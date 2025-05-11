import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { ensureAdmin } from '../_shared/auth.ts';
import type { Database } from '../../../src/integrations/supabase/database.types.ts'; // Adjust path as needed

console.log(`Function "admin-schedule-slots-create" booting up...`);

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

  const { adminClient, errorResponse: authErrorResponse, user } = await ensureAdmin(req);
  if (authErrorResponse) {
    return authErrorResponse;
  }
  if (!adminClient) {
    console.error('adminClient is null after successful admin check');
    return new Response(JSON.stringify({ error: 'Internal server error: Admin client unavailable' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
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
      youtube_channel_id, // UUID, required
      day_of_week,        // Target: SMALLINT[], 0-6 (Sun-Sat), can be null
      default_start_time_utc, // TIME string, required
      specific_date,      // DATE string, required if not recurring (override), null otherwise
      is_recurring,       // BOOLEAN, required
      fallback_title,     // TEXT, optional
      notes,              // TEXT, optional
    } = body;

    // Basic Validations
    if (!youtube_channel_id || typeof youtube_channel_id !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing or invalid youtube_channel_id (must be a UUID string)' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (typeof is_recurring !== 'boolean') {
      return new Response(JSON.stringify({ error: 'is_recurring (boolean) is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!default_start_time_utc || !isValidTimeFormat(default_start_time_utc)) {
        return new Response(JSON.stringify({ error: 'Missing or invalid default_start_time_utc (must be HH:MM or HH:MM:SS)' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    const slotToInsert: Partial<Database['public']['Tables']['schedule_slots']['Insert']> = {
        youtube_channel_id,
        default_start_time_utc,
        is_recurring,
        fallback_title: fallback_title || null, // Ensure null if empty
        notes: notes || null, // Ensure null if empty
        // day_of_week and specific_date are set below based on is_recurring
    };

    if (is_recurring) {
        // For recurring slots, day_of_week can be an array of numbers (0-6) or null if no days are specified.
        // The form sends null if the array would be empty.
        if (day_of_week !== null) { // Only validate if it's not explicitly null
            if (!Array.isArray(day_of_week) || day_of_week.some(d => typeof d !== 'number' || d < 0 || d > 6)) {
                return new Response(JSON.stringify({ error: 'If provided, day_of_week must be an array of numbers (0-6) for recurring slots' }), {
                    status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }
            // It's a valid array (possibly empty, though form sends null for that)
            // but if it is, business logic would decide if an empty array is an error or means 'null'
            // For now, allowing empty array, or could enforce non-empty:
            // if (day_of_week.length === 0) { return new Response(JSON.stringify({ error: 'day_of_week array cannot be empty for recurring slots' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
            slotToInsert.day_of_week = day_of_week; // No longer needs 'as any'
        } else {
            // This case should ideally not be hit if the form sends null for empty arrays
            // or if day_of_week is not provided when is_recurring is true (covered by earlier check)
            slotToInsert.day_of_week = null;
        }
        slotToInsert.specific_date = null; // Ensure specific_date is null for recurring
    } else { // Not recurring (one-time or override)
        if (!specific_date || !isValidDateFormat(specific_date)) {
            return new Response(JSON.stringify({ error: 'specific_date (YYYY-MM-DD) is required for non-recurring slots' }), {
                status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }
        slotToInsert.specific_date = specific_date;
        // slotToInsert.day_of_week = null; // Ensured by schema if not recurring, or handled above if recurring but explicitly set to null
        if (specific_date) {
            slotToInsert.day_of_week = null; // Explicitly nullify day_of_week if specific_date is set
        } else if (!is_recurring && day_of_week !== undefined) {
             // This case should not happen based on form logic (day_of_week is hidden if not recurring)
             // but defensively, if it's not recurring and day_of_week somehow got a value, nullify it.
            slotToInsert.day_of_week = null;
        }
    }

    // Validate optional text fields
    if (fallback_title && typeof fallback_title !== 'string') {
        return new Response(JSON.stringify({ error: 'Invalid fallback_title, must be a string if provided' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (notes && typeof notes !== 'string') {
        return new Response(JSON.stringify({ error: 'Invalid notes, must be a string if provided' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data, error } = await adminClient
      .from('schedule_slots') // Regenerate your database.types.ts for this to be type-checked
      .insert(slotToInsert)
      .select()
      .single();

    if (error) {
      console.error('Error inserting schedule slot:', error);
      // Handle foreign key violation for youtube_channel_id if it doesn't exist
      if (error.code === '23503') { // foreign_key_violation
        return new Response(JSON.stringify({ error: 'Invalid youtube_channel_id: Channel does not exist.', details: error.message }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      // Handle other potential errors (e.g., unique constraints if you add them later)
      return new Response(JSON.stringify({ error: 'Failed to add schedule slot', details: error.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Admin ${user?.id} successfully added schedule slot: ${data.id}`);
    return new Response(JSON.stringify(data), {
      status: 201, // Created
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Unexpected error in admin-schedule-slots-create:', err);
    return new Response(JSON.stringify({ error: err.message || 'An unexpected error occurred.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}); 