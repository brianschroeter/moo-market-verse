import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

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

    if (!shopDomain || !adminApiAccessToken) {
      console.error("Missing Shopify API credentials in environment variables.");
      return new Response(
        JSON.stringify({ error: "Server configuration error: Shopify API credentials missing." } as ErrorResponse),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const shopifyApiBaseUrl = `https://${shopDomain}/admin/api/${apiVersion}`;

    const url = new URL(req.url);
    const orderId = url.searchParams.get("order_id"); // For fetching a single order

    // --- Request Parameters ---
    let params: any = {};
    if (req.body) {
      try {
        params = await req.json();
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

    console.log("Edge Function received params:", JSON.stringify(params, null, 2));
    
    // Pagination params (cursor-based preferred)
    const limit = parseInt(params.limit || "10", 10);
    const pageInfo = params.page_info; // Shopify's cursor for next/prev page
    const direction = params.direction || "next"; // 'next' or 'previous'

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


    // --- Shopify API Call Logic ---
    let apiEndpoint = "";
    const queryParams = new URLSearchParams();
    queryParams.set("limit", String(limit));

    if (params.order_id) { // Check params from request body first
      // Fetch single order
      apiEndpoint = `/orders/${params.order_id}.json`;
    } else if (orderId) { // Fallback to URL param (though body is preferred for POST/PUT)
      // Fetch single order
      apiEndpoint = `/orders/${orderId}.json`;
    } else {
      // Fetch order list
      apiEndpoint = "/orders.json";

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
        if (sortBy === 'name') shopifySortKey = 'name';
        else if (sortBy === 'created_at') shopifySortKey = 'processed_at';
        else if (sortBy === 'total_price') shopifySortKey = 'total_price';
        queryParams.set("order", `${shopifySortKey} ${sortOrder.toUpperCase()}`);

        // Apply filtering
        if (paymentStatus) queryParams.set("financial_status", paymentStatus);
        if (fulfillmentStatus) queryParams.set("fulfillment_status", fulfillmentStatus);
        if (dateFrom) queryParams.set("created_at_min", dateFrom);
        if (dateTo) queryParams.set("created_at_max", dateTo);
        
        // Apply search
        if (searchQuery) {
          if (/^#?\d+$/.test(searchQuery)) {
            queryParams.set("name", searchQuery.startsWith('#') ? searchQuery : searchQuery);
          } else {
            queryParams.set("query", searchQuery);
          }
        }
      }
    }

    const fullShopifyUrl = `${shopifyApiBaseUrl}${apiEndpoint}?${queryParams.toString()}`;
    console.log("Requesting Shopify URL:", fullShopifyUrl);

    const shopifyResponse = await fetch(fullShopifyUrl, {
      method: "GET",
      headers: {
        "X-Shopify-Access-Token": adminApiAccessToken,
        "Content-Type": "application/json",
      },
    });

    if (!shopifyResponse.ok) {
      const errorBody = await shopifyResponse.text();
      // Enhanced logging
      console.error("Shopify API Request Failed!");
      console.error("Requested URL:", fullShopifyUrl);
      console.error("Shopify Response Status:", shopifyResponse.status, shopifyResponse.statusText);
      console.error("Shopify Response Body:", errorBody);
      
      let errorJson: any = { message: "Failed to parse Shopify error response." };
      try {
        errorJson = JSON.parse(errorBody);
      } catch (e) {
        console.error("Could not parse Shopify error body as JSON:", e);
        // Keep errorBody as the primary detail if JSON parsing fails
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

    // --- Data Transformation & Response ---
    const requestedOrderId = params.order_id || orderId;

    if (requestedOrderId) {
      // Single order response
      const order = responseData.order as ShopifyOrder;
      if (!order) {
        return new Response(
            JSON.stringify({ error: "Order not found." } as ErrorResponse),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
        );
      }
      const transformedOrder: TransformedOrderDetail = {
        id: order.id, // Added Shopify Order ID
        shopify_order_number: order.name,
        order_date: order.created_at,
        customer_name: getCustomerName(order.customer),
        customer_email: order.customer?.email || null,
        total_amount: parseAmount(order.total_price),
        currency: order.currency,
        payment_status: order.financial_status,
        fulfillment_status: order.fulfillment_status || null,
        line_items: order.line_items.map(item => {
          // item.name usually is "Product Title - Variant Title"
          // item.title is "Product Title"
          // item.variant_title might be null or the actual variant title.
          // For simplicity, if item.name is different from item.title, assume item.name contains variant info.
          const productName = item.name || item.title; // Use item.name as it often includes variant
          let variantTitle: string | null = null;
          if (item.variant_id && item.name !== item.title) {
            // A simple heuristic: if name and title differ, the "extra" part in name might be the variant.
            // Shopify's `variant_title` on the line item is the most reliable if present.
            // The `ShopifyLineItem` interface doesn't explicitly list `variant_title` from the API response,
            // but it might be there. If not, `item.name` is the best bet.
            // For now, we'll assume item.name is descriptive enough.
            // If `item.variant_title` was a direct field on the raw line item, we'd use it.
            // Let's try to extract it if item.name is "Product Title - Variant"
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
          ...order.shipping_address, // Spread RawShopifyAddress
          province: order.shipping_address.province_code, // Map from province_code
          country: order.shipping_address.country_code,   // Map from country_code
        } as TransformedShopifyAddress : null, // Cast to TransformedShopifyAddress
        billing_address: order.billing_address ? {
          ...order.billing_address, // Spread RawShopifyAddress
          province: order.billing_address.province_code, // Map from province_code
          country: order.billing_address.country_code,   // Map from country_code
        } as TransformedShopifyAddress : null, // Cast to TransformedShopifyAddress
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
        id: order.id, // Added Shopify Order ID
        shopify_order_number: order.name,
        order_date: order.created_at,
        customer_name: getCustomerName(order.customer),
        customer_email: order.customer?.email || null,
        total_amount: parseAmount(order.total_price),
        currency: order.currency,
        payment_status: order.financial_status,
        fulfillment_status: order.fulfillment_status || null,
      }));

      // Post-fetch search filtering is removed as Shopify's `query` or `name` parameter should handle it.
      
      // Pagination details from headers (Link header for cursor-based)
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
        // total_items and total_pages would require a separate count query or be part of Shopify's response if using offset.
        // For cursor, these are less common.
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