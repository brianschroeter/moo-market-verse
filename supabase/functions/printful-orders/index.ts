import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const PRINTFUL_API_URL = "https://api.printful.com/orders";

interface PrintfulOrderItem {
  id: number; // This is the Printful Line Item ID
  external_id?: string; // This is the External Line Item ID
  name: string;
  quantity: number;
  price: string; // This is the retail price from Printful
  // ... other item fields we might not need directly for summary
}

interface PrintfulOrder {
  id: number; // Printful's internal Order ID
  external_id?: string; // External Order ID if provided
  recipient: {
    name: string;
    address1: string;
    address2?: string;
    city: string;
    state_code?: string;
    country_code: string;
    zip?: string;
    // ... other recipient fields
  };
  created: number; // Timestamp
  status: string; // e.g., "pending", "fulfilled", "shipped"
  shipping: string; // Shipping method
  costs: {
    total: string; // Includes currency
    // ... other cost details
  };
  currency: string; // e.g. "USD", "AUD"
  items: PrintfulOrderItem[];
  // ... other order fields
}

interface PrintfulAPIResponse {
  code: number;
  result: PrintfulOrder[];
  paging: {
    total: number;
    offset: number;
    limit: number;
  };
  // ... other potential fields in Printful's response
}

// This interface should align with `TransformedPrintfulOrder` from `printfulService.ts`
// if the Edge Function is to return data directly usable by the service layer without further complex mapping.
// TransformedPrintfulOrder from service: id, status, created, shipping_address (object), items (array)

interface DetailedPrintfulItem {
  printfulItemId: number; // Printful Line Item ID
  externalId?: string; // External Line Item ID
  name: string; // Parsed product name
  quantity: number;
  variant: string; // Parsed variant description
  retailPrice: number; // Renamed from 'cost' to be clear this is retail
  itemCost?: number; // Our internal cost from printful_order_items
  currencyCode: string;
}

interface EdgeTransformedOrder {
  id: number; // Printful's internal ID, kept for potential internal references
  displayOrderId: string; // Customer-facing order ID
  status: string;
  created: number; // Timestamp
  shipping_address: {
    name: string;
    address1: string;
    city: string;
    state_code: string;
    country_code: string;
    zip: string;
  };
  detailedItems: DetailedPrintfulItem[]; // Replaces the old 'items'
  totalAmount: number; // Numeric total amount
  currencyCode: string; // e.g., "USD", "AUD"
}


interface PaginationInfo {
  total_items: number; // Matches client PaginationDetails
  limit: number;
  offset: number;
  has_next_page: boolean; // Corrected casing
  // currentPage and totalPages can be derived client-side or added here if needed
}

interface SuccessResponse {
  data: EdgeTransformedOrder[]; // Data will be array of EdgeTransformedOrder
  pagination: PaginationInfo;
  error: false;
}

interface ErrorResponse {
  error: true;
  message: string;
  statusCode: number;
  details?: unknown;
}

serve(async (req: Request) => {
  // Helper function to parse currency string like "$30.14" or "30.14 AUD" to a number
  const parseAmount = (amountStr: string): number => {
    if (!amountStr) return 0;
    // Remove currency symbols, letters, and spaces, then parse
    const numericStr = amountStr.replace(/[^\d.-]/g, "");
    const amount = parseFloat(numericStr);
    return isNaN(amount) ? 0 : amount;
  };

  // Helper function to parse Printful item name into product name and variant
  const parsePrintfulItemName = (fullName: string): { productName: string; variantDescription: string } => {
    if (!fullName) return { productName: "Unknown Product", variantDescription: "N/A" };
    const parts = fullName.split(" - ");
    if (parts.length > 1) {
      const variantDescription = parts.pop()?.trim() || ""; // Last part is variant
      const productName = parts.join(" - ").trim(); // Rest is product name
      return { productName, variantDescription };
    }
    return { productName: fullName.trim(), variantDescription: "Standard" }; // Fallback if no " - " separator
  };

  // Handle OPTIONS request for CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const printfulApiKey = Deno.env.get("PRINTFUL_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!printfulApiKey || !supabaseUrl || !supabaseAnonKey) {
      console.error("Missing one or more environment variables: PRINTFUL_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY");
      return new Response(
        JSON.stringify({ error: true, message: "Server configuration error: API credentials missing.", statusCode: 500 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
      auth: {
        persistSession: false,
      }
    });

    let clientParams = {
      limit: 10,
      offset: 0,
      customerName: '',
      itemName: '',
      orderNumber: '',
      shippingAddress: '',
      sortBy: 'created', // Default sortBy
      sortOrder: 'desc', // Default sortOrder
    };

    if (req.body) {
        try {
            const body = await req.json();
            clientParams = { ...clientParams, ...body };
        } catch (e: unknown) { // Type the error
            if (e instanceof Error) {
                console.warn("Could not parse request body as JSON:", e.message);
            } else {
                console.warn("Could not parse request body as JSON: An unknown error occurred.");
            }
            // Proceed with default params or handle error as appropriate
        }
    } else {
        // Fallback to URL search params if no body
        const url = new URL(req.url);
        clientParams.limit = parseInt(url.searchParams.get("limit") || "10", 10);
        clientParams.offset = parseInt(url.searchParams.get("offset") || "0", 10);
        clientParams.customerName = url.searchParams.get("customerName") || "";
        clientParams.itemName = url.searchParams.get("itemName") || "";
        clientParams.orderNumber = url.searchParams.get("orderNumber") || "";
        clientParams.shippingAddress = url.searchParams.get("shippingAddress") || "";
        clientParams.sortBy = url.searchParams.get("sortBy") || 'created';
        clientParams.sortOrder = url.searchParams.get("sortOrder") || 'desc';
    }

    // TODO: Investigate if Printful API /orders endpoint supports direct sorting parameters (e.g., sort_by, order).
    // Using Printful API sorting would be more efficient than in-function sorting, especially for large datasets.
    const printfulApiParams = new URLSearchParams({
      limit: String(clientParams.limit),
      offset: String(clientParams.offset),
      // If Printful API supports sorting, map clientParams.sortBy and clientParams.sortOrder here.
      // Example:
      // ...(clientParams.sortBy && { sort_by: clientParams.sortBy }),
      // ...(clientParams.sortOrder && { order: clientParams.sortOrder }),
    });

    const printfulApiResponse = await fetch(`${PRINTFUL_API_URL}?${printfulApiParams.toString()}`, {
      method: "GET", // This is the call to Printful API
      headers: {
        "Authorization": `Bearer ${printfulApiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!printfulApiResponse.ok) {
      const errorData = await printfulApiResponse.json().catch(() => ({}));
      console.error("Printful API Error:", printfulApiResponse.status, errorData);
      return new Response(
        JSON.stringify({ error: true, message: `Printful API error: ${errorData.result || printfulApiResponse.statusText}`, statusCode: printfulApiResponse.status, details: errorData }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: printfulApiResponse.status }
      );
    }

    const printfulData: PrintfulAPIResponse = await printfulApiResponse.json();
    let filteredPrintfulOrders = printfulData.result;

    // Apply filters if any are provided
    if (clientParams.customerName) {
      filteredPrintfulOrders = filteredPrintfulOrders.filter(order =>
        order.recipient.name.toLowerCase().includes(clientParams.customerName.toLowerCase())
      );
    }
    if (clientParams.itemName) {
      filteredPrintfulOrders = filteredPrintfulOrders.filter(order =>
        order.items.some(item => item.name.toLowerCase().includes(clientParams.itemName.toLowerCase()))
      );
    }
    if (clientParams.orderNumber) {
      filteredPrintfulOrders = filteredPrintfulOrders.filter(order =>
        order.id === parseInt(clientParams.orderNumber, 10) // Exact match for order number (ID)
      );
    }
    if (clientParams.shippingAddress) {
      const searchTerm = clientParams.shippingAddress.toLowerCase();
      filteredPrintfulOrders = filteredPrintfulOrders.filter(order => {
        const addressString = [
          order.recipient.address1,
          order.recipient.address2,
          order.recipient.city,
          order.recipient.state_code,
          order.recipient.zip,
          order.recipient.country_code,
        ].filter(Boolean).join(", ").toLowerCase();
        return addressString.includes(searchTerm);
      });
    }

    // Map the filtered Printful orders to the EdgeTransformedOrder structure
    const orderPromises = filteredPrintfulOrders.map(async (order: PrintfulOrder): Promise<EdgeTransformedOrder> => {
      const detailedItemPromises = order.items.map(async (item: PrintfulOrderItem) => {
        const { productName, variantDescription } = parsePrintfulItemName(item.name);

        // Fetch item_cost from printful_order_items
        let itemCostValue: number | undefined = undefined;
        try {
          const { data: dbItem, error: dbError } = await supabase
            .from("printful_order_items")
            .select("item_cost")
            .eq("order_printful_internal_id", order.id) // Match by Printful Order ID
            .eq("printful_line_item_id", item.id) // Match by Printful Line Item ID
            .single();

          if (dbError) {
            console.warn(`Error fetching item_cost for order ${order.id}, item ${item.id}:`, dbError.message);
          } else if (dbItem && dbItem.item_cost !== null) {
            itemCostValue = Number(dbItem.item_cost);
          }
        } catch (e) {
             console.warn(`Exception fetching item_cost for order ${order.id}, item ${item.id}:`, e);
        }

        return {
          printfulItemId: item.id,
          externalId: item.external_id,
          name: productName,
          quantity: item.quantity,
          variant: variantDescription,
          retailPrice: parseAmount(item.price), // Retail price from Printful API
          itemCost: itemCostValue, // Our cost from DB
          currencyCode: order.currency || 'USD', // Use order's currency
        };
      });
      const detailedItems: DetailedPrintfulItem[] = await Promise.all(detailedItemPromises);

      return {
        id: order.id, // Keep internal ID
        displayOrderId: order.external_id || String(order.id), // Use external_id, fallback to internal id
        status: order.status,
        created: order.created,
        shipping_address: {
          name: order.recipient.name,
          address1: order.recipient.address1 || '',
          city: order.recipient.city || '',
          state_code: order.recipient.state_code || '',
          country_code: order.recipient.country_code || '',
          zip: order.recipient.zip || '',
        },
        detailedItems: detailedItems, // Use the new detailed items
        totalAmount: parseAmount(order.costs.total),
        currencyCode: order.currency || 'USD', // Default to USD if currency is not provided
      };
    });
    let transformedAndFilteredOrders: EdgeTransformedOrder[] = await Promise.all(orderPromises);

    // Apply in-function sorting if Printful API sorting is not used or not available for all fields.
    // Note: This sorts only the current page of data fetched from Printful.
    // For true global sorting across all Printful orders, all orders would need to be fetched,
    // which can be resource-intensive and hit API rate limits.
    if (transformedAndFilteredOrders.length > 0) {
      transformedAndFilteredOrders.sort((a, b) => {
        let comparison = 0;
        const valA = clientParams.sortBy === 'totalAmount' ? a.totalAmount :
                     clientParams.sortBy === 'created' ? a.created :
                     clientParams.sortBy === 'status' ? a.status.toLowerCase() :
                     clientParams.sortBy === 'displayOrderId' ? a.displayOrderId.toLowerCase() :
                     null;

        const valB = clientParams.sortBy === 'totalAmount' ? b.totalAmount :
                     clientParams.sortBy === 'created' ? b.created :
                     clientParams.sortBy === 'status' ? b.status.toLowerCase() :
                     clientParams.sortBy === 'displayOrderId' ? b.displayOrderId.toLowerCase() :
                     null;

        if (valA === null || valB === null) {
          comparison = 0;
        } else if (typeof valA === 'number' && typeof valB === 'number') {
          comparison = valA - valB;
        } else if (typeof valA === 'string' && typeof valB === 'string') {
          comparison = valA.localeCompare(valB);
        }

        return clientParams.sortOrder === 'desc' ? comparison * -1 : comparison;
      });
    }


    // Pagination based on filtered results for THIS PAGE.
    // `clientParams.limit` and `clientParams.offset` were used for the Printful API call.
    // The `total` from Printful's paging refers to THEIR total, not our filtered total.
    // For our pagination response, `total_items` should be the count of `transformedAndFilteredOrders`.
    const totalFilteredItemsOnPage = transformedAndFilteredOrders.length;

    // If we want to provide a sense of total pages based on *this filtered page's density*,
    // it's a bit artificial. The client asked for `totalOrders` to reflect filtering.
    // The most honest `total_items` here is `totalFilteredItemsOnPage` if we only process one Printful page.
    // If the goal was to filter *across all Printful orders* and then paginate, this function would need
    // to loop through all Printful pages, collect all items, filter, then apply limit/offset.
    // Given the constraints, we filter the page fetched from Printful.
    // The `pagination.total_items` should reflect the count of items *after* filtering *on this page*.
    // The `offset` and `limit` in the response should be what the client sent.

    const pagination: PaginationInfo = {
      total_items: totalFilteredItemsOnPage, // This reflects the count on the *current, sorted page*
      limit: clientParams.limit,
      offset: clientParams.offset,
      // has_next_page should ideally reflect if there are more items *after filtering and sorting*
      // across the entire dataset. Since we only sort the current page, this might be misleading
      // if the Printful API has more pages but they would all be filtered out.
      // For now, base it on Printful's total, but acknowledge this limitation.
      has_next_page: clientParams.offset + clientParams.limit < printfulData.paging.total,
    };
    
    const successResponse: SuccessResponse = {
      data: transformedAndFilteredOrders, // Now sorted EdgeTransformedOrder[]
      pagination: pagination,
      error: false,
    };

    return new Response(JSON.stringify(successResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Unhandled error in Edge Function:", error);
    const errorResponse: ErrorResponse = {
      error: true,
      message: error instanceof Error ? error.message : "An unexpected error occurred.",
      statusCode: 500,
      details: error,
    };
    return new Response(JSON.stringify(errorResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});