import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { ensureAdmin } from '../_shared/auth.ts'

interface CreateApiKeyRequest {
  name: string
  description?: string
  api_key: string
  status?: 'active' | 'inactive'
}

interface UpdateApiKeyRequest {
  id: string
  name?: string
  description?: string
  status?: 'active' | 'inactive' | 'quota_exceeded'
}

// Simple encryption using base64 and a salt
// In production, use proper encryption with key management
const encryptApiKey = (apiKey: string): string => {
  const salt = Deno.env.get('YOUTUBE_API_KEY_SALT') || 'default-salt'
  const combined = `${salt}:${apiKey}:${salt}`
  return btoa(combined)
}

const decryptApiKey = (encrypted: string): string => {
  try {
    const salt = Deno.env.get('YOUTUBE_API_KEY_SALT') || 'default-salt'
    const decrypted = atob(encrypted)
    const parts = decrypted.split(':')
    if (parts.length === 3 && parts[0] === salt && parts[2] === salt) {
      return parts[1]
    }
    return encrypted // Return as-is if format doesn't match
  } catch {
    return encrypted // Return as-is if decryption fails
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse body first
    let body: any
    try {
      body = await req.json()
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const action = body.action
    if (!action) {
      return new Response(JSON.stringify({ error: 'Action is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Ensure user is admin
    const authResult = await ensureAdmin(req)
    
    if (authResult.errorResponse) {
      return authResult.errorResponse
    }
    
    if (!authResult.isAdmin || !authResult.user) {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    const adminUser = authResult.user
    const supabaseAdmin = authResult.adminClient!

    switch (action) {
      case 'create': {
        if (req.method !== 'POST') {
          return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        const createBody: CreateApiKeyRequest = body

        if (!createBody.name || !createBody.api_key) {
          return new Response(JSON.stringify({ error: 'Name and API key are required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        // Encrypt the API key
        const encryptedKey = encryptApiKey(createBody.api_key)

        // Create the API key record
        const { data, error } = await supabaseAdmin
          .from('youtube_api_keys')
          .insert({
            name: createBody.name,
            description: createBody.description,
            api_key_encrypted: encryptedKey,
            status: createBody.status || 'active',
            created_by: adminUser.id
          })
          .select()
          .single()

        if (error) {
          throw error
        }

        // Don't return the encrypted key
        return new Response(JSON.stringify({
          ...data,
          api_key_encrypted: '••••••••'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'update': {
        if (req.method !== 'PUT') {
          return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        const updateBody: UpdateApiKeyRequest = body

        if (!updateBody.id) {
          return new Response(JSON.stringify({ error: 'ID is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        const updateData: any = {}
        if (updateBody.name !== undefined) updateData.name = updateBody.name
        if (updateBody.description !== undefined) updateData.description = updateBody.description
        if (updateBody.status !== undefined) updateData.status = updateBody.status

        const { data, error } = await supabaseAdmin
          .from('youtube_api_keys')
          .update(updateData)
          .eq('id', updateBody.id)
          .select()
          .single()

        if (error) {
          throw error
        }

        return new Response(JSON.stringify({
          ...data,
          api_key_encrypted: '••••••••'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'test': {
        if (req.method !== 'POST') {
          return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        const testBody: { api_key?: string; id?: string } = body

        let apiKey: string

        if (testBody.api_key) {
          // Testing a new key
          apiKey = testBody.api_key
        } else if (testBody.id) {
          // Testing an existing key
          const { data: keyData, error } = await supabaseAdmin
            .from('youtube_api_keys')
            .select('api_key_encrypted')
            .eq('id', testBody.id)
            .single()

          if (error || !keyData) {
            return new Response(JSON.stringify({ error: 'API key not found' }), {
              status: 404,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
          }

          apiKey = decryptApiKey(keyData.api_key_encrypted)
        } else {
          return new Response(JSON.stringify({ error: 'API key or ID is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        // Test the API key by searching for a known channel
        try {
          const response = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&q=test&type=video&maxResults=1&key=${apiKey}`
          )

          if (response.ok) {
            return new Response(JSON.stringify({
              success: true,
              message: 'API key is valid and working'
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
          } else {
            const data = await response.json()
            const errorMessage = data.error?.message || 'Invalid API key'
            
            if (response.status === 403 && errorMessage.includes('quota')) {
              return new Response(JSON.stringify({
                success: false,
                message: 'API key has exceeded its quota'
              }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              })
            }

            return new Response(JSON.stringify({
              success: false,
              message: errorMessage
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
          }
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            message: 'Failed to test API key: ' + error.message
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})