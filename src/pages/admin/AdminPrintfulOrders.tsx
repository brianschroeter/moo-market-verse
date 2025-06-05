import AdminLayout from '@/components/AdminLayout';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  fetchSyncedPrintfulOrdersFromDB, // Changed
  TransformedPrintfulOrder,
  // PaginationDetails, // Will use parts of SyncedPrintfulOrdersData
  // PrintfulOrdersResponse, // Will use SyncedPrintfulOrdersResponse
  PrintfulError, // Still useful for general error structure
  DetailedPrintfulItem,
  FetchSyncedPrintfulOrdersParams, // New
  SyncedPrintfulOrdersResponse, // New
  DbPrintfulOrder, // For sort key reference
  ShippingAddress, // Import if not already implicitly available via TransformedPrintfulOrder
} from '@/services/printfulService';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Loader2, RefreshCw, Eye, Filter, X, Calendar, Package, User, DollarSign, Search } from 'lucide-react';
import { toast } from "sonner";

// Define a type for the order object that includes the fields mentioned in the prompt
interface DisplayablePrintfulOrder extends TransformedPrintfulOrder {
  // TransformedPrintfulOrder (from service) now includes:
  // id: number (Printful's internal order ID - maps to printful_internal_id)
  // displayOrderId: string (Customer-facing order ID - maps to printful_external_id)
  // status: string
  // created: number (Timestamp from printful_created_at)
  // shipping_address: ShippingAddress (Mapped from shipping_details)
  // detailedItems: DetailedPrintfulItem[] (Mapped from printful_order_items)
  // totalAmount: number (From total_amount)
  // currencyCode: string (From currency)
  // printful_updated_at?: string | null;
  // last_synced_at?: string;


  // Fields derived/maintained for display:
  customerName: string; // Derived from shipping_address.name
  orderDate: string; // Derived from 'created' timestamp (which is already a number after transformation)
  fulfillmentStatus: string; // Already in TransformedPrintfulOrder as 'status'
  itemsSummary: string; // Derived from 'detailedItems' array
}

// Columns that can be sorted by the new service function
type SortableDbColumns = NonNullable<FetchSyncedPrintfulOrdersParams['sortBy']>;

// Map DB sortable columns to display names if needed, or use directly
// For now, we'll align DisplayablePrintfulOrder keys with what we want to show in headers
// and ensure handleSort uses the correct DB column name.
type SortableDisplayColumns = 'orderDate' | 'fulfillmentStatus' | 'displayOrderId' | 'customerName' | 'totalAmount';


// Helper function to format currency
const formatCurrency = (amount: number, currencyCode: string) => {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currencyCode }).format(amount);
  } catch (e) {
    // Fallback for unknown currency codes or other errors
    return `${amount.toFixed(2)} ${currencyCode}`;
  }
};

const AdminPrintfulOrders: React.FC = () => {
  const [orders, setOrders] = useState<DisplayablePrintfulOrder[]>([]);
  const [totalOrders, setTotalOrders] = useState<number>(0); // For total count from new service
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null); // For critical on-page errors
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10); // Default items per page
  const [sortColumn, setSortColumn] = useState<SortableDbColumns>('printful_external_id'); // Default to external ID
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Modal state for viewing order items
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [currentOrderForModal, setCurrentOrderForModal] = useState<TransformedPrintfulOrder | null>(null);

  // Filter states
  const [customerNameFilter, setCustomerNameFilter] = useState<string>('');
  const [itemsOrderedFilter, setItemsOrderedFilter] = useState<string>('');
  const [printfulOrderNumberFilter, setPrintfulOrderNumberFilter] = useState<string>('');
  const [shippingAddressFilter, setShippingAddressFilter] = useState<string>(''); // This will be used for email or name
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [minAmountFilter, setMinAmountFilter] = useState<string>('');
  const [maxAmountFilter, setMaxAmountFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState<boolean>(true);
  const [currencyFilter, setCurrencyFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRange | undefined>(undefined);

  // Debounced filter states for triggering API calls
  const [debouncedCustomerNameFilter, setDebouncedCustomerNameFilter] = useState<string>('');
  const [debouncedItemsOrderedFilter, setDebouncedItemsOrderedFilter] = useState<string>('');
  const [debouncedPrintfulOrderNumberFilter, setDebouncedPrintfulOrderNumberFilter] = useState<string>('');
  const [debouncedShippingAddressFilter, setDebouncedShippingAddressFilter] = useState<string>('');
  const [debouncedStatusFilter, setDebouncedStatusFilter] = useState<string>('');
  const [debouncedMinAmountFilter, setDebouncedMinAmountFilter] = useState<string>('');
  const [debouncedMaxAmountFilter, setDebouncedMaxAmountFilter] = useState<string>('');
  const [debouncedCurrencyFilter, setDebouncedCurrencyFilter] = useState<string>('');
  const [debouncedDateRangeFilter, setDebouncedDateRangeFilter] = useState<DateRange | undefined>(undefined);


  const loadOrders = useCallback(async (
    // Filters are now based on FetchSyncedPrintfulOrdersParams
    currentFilters?: {
        customerName?: string;
        itemsOrdered?: string;
        orderNumber?: string;
        shippingAddress?: string; // Keep UI filter name, map to DB fields inside
    },
    isRefreshAction: boolean = false
  ) => {
    if (isRefreshAction) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const offset = (currentPage - 1) * itemsPerPage;
      const params: FetchSyncedPrintfulOrdersParams = {
        limit: itemsPerPage,
        offset: offset,
        sortBy: sortColumn,
        sortAscending: sortDirection === 'asc',
      };

      if (currentFilters?.customerName) params.customerName = currentFilters.customerName;
      if (currentFilters?.itemsOrdered) params.itemsOrdered = currentFilters.itemsOrdered;
      if (currentFilters?.orderNumber) params.orderNumber = currentFilters.orderNumber;
      
      // Date range filtering
      if (debouncedDateRangeFilter?.from) {
        params.dateFrom = debouncedDateRangeFilter.from.toISOString();
      }
      if (debouncedDateRangeFilter?.to) {
        params.dateTo = debouncedDateRangeFilter.to.toISOString();
      }
      
      // Only pass status and currency filters if they're not 'all'
      if (statusFilter && statusFilter !== 'all') {
        // Add status filter to params when backend supports it
        // params.status = statusFilter;
      }
      if (currencyFilter && currencyFilter !== 'all') {
        // Add currency filter to params when backend supports it
        // params.currency = currencyFilter;
      }
      
      // Handle shippingAddressFilter: try email first, then name
      if (currentFilters?.shippingAddress) {
        // Basic check if it looks like an email
        if (currentFilters.shippingAddress.includes('@')) {
            params.shippingAddressEmail = currentFilters.shippingAddress;
        } else {
            params.shippingAddressName = currentFilters.shippingAddress;
        }
      }

      const response: SyncedPrintfulOrdersResponse = await fetchSyncedPrintfulOrdersFromDB(params);

      if (response.error) {
        const errorMessage = response.error.message || 'An unknown error occurred.';
        // Assuming PostgrestError might have a code or details, but PrintfulError structure is simpler
        // For now, use a generic toast for DB errors.
        console.error("Error fetching orders from DB:", response.error);
        toast.error(`Failed to fetch orders: ${errorMessage}`, {
          description: "Please check your connection or try again.",
        });
        setError(errorMessage);
        setOrders([]);
        setTotalOrders(0);
      } else if (response.data) {
        // Data is already transformed by the service layer
        const displayableOrders = response.data.orders.map((order: TransformedPrintfulOrder): DisplayablePrintfulOrder => ({
          ...order,
          customerName: order.shipping_address?.name || 'N/A',
          // 'created' is already a number (timestamp) from transformDbOrderToTransformedOrder
          orderDate: new Date(order.created).toLocaleDateString(),
          fulfillmentStatus: order.status,
          itemsSummary: order.detailedItems.map(item => `${item.quantity}x ${item.name}`).join(', ') || 'N/A',
        }));
        setOrders(displayableOrders);
        setTotalOrders(response.data.totalCount);
      } else {
        console.error("Unexpected response structure from DB fetch:", response);
        setError('Received an unexpected response structure from the server.');
        setOrders([]);
        setTotalOrders(0);
      }
    } catch (err: any) {
      console.error("Failed to fetch orders (catch block):", err);
      const errorMessage = err.message || 'An unexpected network or client-side error occurred.';
      toast.error("Network/Request Error", {
        description: errorMessage,
      });
      setError(errorMessage);
      setOrders([]);
      setTotalOrders(0);
    } finally {
      if (isRefreshAction) {
        setIsRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [currentPage, itemsPerPage, sortColumn, sortDirection]); // sortColumn and sortDirection are now deps for server-side sorting

  // Effect to update debounced filters after a delay
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedCustomerNameFilter(customerNameFilter);
      setDebouncedItemsOrderedFilter(itemsOrderedFilter);
      setDebouncedPrintfulOrderNumberFilter(printfulOrderNumberFilter);
      setDebouncedShippingAddressFilter(shippingAddressFilter);
      setDebouncedStatusFilter(statusFilter);
      setDebouncedMinAmountFilter(minAmountFilter);
      setDebouncedMaxAmountFilter(maxAmountFilter);
      setDebouncedCurrencyFilter(currencyFilter);
      setDebouncedDateRangeFilter(dateRangeFilter);
    }, 500); // 500ms debounce delay

    return () => {
      clearTimeout(handler);
    };
  }, [customerNameFilter, itemsOrderedFilter, printfulOrderNumberFilter, shippingAddressFilter, statusFilter, minAmountFilter, maxAmountFilter, currencyFilter, dateRangeFilter]);


  // Effect to load orders when debounced filters, pagination, or sorting changes
  useEffect(() => {
    // We only want to trigger loadOrders if the debounced values are used.
    // The handleApplyFilters button will set currentPage to 1 and then this effect will run.
    // Typing into filters will update debounced filters, and this effect will run.
    loadOrders({
      customerName: debouncedCustomerNameFilter || undefined,
      itemsOrdered: debouncedItemsOrderedFilter || undefined,
      orderNumber: debouncedPrintfulOrderNumberFilter || undefined,
      shippingAddress: debouncedShippingAddressFilter || undefined,
    });
  }, [loadOrders, debouncedCustomerNameFilter, debouncedItemsOrderedFilter, debouncedPrintfulOrderNumberFilter, debouncedShippingAddressFilter, debouncedStatusFilter, debouncedMinAmountFilter, debouncedMaxAmountFilter, debouncedCurrencyFilter, debouncedDateRangeFilter, currentPage, itemsPerPage, sortColumn, sortDirection]);

  const handleApplyFilters = () => {
    setCurrentPage(1);
    // This function now primarily serves to reset to page 1
    // and let the useEffect for debounced filters handle the actual load.
    // Or, if we want instant application on button click, we can call loadOrders directly
    // with the non-debounced filters. For consistency with typing, let's rely on debounce.
    // The useEffect listening to debounced filters will pick up the changes.
    // We must ensure that if filter inputs are typed and then "Apply" is clicked,
    // the debounced values are up-to-date or the non-debounced are used.
    // For simplicity, let's make "Apply Filters" instant and not rely on the debounce for the click.
    setCurrentPage(1); // Reset to page 1
    loadOrders({ // Use non-debounced filters for immediate effect on click
        customerName: customerNameFilter || undefined,
        itemsOrdered: itemsOrderedFilter || undefined,
        orderNumber: printfulOrderNumberFilter || undefined,
        shippingAddress: shippingAddressFilter || undefined,
    });
  };

  const handleClearFilters = () => {
    setCustomerNameFilter('');
    setItemsOrderedFilter('');
    setPrintfulOrderNumberFilter('');
    setShippingAddressFilter('');
    setStatusFilter('all');
    setMinAmountFilter('');
    setMaxAmountFilter('');
    setCurrencyFilter('all');
    setDateRangeFilter(undefined);
    setCurrentPage(1); // Reset to page 1
    loadOrders({}); // Call with empty filters
  };

  const handleRefresh = () => {
    // Pass current filters to refresh
    loadOrders({
      customerName: customerNameFilter || undefined,
      itemsOrdered: itemsOrderedFilter || undefined,
      orderNumber: printfulOrderNumberFilter || undefined,
      shippingAddress: shippingAddressFilter || undefined,
    }, true);
  };

  // Server-side sorting is implemented for these synced orders (fetched from the local database).
  // This means the `orders` state variable is already sorted according to `sortColumn` and `sortDirection`.
  // The "Total Amount" column is sortable via the `handleSort` function, which maps it to the `total_amount` DB field.
  // Sorting for *live* Printful data (via the Supabase Edge Function) is a separate concern and is handled in that function.
  const sortedOrders = useMemo(() => {
    // `orders` are directly used as they are fetched pre-sorted from the server.
    return orders;
  }, [orders]);

  const handleSort = (column: SortableDisplayColumns) => {
    // Map display column to DB column
    let dbSortColumn: SortableDbColumns;
    switch (column) {
        case 'orderDate': dbSortColumn = 'printful_created_at'; break;
        case 'fulfillmentStatus': dbSortColumn = 'status'; break;
        case 'displayOrderId': dbSortColumn = 'printful_external_id'; break;
        case 'customerName': dbSortColumn = 'recipient_name'; break;
        case 'totalAmount': dbSortColumn = 'total_amount'; break;
        default: dbSortColumn = 'printful_created_at'; // Fallback
    }

    if (sortColumn === dbSortColumn) {
      setSortDirection(prevDirection => (prevDirection === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(dbSortColumn);
      setSortDirection('asc'); // Default to ascending for new column
    }
    setCurrentPage(1); // Reset to page 1 on sort change
    // loadOrders will be called by useEffect due to sortColumn/sortDirection change
  };

  const totalPages = totalOrders > 0 ? Math.ceil(totalOrders / itemsPerPage) : 0;

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const renderPaginationItems = () => {
    if (!totalPages) return null;

    const pageNumbers = [];
    const maxPagesToShow = 5; // Max number of page links to show
    const ellipsis = <PaginationItem key="ellipsis"><PaginationEllipsis /></PaginationItem>;

    if (totalPages <= maxPagesToShow + 2) { // Show all pages if not too many
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(
          <PaginationItem key={i}>
            <PaginationLink href="#" onClick={(e) => { e.preventDefault(); handlePageChange(i); }} isActive={currentPage === i}>
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }
    } else {
      // Always show first page
      pageNumbers.push(
        <PaginationItem key={1}>
          <PaginationLink href="#" onClick={(e) => { e.preventDefault(); handlePageChange(1); }} isActive={currentPage === 1}>
            1
          </PaginationLink>
        </PaginationItem>
      );

      // Logic for ellipsis and middle pages
      if (currentPage > maxPagesToShow - 2) {
        pageNumbers.push(React.cloneElement(ellipsis, { key: "start-ellipsis" }));
      }

      let startPage = Math.max(2, currentPage - Math.floor((maxPagesToShow - 2) / 2));
      let endPage = Math.min(totalPages - 1, currentPage + Math.floor((maxPagesToShow - 2) / 2));
      
      if (currentPage < maxPagesToShow -1) {
        endPage = Math.min(totalPages -1, maxPagesToShow -1)
      }
      if (currentPage > totalPages - (maxPagesToShow - 2)) {
        startPage = Math.max(2, totalPages - (maxPagesToShow-2))
      }


      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(
          <PaginationItem key={i}>
            <PaginationLink href="#" onClick={(e) => { e.preventDefault(); handlePageChange(i); }} isActive={currentPage === i}>
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }

      if (currentPage < totalPages - (maxPagesToShow - 2)) {
         pageNumbers.push(React.cloneElement(ellipsis, { key: "end-ellipsis" }));
      }

      // Always show last page
      pageNumbers.push(
        <PaginationItem key={totalPages}>
          <PaginationLink href="#" onClick={(e) => { e.preventDefault(); handlePageChange(totalPages); }} isActive={currentPage === totalPages}>
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }
    return pageNumbers;
  };


  const SortableHeader: React.FC<{ displayColumn: SortableDisplayColumns; dbColumn: SortableDbColumns; title: string }> =
    ({ displayColumn, dbColumn, title }) => {
    const isCurrentSortColumn = sortColumn === dbColumn;
    return (
      <TableHead onClick={() => handleSort(displayColumn)} className="cursor-pointer">
        <div className="flex items-center">
          {title}
          {isCurrentSortColumn ? (
            <ArrowUpDown className={`ml-2 h-4 w-4 text-primary ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/50" />
          )}
        </div>
      </TableHead>
    );
  };


  // Initial loading state
  if (loading && !isRefreshing) {
    return (
      <AdminLayout>
        <div className="container mx-auto px-4 py-8 flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-4 text-lg">Loading orders...</p>
        </div>
      </AdminLayout>
    );
  }

  // Display critical error if present and not just refreshing (to avoid replacing table with error during refresh)
  if (error && !isRefreshing && orders.length === 0) {
    return (
      <AdminLayout>
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-2xl font-semibold mb-6 text-destructive">Error Fetching Printful Orders</h1>
          <p className="text-destructive-foreground bg-destructive/10 p-4 rounded-md">
            {error || "An unexpected error occurred. Please try refreshing or check the console for more details."}
          </p>
          <Button onClick={handleRefresh} className="mt-4" disabled={isRefreshing}>
            {isRefreshing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Try Again
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold mb-6">Printful Orders Management</h1>

        {/* Enhanced Filter UI Section */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Advanced Filters
                </CardTitle>
                <CardDescription>
                  Filter and search through {totalOrders} printful orders
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
              <form onSubmit={(e) => e.preventDefault()}>
                {/* Quick Search Row */}
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Quick search by customer name, order number, or shipping address..."
                      value={customerNameFilter}
                      onChange={(e) => setCustomerNameFilter(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                {/* Advanced Filters Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Items Ordered
                    </label>
                    <Input
                      placeholder="Product name..."
                      value={itemsOrderedFilter}
                      onChange={(e) => setItemsOrderedFilter(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Order Number</label>
                    <Input
                      placeholder="Exact order ID..."
                      value={printfulOrderNumberFilter}
                      onChange={(e) => setPrintfulOrderNumberFilter(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Fulfillment Status</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="fulfilled">Fulfilled</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
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
                    <Button type="button" onClick={handleApplyFilters} disabled={isRefreshing || loading}>
                      <Search className="mr-2 h-4 w-4" />
                      Apply Filters
                    </Button>
                    <Button type="button" variant="outline" onClick={handleClearFilters} disabled={isRefreshing || loading}>
                      <X className="mr-2 h-4 w-4" />
                      Clear All
                    </Button>
                  </div>
                  
                  <Button type="button" variant="outline" onClick={handleRefresh} disabled={isRefreshing || loading}>
                    {isRefreshing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Refresh Data
                  </Button>
                </div>
                
                {/* Active Filters Display */}
                {(customerNameFilter || itemsOrderedFilter || printfulOrderNumberFilter || (statusFilter && statusFilter !== 'all') || minAmountFilter || maxAmountFilter || (currencyFilter && currencyFilter !== 'all') || dateRangeFilter) && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm font-medium mb-2">Active Filters:</p>
                    <div className="flex flex-wrap gap-2">
                      {customerNameFilter && (
                        <Badge variant="secondary" className="gap-1">
                          Customer: {customerNameFilter}
                          <X className="h-3 w-3 cursor-pointer" onClick={() => setCustomerNameFilter('')} />
                        </Badge>
                      )}
                      {itemsOrderedFilter && (
                        <Badge variant="secondary" className="gap-1">
                          Items: {itemsOrderedFilter}
                          <X className="h-3 w-3 cursor-pointer" onClick={() => setItemsOrderedFilter('')} />
                        </Badge>
                      )}
                      {statusFilter && statusFilter !== 'all' && (
                        <Badge variant="secondary" className="gap-1">
                          Status: {statusFilter}
                          <X className="h-3 w-3 cursor-pointer" onClick={() => setStatusFilter('all')} />
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
              </form>
            </CardContent>
          )}
        </Card>

        {/* Orders Table - Always show the card structure */}
          <>
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Printful Orders
                    </CardTitle>
                    <CardDescription>
                      {totalOrders > 0 ? (
                        `Showing page ${currentPage} of ${totalPages} • ${totalOrders} total orders`
                      ) : (
                        'No orders found matching your criteria'
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={String(itemsPerPage)}
                      onValueChange={(value) => {
                        setItemsPerPage(Number(value));
                        setCurrentPage(1);
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
                  <SortableHeader displayColumn="displayOrderId" dbColumn="printful_external_id" title="Printful Order ID" />
                  <SortableHeader displayColumn="customerName" dbColumn="recipient_name" title="Customer Name" />
                  <SortableHeader displayColumn="orderDate" dbColumn="printful_created_at" title="Order Date" />
                  <SortableHeader displayColumn="fulfillmentStatus" dbColumn="status" title="Fulfillment Status" />
                  <SortableHeader displayColumn="totalAmount" dbColumn="total_amount" title="Total Amount" />
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>{order.displayOrderId}</TableCell>
                    <TableCell>{order.customerName}</TableCell>
                    <TableCell>{order.orderDate}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          order.fulfillmentStatus === 'fulfilled' ? 'default' :
                          order.fulfillmentStatus === 'shipped' ? 'secondary' :
                          order.fulfillmentStatus === 'pending' ? 'outline' :
                          order.fulfillmentStatus === 'cancelled' ? 'destructive' :
                          'outline'
                        }
                      >
                        {order.fulfillmentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(order.totalAmount, order.currencyCode)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCurrentOrderForModal(order);
                            setIsViewModalOpen(true);
                          }}
                        >
                          <Eye className="mr-2 h-4 w-4" /> 
                          View ({order.detailedItems.length})
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* No orders message */}
            {!loading && !isRefreshing && sortedOrders.length === 0 && !error && (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No orders found matching your criteria</p>
                <p className="text-sm">Try adjusting your filters or search terms</p>
              </div>
            )}

            {/* Modal for Viewing Order Items */}
            {currentOrderForModal && (
              <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
                <DialogContent className="sm:max-w-[625px]">
                  <DialogHeader>
                    <DialogTitle>Order Items - ID: {currentOrderForModal.displayOrderId}</DialogTitle>
                    <DialogDescription>
                      Details for items in order placed on {new Date(currentOrderForModal.created).toLocaleDateString()}.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
                    {currentOrderForModal.detailedItems.length > 0 ? (
                      currentOrderForModal.detailedItems.map((item: DetailedPrintfulItem) => (
                        <div key={item.printfulItemId} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 gap-y-2 p-2 border-b last:border-b-0">
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-xs text-muted-foreground">Variant: {item.variant}</p>
                            <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                          </div>
                          <div className="text-right">
                             <p className="text-xs text-muted-foreground">Retail Price</p>
                            <p>{formatCurrency(item.retailPrice, item.currencyCode)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Item Cost</p>
                            <p>{item.itemCost !== undefined && item.itemCost !== null ? formatCurrency(item.itemCost, item.currencyCode) : 'N/A'}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No items found for this order.</p>
                    )}
                  </div>
                  <DialogFooter>
                    <Button onClick={() => setIsViewModalOpen(false)}>Close</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {totalPages > 1 && (
              <Pagination className="mt-8">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => { e.preventDefault(); handlePageChange(currentPage - 1); }}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                  {renderPaginationItems()}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => { e.preventDefault(); handlePageChange(currentPage + 1); }}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </>

        {/* Summary Cards */}
        {orders.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                    <p className="text-2xl font-bold">{totalOrders}</p>
                  </div>
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Current Page</p>
                    <p className="text-2xl font-bold">{orders.length}</p>
                  </div>
                  <Eye className="h-8 w-8 text-muted-foreground" />
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
                          orders.reduce((sum, order) => sum + order.totalAmount, 0) / orders.length,
                          orders[0]?.currencyCode || 'USD'
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
                    <p className="text-sm font-medium text-muted-foreground">Total Items</p>
                    <p className="text-2xl font-bold">
                      {orders.reduce((sum, order) => sum + order.detailedItems.reduce((itemSum, item) => itemSum + item.quantity, 0), 0)}
                    </p>
                  </div>
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminPrintfulOrders;