import { supabase } from '@/integrations/supabase/client'; // Path to supabase client
import type { PostgrestError } from '@supabase/supabase-js';

// --- Existing Types (can be reviewed/updated if needed) ---
export interface DetailedPrintfulItem {
  printfulItemId: number;
  externalId?: string;
  name: string;
  quantity: number;
  variant: string; // Variant description (e.g., "Size: L, Color: Black")
  retailPrice: number; // Explicitly named retail price
  itemCost?: number; // Our internal cost, optional
  currencyCode: string;
}

export interface ShippingAddress {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state_code: string;
  state_name?: string;
  country_code: string;
  country_name?: string;
  zip: string;
  phone?: string;
  email?: string;
}
export interface TransformedPrintfulOrder {
  id: number; // Printful's internal order ID (maps to printful_internal_id)
  displayOrderId: string; // Customer-facing order ID (maps to printful_external_id)
  status: string;
  created: number; // Timestamp (from printful_created_at)
  shipping_address: ShippingAddress; // Mapped from shipping_details
  detailedItems: DetailedPrintfulItem[]; // Mapped from printful_order_items
  totalAmount: number; // From total_amount
  currencyCode: string; // From currency
  // Potentially add other fields from DbPrintfulOrder if needed by UI
  printful_updated_at?: string | null;
  last_synced_at?: string;
}

export interface PaginationDetails {
  total_items: number;
  limit: number;
  offset: number;
  has_next_page: boolean;
}

export interface PrintfulOrdersSuccessResponse {
  data: TransformedPrintfulOrder[];
  pagination: PaginationDetails;
  error: false;
}

export interface PrintfulOrdersErrorResponse {
  error: true;
  message: string;
  statusCode?: number;
}

export interface PrintfulError {
  error: true;
  message: string;
  statusCode?: number;
  details?: any;
}

export type PrintfulOrdersResponse = PrintfulOrdersSuccessResponse | PrintfulOrdersErrorResponse;

interface FetchPrintfulOrdersParams {
  limit?: number;
  offset?: number;
  customerName?: string;
  itemName?: string; // This was for the old function, will be itemsOrdered for the new one
  orderNumber?: string;
  shippingAddress?: string;
}


// --- New Types for Synced Printful Data from DB ---

// Directly maps to printful_order_items table
export interface DbPrintfulOrderItem {
  id: string; // uuid
  order_printful_internal_id: number;
  printful_line_item_id: number;
  printful_external_line_item_id: string | null;
  product_name: string;
  variant_details: Record<string, any> | null; // JSONB
  quantity: number;
  item_retail_price: number;
  item_cost: number | null;
  item_currency: string;
  sku: string | null;
  printful_product_id: number | null;
  printful_variant_id: number;
}

// Directly maps to printful_orders table
export interface DbPrintfulOrder {
  printful_internal_id: number;
  printful_external_id: string;
  recipient_name: string;
  status: string;
  total_amount: number;
  currency: string;
  shipping_details: ShippingAddress; // JSONB, assuming it matches this structure
  printful_created_at: string; // ISO timestamp string
  printful_updated_at: string | null; // ISO timestamp string
  last_synced_at: string; // ISO timestamp string
  printful_order_items: DbPrintfulOrderItem[]; // Joined data
}

export interface FetchSyncedPrintfulOrdersParams {
  limit?: number;
  offset?: number;
  customerName?: string; // Filters recipient_name
  itemsOrdered?: string; // Filters product_name in printful_order_items
  orderNumber?: string; // Filters printful_external_id or printful_internal_id
  shippingAddressEmail?: string; // Filters shipping_details->>'email'
  shippingAddressName?: string; // Filters shipping_details->>'name'
  sortBy?: keyof Pick<DbPrintfulOrder, 'printful_created_at' | 'recipient_name' | 'status' | 'total_amount' | 'printful_internal_id'>; // Allowed sortable columns
  sortAscending?: boolean;
}

export interface SyncedPrintfulOrdersData {
  orders: TransformedPrintfulOrder[];
  totalCount: number;
}

export interface SyncedPrintfulOrdersResponse {
  data: SyncedPrintfulOrdersData | null;
  error: PostgrestError | { message: string } | null;
}

// --- Helper function to transform DB data to UI-friendly structure ---
const transformDbOrderToTransformedOrder = (dbOrder: DbPrintfulOrder): TransformedPrintfulOrder => {
  return {
    id: dbOrder.printful_internal_id,
    displayOrderId: dbOrder.printful_external_id,
    status: dbOrder.status,
    created: new Date(dbOrder.printful_created_at).getTime(),
    shipping_address: dbOrder.shipping_details, // Assuming direct match for now
    detailedItems: dbOrder.printful_order_items.map(item => ({
      printfulItemId: item.printful_line_item_id,
      externalId: item.printful_external_line_item_id ?? undefined,
      name: item.product_name,
      quantity: item.quantity,
      // Basic variant transformation, can be enhanced
      variant: item.variant_details
        ? Object.entries(item.variant_details)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ')
        : 'N/A',
      retailPrice: item.item_retail_price,
      itemCost: item.item_cost ?? undefined, // Map item_cost, provide undefined if null
      currencyCode: item.item_currency,
    })),
    totalAmount: dbOrder.total_amount,
    currencyCode: dbOrder.currency,
    printful_updated_at: dbOrder.printful_updated_at,
    last_synced_at: dbOrder.last_synced_at,
  };
};


/**
 * Fetches Printful orders from the Supabase Edge Function. (OLD FUNCTION)
 * @param params - Parameters for pagination (limit, offset).
 * @returns A promise that resolves to the API response.
 */
export const fetchPrintfulOrders = async (
  params: FetchPrintfulOrdersParams = {}
): Promise<PrintfulOrdersResponse> => {
  // Construct the body object with all provided parameters
  const bodyParams: { [key: string]: any } = {};
  if (params.limit !== undefined) bodyParams.limit = params.limit;
  if (params.offset !== undefined) bodyParams.offset = params.offset;
  if (params.customerName) bodyParams.customerName = params.customerName;
  if (params.itemName) bodyParams.itemName = params.itemName; // Old param
  if (params.orderNumber) bodyParams.orderNumber = params.orderNumber;
  if (params.shippingAddress) bodyParams.shippingAddress = params.shippingAddress; // Old param

  const { data, error } = await supabase.functions.invoke('printful-orders', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    body: bodyParams,
  });

  if (error) {
    console.error('Error invoking printful-orders function:', error);
    return {
      error: true,
      message: error.message || 'Failed to fetch Printful orders.',
    };
  }
  return data as PrintfulOrdersResponse;
};

// --- New Function to Fetch Synced Printful Orders from DB ---
export const fetchSyncedPrintfulOrdersFromDB = async (
  params: FetchSyncedPrintfulOrdersParams = {}
): Promise<SyncedPrintfulOrdersResponse> => {
  const {
    limit = 10,
    offset = 0,
    customerName,
    itemsOrdered,
    orderNumber,
    shippingAddressEmail,
    shippingAddressName,
    sortBy = 'printful_created_at',
    sortAscending = false,
  } = params;

  let query = supabase
    .from('printful_orders')
    .select('*, printful_order_items(*)', { count: 'exact' });

  // Filtering
  if (customerName) {
    query = query.ilike('recipient_name', `%${customerName}%`);
  }
  if (orderNumber) {
    // Assuming orderNumber can be either internal or external ID.
    // If only external, then just filter on printful_external_id
    query = query.or(`printful_external_id.eq.${orderNumber},printful_internal_id.eq.${orderNumber}`);
  }
  if (shippingAddressEmail) {
    query = query.ilike('shipping_details->>email', `%${shippingAddressEmail}%`);
  }
  if (shippingAddressName) {
    // This assumes 'name' is a top-level key in shipping_details JSON
    query = query.ilike('shipping_details->>name', `%${shippingAddressName}%`);
  }

  // Filtering by itemsOrdered (product_name in printful_order_items)
  // This requires a subquery or a join condition that's a bit more complex.
  // For simplicity, if itemsOrdered is present, we first fetch matching order_ids.
  if (itemsOrdered) {
    const { data: itemOrderIds, error: itemOrderIdsError } = await supabase
      .from('printful_order_items')
      .select('order_printful_internal_id')
      .ilike('product_name', `%${itemsOrdered}%`)
      .limit(1000); // Limit to avoid overly large IN clauses

    if (itemOrderIdsError) {
      console.error('Error fetching order IDs for item filter:', itemOrderIdsError);
      return { data: null, error: itemOrderIdsError };
    }
    // Assuming itemOrderIds will be of type { order_printful_internal_id: number }[] once types are updated
    const typedItemOrderIds = itemOrderIds as unknown as { order_printful_internal_id: number }[];

    if (typedItemOrderIds && typedItemOrderIds.length > 0) {
      const distinctOrderIds = [...new Set(typedItemOrderIds.map(item => item.order_printful_internal_id))];
      if (distinctOrderIds.length === 0) { // No orders match the item filter
        return { data: { orders: [], totalCount: 0 }, error: null };
      }
      query = query.in('printful_internal_id', distinctOrderIds);
    } else {
      // No items found matching the criteria, so no orders will be returned
      return { data: { orders: [], totalCount: 0 }, error: null };
    }
  }

  // Pagination
  query = query.range(offset, offset + limit - 1);

  // Sorting
  if (sortBy) {
    query = query.order(sortBy, { ascending: sortAscending });
  }
  // Always add a secondary sort for stable pagination if not already primary
  if (sortBy !== 'printful_internal_id') {
     query = query.order('printful_internal_id', { ascending: false }); // Or true, for consistency
  }


  const { data: rawOrders, error, count } = await query.returns<DbPrintfulOrder[]>();

  if (error) {
    console.error('Error fetching synced Printful orders:', error);
    return { data: null, error };
  }

  if (!rawOrders) {
    return { data: { orders: [], totalCount: 0 }, error: null };
  }

  const transformedOrders = rawOrders.map(transformDbOrderToTransformedOrder);

  return {
    data: {
      orders: transformedOrders,
      totalCount: count ?? 0,
    },
    error: null,
  };
};