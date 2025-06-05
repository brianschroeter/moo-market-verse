import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface UserProfile {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
}

interface SharedConnectionGroup {
  youtube_channel_id: string;
  youtube_channel_name: string | null;
  users: UserProfile[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // IMPORTANT: Ensure SUPABASE_SERVICE_ROLE_KEY is set in your Edge Function's environment variables
    // as this function might require broader access than anon key provides.
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceRoleKey) {
        console.error('SUPABASE_SERVICE_ROLE_KEY is not set.');
        throw new Error('Server configuration error: Service role key missing.');
    }

    const adminSupabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        serviceRoleKey, // Use Service Role Key for admin-level operations
         { global: { headers: { Authorization: `Bearer ${serviceRoleKey}` } } } // Pass service key as auth
    );

    // Call the SQL function created in the migration
    const { data, error } = await adminSupabaseClient.rpc('get_shared_youtube_connection_details');

    if (error) {
      console.error('Error fetching shared YouTube connections:', error)
      throw error
    }

    if (!data) {
        return new Response(JSON.stringify({ data: [] }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    }
    
    // Process data: Group by youtube_channel_id
    const result: SharedConnectionGroup[] = [];
    const groups: Record<string, SharedConnectionGroup> = {};

    (data as any[]).forEach(row => {
      const { youtube_channel_id, youtube_channel_name, user_id, username, discord_id, discord_avatar } = row;
      
      if (!groups[youtube_channel_id]) {
        groups[youtube_channel_id] = {
          youtube_channel_id,
          youtube_channel_name: youtube_channel_name || 'N/A', // Default if name is null
          users: [],
        };
      }
      
      // Construct avatar URL with proper fallback handling
      let avatarUrl = null;
      if (discord_avatar) {
        if (discord_avatar.startsWith('http')) {
          // Already a full URL (e.g., default Discord avatar)
          avatarUrl = discord_avatar;
        } else if (discord_id) {
          // It's an avatar hash, construct the URL
          avatarUrl = `https://cdn.discordapp.com/avatars/${discord_id}/${discord_avatar}.png`;
        }
      }

      groups[youtube_channel_id].users.push({
        user_id,
        username: username || 'Unknown', // Default if username is null
        avatar_url: avatarUrl,
      });
    });

    // Convert the groups object to an array
    Object.values(groups).forEach(group => result.push(group));

    return new Response(JSON.stringify({ data: result }), { // Ensure result is wrapped in a 'data' property if frontend expects it like that. Let's assume it sends the array directly.
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (e) {
    console.error('Handler error:', e.message)
    return new Response(JSON.stringify({ error: e.message || 'An unexpected error occurred.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500, // Use 500 for server errors
    })
  }
}) 