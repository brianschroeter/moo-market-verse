// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

console.log("Hello from Functions!")

serve(async (req: Request) => {
  // Log invocation
  console.log(`[GET-LEADERBOARD-STATS] Function invoked. Method: ${req.method}`);

  if (req.method === "OPTIONS") {
    console.log("[GET-LEADERBOARD-STATS] Handling OPTIONS request.");
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("[GET-LEADERBOARD-STATS] Inside try block.");

    // 1. API Key Check
    const apiKeyFromHeader = req.headers.get("X-Api-Key");
    const expectedApiKey = Deno.env.get("LEADERBOARD_API_KEY");

    console.log("[GET-LEADERBOARD-STATS] LEADERBOARD_API_KEY from env:", expectedApiKey ? "Loaded" : "MISSING");

    if (!expectedApiKey) {
      console.error("[GET-LEADERBOARD-STATS] LEADERBOARD_API_KEY environment variable is not set.");
      return new Response(JSON.stringify({ error: "Internal server configuration error: API key not set." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    if (!apiKeyFromHeader || apiKeyFromHeader !== expectedApiKey) {
      console.warn("[GET-LEADERBOARD-STATS] Unauthorized attempt. Missing or incorrect X-Api-Key.");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    console.log("[GET-LEADERBOARD-STATS] X-Api-Key validated successfully.");

    // 2. Supabase Client Initialization
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    console.log("[GET-LEADERBOARD-STATS] SUPABASE_URL from env:", supabaseUrl ? "Loaded" : "MISSING");
    console.log("[GET-LEADERBOARD-STATS] SUPABASE_SERVICE_ROLE_KEY from env:", serviceRoleKey ? "Loaded (obscured)" : "MISSING");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[GET-LEADERBOARD-STATS] Supabase URL or Service Role Key is missing from environment variables.");
      return new Response(JSON.stringify({ error: "Internal server configuration error: Supabase credentials missing." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const supabaseClient = createClient(supabaseUrl, serviceRoleKey);
    console.log("[GET-LEADERBOARD-STATS] Supabase client initialized.");

    // 3. Determine Month and Year for RPC calls
    const url = new URL(req.url);
    const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');
    const currentYear = new Date().getFullYear().toString();
    const p_month = url.searchParams.get("month") || currentMonth;
    const p_year = url.searchParams.get("year") || currentYear;
    console.log(`[GET-LEADERBOARD-STATS] Using month: ${p_month}, year: ${p_year}`);

    // 4. Fetch Data using RPC calls
    console.log("[GET-LEADERBOARD-STATS] Fetching superchats data...");
    const { data: superchatsRaw, error: superchatsError } = await supabaseClient
      .rpc('sum_donations_by_channel_for_month_year', { p_month, p_year });
    if (superchatsError) {
      console.error("[GET-LEADERBOARD-STATS] Error fetching superchats:", superchatsError);
      throw superchatsError;
    }
    console.log("[GET-LEADERBOARD-STATS] Superchats data fetched.");

    console.log("[GET-LEADERBOARD-STATS] Fetching gifted memberships data...");
    const { data: giftedRaw, error: giftedError } = await supabaseClient
      .rpc('sum_gifted_memberships_by_channel_for_month_year', { p_month, p_year });
    if (giftedError) {
      console.error("[GET-LEADERBOARD-STATS] Error fetching gifted memberships:", giftedError);
      throw giftedError;
    }
    console.log("[GET-LEADERBOARD-STATS] Gifted memberships data fetched.");

    console.log("[GET-LEADERBOARD-STATS] Fetching membership breakdown data...");
    const { data: membershipsRaw, error: membershipsError } = await supabaseClient
      .rpc('get_channel_membership_breakdown');
    if (membershipsError) {
      console.error("[GET-LEADERBOARD-STATS] Error fetching membership breakdown:", membershipsError);
      throw membershipsError;
    }
    console.log("[GET-LEADERBOARD-STATS] Membership breakdown data fetched.");

    const responseData = {
      superchats: superchatsRaw || [],
      giftedMemberships: giftedRaw || [],
      membershipBreakdown: membershipsRaw || [],
    };

    console.log("[GET-LEADERBOARD-STATS] Successfully fetched all data. Sending response.");
    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("[GET-LEADERBOARD-STATS] Error in function execution:", error);
    return new Response(JSON.stringify({ error: error.message || "An unexpected error occurred." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/get-leaderboard-stats' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
