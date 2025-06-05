export type OrderClassification = 'normal' | 'corrective' | 'gift';

export interface OrderMapping {
  id: string;
  printful_order_id: number;
  shopify_order_id: number | null;
  classification: OrderClassification;
  mapped_by: string | null;
  mapped_at: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderMappingWithDetails extends OrderMapping {
  printful_order?: {
    printful_external_id: string;
    recipient_name: string;
    total_amount: number;
    currency: string;
    status: string;
    printful_created_at: string;
  };
  shopify_order?: {
    shopify_order_number: string;
    customer_name: string;
    total_amount: number;
    currency: string;
    payment_status: string;
    order_date: string;
  };
  mapped_by_profile?: {
    username: string | null;
    discord_username: string | null;
  };
}

export interface UnmappedPrintfulOrder {
  printful_internal_id: number;
  printful_external_id: string;
  recipient_name: string;
  total_amount: number;
  currency: string;
  status: string;
  printful_created_at: string;
  suggested_shopify_matches?: SuggestedShopifyMatch[];
}

export interface SuggestedShopifyMatch {
  shopify_order_id: number;
  shopify_order_number: string;
  customer_name: string;
  total_amount: number;
  currency: string;
  order_date: string;
  match_score: number;
  match_reasons: string[];
}

export interface OrderMappingStats {
  total_printful_orders: number;
  mapped_orders: number;
  unmapped_orders: number;
  normal_orders: number;
  corrective_orders: number;
  gift_orders: number;
  mapping_percentage: number;
}

export interface CreateOrderMappingRequest {
  printful_order_id: number;
  shopify_order_id?: number | null;
  classification: OrderClassification;
  notes?: string;
}

export interface UpdateOrderMappingRequest {
  id: string;
  shopify_order_id?: number | null;
  classification?: OrderClassification;
  notes?: string;
}

export interface OrderMappingFilters {
  classification?: OrderClassification | 'all';
  mapped_status?: 'mapped' | 'unmapped' | 'all';
  search_query?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

export interface OrderMappingResponse {
  mappings: OrderMappingWithDetails[];
  total_count: number;
  stats: OrderMappingStats;
}

export interface AutoMappingResult {
  successful_mappings: number;
  failed_mappings: number;
  details: {
    printful_order_id: number;
    shopify_order_id?: number;
    success: boolean;
    reason: string;
  }[];
}