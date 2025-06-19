import React, { useEffect, useState, useCallback, useMemo } from 'react';
import AdminLayout from '../../components/AdminLayout.tsx';
import { supabase } from '@/integrations/supabase/client';
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { DatePickerWithRange } from "@/components/ui/date-range-picker"; // Assuming this exists or will be created based on calendar.tsx
import { DateRange } from "react-day-picker";
import { ArrowUpDown, Loader2, RefreshCw, Search, Eye, Filter, X, Calendar, Package, User, DollarSign, ShoppingCart, CreditCard, Truck, Download } from 'lucide-react';
import { toast } from "sonner";
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter, // Added DialogFooter
} from "@/components/ui/dialog"; // Added Dialog components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { ShopifyPrintfulLinker } from '@/components/admin/linking/ShopifyPrintfulLinker'; // Added for order linking
import { syncShopifyOrders, SyncShopifyOrdersResponse } from '@/services/printfulService'; // Import sync functionality
import { syncShopifyProducts } from '@/services/shopify/productSync'; // Import product sync functionality

// --- Interfaces based on shopify-orders Edge Function ---
interface TransformedShopifyOrder {
  id: number; // Actual Shopify Order ID
  shopify_order_number: string;
  order_date: string; // ISO 8601 date string
  customer_name: string;
  customer_email: string | null;
  total_amount: number;
  currency: string;
  payment_status: string;
  fulfillment_status: string | null;
}

// For Detailed Order View
interface ShopifyLineItem {
  product_name: string;
  sku: string | null;
  quantity: number;
  individual_price: number;
  total_price: number;
  variant_title?: string | null; // Optional: good to have
}

interface ShopifyAddress {
  first_name: string | null;
  last_name: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
  zip: string | null;
  phone: string | null;
  name?: string;
  company?: string | null;
}

interface DetailedShopifyOrder extends TransformedShopifyOrder {
  line_items: ShopifyLineItem[];
  shipping_address: ShopifyAddress | null;
  billing_address: ShopifyAddress | null;
  note: string | null;
  tags: string[] | string; // Shopify API returns tags as a comma-separated string or an array depending on context
  // Potentially other fields like financial_status_label, fulfillment_status_label if the function provides them
}


interface ShopifyPaginationInfo {
  next_cursor?: string | null;
  prev_cursor?: string | null;
  has_next_page?: boolean;
  has_previous_page?: boolean;
  limit?: number;
}

interface ShopifyOrdersApiResponse {
  data: TransformedShopifyOrder[];
  pagination: ShopifyPaginationInfo;
  error?: string; // For top-level API errors
}

type ShopifySortableColumns = 'name' | 'created_at' | 'total_price'; // Corresponds to Edge Function sort_by

// Helper function to format currency
const formatCurrency = (amount: number, currencyCode: string) => {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currencyCode }).format(amount);
  } catch (e) {
    return `${amount.toFixed(2)} ${currencyCode}`;
  }
};

const ShopifyOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<TransformedShopifyOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isSyncingProducts, setIsSyncingProducts] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Detail Modal State
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<DetailedShopifyOrder | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Pagination state
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [currentPageInfo, setCurrentPageInfo] = useState<string | null | undefined>(undefined); // For current page cursor (used for 'next' or 'prev' call)
  const [paginationDetails, setPaginationDetails] = useState<ShopifyPaginationInfo | null>(null);


  // Sorting state
  const [sortColumn, setSortColumn] = useState<ShopifySortableColumns>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Filtering state
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all_payment_statuses');
  const [fulfillmentStatusFilter, setFulfillmentStatusFilter] = useState<string>('all_fulfillment_statuses');
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRange | undefined>(undefined);
  const [showFilters, setShowFilters] = useState<boolean>(true);
  const [minAmountFilter, setMinAmountFilter] = useState<string>('');
  const [maxAmountFilter, setMaxAmountFilter] = useState<string>('');
  const [currencyFilter, setCurrencyFilter] = useState<string>('all');

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');

  // Debounce timer for search
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timerId);
  }, [searchQuery]);


  const loadOrders = useCallback(async (
    pageInfoCursor?: string | null, // Cursor for pagination
    isRefreshAction: boolean = false
  ) => {
    if (isRefreshAction) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    // Check if we're in development mode
    const isDev = import.meta.env.DEV && import.meta.env.VITE_DEVMODE === 'true';
    const headers = isDev ? { 'Authorization': 'Bearer dev-access-token' } : undefined;

    try {
      if (isDev) {
        // In development mode, query the database directly via Supabase
        let query = supabase
          .from('shopify_orders')
          .select('*');

        // Apply filters
        if (paymentStatusFilter && paymentStatusFilter !== 'all_payment_statuses') {
          query = query.eq('payment_status', paymentStatusFilter);
        }
        if (fulfillmentStatusFilter && fulfillmentStatusFilter !== 'all_fulfillment_statuses') {
          query = query.eq('fulfillment_status', fulfillmentStatusFilter);
        }
        if (debouncedSearchQuery) {
          query = query.or(`customer_name.ilike.%${debouncedSearchQuery}%,customer_email.ilike.%${debouncedSearchQuery}%,shopify_order_number.ilike.%${debouncedSearchQuery}%`);
        }
        if (dateRangeFilter?.from) {
          query = query.gte('order_date', dateRangeFilter.from.toISOString());
        }
        if (dateRangeFilter?.to) {
          query = query.lte('order_date', dateRangeFilter.to.toISOString());
        }

        // Apply sorting - map to database column names
        const dbSortColumn = sortColumn === 'name' ? 'shopify_order_number' : 
                           sortColumn === 'created_at' ? 'order_date' :
                           sortColumn === 'total_price' ? 'total_amount' : 'order_date';
        
        query = query.order(dbSortColumn, { ascending: sortDirection === 'asc' });

        // Apply pagination
        const offset = pageInfoCursor ? parseInt(pageInfoCursor) : 0;
        
        // Get total count first for pagination
        const countQuery = supabase
          .from('shopify_orders')
          .select('*', { count: 'exact', head: true });
        
        // Apply same filters to count query
        if (paymentStatusFilter && paymentStatusFilter !== 'all_payment_statuses') {
          countQuery.eq('payment_status', paymentStatusFilter);
        }
        if (fulfillmentStatusFilter && fulfillmentStatusFilter !== 'all_fulfillment_statuses') {
          countQuery.eq('fulfillment_status', fulfillmentStatusFilter);
        }
        if (debouncedSearchQuery) {
          countQuery.or(`customer_name.ilike.%${debouncedSearchQuery}%,customer_email.ilike.%${debouncedSearchQuery}%,shopify_order_number.ilike.%${debouncedSearchQuery}%`);
        }
        if (dateRangeFilter?.from) {
          countQuery.gte('order_date', dateRangeFilter.from.toISOString());
        }
        if (dateRangeFilter?.to) {
          countQuery.lte('order_date', dateRangeFilter.to.toISOString());
        }

        const { count } = await countQuery;
        
        query = query.range(offset, offset + itemsPerPage - 1);
        const { data: dbOrders, error: dbError } = await query;

        if (dbError) {
          throw dbError;
        }

        // Transform database results to match API format
        const transformedOrders = (dbOrders || []).map(order => ({
          id: order.id,
          shopify_order_number: order.shopify_order_number,
          order_date: order.order_date,
          customer_name: order.customer_name,
          customer_email: order.customer_email,
          total_amount: order.total_amount,
          currency: order.currency,
          payment_status: order.payment_status,
          fulfillment_status: order.fulfillment_status,
        }));

        // Create pagination info
        const nextOffset = offset + itemsPerPage;
        const hasNextPage = (count || 0) > nextOffset;
        const hasPrevPage = offset > 0;

        setOrders(transformedOrders);
        setPaginationDetails({
          has_next_page: hasNextPage,
          has_previous_page: hasPrevPage,
          next_cursor: hasNextPage ? String(nextOffset) : null,
          prev_cursor: hasPrevPage ? String(Math.max(0, offset - itemsPerPage)) : null,
          limit: itemsPerPage,
        });

      } else {
        // Production mode - use Shopify API via edge function
        const params: any = {
          limit: itemsPerPage,
          sort_by: sortColumn,
          sort_order: sortDirection,
        };

        if (pageInfoCursor) {
          params.page_info = pageInfoCursor;
        }

        if (paymentStatusFilter && paymentStatusFilter !== 'all_payment_statuses') params.payment_status = paymentStatusFilter;
        if (fulfillmentStatusFilter && fulfillmentStatusFilter !== 'all_fulfillment_statuses') params.fulfillment_status = fulfillmentStatusFilter;
        if (dateRangeFilter?.from) params.date_from = dateRangeFilter.from.toISOString();
        if (dateRangeFilter?.to) params.date_to = dateRangeFilter.to.toISOString();
        if (debouncedSearchQuery) params.search_query = debouncedSearchQuery;

        const { data: responseData, error: rpcError } = await supabase.functions.invoke('shopify-orders', {
          body: params,
          headers,
        });

        if (rpcError) {
          throw rpcError;
        }

        const apiResponse = responseData as ShopifyOrdersApiResponse;

        if (apiResponse.error) {
          console.error("Error from shopify-orders function:", apiResponse.error);
          toast.error(`Failed to fetch orders: ${apiResponse.error}`);
          setError(apiResponse.error);
          setOrders([]);
          setPaginationDetails(null);
        } else if (apiResponse.data) {
          setOrders(apiResponse.data);
          setPaginationDetails(apiResponse.pagination);
        } else {
          setError('Received an unexpected response structure from the server.');
          setOrders([]);
          setPaginationDetails(null);
        }
      }
    } catch (err: any) {
      console.error("Failed to fetch Shopify orders:", err);
      const errorMessage = err.message || 'An unexpected network or client-side error occurred.';
      toast.error("Error Fetching Orders", { description: errorMessage });
      setError(errorMessage);
      setOrders([]);
      setPaginationDetails(null);
    } finally {
      if (isRefreshAction) {
        setIsRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [itemsPerPage, sortColumn, sortDirection, paymentStatusFilter, fulfillmentStatusFilter, dateRangeFilter, debouncedSearchQuery]);

  // Initial load and load on dependency change
  useEffect(() => {
    // Reset pageInfoCursor (effectively going to first page) when filters/sort/search change
    setCurrentPageInfo(undefined);
    loadOrders(undefined);
  }, [sortColumn, sortDirection, paymentStatusFilter, fulfillmentStatusFilter, dateRangeFilter, debouncedSearchQuery, itemsPerPage, loadOrders]);
  // Note: loadOrders is in dependency array. currentPageInfo is handled by explicit calls.

  const handleRefresh = () => {
    loadOrders(currentPageInfo, true); // Refresh current view
  };

  const handleSyncOrders = async (fullSync: boolean = false) => {
    setIsSyncing(true);
    try {
      const response: SyncShopifyOrdersResponse = await syncShopifyOrders({
        fullSync,
        maxPages: fullSync ? 100 : 10
      });

      if (response.success) {
        toast.success("Shopify sync completed successfully!", {
          description: `${response.ordersSynced || 0} orders synced from Shopify`
        });
        
        // Refresh the orders list after successful sync
        setTimeout(() => {
          handleRefresh();
        }, 1000);
      } else {
        toast.error("Shopify sync failed", {
          description: response.error || response.message
        });
      }
    } catch (error: any) {
      console.error('Shopify sync error:', error);
      toast.error("Shopify sync failed", {
        description: error.message || "An unexpected error occurred"
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncProducts = async () => {
    setIsSyncingProducts(true);
    try {
      const response = await syncShopifyProducts();

      if (response.success) {
        toast.success("Product sync completed successfully!", {
          description: `${response.products_synced || 0} products and ${response.collections_synced || 0} collections synced from Shopify`
        });
      } else {
        toast.error("Product sync failed", {
          description: response.error || "An unexpected error occurred"
        });
      }
    } catch (error: any) {
      console.error('Product sync error:', error);
      toast.error("Product sync failed", {
        description: error.message || "An unexpected error occurred"
      });
    } finally {
      setIsSyncingProducts(false);
    }
  };

  const handleSort = (column: ShopifySortableColumns) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc'); // Default to descending for new column, or 'asc' as preferred
    }
    // useEffect will trigger reload due to sortColumn/sortDirection change
  };
  
  const handleNextPage = () => {
    if (paginationDetails?.has_next_page && paginationDetails.next_cursor) {
      setCurrentPageInfo(paginationDetails.next_cursor);
      loadOrders(paginationDetails.next_cursor);
    }
  };

  const handlePreviousPage = () => {
    if (paginationDetails?.has_previous_page && paginationDetails.prev_cursor) {
      setCurrentPageInfo(paginationDetails.prev_cursor);
      loadOrders(paginationDetails.prev_cursor);
    }
  };
  
  const handleApplyFilters = () => {
    setCurrentPageInfo(undefined); // Reset to first page
    // loadOrders will be called by useEffect due to filter state changes
    // To force immediate load if useEffect doesn't catch it (e.g. if filters didn't change but user clicks apply)
    loadOrders(undefined);
  };

  const handleClearFilters = () => {
    setPaymentStatusFilter('all_payment_statuses');
    setFulfillmentStatusFilter('all_fulfillment_statuses');
    setDateRangeFilter(undefined);
    setSearchQuery('');
    setMinAmountFilter('');
    setMaxAmountFilter('');
    setCurrencyFilter('all');
    setCurrentPageInfo(undefined); // Reset to first page
  };

  const handlePaymentStatusChange = (value: string) => {
    if (value === "all_payment_statuses") {
      setPaymentStatusFilter('');
    } else {
      setPaymentStatusFilter(value);
    }
  };

  const handleFulfillmentStatusChange = (value: string) => {
    if (value === "all_fulfillment_statuses") {
      setFulfillmentStatusFilter('');
    } else {
      setFulfillmentStatusFilter(value);
    }
  };
 
  const handleViewOrderClick = async (orderId: number) => {
    setIsDetailModalOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    setSelectedOrderForDetail(null);

    try {
      // In development mode, we need to handle authentication differently
      const isDev = import.meta.env.DEV && import.meta.env.VITE_DEVMODE === 'true';
      const headers = isDev ? { 'Authorization': 'Bearer dev-access-token' } : undefined;
      
      const { data: responseData, error: rpcError } = await supabase.functions.invoke('shopify-orders', {
        body: { order_id: orderId }, // Pass order_id to fetch specific order
        headers,
      });

      if (rpcError) {
        throw rpcError;
      }

      // Assuming the response for a single order is directly the DetailedShopifyOrder object
      // or nested under a 'data' property. Adjust as per actual function response.
      const detailedOrder = responseData?.data || responseData;


      if (!detailedOrder || responseData?.error) {
        const errMsg = responseData?.error || 'Order details not found or invalid response.';
        console.error("Error fetching order details:", errMsg);
        toast.error("Failed to load order details", { description: errMsg });
        setDetailError(errMsg);
        setSelectedOrderForDetail(null);
      } else {
        // Ensure tags are an array
        if (typeof detailedOrder.tags === 'string') {
          detailedOrder.tags = detailedOrder.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
        } else if (!Array.isArray(detailedOrder.tags)) {
            detailedOrder.tags = [];
        }
        setSelectedOrderForDetail(detailedOrder as DetailedShopifyOrder);
      }
    } catch (err: any) {
      console.error("Client-side error fetching order details:", err);
      const errorMessage = err.message || 'An unexpected error occurred.';
      toast.error("Error loading details", { description: errorMessage });
      setDetailError(errorMessage);
      setSelectedOrderForDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };


  const SortableHeader: React.FC<{ column: ShopifySortableColumns; title: string }> = ({ column, title }) => (
    <TableHead onClick={() => handleSort(column)} className="cursor-pointer">
      <div className="flex items-center">
        {title}
        {sortColumn === column ? (
          <ArrowUpDown className={`ml-2 h-4 w-4 ${sortDirection === 'asc' ? 'rotate-180 text-primary' : 'text-primary'}`} />
        ) : (
          <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/50" />
        )}
      </div>
    </TableHead>
  );

  if (loading && !isRefreshing && !isSyncing) {
    return (
      <AdminLayout>
        <div className="container mx-auto px-4 py-8 flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-4 text-lg">Loading Shopify orders...</p>
        </div>
      </AdminLayout>
    );
  }

  // Sync loading state
  if (isSyncing) {
    return (
      <AdminLayout>
        <div className="container mx-auto px-4 py-8 flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-green-600" />
          <div className="ml-4 text-center">
            <p className="text-lg font-medium">Syncing Shopify orders...</p>
            <p className="text-sm text-muted-foreground">This may take a few minutes</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Display critical error if present and not just refreshing
  if (error && !isRefreshing && orders.length === 0) {
    return (
      <AdminLayout>
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-2xl font-semibold mb-6 text-destructive">Error Fetching Shopify Orders</h1>
          <p className="text-destructive-foreground bg-destructive/10 p-4 rounded-md">
            {error || "An unexpected error occurred. Please try refreshing."}
          </p>
          <Button onClick={handleRefresh} className="mt-4" disabled={isRefreshing}>
            {isRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Try Again
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Shopify Orders</h1>
          {import.meta.env.DEV && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              Development Mode
            </Badge>
          )}
        </div>

        {/* Enhanced Filter and Search UI Section */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Advanced Filters & Search
                </CardTitle>
                <CardDescription>
                  Filter and search through Shopify orders with advanced criteria
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                {showFilters ? <X className="h-4 w-4" /> : <Filter className="h-4 w-4" />}
                {showFilters ? 'Hide' : 'Show'} Filters
              </Button>
            </div>
          </CardHeader>
          
          {showFilters && (
            <CardContent>
              {/* Quick Search Row */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by Order #, Customer Name, Email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              {/* Advanced Filters Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Payment Status
                  </label>
                  <Select value={paymentStatusFilter} onValueChange={handlePaymentStatusChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="All payment statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_payment_statuses">All Payment Statuses</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                      <SelectItem value="partially_refunded">Partially Refunded</SelectItem>
                      <SelectItem value="voided">Voided</SelectItem>
                      <SelectItem value="authorized">Authorized</SelectItem>
                      <SelectItem value="partially_paid">Partially Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Fulfillment Status
                  </label>
                  <Select value={fulfillmentStatusFilter} onValueChange={handleFulfillmentStatusChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="All fulfillment statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_fulfillment_statuses">All Fulfillment Statuses</SelectItem>
                      <SelectItem value="fulfilled">Fulfilled</SelectItem>
                      <SelectItem value="unfulfilled">Unfulfilled</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                      <SelectItem value="restocked">Restocked</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Currency</label>
                  <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All currencies" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All currencies</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="CAD">CAD</SelectItem>
                      <SelectItem value="AUD">AUD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Min Amount
                  </label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={minAmountFilter}
                    onChange={(e) => setMinAmountFilter(e.target.value)}
                    step="0.01"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Max Amount
                  </label>
                  <Input
                    type="number"
                    placeholder="999.99"
                    value={maxAmountFilter}
                    onChange={(e) => setMaxAmountFilter(e.target.value)}
                    step="0.01"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Date Range
                  </label>
                  <DatePickerWithRange
                    date={dateRangeFilter}
                    onDateChange={setDateRangeFilter}
                    placeholder="Select date range"
                    className="w-full"
                  />
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 items-center justify-between">
                <div className="flex gap-2">
                  <Button onClick={handleApplyFilters} disabled={loading || isRefreshing || isSyncing}>
                    {(loading && !isRefreshing) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                    Apply Filters
                  </Button>
                  <Button variant="outline" onClick={handleClearFilters} disabled={loading || isRefreshing || isSyncing}>
                    <X className="mr-2 h-4 w-4" />
                    Clear All
                  </Button>
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleRefresh} disabled={loading || isRefreshing || isSyncing}>
                    {isRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Refresh
                  </Button>
                  
                  <Button 
                    onClick={() => handleSyncOrders(false)} 
                    disabled={loading || isRefreshing || isSyncing}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isSyncing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Sync Latest Orders
                  </Button>
                  
                  <Button 
                    variant="outline"
                    onClick={() => handleSyncOrders(true)} 
                    disabled={loading || isRefreshing || isSyncing}
                    title="Fetch many pages of orders from Shopify (may take several minutes)"
                  >
                    {isSyncing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Full Sync
                  </Button>
                  
                  <Button 
                    onClick={handleSyncProducts} 
                    disabled={loading || isRefreshing || isSyncing || isSyncingProducts}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                    title="Sync all products and collections from Shopify"
                  >
                    {isSyncingProducts ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Package className="mr-2 h-4 w-4" />
                    )}
                    Sync Products
                  </Button>
                </div>
              </div>
              
              {/* Active Filters Display */}
              {(searchQuery || (paymentStatusFilter && paymentStatusFilter !== 'all_payment_statuses') || (fulfillmentStatusFilter && fulfillmentStatusFilter !== 'all_fulfillment_statuses') || minAmountFilter || maxAmountFilter || (currencyFilter && currencyFilter !== 'all') || dateRangeFilter) && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium mb-2">Active Filters:</p>
                  <div className="flex flex-wrap gap-2">
                    {searchQuery && (
                      <Badge variant="secondary" className="gap-1">
                        Search: {searchQuery}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => setSearchQuery('')} />
                      </Badge>
                    )}
                    {paymentStatusFilter && paymentStatusFilter !== 'all_payment_statuses' && (
                      <Badge variant="secondary" className="gap-1">
                        Payment: {paymentStatusFilter}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => setPaymentStatusFilter('all_payment_statuses')} />
                      </Badge>
                    )}
                    {fulfillmentStatusFilter && fulfillmentStatusFilter !== 'all_fulfillment_statuses' && (
                      <Badge variant="secondary" className="gap-1">
                        Fulfillment: {fulfillmentStatusFilter}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => setFulfillmentStatusFilter('all_fulfillment_statuses')} />
                      </Badge>
                    )}
                    {(minAmountFilter || maxAmountFilter) && (
                      <Badge variant="secondary" className="gap-1">
                        Amount: {minAmountFilter || '0'} - {maxAmountFilter || '∞'}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => { setMinAmountFilter(''); setMaxAmountFilter(''); }} />
                      </Badge>
                    )}
                    {currencyFilter && currencyFilter !== 'all' && (
                      <Badge variant="secondary" className="gap-1">
                        Currency: {currencyFilter}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => setCurrencyFilter('all')} />
                      </Badge>
                    )}
                    {dateRangeFilter && (dateRangeFilter.from || dateRangeFilter.to) && (
                      <Badge variant="secondary" className="gap-1">
                        Date: {dateRangeFilter.from ? format(dateRangeFilter.from, 'MMM dd') : 'Start'} - {dateRangeFilter.to ? format(dateRangeFilter.to, 'MMM dd') : 'End'}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => setDateRangeFilter(undefined)} />
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Orders Table */}
        {(loading && isRefreshing) && (
          <div className="py-4 text-center">
            <Loader2 className="h-6 w-6 animate-spin inline-block" /> 
            Refreshing data...
          </div>
        )}
        
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Shopify Orders
                </CardTitle>
                <CardDescription>
                  {orders.length > 0 ? (
                    `Showing ${orders.length} orders ${paginationDetails?.has_next_page ? '(more available)' : ''}`
                  ) : (
                    !loading && !isRefreshing ? 'No orders found matching your criteria' : 'Loading orders...'
                  )}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={String(itemsPerPage)}
                  onValueChange={(value) => {
                    setItemsPerPage(Number(value));
                    setCurrentPageInfo(undefined);
                  }}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 20, 50, 100].map(size => (
                      <SelectItem key={size} value={String(size)}>{size} / page</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
            <TableRow>
              <SortableHeader column="name" title="Shopify Order #" />
              <SortableHeader column="created_at" title="Order Date" />
              <TableHead>Customer Name</TableHead>
              <TableHead>Customer Email</TableHead>
              <SortableHeader column="total_price" title="Total Amount" />
              <TableHead>Payment Status</TableHead>
              <TableHead>Fulfillment Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            { !loading && orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">{order.shopify_order_number}</TableCell>
                <TableCell>{format(new Date(order.order_date), 'PPpp')}</TableCell>
                <TableCell>{order.customer_name}</TableCell>
                <TableCell>{order.customer_email || 'N/A'}</TableCell>
                <TableCell>{formatCurrency(order.total_amount, order.currency)}</TableCell>
                <TableCell>
                  <Badge 
                    variant={
                      order.payment_status === 'paid' ? 'default' :
                      order.payment_status === 'pending' ? 'outline' :
                      order.payment_status === 'refunded' ? 'destructive' :
                      order.payment_status === 'partially_refunded' ? 'secondary' :
                      'outline'
                    }
                  >
                    {order.payment_status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={
                      order.fulfillment_status === 'fulfilled' ? 'default' :
                      order.fulfillment_status === 'unfulfilled' ? 'outline' :
                      order.fulfillment_status === 'partial' ? 'secondary' :
                      order.fulfillment_status === 'cancelled' ? 'destructive' :
                      'outline'
                    }
                  >
                    {order.fulfillment_status || 'N/A'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" onClick={() => handleViewOrderClick(order.id)}>
                    <Eye className="mr-2 h-4 w-4" /> View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        {/* Order Detail Modal */}
        {selectedOrderForDetail && !detailLoading && (
          <Dialog open={isDetailModalOpen} onOpenChange={(isOpen) => {
            setIsDetailModalOpen(isOpen);
            if (!isOpen) {
                setSelectedOrderForDetail(null);
                setDetailError(null);
            }
          }}>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Order Details: #{selectedOrderForDetail.shopify_order_number}</DialogTitle>
                <DialogDescription>
                  Detailed information for Shopify Order ID: {selectedOrderForDetail.id}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <Card>
                  <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    <p><strong>Order Date:</strong> {format(new Date(selectedOrderForDetail.order_date), 'PPpp')}</p>
                    <p><strong>Customer:</strong> {selectedOrderForDetail.customer_name} ({selectedOrderForDetail.customer_email || 'N/A'})</p>
                    <p><strong>Total Amount:</strong> {formatCurrency(selectedOrderForDetail.total_amount, selectedOrderForDetail.currency)}</p>
                    <p><strong>Payment Status:</strong> {selectedOrderForDetail.payment_status}</p>
                    <p><strong>Fulfillment Status:</strong> {selectedOrderForDetail.fulfillment_status || 'N/A'}</p>
                    {selectedOrderForDetail.note && <p><strong>Customer Note:</strong> {selectedOrderForDetail.note}</p>}
                    {selectedOrderForDetail.tags && Array.isArray(selectedOrderForDetail.tags) && selectedOrderForDetail.tags.length > 0 && (
                        <p><strong>Tags:</strong> {selectedOrderForDetail.tags.join(', ')}</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>Line Items</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Unit Price</TableHead>
                          <TableHead className="text-right">Total Price</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedOrderForDetail.line_items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.product_name}{item.variant_title ? ` (${item.variant_title})` : ''}</TableCell>
                            <TableCell>{item.sku || 'N/A'}</TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.individual_price, selectedOrderForDetail.currency)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.total_price, selectedOrderForDetail.currency)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <div className="grid md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader><CardTitle>Shipping Address</CardTitle></CardHeader>
                    <CardContent>
                      {selectedOrderForDetail.shipping_address ? (
                        <>
                          <p>{selectedOrderForDetail.shipping_address.name || `${selectedOrderForDetail.shipping_address.first_name || ''} ${selectedOrderForDetail.shipping_address.last_name || ''}`.trim()}</p>
                          {selectedOrderForDetail.shipping_address.company && <p>{selectedOrderForDetail.shipping_address.company}</p>}
                          <p>{selectedOrderForDetail.shipping_address.address1}</p>
                          {selectedOrderForDetail.shipping_address.address2 && <p>{selectedOrderForDetail.shipping_address.address2}</p>}
                          <p>{selectedOrderForDetail.shipping_address.city}, {selectedOrderForDetail.shipping_address.province} {selectedOrderForDetail.shipping_address.zip}</p>
                          <p>{selectedOrderForDetail.shipping_address.country}</p>
                          {selectedOrderForDetail.shipping_address.phone && <p>Phone: {selectedOrderForDetail.shipping_address.phone}</p>}
                        </>
                      ) : <p>No shipping address provided.</p>}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle>Billing Address</CardTitle></CardHeader>
                    <CardContent>
                      {selectedOrderForDetail.billing_address ? (
                        <>
                          <p>{selectedOrderForDetail.billing_address.name || `${selectedOrderForDetail.billing_address.first_name || ''} ${selectedOrderForDetail.billing_address.last_name || ''}`.trim()}</p>
                          {selectedOrderForDetail.billing_address.company && <p>{selectedOrderForDetail.billing_address.company}</p>}
                          <p>{selectedOrderForDetail.billing_address.address1}</p>
                          {selectedOrderForDetail.billing_address.address2 && <p>{selectedOrderForDetail.billing_address.address2}</p>}
                          <p>{selectedOrderForDetail.billing_address.city}, {selectedOrderForDetail.billing_address.province} {selectedOrderForDetail.billing_address.zip}</p>
                          <p>{selectedOrderForDetail.billing_address.country}</p>
                          {selectedOrderForDetail.billing_address.phone && <p>Phone: {selectedOrderForDetail.billing_address.phone}</p>}
                        </>
                      ) : <p>No billing address provided.</p>}
                    </CardContent>
                  </Card>
                </div>
              </div>
{/* Shopify-Printful Linker Integration */}
                {selectedOrderForDetail && (
                  <div className="mt-6 mb-4"> {/* Add some margin for separation */}
                    <ShopifyPrintfulLinker shopifyOrderId={selectedOrderForDetail.id} />
                  </div>
                )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {detailLoading && isDetailModalOpen && (
             <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Loading Order Details...</DialogTitle>
                    </DialogHeader>
                    <div className="flex justify-center items-center p-8">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    </div>
                </DialogContent>
            </Dialog>
        )}

        {detailError && isDetailModalOpen && (
            <Dialog open={isDetailModalOpen} onOpenChange={(isOpen) => {
                setIsDetailModalOpen(isOpen);
                if (!isOpen) setDetailError(null);
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-destructive">Error Loading Details</DialogTitle>
                        <DialogDescription>{detailError}</DialogDescription>
                    </DialogHeader>
                     <DialogFooter>
                        <Button variant="outline" onClick={() => { setIsDetailModalOpen(false); setDetailError(null); }}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        )}


        {/* Pagination UI */}
        {paginationDetails && (paginationDetails.has_next_page || paginationDetails.has_previous_page) && (
          <Pagination className="mt-8">
            <PaginationContent>
              <PaginationItem>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={!paginationDetails.has_previous_page}
                  className="flex items-center gap-2"
                >
                  Previous
                </Button>
              </PaginationItem>
              
              <PaginationItem>
                <span className="text-sm text-muted-foreground px-4">
                  {paginationDetails.has_previous_page || paginationDetails.has_next_page ? 
                    `Showing ${orders.length} orders` : 
                    `${orders.length} orders`
                  }
                </span>
              </PaginationItem>
              
              <PaginationItem>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={!paginationDetails.has_next_page}
                  className="flex items-center gap-2"
                >
                  Next
                </Button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
        {/* Summary Cards */}
        {orders.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Current Page</p>
                    <p className="text-2xl font-bold">{orders.length}</p>
                  </div>
                  <ShoppingCart className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(
                        orders.reduce((sum, order) => sum + order.total_amount, 0),
                        orders[0]?.currency || 'USD'
                      )}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Avg. Order Value</p>
                    <p className="text-2xl font-bold">
                      {orders.length > 0 ? 
                        formatCurrency(
                          orders.reduce((sum, order) => sum + order.total_amount, 0) / orders.length,
                          orders[0]?.currency || 'USD'
                        ) : 
                        '$0.00'
                      }
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Paid Orders</p>
                    <p className="text-2xl font-bold">
                      {orders.filter(order => order.payment_status === 'paid').length}
                    </p>
                  </div>
                  <CreditCard className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

      </div>
    </AdminLayout>
  );
};

export default ShopifyOrdersPage;

// Placeholder for DatePickerWithRange if it doesn't exist.
// You would typically have this in its own file, e.g., src/components/ui/date-range-picker.tsx
// For now, adding a minimal placeholder to avoid breaking the build if it's missing.
// This should be replaced with the actual component from shadcn/ui or a custom one.
// const DatePickerWithRange = ({ date, onDateChange, className }: { date?: DateRange, onDateChange: (date?: DateRange) => void, className?: string }) => {
//   return (
//     <div className={className}>
//       <Input
//         type="text"
//         placeholder="Select date range (placeholder)"
//         value={date ? `${date.from?.toLocaleDateString()} - ${date.to?.toLocaleDateString()}` : "Not selected"}
//         readOnly
//         onClick={() => toast.info("Date Range Picker component needs to be implemented or imported.")}
//       />
//     </div>
//   );
// };