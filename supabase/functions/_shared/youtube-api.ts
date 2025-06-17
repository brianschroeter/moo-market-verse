// Shared YouTube API service for consistent API key management across all edge functions

export interface YouTubeAPIKey {
  id: string;
  key: string;
}

export interface YouTubeAPIError {
  error: {
    code: number;
    message: string;
    errors?: Array<{
      domain: string;
      reason: string;
      message: string;
    }>;
  };
}

export class YouTubeAPIService {
  private supabase: any;
  private currentApiKey: YouTubeAPIKey | null = null;
  private maxRetries: number = 3;

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
  }

  /**
   * Get the next available API key using the database function with proper locking
   */
  async getApiKey(): Promise<YouTubeAPIKey> {
    try {
      // Try to get the next available API key from the database
      const { data, error } = await this.supabase
        .rpc('get_next_youtube_api_key');

      if (error || !data || data.length === 0) {
        // Fallback to environment variable if no keys in database
        const envKey = Deno.env.get('YOUTUBE_API_KEY');
        if (!envKey) {
          throw new Error('No YouTube API keys available');
        }
        console.warn('Using fallback YOUTUBE_API_KEY from environment');
        return { id: 'env-key', key: envKey };
      }

      const keyData = data[0];
      
      // Decrypt the API key
      const decryptedKey = this.decryptApiKey(keyData.api_key_encrypted);
      
      this.currentApiKey = { id: keyData.id, key: decryptedKey };
      return this.currentApiKey;
    } catch (error) {
      console.error('Error getting API key:', error);
      // Last resort fallback
      const envKey = Deno.env.get('YOUTUBE_API_KEY');
      if (envKey) {
        return { id: 'env-key', key: envKey };
      }
      throw error;
    }
  }

  /**
   * Decrypt an API key using the same logic as sync-youtube-streams
   */
  private decryptApiKey(encrypted: string): string {
    try {
      const salt = Deno.env.get('YOUTUBE_API_KEY_SALT') || 
                   Deno.env.get('ENCRYPTION_SALT') || 
                   'default-salt';
      const decrypted = atob(encrypted);
      const parts = decrypted.split(':');
      if (parts.length === 3 && parts[0] === salt && parts[2] === salt) {
        return parts[1];
      }
      return encrypted; // Return as-is if format doesn't match
    } catch {
      return encrypted; // Return as-is if decryption fails
    }
  }

  /**
   * Make a YouTube API request with automatic key rotation on quota errors
   */
  async makeRequest(url: string, retryCount: number = 0): Promise<Response> {
    if (!this.currentApiKey) {
      this.currentApiKey = await this.getApiKey();
    }

    // Add API key to URL
    const urlWithKey = new URL(url);
    urlWithKey.searchParams.set('key', this.currentApiKey.key);

    try {
      const response = await fetch(urlWithKey.toString());
      
      if (response.ok) {
        // Record successful API call
        await this.recordSuccess(this.currentApiKey.id);
        return response;
      }

      // Check if it's a quota error
      const errorData = await response.json() as YouTubeAPIError;
      const isQuotaError = this.isQuotaError(errorData);

      if (isQuotaError && retryCount < this.maxRetries) {
        console.log(`Quota exceeded for key ${this.currentApiKey.id}, rotating to next key...`);
        
        // Mark current key as quota exceeded
        await this.markKeyAsQuotaExceeded(
          this.currentApiKey.id, 
          errorData.error.message,
          true
        );
        
        // Get a new key and retry
        this.currentApiKey = await this.getApiKey();
        return this.makeRequest(url, retryCount + 1);
      }

      // For non-quota errors, still track them
      if (!isQuotaError && this.currentApiKey.id !== 'env-key') {
        await this.markKeyAsQuotaExceeded(
          this.currentApiKey.id,
          errorData.error.message,
          false
        );
      }

      // Return the error response
      return response;
    } catch (error) {
      console.error('Error making YouTube API request:', error);
      
      // Track network/fetch errors
      if (this.currentApiKey.id !== 'env-key') {
        await this.markKeyAsQuotaExceeded(
          this.currentApiKey.id,
          error.message || 'Network error',
          false
        );
      }
      
      throw error;
    }
  }

  /**
   * Check if an error response indicates quota exceeded
   */
  private isQuotaError(errorData: YouTubeAPIError): boolean {
    if (!errorData.error) return false;
    
    // Check for quota exceeded error codes
    if (errorData.error.code === 403) {
      const errors = errorData.error.errors || [];
      return errors.some(e => 
        e.reason === 'quotaExceeded' || 
        e.reason === 'dailyLimitExceeded' ||
        e.reason === 'rateLimitExceeded'
      );
    }
    
    return false;
  }

  /**
   * Mark a key as having quota exceeded
   */
  async markKeyAsQuotaExceeded(keyId: string, error: string, isQuotaError: boolean = true): Promise<void> {
    if (keyId === 'env-key') return; // Skip if using env key
    
    try {
      await this.supabase.rpc('mark_youtube_api_key_quota_exceeded', {
        key_id: keyId,
        error_message: error,
        is_quota_error: isQuotaError
      });
    } catch (err) {
      console.error('Error marking key as quota exceeded:', err);
    }
  }

  /**
   * Record successful API usage
   */
  async recordSuccess(keyId: string): Promise<void> {
    if (keyId === 'env-key') return; // Skip if using env key
    
    try {
      await this.supabase.rpc('record_youtube_api_success', {
        key_id: keyId
      });
    } catch (err) {
      console.error('Error recording API success:', err);
    }
  }

  /**
   * Log API usage for tracking
   */
  async logApiUsage(
    endpoint: string, 
    channelIds: string[], 
    unitsUsed: number, 
    success: boolean, 
    error?: string
  ): Promise<void> {
    if (!this.currentApiKey || this.currentApiKey.id === 'env-key') return;

    try {
      await this.supabase
        .from('youtube_api_key_usage_log')
        .insert({
          api_key_id: this.currentApiKey.id,
          endpoint,
          channel_ids: channelIds,
          units_used: unitsUsed,
          response_cached: false,
          success,
          error_message: error || null
        });
    } catch (err) {
      console.error('Error logging API usage:', err);
    }
  }

  /**
   * Helper to build YouTube API URLs
   */
  static buildApiUrl(endpoint: string, params: Record<string, string>): string {
    const baseUrl = 'https://www.googleapis.com/youtube/v3';
    const url = new URL(`${baseUrl}/${endpoint}`);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, value);
      }
    });
    
    return url.toString();
  }
}

// Export a factory function for creating the service
export function createYouTubeAPIService(supabaseClient: any): YouTubeAPIService {
  return new YouTubeAPIService(supabaseClient);
}