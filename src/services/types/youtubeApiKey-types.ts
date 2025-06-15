export type YouTubeApiKeyStatus = 'active' | 'inactive' | 'quota_exceeded';

export interface YouTubeApiKey {
  id: string;
  name: string;
  description: string | null;
  api_key_encrypted: string;
  status: YouTubeApiKeyStatus;
  total_requests: number;
  quota_used_today: number;
  last_used_at: string | null;
  last_quota_reset_at: string;
  quota_exceeded_at: string | null;
  last_error: string | null;
  last_error_at: string | null;
  consecutive_errors: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface YouTubeApiKeyStats {
  id: string;
  name: string;
  status: YouTubeApiKeyStatus;
  total_requests: number;
  quota_used_today: number;
  last_used_at: string | null;
  last_quota_reset_at: string;
  consecutive_errors: number;
  logs_count: number;
  units_used_24h: number;
  units_used_1h: number;
  errors_24h: number;
}

export interface YouTubeApiKeyUsageLog {
  id: string;
  api_key_id: string;
  endpoint: string;
  channel_ids: string[];
  units_used: number;
  response_cached: boolean;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

export interface CreateYouTubeApiKeyPayload {
  name: string;
  description?: string;
  api_key: string;
  status?: YouTubeApiKeyStatus;
}

export interface UpdateYouTubeApiKeyPayload {
  name?: string;
  description?: string;
  status?: YouTubeApiKeyStatus;
}