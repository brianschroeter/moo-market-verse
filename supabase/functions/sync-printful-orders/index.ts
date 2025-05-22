import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers for local development and deployed function
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Or your specific frontend origin
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS", // Allow POST for invocation and OPTIONS for preflight
};

// Define interfaces for Printful API responses (simplified for now)
interface PrintfulOrderItem {
  id: number;
  external_id: string | null;
  variant_id: number;
  quantity: number;
  price: string; // Needs conversion to numeric
  retail_price: string; // Needs conversion to numeric
  name: string;
  product: {
    variant_id: number;
    product_id: number;
    image: string;
    name: string;
  };
  sku: string | null;
  // ... other fields as needed
}

interface PrintfulOrder {
  id: number;
  external_id: string | null;
  status: string;
  shipping: string; // This might be an object or string, needs clarification from Printful docs
  recipient: {
    name: string;
    email: string | null;
    // ... other recipient fields
  };
  items: PrintfulOrderItem[];
  costs: {
    total: string; // Needs conversion to numeric
    currency: string;
    // ... other cost fields
  };
  created: number; // Timestamp
  updated: number; // Timestamp
  // ... other fields as needed
}

interface PrintfulAPIResponse {
  code: number;
  result: PrintfulOrder[];
  paging: {
    total: number;
    offset: number;
    limit: number;
  };
  // ... other response fields
}


console.log("sync-printful-orders function initializing...");

serve(async (req: Request) => {
  // Handle OPTIONS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("Function invoked via:", req.method);

    // 1. Securely get Printful API Key
    const printfulApiKey = Deno.env.get("PRINTFUL_API_KEY");
    if (!printfulApiKey) {
      console.error("PRINTFUL_API_KEY not set in Supabase secrets.");
      return new Response(JSON.stringify({ error: "Printful API key is not configured." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Initialize Supabase client
    // Ensure SUPABASE_URL and SUPABASE_ANON_KEY are set in your Edge Function settings
    // For service_role key, use SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
        console.error("Supabase URL or Service Role Key not set.");
        return new Response(JSON.stringify({ error: "Supabase environment variables not set." }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);


    // 3. API Interaction & Data Fetching (Incremental Sync Logic)
    console.log("Fetching last sync timestamp...");
    let lastSyncTimestamp = 0; // Default to fetch all if no previous sync

    const { data: lastOrder, error: lastOrderError } = await supabaseAdmin
      .from("printful_orders")
      .select("printful_updated_at, printful_created_at")
      .order("printful_updated_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (lastOrderError) {
      console.error("Error fetching last sync timestamp:", lastOrderError.message);
      // Decide if to proceed or return error. For now, we'll try to sync all.
    }

    if (lastOrder && lastOrder.printful_updated_at) {
      // Printful API might expect Unix timestamp in seconds.
      // The 'updated' field from Printful is a Unix timestamp.
      // We store printful_updated_at as ISO string, so convert it back if needed or use a raw 'updated' value.
      // For simplicity, let's assume we need to fetch orders updated *after* this timestamp.
      // Printful's API might not have a direct "updated_since".
      // We might need to fetch recent orders and filter, or use created_at if more suitable.
      // Let's assume Printful API uses 'offset' and 'limit' for pagination and we might filter by date range.
      // For now, we'll fetch recent orders. A more robust solution would check Printful API docs for date filters.
      // Example: fetch orders created in the last 7 days if no specific 'updated_since'
      const sevenDaysAgo = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);
      lastSyncTimestamp = lastOrder.printful_updated_at ? Math.floor(new Date(lastOrder.printful_updated_at).getTime() / 1000) : sevenDaysAgo;
      console.log(`Last sync timestamp (from printful_updated_at): ${new Date(lastSyncTimestamp * 1000).toISOString()}`);
    } else if (lastOrder && lastOrder.printful_created_at) {
        lastSyncTimestamp = Math.floor(new Date(lastOrder.printful_created_at).getTime() / 1000);
        console.log(`Last sync timestamp (from printful_created_at): ${new Date(lastSyncTimestamp * 1000).toISOString()}`);
    } else {
        console.log("No previous sync timestamp found, will attempt to fetch recent/all orders based on Printful API capabilities.");
        // Default to a reasonable lookback, e.g., 30 days, or rely on Printful's default order list (often most recent)
        const thirtyDaysAgo = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
        lastSyncTimestamp = thirtyDaysAgo; // Fallback if no orders yet
    }

    const printfulApiUrl = "https://api.printful.com/orders";
    let offset = 0;
    const limit = 100; // Printful's max limit per page is often 100
    let allFetchedOrders: PrintfulOrder[] = [];
    let hasMore = true;

    console.log(`Starting Printful API fetch. Initial offset: ${offset}, limit: ${limit}. Syncing orders updated/created after: ${new Date(lastSyncTimestamp * 1000).toISOString()}`);

    while (hasMore) {
      // Construct URL with parameters. Printful might use 'status', 'offset', 'limit'.
      // Check Printful API for date filtering. If 'updated_from' or similar exists, use it.
      // For this example, we'll just paginate and then filter locally if needed, or assume Printful returns recent enough orders.
      const fetchUrl = `${printfulApiUrl}?offset=${offset}&limit=${limit}`; // Add date filters here if API supports
      console.log(`Fetching from: ${fetchUrl}`);

      const response = await fetch(fetchUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${printfulApiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Printful API error: ${response.status} ${response.statusText}`, errorBody);
        throw new Error(`Printful API request failed: ${response.status} - ${errorBody}`);
      }

      const data: PrintfulAPIResponse = await response.json();
      console.log(`Fetched ${data.result.length} orders from Printful. Total available according to this page: ${data.paging.total}`);

      if (data.result && data.result.length > 0) {
        // Filter orders based on 'updated' timestamp if API didn't do it.
        // Printful 'updated' is a Unix timestamp (seconds).
        const newOrders = data.result.filter(order => order.updated > lastSyncTimestamp || order.created > lastSyncTimestamp);
        if (newOrders.length < data.result.length) {
            console.log(`Filtered down to ${newOrders.length} orders based on lastSyncTimestamp.`);
        }
        allFetchedOrders.push(...newOrders);

        if (allFetchedOrders.length >= data.paging.total || data.result.length < limit) {
          hasMore = false; // No more pages or fetched all relevant
        } else {
          offset += limit;
        }
      } else {
        hasMore = false; // No results on this page
      }
      // Safety break for very large initial syncs if not filtering well by date
      if (offset > 10000 && Deno.env.get("ENV_TYPE") !== "PRODUCTION") { // Example safety break
          console.warn("Reached offset limit during development sync, stopping early.");
          hasMore = false;
      }
    }
    console.log(`Total orders fetched and filtered from Printful: ${allFetchedOrders.length}`);

    if (allFetchedOrders.length === 0) {
      console.log("No new or updated orders to sync from Printful.");
      return new Response(JSON.stringify({ message: "No new orders to sync." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Data Transformation and 5. Database Upsert Logic
    let ordersSynced = 0;
    let itemsSynced = 0;

    for (const order of allFetchedOrders) {
      // Transform PrintfulOrder to printful_orders schema
      const orderToUpsert = {
        printful_internal_id: order.id,
        printful_external_id: order.external_id || `PF-${order.id}`, // Ensure not null
        recipient_name: order.recipient.name,
        status: order.status,
        total_amount: parseFloat(order.costs.total),
        currency: order.costs.currency,
        shipping_details: { // Assuming 'recipient' contains most shipping details
          name: order.recipient.name,
          email: order.recipient.email,
          // Potentially more fields like address1, city, country_code, zip from order.recipient
          // This needs to match what Printful API provides in `order.recipient` or a dedicated `shipping` object
        },
        printful_created_at: new Date(order.created * 1000).toISOString(),
        printful_updated_at: new Date(order.updated * 1000).toISOString(),
        last_synced_at: new Date().toISOString(),
      };

      // Upsert into printful_orders
      const { error: orderUpsertError } = await supabaseAdmin
        .from("printful_orders")
        .upsert(orderToUpsert, { onConflict: "printful_internal_id" });

      if (orderUpsertError) {
        console.error(`Error upserting order ${order.id}:`, orderUpsertError.message);
        // Continue to next order or handle error more gracefully
        continue;
      }
      ordersSynced++;

      // Transform and upsert printful_order_items
      for (const item of order.items) {
        const itemToUpsert = {
          order_printful_internal_id: order.id,
          printful_line_item_id: item.id,
          printful_external_line_item_id: item.external_id,
          product_name: item.name,
          variant_details: { // Store relevant variant details
            printful_variant_id: item.variant_id,
            printful_product_id: item.product?.product_id,
            product_name: item.product?.name, // Product name from item.product if available
            // Add other details like size, color if available in item or item.product
          },
          quantity: item.quantity,
          item_retail_price: parseFloat(item.retail_price),
          item_cost: parseFloat(item.price), // 'price' in Printful item is often cost to you
          item_currency: order.costs.currency, // Assuming item currency is same as order currency
          sku: item.sku,
          printful_product_id: item.product?.product_id,
          printful_variant_id: item.variant_id,
        };

        const { error: itemUpsertError } = await supabaseAdmin
          .from("printful_order_items")
          .upsert(itemToUpsert, { onConflict: "order_printful_internal_id,printful_line_item_id" });

        if (itemUpsertError) {
          console.error(`Error upserting item ${item.id} for order ${order.id}:`, itemUpsertError.message);
          // Continue to next item or handle error
          continue;
        }
        itemsSynced++;
      }
    }

    const successMessage = `Sync completed. Orders processed/upserted: ${ordersSynced}. Items processed/upserted: ${itemsSynced}.`;
    console.log(successMessage);
    return new Response(JSON.stringify({ message: successMessage }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    let errorMessage = "An unknown error occurred.";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    console.error("Error in sync-printful-orders function:", errorMessage, error); // Log the original error too
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

console.log("sync-printful-orders function initialized and server started.");

/*
Remaining considerations:
- Detailed Printful API documentation review for:
    - Exact structure of `order.recipient` and `order.shipping` for `shipping_details` JSONB.
    - Exact structure of `item.product` and other item fields for `variant_details` JSONB.
    - Confirmed date/timestamp filtering parameters (e.g., `updated_since`, date ranges).
    - Rate limits and best practices for API calls.
- Transactional upserts: If an order and its items must be all-or-nothing, wrap the Supabase calls for an order and its items in a transaction (e.g., by calling a Supabase RPC/database function). Edge functions themselves don't directly manage DB transactions across multiple client calls easily. A stored procedure would be better for atomicity.
- More robust error handling (e.g., retries for transient API errors).
- Comprehensive logging for monitoring.
- Testing with actual Printful API responses.
- Enabling `pgcrypto` and `pg_trgm` extensions (usually enabled on Supabase, but good to confirm for the GIN index). The migration file has comments for this.
*/