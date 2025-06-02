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

    // Get basic statistics first to test
    const { data: deviceCount, error: countError } = await supabaseAdmin
      .from('user_devices')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.error('Count error:', countError)
      throw countError
    }

    // Get enhanced fingerprint statistics
    const { data: stats, error: statsError } = await supabaseAdmin
      .rpc('get_enhanced_fingerprint_stats')

    if (statsError) {
      console.error('Stats function error:', statsError)
      // Continue without stats for now
    }

    // Get shared fingerprints using enhanced function
    const { data: sharedFingerprints, error: sharedError } = await supabaseAdmin
      .rpc('get_shared_fingerprint_details')

    if (sharedError) {
      console.error('Shared fingerprints function error:', sharedError)
      // Continue without shared fingerprints for now
    }

    // Simplified suspicious devices query for now
    const multiUserDevices: any[] = []

    return new Response(JSON.stringify({
      success: true,
      data: {
        statistics: stats?.[0] || {
          total_devices: deviceCount || 0,
          high_confidence_devices: 0,
          unique_users: 0,
          potential_duplicates: 0,
          avg_confidence: 0
        },
        sharedFingerprints: sharedFingerprints || [],
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