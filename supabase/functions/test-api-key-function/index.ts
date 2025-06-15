import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const logs: string[] = []
  
  try {
    logs.push('Starting test-api-key-function')
    
    // Test environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const salt = Deno.env.get('YOUTUBE_API_KEY_SALT')
    
    logs.push(`Has SUPABASE_URL: ${!!supabaseUrl}`)
    logs.push(`Has SUPABASE_ANON_KEY: ${!!supabaseAnonKey}`)
    logs.push(`Has SUPABASE_SERVICE_ROLE_KEY: ${!!supabaseServiceKey}`)
    logs.push(`Has YOUTUBE_API_KEY_SALT: ${!!salt}`)
    
    // Parse body
    let body: any
    try {
      body = await req.json()
      logs.push(`Body parsed successfully: ${JSON.stringify(body)}`)
    } catch (e) {
      logs.push(`Failed to parse body: ${e.message}`)
      return new Response(JSON.stringify({ 
        error: 'Invalid JSON body',
        logs 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Test auth
    const authHeader = req.headers.get('Authorization')
    logs.push(`Has Authorization header: ${!!authHeader}`)
    
    if (!authHeader) {
      return new Response(JSON.stringify({ 
        error: 'No authorization header',
        logs 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Create Supabase client
    const supabase = createClient(
      supabaseUrl ?? '',
      supabaseAnonKey ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Get user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      logs.push(`Auth error: ${userError?.message || 'No user'}`)
      return new Response(JSON.stringify({ 
        error: 'Authentication failed',
        details: userError?.message,
        logs 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    logs.push(`User authenticated: ${user.id}`)

    // Check admin role
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (rolesError) {
      logs.push(`Roles error: ${rolesError.message}`)
      return new Response(JSON.stringify({ 
        error: 'Failed to check admin status',
        details: rolesError.message,
        logs 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    logs.push(`User role: ${roles?.role}`)
    const isAdmin = roles?.role === 'admin'

    // Test database table exists
    const supabaseAdmin = createClient(
      supabaseUrl ?? '',
      supabaseServiceKey ?? ''
    )

    const { data: tableCheck, error: tableError } = await supabaseAdmin
      .from('youtube_api_keys')
      .select('id')
      .limit(1)

    if (tableError) {
      logs.push(`Table check error: ${tableError.message}`)
      logs.push(`Table error code: ${tableError.code}`)
      logs.push(`Table error details: ${tableError.details}`)
    } else {
      logs.push(`Table exists, found ${tableCheck?.length || 0} rows`)
    }

    return new Response(JSON.stringify({ 
      success: true,
      isAdmin,
      hasRequiredEnvVars: {
        supabaseUrl: !!supabaseUrl,
        supabaseAnonKey: !!supabaseAnonKey,
        supabaseServiceKey: !!supabaseServiceKey,
        salt: !!salt
      },
      tableExists: !tableError,
      tableError: tableError ? {
        message: tableError.message,
        code: tableError.code,
        details: tableError.details
      } : null,
      logs
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    logs.push(`Unexpected error: ${error.message}`)
    logs.push(`Error stack: ${error.stack}`)
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message,
      logs
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})