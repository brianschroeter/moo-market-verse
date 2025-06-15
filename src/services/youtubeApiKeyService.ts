import { supabase } from '@/integrations/supabase/client';
import { YouTubeApiKey, YouTubeApiKeyStats, CreateYouTubeApiKeyPayload, UpdateYouTubeApiKeyPayload } from './types/youtubeApiKey-types';

// Simple encryption/decryption for client-side (not secure, just obfuscation)
// In production, API keys should only be encrypted/decrypted server-side
const obfuscateKey = (key: string): string => {
  // Simple base64 encoding for obfuscation
  return btoa(key);
};

const deobfuscateKey = (encoded: string): string => {
  try {
    return atob(encoded);
  } catch {
    return encoded; // Return as-is if decoding fails
  }
};

export async function getYouTubeApiKeys(): Promise<YouTubeApiKey[]> {
  const { data, error } = await supabase
    .from('youtube_api_keys')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching YouTube API keys:', error);
    throw error;
  }

  // Don't return the actual API keys to the client
  return (data || []).map(key => ({
    ...key,
    api_key_encrypted: '••••••••' // Mask the key
  }));
}

export async function getYouTubeApiKeyStats(): Promise<YouTubeApiKeyStats[]> {
  const { data, error } = await supabase
    .from('youtube_api_key_stats')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching YouTube API key stats:', error);
    throw error;
  }

  return data || [];
}

export async function createYouTubeApiKey(payload: CreateYouTubeApiKeyPayload): Promise<YouTubeApiKey> {
  const response = await supabase.functions.invoke('manage-youtube-api-keys', {
    body: {
      action: 'create',
      ...payload
    }
  });

  if (response.error) {
    console.error('Error creating YouTube API key:', response.error);
    throw new Error(response.error.message || 'Failed to create API key');
  }

  return response.data;
}

export async function updateYouTubeApiKey(id: string, payload: UpdateYouTubeApiKeyPayload): Promise<YouTubeApiKey> {
  const updateData: any = {
    updated_at: new Date().toISOString()
  };

  if (payload.name !== undefined) updateData.name = payload.name;
  if (payload.description !== undefined) updateData.description = payload.description;
  if (payload.status !== undefined) updateData.status = payload.status;

  const { data, error } = await supabase
    .from('youtube_api_keys')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating YouTube API key:', error);
    throw error;
  }

  return {
    ...data,
    api_key_encrypted: '••••••••' // Mask the key in response
  };
}

export async function deleteYouTubeApiKey(id: string): Promise<void> {
  const { error } = await supabase
    .from('youtube_api_keys')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting YouTube API key:', error);
    throw error;
  }
}

export async function testYouTubeApiKey(apiKey: string): Promise<{ success: boolean; message: string; quota?: number }> {
  const response = await supabase.functions.invoke('manage-youtube-api-keys', {
    body: { 
      action: 'test',
      api_key: apiKey 
    }
  });

  if (response.error) {
    console.error('Error testing YouTube API key:', response.error);
    return {
      success: false,
      message: 'Failed to test API key: ' + response.error.message
    };
  }

  return response.data;
}

export async function resetYouTubeApiKeyQuotas(): Promise<void> {
  const { error } = await supabase.rpc('reset_youtube_api_key_quotas');

  if (error) {
    console.error('Error resetting YouTube API key quotas:', error);
    throw error;
  }
}