import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@^2';
import { corsHeaders } from '../_shared/cors.ts';
import { ensureAdmin } from '../_shared/auth.ts';
import type { Database } from '../../../src/integrations/supabase/database.types.ts';

console.log(`Function "admin-schedule-slots-update" booting up...`);

// Helper to validate TIME format (HH:MM or HH:MM:SS)
function isValidTimeFormat(timeString: string): boolean {
    if (!timeString) return false;
    return /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/.test(timeString);
}

// Helper to validate DATE format (YYYY-MM-DD)
function isValidDateFormat(dateString: string): boolean {
    if (!dateString) return false;
    return /^\d{4}-\d{2}-\d{2}$/.test(dateString) && !isNaN(new Date(dateString).getTime());
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // For development mode, allow bypassing authentication
  const authHeader = req.headers.get('Authorization');
  let adminClient;
  let user = null;

  // Check if this is development mode (no auth header OR dev token)
  const isDevToken = authHeader?.includes('dev-access-token');

  if (!authHeader || isDevToken) {
    // Development mode - create admin client directly
    console.log('Development mode detected (no auth header or dev token)');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);
  } else {
    // Production mode - ensure admin
    const { adminClient: authAdminClient, errorResponse: authErrorResponse, user: authUser } = await ensureAdmin(req);
    if (authErrorResponse) {
      return authErrorResponse;
    }
    if (!authAdminClient) {
      return new Response(JSON.stringify({ error: 'Internal server error: Admin client unavailable' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    adminClient = authAdminClient;
    user = authUser;
  }

  try {
    if (req.method !== 'PUT') {
      return new Response(JSON.stringify({ error: 'Method Not Allowed, use PUT' }), {
        status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let body;
    try {
      body = await req.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const {
      id, // UUID of the slot to update, required
      youtube_channel_id,
      day_of_week,
      default_start_time_utc,
      specific_date,
      is_recurring,
      fallback_title,
      notes,
    } = body;

    if (!id || typeof id !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing or invalid schedule slot id in request body' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const fieldsToUpdate: Partial<Database['public']['Tables']['schedule_slots']['Update']> = {};
    let recurringStatusChanged = false;
    let currentIsRecurring: boolean | undefined = undefined;

    // Fetch current is_recurring status if it's being changed or if relevant for conditional logic
    if (is_recurring !== undefined || day_of_week !== undefined || specific_date !== undefined) {
        const { data: currentSlot, error: fetchError } = await adminClient
            .from('schedule_slots')
            .select('is_recurring, day_of_week, specific_date')
            .eq('id', id)
            .single();
        if (fetchError || !currentSlot) {
            return new Response(JSON.stringify({ error: `Schedule slot with id ${id} not found.`}), {
                status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
        currentIsRecurring = currentSlot.is_recurring;
        if (is_recurring !== undefined && typeof is_recurring === 'boolean' && is_recurring !== currentIsRecurring) {
            recurringStatusChanged = true;
            fieldsToUpdate.is_recurring = is_recurring;
        }
    }
    
    const targetIsRecurring = fieldsToUpdate.is_recurring !== undefined ? fieldsToUpdate.is_recurring : currentIsRecurring;

    if (youtube_channel_id !== undefined) {
        if (typeof youtube_channel_id !== 'string') {
             return new Response(JSON.stringify({ error: 'Invalid youtube_channel_id' }), {
                status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
        }
        fieldsToUpdate.youtube_channel_id = youtube_channel_id;
    }
    if (default_start_time_utc !== undefined) {
        if (!isValidTimeFormat(default_start_time_utc)) {
            return new Response(JSON.stringify({ error: 'Invalid default_start_time_utc (must be HH:MM or HH:MM:SS)' }), {
                status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
        }
        fieldsToUpdate.default_start_time_utc = default_start_time_utc;
    }
    if (fallback_title !== undefined) {
        if (typeof fallback_title !== 'string' && fallback_title !== null) { // Allow null to clear
            return new Response(JSON.stringify({ error: 'Invalid fallback_title (must be string or null)' }), {
                status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
        }
        fieldsToUpdate.fallback_title = fallback_title; 
    }
    if (notes !== undefined) {
        if (typeof notes !== 'string' && notes !== null) { // Allow null to clear
            return new Response(JSON.stringify({ error: 'Invalid notes (must be string or null)' }), {
                status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
        }
        fieldsToUpdate.notes = notes;
    }

    // Conditional logic for day_of_week and specific_date based on is_recurring status (current or intended)
    if (targetIsRecurring) {
        if (day_of_week !== undefined) { // day_of_week is being explicitly set or unset
            if (day_of_week === null) {
                fieldsToUpdate.day_of_week = null;
            } else if (Array.isArray(day_of_week) && day_of_week.every(d => typeof d === 'number' && d >= 0 && d <= 6)) {
                fieldsToUpdate.day_of_week = day_of_week; // No longer needs 'as any'
            } else {
                return new Response(JSON.stringify({ error: 'Invalid day_of_week (must be an array of numbers 0-6, or null) for recurring slot' }), {
                    status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }
        } else if (day_of_week !== undefined) {
            // If is_recurring is false (or being set to false), day_of_week must be null
            // However, the form should not send day_of_week if not recurring. This is a safeguard.
            fieldsToUpdate.day_of_week = null;
        }
        // If is_recurring is being set to true, or if it's already true and specific_date is trying to be set, clear specific_date.
        if (recurringStatusChanged || (specific_date !== undefined && targetIsRecurring)) {
             fieldsToUpdate.specific_date = null;
        }
    } else { // Not recurring (targetIsRecurring is false)
        if (specific_date !== undefined) {
            if (specific_date === null || !isValidDateFormat(specific_date)) { // Must provide a valid date if setting it
                return new Response(JSON.stringify({ error: 'Invalid specific_date (YYYY-MM-DD) for non-recurring slot, or null to clear' }), {
                    status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
            }
            fieldsToUpdate.specific_date = specific_date;
        }
         // If is_recurring is being set to false, or if it's already false and day_of_week is trying to be set, clear day_of_week.
        if (recurringStatusChanged || (day_of_week !== undefined && !targetIsRecurring)) {
            fieldsToUpdate.day_of_week = null;
        }
    }

    // Edge case: if is_recurring is not in body, but day_of_week is set, this implies recurring.
    // And if specific_date is set, implies not recurring. This needs to be handled by the above.
    // Ensure that if day_of_week is set, specific_date is cleared, and vice-versa,
    // if is_recurring is not explicitly part of the payload but implied.

    if (fieldsToUpdate.day_of_week !== undefined && fieldsToUpdate.day_of_week !== null && fieldsToUpdate.specific_date === undefined && targetIsRecurring) {
        // If we're setting day_of_week for a recurring slot, ensure specific_date is nulled out if not already handled
        // This is mostly a safeguard for cases where recurringStatusChanged might not have caught it
        const { data: currentSlotData } = await adminClient.from('schedule_slots').select('specific_date').eq('id', id).single();
        if (currentSlotData && currentSlotData.specific_date !== null) {
            fieldsToUpdate.specific_date = null;
        }
    } else if (fieldsToUpdate.specific_date !== undefined && fieldsToUpdate.specific_date !== null && fieldsToUpdate.day_of_week === undefined && !targetIsRecurring) {
        // If we're setting specific_date for a non-recurring slot, ensure day_of_week is nulled out
        const { data: currentSlotData } = await adminClient.from('schedule_slots').select('day_of_week').eq('id', id).single();
        if (currentSlotData && currentSlotData.day_of_week !== null) {
             fieldsToUpdate.day_of_week = null;
        }
    }

    if (Object.keys(fieldsToUpdate).length === 0 && !recurringStatusChanged) {
      return new Response(JSON.stringify({ error: 'No updateable fields provided' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data, error } = await adminClient
      .from('schedule_slots')
      .update(fieldsToUpdate)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating schedule slot ${id}:`, error);
       if (error.code === 'PGRST204') { // PostgREST code for no rows found, though .single() should make this explicit
        return new Response(JSON.stringify({ error: `Schedule slot with id ${id} not found.` }), {
            status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (error.code === '23503') { // foreign_key_violation on youtube_channel_id
        return new Response(JSON.stringify({ error: 'Invalid youtube_channel_id: Channel does not exist.', details: error.message }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'Failed to update schedule slot', details: error.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
     if (!data) { // Should be caught by PGRST204 or .single(), but as a safeguard
        return new Response(JSON.stringify({ error: `Schedule slot with id ${id} not found after update attempt.` }), {
            status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    console.log(`Admin ${user?.id} successfully updated schedule slot: ${data.id}`);
    return new Response(JSON.stringify(data), {
      status: 200, // OK
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error(`Unexpected error in admin-schedule-slots-update for ID ${req.json()?.id || 'unknown'}:`, err);
    return new Response(JSON.stringify({ error: err.message || 'An unexpected error occurred.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}); 