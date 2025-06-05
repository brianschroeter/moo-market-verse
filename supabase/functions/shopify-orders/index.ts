import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { ensureAdmin } from "../_shared/auth.ts";

// --- Shopify API Configuration ---
// Expected Environment Variables:
// - SHOPIFY_SHOP_DOMAIN: Your Shopify store domain (e.g., your-shop-name.myshopify.com)
// - SHOPIFY_ADMIN_API_ACCESS_TOKEN: Your Shopify Admin API Access Token
// - SHOPIFY_API_VERSION: (Optional) Shopify API version, e.g., "2023-10" (defaults to a recent stable if not set)

const DEFAULT_API_VERSION = "2024-04"; // Use a recent stable version

// --- Request & Response Interfaces ---

// Represents the address structure as received from Shopify API
interface RawShopifyAddress {
  first_name: string | null;
  last_name: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  province_code: string | null; // Correctly reflects raw API data
  country_code: string | null;  // Correctly reflects raw API data
  zip: string | null;
  phone: string | null;
  name?: string;
  company: string | null;
}

// Represents the transformed address structure for the function's output
interface TransformedShopifyAddress {
  first_name: string | null;
  last_name: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  province: string | null; // Transformed field
  country: string | null;  // Transformed field
  zip: string | null;
  phone: string | null;
  name?: string;
  company: string | null;
}

interface ShopifyCustomer {
  id: number;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  // other customer fields if needed
}

interface ShopifyLineItem {
  id: number;
  variant_id: number | null;
  product_id: number | null;
  title: string; // Product name
  quantity: number;
  sku: string | null;
  vendor: string | null;
  price: string; // Individual item price
  // total_discount: string;
  // tax_lines: any[];
  // duties: any[];
  // ... other line item fields
  name: string; // Often same as title, or includes variant info
}

interface ShopifyOrder {
  id: number; // Shopify Order ID
  name: string; // Shopify Order Number (e.g., #1001)
  created_at: string; // ISO 8601 date string
  customer: ShopifyCustomer | null;
  total_price: string;
  financial_status: string; // e.g., "paid", "pending", "refunded"
  fulfillment_status: string | null; // e.g., "fulfilled", "unfulfilled", "partial"
  line_items: ShopifyLineItem[];
  shipping_address: RawShopifyAddress | null; // Use RawShopifyAddress for incoming data
  billing_address: RawShopifyAddress | null; // Use RawShopifyAddress for incoming data
  note: string | null;
  tags: string; // Comma-separated string of tags
  // ... other order fields
  order_status_url: string | null; // Link to the order status page for the customer
  currency: string;
}

// For transformed order data to be returned by the function
interface TransformedLineItem {
  product_name: string; // Will now use item.name which often includes variant
  sku: string | null;
  quantity: number;
  individual_price: number;
  total_price: number; // quantity * individual_price
  variant_title: string | null; // Added for clarity if available
}

interface TransformedOrderBase {
  id: number; // Shopify Order ID
  shopify_order_number: string;
  order_date: string;
  customer_name: string;
  customer_email: string | null;
  total_amount: number;
  currency: string;
  payment_status: string;
  fulfillment_status: string | null;
}

interface TransformedOrderListItem extends TransformedOrderBase {
  // Fields specific to list view, if any, beyond base
}

interface TransformedOrderDetail extends TransformedOrderBase {
  line_items: TransformedLineItem[];
  shipping_address: TransformedShopifyAddress | null; // Use TransformedShopifyAddress for outgoing data
  billing_address: TransformedShopifyAddress | null; // Use TransformedShopifyAddress for outgoing data
  note: string | null;
  tags: string[];
}

interface PaginationInfo {
  next_cursor?: string | null;
  prev_cursor?: string | null;
  has_next_page?: boolean;
  has_previous_page?: boolean;
  // For offset/limit based pagination (fallback)
  total_items?: number;
  limit?: number;
  offset?: number;
  current_page?: number;
  total_pages?: number;
}

interface OrderListResponse {
  data: TransformedOrderListItem[];
  pagination: PaginationInfo;
}

interface SingleOrderResponse {
  data: TransformedOrderDetail;
}

interface ErrorResponse {
  error: string;
  details?: unknown;
}

// --- Helper Functions ---
function parseAmount(amountStr: string | null | undefined): number {
  if (!amountStr) return 0;
  return parseFloat(amountStr);
}

function getCustomerName(customer: ShopifyCustomer | null): string {
  if (!customer) return "N/A";
  const firstName = customer.first_name || "";
  const lastName = customer.last_name || "";
  const name = `${firstName} ${lastName}`.trim();
  return name || "N/A";
}

serve(async (req: Request) => {
  // Handle OPTIONS request for CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const shopDomain = Deno.env.get("SHOPIFY_SHOP_DOMAIN");
    const adminApiAccessToken = Deno.env.get("SHOPIFY_ADMIN_API_ACCESS_TOKEN");
    const apiVersion = Deno.env.get("SHOPIFY_API_VERSION") || DEFAULT_API_VERSION;
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!shopDomain || !adminApiAccessToken) {
      console.error("Missing Shopify API credentials in environment variables.");
      return new Response(
        JSON.stringify({ error: "Server configuration error: Shopify API credentials missing." } as ErrorResponse),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Missing Supabase credentials in environment variables.");
      return new Response(
        JSON.stringify({ error: "Server configuration error: Supabase credentials missing." } as ErrorResponse),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
    
    // For development mode, allow bypassing authentication
    const authHeader = req.headers.get('Authorization');
    let supabase: SupabaseClient;

    if (!authHeader) {
      // Development mode - create admin client directly
      console.log('No auth header - using development mode');
      const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (!supabaseServiceRoleKey) {
        return new Response(
          JSON.stringify({ error: "Server configuration error: Service role key missing for development mode." } as ErrorResponse),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
      
      supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    } else {
      // Production mode - ensure admin
      const { adminClient, errorResponse } = await ensureAdmin(req);
      if (errorResponse) {
        return errorResponse;
      }
      if (!adminClient) {
        return new Response(
          JSON.stringify({ error: "Internal server error: Admin client unavailable" } as ErrorResponse),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
      supabase = adminClient;
    }

    const shopifyApiBaseUrl = `https://${shopDomain}/admin/api/${apiVersion}`;

    const url = new URL(req.url);
    const orderIdFromUrl = url.searchParams.get("order_id"); // For fetching a single order via GET

    // --- Request Parameters ---
    let params: any = {};
    let action: string | null = null;

    if (req.body) {
      try {
        const body = await req.json();
        params = body;
        action = body.action || null; // Expect 'action' in the JSON body for POST requests
      } catch (e) {
        console.warn("Could not parse request body as JSON:", e);
        // Continue with empty params or handle error
      }
    } else {
      // Fallback to URL search params if no body (for GET requests primarily)
      url.searchParams.forEach((value, key) => {
        params[key] = value;
      });
    }
    // If action is in query params (e.g. for a GET request that triggers an action)
    if (!action && url.searchParams.has("action")) {
        action = url.searchParams.get("action");
    }


    console.log("Edge Function received params:", JSON.stringify(params, null, 2));
    console.log("Action:", action);

    // --- Action: sync-orders-to-db ---
    if (action === "sync-orders-to-db") {
      console.log("Executing sync-orders-to-db action...");
      try {
        // For initial sync, we'll attempt to fetch all orders by removing created_at_min.
        // For regular, scheduled syncs, a created_at_min or updated_at_min based on
        // the last sync time from the DB would be more appropriate.
        const syncLimit = "250"; // Shopify's max limit per page

        // Initial query parameters for the first page
        let currentSyncQueryParams = new URLSearchParams();
        currentSyncQueryParams.set("status", "any"); // Fetch orders of any status
        // Omitting created_at_min to fetch all historical orders for initial sync
        currentSyncQueryParams.set("limit", syncLimit);
        currentSyncQueryParams.set("order", "created_at asc"); // Process oldest orders first

        let allShopifyOrders: ShopifyOrder[] = [];
        let nextPageInfo: string | null = null;
        let pageCount = 0;
        const maxPages = 50; // Increased safety break for pagination for initial full sync
        let fetchedOrdersOnThisPage: ShopifyOrder[] = [];

        do {
          pageCount++;
          
          const syncShopifyUrl = `${shopifyApiBaseUrl}/orders.json?${currentSyncQueryParams.toString()}`;
          console.log(`Fetching Shopify orders for sync (page ${pageCount}): ${syncShopifyUrl}`);

          const syncShopifyResponse = await fetch(syncShopifyUrl, {
            method: "GET",
            headers: {
              "X-Shopify-Access-Token": adminApiAccessToken,
              "Content-Type": "application/json",
            },
          });

          if (!syncShopifyResponse.ok) {
            const errorBody = await syncShopifyResponse.text();
            console.error("Shopify API request failed during sync:", errorBody);
            throw new Error(`Shopify API error during sync: ${syncShopifyResponse.statusText} - ${errorBody}`);
          }

          const syncResponseData = await syncShopifyResponse.json();
          fetchedOrdersOnThisPage = syncResponseData.orders as ShopifyOrder[]; // Assign to new variable

          if (fetchedOrdersOnThisPage && fetchedOrdersOnThisPage.length > 0) {
            allShopifyOrders.push(...fetchedOrdersOnThisPage);
          }
          
          // Handle pagination
          const linkHeader = syncShopifyResponse.headers.get("Link");
          nextPageInfo = null; // Reset for current page's determination
          if (linkHeader) {
            const links = linkHeader.split(", ");
            const nextLink = links.find(link => link.includes('rel="next"'));
            if (nextLink) {
              const match = nextLink.match(/page_info=([^&>]+)/);
              if (match && match[1]) {
                nextPageInfo = match[1];
              }
            }
          }
          console.log(`Fetched ${fetchedOrdersOnThisPage.length} orders on page ${pageCount}. Next page_info: ${nextPageInfo}`);

          if (nextPageInfo) {
            // For the next iteration, Shopify expects only limit and page_info
            currentSyncQueryParams = new URLSearchParams();
            currentSyncQueryParams.set("limit", syncLimit);
            currentSyncQueryParams.set("page_info", nextPageInfo);
          }

        } while (nextPageInfo && fetchedOrdersOnThisPage.length > 0 && pageCount < maxPages);
        
        console.log(`Total Shopify orders fetched for sync after ${pageCount} page(s): ${allShopifyOrders.length}`);

        if (allShopifyOrders.length === 0) {
          return new Response(
            JSON.stringify({ message: "Sync complete. No orders found matching the criteria (or store is empty)." }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
          );
        }
        
        let syncMessage = `Shopify orders synced to database successfully. Synced ${allShopifyOrders.length} orders.`;
        if (pageCount >= maxPages && nextPageInfo) {
            syncMessage = `Shopify orders synced to database. Synced ${allShopifyOrders.length} orders. Reached max page limit (${maxPages}); more orders might exist. Run sync again to continue.`;
        }


        const ordersToUpsert = allShopifyOrders.map(order => ({
          id: order.id, // Shopify Order ID
          shopify_order_number: order.name,
          order_date: order.created_at,
          customer_name: getCustomerName(order.customer),
          customer_email: order.customer?.email || null,
          total_amount: parseAmount(order.total_price),
          currency: order.currency,
          payment_status: order.financial_status,
          fulfillment_status: order.fulfillment_status || null,
          raw_shopify_data: order, // Store the full Shopify order object
          last_shopify_sync_at: new Date().toISOString(),
        }));

        const { data: upsertedData, error: upsertError } = await supabase
          .from("shopify_orders")
          .upsert(ordersToUpsert, { onConflict: "id", ignoreDuplicates: false }); // Ensure `id` is the PK

        if (upsertError) {
          console.error("Error upserting Shopify orders to Supabase:", upsertError);
          throw new Error(`Supabase upsert error: ${upsertError.message}`);
        }

        console.log("Successfully upserted Shopify orders to database:", upsertedData);
        return new Response(
          JSON.stringify({ message: syncMessage, synced_count: allShopifyOrders.length, details: upsertedData }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );

      } catch (syncError) {
        console.error("Error during sync-orders-to-db action:", syncError);
        return new Response(
          JSON.stringify({ error: "Failed to sync Shopify orders to database.", details: syncError.message } as ErrorResponse),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
    }

    // --- Existing Logic for fetching orders (for admin page, etc.) ---
    // Pagination params (cursor-based preferred)
    const limit = parseInt(params.limit || "10", 10);
    const pageInfo = params.page_info; // Shopify's cursor for next/prev page
    // const direction = params.direction || "next"; // 'next' or 'previous' - Not directly used with page_info

    // Sorting params
    const sortBy = params.sort_by || "created_at"; // 'name', 'created_at', 'total_price'
    const sortOrder = params.sort_order || "desc"; // 'asc', 'desc'

    // Filtering params
    const paymentStatus = params.payment_status;
    const fulfillmentStatus = params.fulfillment_status;
    const dateFrom = params.date_from; // e.g., 2023-01-01T00:00:00Z
    const dateTo = params.date_to; // e.g., 2023-01-31T23:59:59Z

    // Search params
    const searchQuery = params.search_query; // Search by order number, customer name, or email

    let apiEndpoint = "";
    const queryParams = new URLSearchParams();
    
    // Determine if fetching single order or list
    const requestedOrderIdFromBody = params.order_id;
    const effectiveOrderId = requestedOrderIdFromBody || orderIdFromUrl;

    if (effectiveOrderId) {
      // Fetch single order
      apiEndpoint = `/orders/${effectiveOrderId}.json`;
      // No need for limit, page_info, sort, or filter for single order by ID
    } else {
      // Fetch order list
      apiEndpoint = "/orders.json";
      queryParams.set("limit", String(limit));

      if (pageInfo) {
        // If page_info (cursor) is present, only limit and page_info should be sent.
        // Other filter/sort parameters are part of the cursor's context.
        queryParams.set("page_info", pageInfo);
      } else {
        // No page_info, so this is the first request for a potentially filtered/sorted list.
        // Set status, order, and other filters.
        queryParams.set("status", "any"); // Fetch orders of any status unless filtered

        // Apply sorting
        let shopifySortKey = sortBy;
        if (sortBy === 'name') shopifySortKey = 'name'; // Shopify uses 'name' for order number sorting
        else if (sortBy === 'created_at') shopifySortKey = 'processed_at'; // 'processed_at' is often more relevant for creation sorting
        else if (sortBy === 'total_price') shopifySortKey = 'total_price';
        // Shopify's 'order' param format is "field direction", e.g., "processed_at desc"
        queryParams.set("order", `${shopifySortKey} ${sortOrder}`);


        // Apply filtering
        if (paymentStatus) queryParams.set("financial_status", paymentStatus);
        if (fulfillmentStatus) queryParams.set("fulfillment_status", fulfillmentStatus);
        if (dateFrom) queryParams.set("created_at_min", dateFrom);
        if (dateTo) queryParams.set("created_at_max", dateTo);
        
        // Apply search
        if (searchQuery) {
          // Shopify's 'query' parameter is powerful for general search.
          // If it's clearly an order number (e.g., starts with # or is all digits),
          // using the 'name' parameter can be more direct.
          if (/^#?\d+$/.test(searchQuery)) {
             // Remove # if present, as Shopify's 'name' filter expects just the number.
            queryParams.set("name", searchQuery.replace(/^#/, ''));
          } else {
            queryParams.set("query", searchQuery); // General text search
          }
        }
      }
    }

    const fullShopifyUrl = `${shopifyApiBaseUrl}${apiEndpoint}?${queryParams.toString()}`;
    console.log("Requesting Shopify URL (non-sync):", fullShopifyUrl);

    const shopifyResponse = await fetch(fullShopifyUrl, {
      method: "GET",
      headers: {
        "X-Shopify-Access-Token": adminApiAccessToken,
        "Content-Type": "application/json",
      },
    });

    if (!shopifyResponse.ok) {
      const errorBody = await shopifyResponse.text();
      console.error("Shopify API Request Failed (non-sync)!");
      console.error("Requested URL:", fullShopifyUrl);
      console.error("Shopify Response Status:", shopifyResponse.status, shopifyResponse.statusText);
      console.error("Shopify Response Body:", errorBody);
      
      let errorJson: any = { message: "Failed to parse Shopify error response." };
      try {
        errorJson = JSON.parse(errorBody);
      } catch (e) {
        console.error("Could not parse Shopify error body as JSON (non-sync):", e);
        errorJson = { errors: errorBody, message: shopifyResponse.statusText };
      }

      return new Response(
        JSON.stringify({
          error: `Shopify API error: ${errorJson.errors || errorJson.message || shopifyResponse.statusText}`,
          details: errorJson
        } as ErrorResponse),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: shopifyResponse.status }
      );
    }

    const responseData = await shopifyResponse.json();
    const responseHeaders = shopifyResponse.headers;

    // --- Data Transformation & Response (non-sync) ---
    if (effectiveOrderId) {
      // Single order response
      const order = responseData.order as ShopifyOrder;
      if (!order) {
        return new Response(
            JSON.stringify({ error: "Order not found." } as ErrorResponse),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
        );
      }
      const transformedOrder: TransformedOrderDetail = {
        id: order.id,
        shopify_order_number: order.name,
        order_date: order.created_at,
        customer_name: getCustomerName(order.customer),
        customer_email: order.customer?.email || null,
        total_amount: parseAmount(order.total_price),
        currency: order.currency,
        payment_status: order.financial_status,
        fulfillment_status: order.fulfillment_status || null,
        line_items: order.line_items.map(item => {
          const productName = item.name || item.title;
          let variantTitle: string | null = null;
          if (item.variant_id && item.name !== item.title) {
            const parts = item.name.split(' - ');
            if (parts.length > 1 && item.name.startsWith(item.title)) {
              variantTitle = parts.slice(1).join(' - ');
            } else if (item.name !== item.title) {
              variantTitle = item.name.replace(item.title, '').trim().replace(/^[\/\-]\s*/, '');
            }
          }
          return {
            product_name: productName,
            sku: item.sku || null,
            quantity: item.quantity,
            individual_price: parseAmount(item.price),
            total_price: parseAmount(item.price) * item.quantity,
            variant_title: variantTitle || (item.name !== item.title ? item.name.substring(item.title.length).trim().replace(/^[\/\-]\s*/, '') : null),
          };
        }),
        shipping_address: order.shipping_address ? {
          ...order.shipping_address,
          province: order.shipping_address.province_code,
          country: order.shipping_address.country_code,
        } as TransformedShopifyAddress : null,
        billing_address: order.billing_address ? {
          ...order.billing_address,
          province: order.billing_address.province_code,
          country: order.billing_address.country_code,
        } as TransformedShopifyAddress : null,
        note: order.note,
        tags: order.tags ? order.tags.split(",").map(tag => tag.trim()).filter(tag => tag) : [],
      };
      return new Response(JSON.stringify({ data: transformedOrder } as SingleOrderResponse), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      // Order list response
      const orders = responseData.orders as ShopifyOrder[];
      let transformedOrders: TransformedOrderListItem[] = orders.map(order => ({
        id: order.id,
        shopify_order_number: order.name,
        order_date: order.created_at,
        customer_name: getCustomerName(order.customer),
        customer_email: order.customer?.email || null,
        total_amount: parseAmount(order.total_price),
        currency: order.currency,
        payment_status: order.financial_status,
        fulfillment_status: order.fulfillment_status || null,
      }));

      const linkHeader = responseHeaders.get("Link");
      let nextCursor: string | null = null;
      let prevCursor: string | null = null;

      if (linkHeader) {
        const links = linkHeader.split(", ");
        links.forEach(link => {
          const match = link.match(/<([^>]+)>; rel="([^"]+)"/);
          if (match) {
            const url = new URL(match[1]);
            const cursor = url.searchParams.get("page_info");
            if (match[2] === "next") nextCursor = cursor;
            if (match[2] === "previous") prevCursor = cursor;
          }
        });
      }

      const paginationInfo: PaginationInfo = {
        next_cursor: nextCursor,
        prev_cursor: prevCursor,
        has_next_page: !!nextCursor,
        has_previous_page: !!prevCursor,
        limit: limit,
      };

      return new Response(JSON.stringify({ data: transformedOrders, pagination: paginationInfo } as OrderListResponse), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

  } catch (error) {
    console.error("Unhandled error in Edge Function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "An unexpected error occurred.", details: error } as ErrorResponse),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});