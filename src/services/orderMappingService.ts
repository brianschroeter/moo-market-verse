import { supabase } from '@/integrations/supabase/client';
import type {
  OrderMapping,
  OrderMappingWithDetails,
  UnmappedPrintfulOrder,
  SuggestedShopifyMatch,
  OrderMappingStats,
  CreateOrderMappingRequest,
  UpdateOrderMappingRequest,
  OrderMappingFilters,
  OrderMappingResponse,
  AutoMappingResult,
  OrderClassification
} from './types/orderMapping-types';

export class OrderMappingService {
  /**
   * Get order mapping statistics
   */
  static async getOrderMappingStats(): Promise<OrderMappingStats> {
    try {
      const { data, error } = await supabase.rpc('get_order_mapping_stats');
      
      if (error) {
        console.error('Error fetching order mapping stats:', error);
        throw error;
      }
      
      return data[0] as OrderMappingStats;
    } catch (error) {
      console.error('Failed to fetch order mapping stats:', error);
      throw error;
    }
  }

  /**
   * Get order mappings with filters and pagination
   */
  static async getOrderMappings(filters: OrderMappingFilters = {}): Promise<OrderMappingResponse> {
    try {
      const {
        classification = 'all',
        mapped_status = 'all',
        search_query,
        date_from,
        date_to,
        limit = 50,
        offset = 0
      } = filters;

      let query = supabase
        .from('order_mappings')
        .select(`
          *,
          printful_order:printful_orders!order_mappings_printful_order_id_fkey (
            printful_external_id,
            recipient_name,
            total_amount,
            currency,
            status,
            printful_created_at
          ),
          shopify_order:shopify_orders!fk_order_mappings_shopify_order (
            shopify_order_number,
            customer_name,
            total_amount,
            currency,
            payment_status,
            order_date
          ),
          mapped_by_profile:profiles!order_mappings_mapped_by_fkey (
            username,
            discord_username
          )
        `, { count: 'exact' });

      // Apply classification filter
      if (classification !== 'all') {
        query = query.eq('classification', classification);
      }

      // Apply date range filter
      if (date_from) {
        query = query.gte('created_at', date_from);
      }
      if (date_to) {
        const endDate = new Date(date_to);
        endDate.setDate(endDate.getDate() + 1);
        query = query.lt('created_at', endDate.toISOString());
      }

      // Apply search filter (search in printful external ID, shopify order number, customer names)
      if (search_query) {
        // This is a simplified search - in production you might want to use full-text search
        query = query.or(`
          printful_order.printful_external_id.ilike.%${search_query}%,
          printful_order.recipient_name.ilike.%${search_query}%,
          shopify_order.shopify_order_number.ilike.%${search_query}%,
          shopify_order.customer_name.ilike.%${search_query}%
        `);
      }

      // Apply pagination
      query = query.range(offset, offset + limit - 1);

      // Order by creation date
      query = query.order('created_at', { ascending: false });

      const { data: mappings, error, count } = await query;

      if (error) {
        console.error('Error fetching order mappings:', error);
        throw error;
      }

      // Get stats
      const stats = await this.getOrderMappingStats();

      return {
        mappings: (mappings as OrderMappingWithDetails[]) || [],
        total_count: count || 0,
        stats
      };
    } catch (error) {
      console.error('Failed to fetch order mappings:', error);
      throw error;
    }
  }

  /**
   * Get unmapped Printful orders with suggested Shopify matches
   */
  static async getUnmappedPrintfulOrders(limit: number = 50, offset: number = 0): Promise<{
    orders: UnmappedPrintfulOrder[];
    total_count: number;
  }> {
    try {
      // First, get all mapped printful order IDs
      const { data: mappedOrderIds } = await supabase
        .from('order_mappings')
        .select('printful_order_id');

      const mappedIds = mappedOrderIds?.map(m => m.printful_order_id) || [];

      // Get unmapped printful orders
      let query = supabase
        .from('printful_orders')
        .select('*', { count: 'exact' })
        .order('printful_created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // If there are mapped IDs, exclude them
      if (mappedIds.length > 0) {
        query = query.not('printful_internal_id', 'in', `(${mappedIds.join(',')})`);
      }

      const { data: unmappedOrders, error: unmappedError, count } = await query;

      if (unmappedError) {
        console.error('Error fetching unmapped orders:', unmappedError);
        throw unmappedError;
      }

      // For each unmapped order, find potential Shopify matches
      const ordersWithSuggestions = await Promise.all(
        (unmappedOrders || []).map(async (order) => {
          const suggestions = await this.findSuggestedShopifyMatches(order);
          return {
            printful_internal_id: order.printful_internal_id,
            printful_external_id: order.printful_external_id,
            recipient_name: order.recipient_name,
            total_amount: order.total_amount,
            currency: order.currency,
            status: order.status,
            printful_created_at: order.printful_created_at,
            suggested_shopify_matches: suggestions
          } as UnmappedPrintfulOrder;
        })
      );

      return {
        orders: ordersWithSuggestions,
        total_count: count || 0
      };
    } catch (error) {
      console.error('Failed to fetch unmapped printful orders:', error);
      throw error;
    }
  }

  /**
   * Find suggested Shopify matches for a Printful order
   */
  private static async findSuggestedShopifyMatches(printfulOrder: any): Promise<SuggestedShopifyMatch[]> {
    try {
      // Get Shopify orders within a reasonable time range and amount range
      const orderDate = new Date(printfulOrder.printful_created_at);
      const dateFrom = new Date(orderDate);
      dateFrom.setDate(dateFrom.getDate() - 7); // 7 days before
      const dateTo = new Date(orderDate);
      dateTo.setDate(dateTo.getDate() + 7); // 7 days after

      const { data: shopifyOrders, error } = await supabase
        .from('shopify_orders')
        .select('*')
        .gte('order_date', dateFrom.toISOString())
        .lte('order_date', dateTo.toISOString())
        .limit(100);

      if (error || !shopifyOrders) {
        console.error('Error fetching Shopify orders for matching:', error);
        return [];
      }

      // Score potential matches
      const suggestions: SuggestedShopifyMatch[] = shopifyOrders
        .map((shopifyOrder: any) => {
          const score = this.calculateMatchScore(printfulOrder, shopifyOrder);
          const reasons = this.getMatchReasons(printfulOrder, shopifyOrder);
          
          return {
            shopify_order_id: shopifyOrder.id,
            shopify_order_number: shopifyOrder.shopify_order_number,
            customer_name: shopifyOrder.customer_name,
            total_amount: shopifyOrder.total_amount,
            currency: shopifyOrder.currency,
            order_date: shopifyOrder.order_date,
            match_score: score,
            match_reasons: reasons
          };
        })
        .filter((match: SuggestedShopifyMatch) => match.match_score > 0.3) // Only show matches with decent scores
        .sort((a: SuggestedShopifyMatch, b: SuggestedShopifyMatch) => b.match_score - a.match_score)
        .slice(0, 5); // Top 5 suggestions

      return suggestions;
    } catch (error) {
      console.error('Failed to find suggested matches:', error);
      return [];
    }
  }

  /**
   * Calculate match score between Printful and Shopify orders
   */
  private static calculateMatchScore(printfulOrder: any, shopifyOrder: any): number {
    let score = 0;
    const factors: { weight: number; matches: boolean }[] = [];

    // Amount matching (most important)
    const amountDiff = Math.abs(printfulOrder.total_amount - shopifyOrder.total_amount);
    const amountMatch = amountDiff < 0.01; // Exact match
    const amountClose = amountDiff < 5.00; // Within $5
    factors.push({ weight: 0.4, matches: amountMatch });
    factors.push({ weight: 0.2, matches: amountClose && !amountMatch });

    // Currency matching
    factors.push({ weight: 0.15, matches: printfulOrder.currency === shopifyOrder.currency });

    // Date proximity (orders within 3 days)
    const printfulDate = new Date(printfulOrder.printful_created_at);
    const shopifyDate = new Date(shopifyOrder.order_date);
    const daysDiff = Math.abs((printfulDate.getTime() - shopifyDate.getTime()) / (1000 * 60 * 60 * 24));
    factors.push({ weight: 0.15, matches: daysDiff <= 3 });

    // Customer name similarity (basic)
    const printfulName = printfulOrder.recipient_name?.toLowerCase() || '';
    const shopifyName = shopifyOrder.customer_name?.toLowerCase() || '';
    const nameMatch = this.calculateStringSimilarity(printfulName, shopifyName) > 0.7;
    factors.push({ weight: 0.1, matches: nameMatch });

    // Calculate weighted score
    score = factors.reduce((total, factor) => {
      return total + (factor.matches ? factor.weight : 0);
    }, 0);

    return Math.min(score, 1.0); // Cap at 1.0
  }

  /**
   * Get human-readable match reasons
   */
  private static getMatchReasons(printfulOrder: any, shopifyOrder: any): string[] {
    const reasons: string[] = [];

    const amountDiff = Math.abs(printfulOrder.total_amount - shopifyOrder.total_amount);
    if (amountDiff < 0.01) {
      reasons.push('Exact amount match');
    } else if (amountDiff < 5.00) {
      reasons.push('Similar amount');
    }

    if (printfulOrder.currency === shopifyOrder.currency) {
      reasons.push('Same currency');
    }

    const printfulDate = new Date(printfulOrder.printful_created_at);
    const shopifyDate = new Date(shopifyOrder.order_date);
    const daysDiff = Math.abs((printfulDate.getTime() - shopifyDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff <= 1) {
      reasons.push('Same day order');
    } else if (daysDiff <= 3) {
      reasons.push('Close order date');
    }

    const printfulName = printfulOrder.recipient_name?.toLowerCase() || '';
    const shopifyName = shopifyOrder.customer_name?.toLowerCase() || '';
    if (this.calculateStringSimilarity(printfulName, shopifyName) > 0.7) {
      reasons.push('Similar customer name');
    }

    return reasons;
  }

  /**
   * Simple string similarity calculation
   */
  private static calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[str2.length][str1.length];
  }

  /**
   * Create a new order mapping
   */
  static async createOrderMapping(request: CreateOrderMappingRequest): Promise<OrderMapping> {
    try {
      const { data, error } = await supabase
        .from('order_mappings')
        .insert({
          printful_order_id: request.printful_order_id,
          shopify_order_id: request.shopify_order_id,
          classification: request.classification,
          notes: request.notes,
          mapped_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating order mapping:', error);
        throw error;
      }

      return data as OrderMapping;
    } catch (error) {
      console.error('Failed to create order mapping:', error);
      throw error;
    }
  }

  /**
   * Update an existing order mapping
   */
  static async updateOrderMapping(request: UpdateOrderMappingRequest): Promise<OrderMapping> {
    try {
      const { data, error } = await supabase
        .from('order_mappings')
        .update({
          shopify_order_id: request.shopify_order_id,
          classification: request.classification,
          notes: request.notes,
          mapped_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', request.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating order mapping:', error);
        throw error;
      }

      return data as OrderMapping;
    } catch (error) {
      console.error('Failed to update order mapping:', error);
      throw error;
    }
  }

  /**
   * Delete an order mapping
   */
  static async deleteOrderMapping(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('order_mappings')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting order mapping:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to delete order mapping:', error);
      throw error;
    }
  }

  /**
   * Auto-map orders based on matching criteria
   */
  static async autoMapOrders(): Promise<AutoMappingResult> {
    try {
      // This would be implemented as a more sophisticated Edge Function
      // For now, we'll return a placeholder
      const result: AutoMappingResult = {
        successful_mappings: 0,
        failed_mappings: 0,
        details: []
      };

      // Get unmapped orders and try to auto-map high-confidence matches
      const { orders } = await this.getUnmappedPrintfulOrders(100, 0);
      
      for (const order of orders) {
        const bestMatch = order.suggested_shopify_matches?.[0];
        if (bestMatch && bestMatch.match_score > 0.8) {
          try {
            await this.createOrderMapping({
              printful_order_id: order.printful_internal_id,
              shopify_order_id: bestMatch.shopify_order_id,
              classification: 'normal',
              notes: `Auto-mapped with ${(bestMatch.match_score * 100).toFixed(1)}% confidence`
            });
            
            result.successful_mappings++;
            result.details.push({
              printful_order_id: order.printful_internal_id,
              shopify_order_id: bestMatch.shopify_order_id,
              success: true,
              reason: `Auto-mapped with ${(bestMatch.match_score * 100).toFixed(1)}% confidence`
            });
          } catch (error) {
            result.failed_mappings++;
            result.details.push({
              printful_order_id: order.printful_internal_id,
              success: false,
              reason: 'Failed to create mapping'
            });
          }
        }
      }

      return result;
    } catch (error) {
      console.error('Failed to auto-map orders:', error);
      throw error;
    }
  }
}