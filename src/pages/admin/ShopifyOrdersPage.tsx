import React, { useEffect, useState, useCallback, useMemo } from 'react';
import AdminLayout from '@/components/AdminLayout';
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
import { ArrowUpDown, Loader2, RefreshCw, Search, Eye } from 'lucide-react'; // Added Eye icon
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Added Card components

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
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('');
  const [fulfillmentStatusFilter, setFulfillmentStatusFilter] = useState<string>('');
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRange | undefined>(undefined);

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

    const params: any = {
      limit: itemsPerPage,
      sort_by: sortColumn,
      sort_order: sortDirection,
    };

    if (pageInfoCursor) {
      params.page_info = pageInfoCursor;
    }

    if (paymentStatusFilter) params.payment_status = paymentStatusFilter;
    if (fulfillmentStatusFilter) params.fulfillment_status = fulfillmentStatusFilter;
    if (dateRangeFilter?.from) params.date_from = dateRangeFilter.from.toISOString();
    if (dateRangeFilter?.to) params.date_to = dateRangeFilter.to.toISOString();
    if (debouncedSearchQuery) params.search_query = debouncedSearchQuery;

    try {
      const { data: responseData, error: rpcError } = await supabase.functions.invoke('shopify-orders', {
        body: params,
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
    setPaymentStatusFilter('');
    setFulfillmentStatusFilter('');
    setDateRangeFilter(undefined);
    setSearchQuery(''); // This will also clear debouncedSearchQuery via its own useEffect
    setCurrentPageInfo(undefined); // Reset to first page
    // loadOrders will be called by useEffect
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
      const { data: responseData, error: rpcError } = await supabase.functions.invoke('shopify-orders', {
        body: { order_id: orderId }, // Pass order_id to fetch specific order
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

  if (loading && !isRefreshing) {
    return (
      <AdminLayout>
        <div className="container mx-auto px-4 py-8 flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-4 text-lg">Loading Shopify orders...</p>
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
        <h1 className="text-2xl font-semibold mb-6">Shopify Orders</h1>

        {/* Filter and Search UI Section */}
        <div className="mb-6 p-4 border rounded-lg bg-card shadow">
          <h2 className="text-lg font-medium mb-4">Filters & Search</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <Input
              placeholder="Search by Order #, Customer Name, Email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="lg:col-span-1"
            />
             <Select value={paymentStatusFilter} onValueChange={handlePaymentStatusChange}>
              <SelectTrigger>
                <SelectValue placeholder="Payment Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_payment_statuses">All Payment Statuses</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
                <SelectItem value="partially_refunded">Partially Refunded</SelectItem>
                <SelectItem value="voided">Voided</SelectItem>
                {/* Add other common Shopify statuses as needed */}
              </SelectContent>
            </Select>
            <Select value={fulfillmentStatusFilter} onValueChange={handleFulfillmentStatusChange}>
              <SelectTrigger>
                <SelectValue placeholder="Fulfillment Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_fulfillment_statuses">All Fulfillment Statuses</SelectItem>
                <SelectItem value="fulfilled">Fulfilled</SelectItem>
                <SelectItem value="unfulfilled">Unfulfilled</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="restocked">Restocked</SelectItem>
                 {/* Add other common Shopify statuses as needed */}
              </SelectContent>
            </Select>
            {/* DateRangePicker - Assuming DatePickerWithRange is available and works like shadcn example */}
            {/*
            <div className="lg:col-span-2">
              <DatePickerWithRange
                date={dateRangeFilter}
                onDateChange={setDateRangeFilter}
                className="w-full"
              />
            </div>
            */}
             <p className="text-sm text-muted-foreground lg:col-span-3">Date Range Picker placeholder. Requires a component like 'DatePickerWithRange'.</p>

          </div>
          <div className="flex space-x-2 items-center">
            <Button onClick={handleApplyFilters} disabled={loading || isRefreshing}>
              { (loading && !isRefreshing) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" /> }
              Apply Filters / Search
            </Button>
            <Button variant="outline" onClick={handleClearFilters} disabled={loading || isRefreshing}>Clear</Button>
            <Button variant="outline" onClick={handleRefresh} disabled={loading || isRefreshing}>
              {isRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh
            </Button>
          </div>
        </div>

        {/* Orders Table */}
        { (loading && isRefreshing) && <div className="py-4 text-center"><Loader2 className="h-6 w-6 animate-spin inline-block" /> Refreshing data...</div> }
        
        <Table>
          <TableCaption>{!loading && !isRefreshing && orders.length === 0 ? "No Shopify orders found matching your criteria." : "A list of Shopify orders."}</TableCaption>
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
                <TableCell>{order.payment_status}</TableCell>
                <TableCell>{order.fulfillment_status || 'N/A'}</TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" onClick={() => handleViewOrderClick(order.id)}>
                    <Eye className="mr-2 h-4 w-4" /> View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
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
                <PaginationPrevious
                  href="#"
                  onClick={(e) => { e.preventDefault(); handlePreviousPage(); }}
                  // @ts-ignore // isActive is not a standard prop for PaginationPrevious
                  isActive={paginationDetails.has_previous_page}
                  aria-disabled={!paginationDetails.has_previous_page}
                  className={!paginationDetails.has_previous_page ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              {/* We don't have page numbers with cursor pagination from Shopify directly */}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => { e.preventDefault(); handleNextPage(); }}
                  // @ts-ignore
                  isActive={paginationDetails.has_next_page}
                  aria-disabled={!paginationDetails.has_next_page}
                  className={!paginationDetails.has_next_page ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
         <div className="mt-4 flex justify-between items-center text-sm text-muted-foreground">
            <div>
                Showing {orders.length > 0 ? '1' : '0'} to {orders.length} of many results (total unknown with cursor pagination).
            </div>
            <div className="flex items-center space-x-2">
                <span>Rows per page:</span>
                <Select
                    value={String(itemsPerPage)}
                    onValueChange={(value) => {
                        setItemsPerPage(Number(value));
                        setCurrentPageInfo(undefined); // Reset to first page
                    }}
                >
                    <SelectTrigger className="w-[70px]">
                        <SelectValue placeholder={String(itemsPerPage)} />
                    </SelectTrigger>
                    <SelectContent>
                        {[10, 20, 50, 100].map(size => (
                            <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>

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