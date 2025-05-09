import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface UserFingerprintProfile {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  last_seen_at: string; // TIMESTAMPTZ from SQL will be string here
  first_seen_at: string; // TIMESTAMPTZ from SQL will be string here
}

interface SharedFingerprintGroup {
  fingerprint: string;
  users: UserFingerprintProfile[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceRoleKey) {
        console.error('SUPABASE_SERVICE_ROLE_KEY is not set.');
        throw new Error('Server configuration error: Service role key missing.');
    }

    const adminSupabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        serviceRoleKey,
        { global: { headers: { Authorization: `Bearer ${serviceRoleKey}` } } }
    );

    const { data, error } = await adminSupabaseClient.rpc('get_shared_fingerprint_details');

    if (error) {
      console.error('Error fetching shared fingerprint details:', error)
      throw error
    }

    if (!data) {
        return new Response(JSON.stringify({ data: [] }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    }
    
    const result: SharedFingerprintGroup[] = [];
    const groups: Record<string, SharedFingerprintGroup> = {};

    (data as any[]).forEach(row => {
      const { fingerprint, user_id, username, discord_id, discord_avatar, last_seen_at, first_seen_at } = row;
      
      if (!groups[fingerprint]) {
        groups[fingerprint] = {
          fingerprint,
          users: [],
        };
      }
      
      const avatarUrl = discord_id && discord_avatar
        ? `https://cdn.discordapp.com/avatars/${discord_id}/${discord_avatar}.png`
        : null;

      groups[fingerprint].users.push({
        user_id,
        username: username || 'Unknown',
        avatar_url: avatarUrl,
        last_seen_at,
        first_seen_at
      });
    });

    Object.values(groups).forEach(group => result.push(group));

    return new Response(JSON.stringify({ data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (e) {
    console.error('Handler error (get-shared-fingerprints):', e.message)
    return new Response(JSON.stringify({ error: e.message || 'An unexpected error occurred.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
}) 