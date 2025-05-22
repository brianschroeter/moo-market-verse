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
import { ArrowUpDown, Loader2, RefreshCw, Eye } from 'lucide-react';
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
  const [sortColumn, setSortColumn] = useState<SortableDbColumns>('printful_created_at'); // Default to DB column
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Modal state for viewing order items
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [currentOrderForModal, setCurrentOrderForModal] = useState<TransformedPrintfulOrder | null>(null);

  // Filter states
  const [customerNameFilter, setCustomerNameFilter] = useState<string>('');
  const [itemsOrderedFilter, setItemsOrderedFilter] = useState<string>('');
  const [printfulOrderNumberFilter, setPrintfulOrderNumberFilter] = useState<string>('');
  const [shippingAddressFilter, setShippingAddressFilter] = useState<string>(''); // This will be used for email or name

  // Debounced filter states for triggering API calls
  const [debouncedCustomerNameFilter, setDebouncedCustomerNameFilter] = useState<string>('');
  const [debouncedItemsOrderedFilter, setDebouncedItemsOrderedFilter] = useState<string>('');
  const [debouncedPrintfulOrderNumberFilter, setDebouncedPrintfulOrderNumberFilter] = useState<string>('');
  const [debouncedShippingAddressFilter, setDebouncedShippingAddressFilter] = useState<string>('');


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
      // When debounced filters change, we might want to reset to page 1
      // This is often desired behavior for new filter applications.
      // setCurrentPage(1); // Consider if this should be here or in loadOrders/useEffect below
    }, 500); // 500ms debounce delay

    return () => {
      clearTimeout(handler);
    };
  }, [customerNameFilter, itemsOrderedFilter, printfulOrderNumberFilter, shippingAddressFilter]);


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
  }, [loadOrders, debouncedCustomerNameFilter, debouncedItemsOrderedFilter, debouncedPrintfulOrderNumberFilter, debouncedShippingAddressFilter, currentPage, itemsPerPage, sortColumn, sortDirection]);

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
    setCurrentPage(1); // Reset to page 1
    // Explicitly call loadOrders with no filters.
    // This will also be picked up by the debounced useEffect if we clear debounced states too,
    // or we can call loadOrders directly.
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
        case 'displayOrderId': dbSortColumn = 'printful_internal_id'; break; // Or external_id if preferred
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
    ({ displayColumn, dbColumn, title }) => (
    <TableHead onClick={() => handleSort(displayColumn)} className="cursor-pointer">
      <div className="flex items-center">
        {title}
        {sortColumn === dbColumn && ( // Compare with the actual DB sort column
          <ArrowUpDown className={`ml-2 h-4 w-4 ${sortDirection === 'asc' ? 'rotate-180 text-primary' : 'text-primary'}`} />
        )}
        {sortColumn !== dbColumn && <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/50" />}
      </div>
    </TableHead>
  );


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

        {/* Filter UI Section */}
        <form onSubmit={(e) => e.preventDefault()} className="contents">
          {/* Using "contents" to avoid introducing an extra div that might break styling,
              assuming the original div was primarily for grouping and styling.
              If the div itself was a flex/grid container for layout beyond just its children,
              then the form should wrap the original div, or the div's styles moved.
              For now, assuming the div was a simple wrapper.
              A safer alternative if styling is an issue:
              <form onSubmit={(e) => e.preventDefault()}>
                <div className="mb-6 p-4 border rounded-lg bg-card shadow"> ... </div>
              </form>
              Let's go with wrapping the div for safety.
          */}
        </form>
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="mb-6 p-4 border rounded-lg bg-card shadow">
            <h2 className="text-lg font-medium mb-4">Filters</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input
                placeholder="Customer Name"
                value={customerNameFilter}
                onChange={(e) => setCustomerNameFilter(e.target.value)}
                className="max-w-sm"
              />
              <Input
                placeholder="Items Ordered (product name)"
                value={itemsOrderedFilter}
                onChange={(e) => setItemsOrderedFilter(e.target.value)}
                className="max-w-sm"
              />
              <Input
                placeholder="Printful Order Number (exact)"
                value={printfulOrderNumberFilter}
                onChange={(e) => setPrintfulOrderNumberFilter(e.target.value)}
                className="max-w-sm"
              />
              <Input
                placeholder="Shipping Address"
                value={shippingAddressFilter}
                onChange={(e) => setShippingAddressFilter(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <div className="mt-4 flex space-x-2 items-center">
              <Button type="button" onClick={handleApplyFilters} disabled={isRefreshing || loading}>Apply Filters</Button>
              <Button type="button" variant="outline" onClick={handleClearFilters} disabled={isRefreshing || loading}>Clear Filters</Button>
              <Button type="button" variant="outline" onClick={handleRefresh} disabled={isRefreshing || loading}>
                {isRefreshing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Refresh Data
              </Button>
            </div>
          </div>
        </form>

        {/* Display "No orders found" or the table, considering loading/refreshing states */}
        { !loading && !isRefreshing && sortedOrders.length === 0 && !error && (
            <p className="text-center py-4">No orders found matching your criteria.</p>
        )}

        { (sortedOrders.length > 0 || loading || isRefreshing) && (
          <>
            <Table>
              <TableCaption>A list of your Printful orders. Currently showing page {currentPage} of {totalPages}. Total Orders: {totalOrders}</TableCaption>
              <TableHeader>
                <TableRow>
                  <SortableHeader displayColumn="displayOrderId" dbColumn="printful_internal_id" title="Printful Order ID" />
                  <SortableHeader displayColumn="customerName" dbColumn="recipient_name" title="Customer Name" />
                  <SortableHeader displayColumn="orderDate" dbColumn="printful_created_at" title="Order Date" />
                  <SortableHeader displayColumn="fulfillmentStatus" dbColumn="status" title="Fulfillment Status" />
                  <SortableHeader displayColumn="totalAmount" dbColumn="total_amount" title="Total Amount" />
                  <TableHead>Items</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>{order.displayOrderId}</TableCell>
                    <TableCell>{order.customerName}</TableCell>
                    <TableCell>{order.orderDate}</TableCell>
                    <TableCell>{order.fulfillmentStatus}</TableCell>
                    <TableCell>{formatCurrency(order.totalAmount, order.currencyCode)}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCurrentOrderForModal(order);
                          setIsViewModalOpen(true);
                        }}
                      >
                        <Eye className="mr-2 h-4 w-4" /> View Items ({order.detailedItems.length})
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

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
        )}
         <div className="mt-4 text-sm text-muted-foreground">
            Items per page:
            <select
                value={itemsPerPage}
                onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1); // Reset to first page
                }}
                className="ml-2 p-1 border rounded bg-background text-foreground"
            >
                {[10, 20, 50, 100].map(size => (
                    <option key={size} value={size}>{size}</option>
                ))}
            </select>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminPrintfulOrders;