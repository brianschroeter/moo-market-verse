import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log(`Function "get-enhanced-fingerprints" up and running!`)

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceRoleKey) {
        console.error('SUPABASE_SERVICE_ROLE_KEY is not set.');
        throw new Error('Server configuration error: Service role key missing.');
    }

    const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        serviceRoleKey,
        { global: { headers: { Authorization: `Bearer ${serviceRoleKey}` } } }
    );

    // Set default parameters for enhanced fingerprint analysis
    const minConfidence = 70
    const similarityThreshold = 0.7

    // Get enhanced fingerprint statistics
    const { data: stats, error: statsError } = await supabaseAdmin
      .rpc('get_enhanced_fingerprint_stats')

    if (statsError) {
      throw statsError
    }

    // Get shared fingerprints using enhanced function
    const { data: sharedFingerprints, error: sharedError } = await supabaseAdmin
      .rpc('get_shared_fingerprint_details')

    if (sharedError) {
      throw sharedError
    }

    // Get suspicious patterns - devices with multiple recent users
    const { data: suspiciousDevices, error: suspiciousError } = await supabaseAdmin
      .from('user_devices')
      .select(`
        fingerprint,
        fingerprint_components,
        confidence_score,
        ip_address,
        profiles!inner(discord_username, discord_id)
      `)
      .gte('confidence_score', minConfidence)
      .gte('last_seen_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
      .order('last_seen_at', { ascending: false })

    if (suspiciousError) {
      throw suspiciousError
    }

    // Group suspicious devices by fingerprint
    const suspiciousGroups = suspiciousDevices.reduce((acc: any, device: any) => {
      if (!acc[device.fingerprint]) {
        acc[device.fingerprint] = {
          fingerprint: device.fingerprint,
          confidence_score: device.confidence_score,
          ip_address: device.ip_address,
          components: device.fingerprint_components,
          users: []
        }
      }
      acc[device.fingerprint].users.push({
        discord_username: device.profiles.discord_username,
        discord_id: device.profiles.discord_id
      })
      return acc
    }, {})

    // Filter to only show devices with multiple users
    const multiUserDevices = Object.values(suspiciousGroups).filter((group: any) => group.users.length > 1)

    return new Response(JSON.stringify({
      success: true,
      data: {
        statistics: stats[0],
        sharedFingerprints: sharedFingerprints,
        suspiciousDevices: multiUserDevices,
        filters: {
          minConfidence,
          similarityThreshold
        }
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error in get-enhanced-fingerprints function:', error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})