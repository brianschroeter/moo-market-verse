import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { OrderMappingService } from '@/services/orderMappingService';
import type {
  OrderMappingWithDetails,
  UnmappedPrintfulOrder,
  OrderMappingStats,
  OrderClassification,
  OrderMappingFilters
} from '@/services/types/orderMapping-types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { 
  BarChart3, 
  Link, 
  Unlink, 
  Search, 
  Filter, 
  RefreshCw, 
  Loader2, 
  AlertTriangle,
  CheckCircle,
  Gift,
  Wrench,
  TrendingUp,
  Eye,
  Edit,
  Trash2,
  Zap
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

const OrderReports: React.FC = () => {
  // State management
  const [stats, setStats] = useState<OrderMappingStats | null>(null);
  const [mappings, setMappings] = useState<OrderMappingWithDetails[]>([]);
  const [unmappedOrders, setUnmappedOrders] = useState<UnmappedPrintfulOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalMappings, setTotalMappings] = useState(0);
  const [totalUnmapped, setTotalUnmapped] = useState(0);

  // Filter states
  const [filters, setFilters] = useState<OrderMappingFilters>({
    classification: 'all',
    mapped_status: 'all',
    limit: 50,
    offset: 0
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [showFilters, setShowFilters] = useState(false);

  // Modal states
  const [mappingModalOpen, setMappingModalOpen] = useState(false);
  const [selectedPrintfulOrder, setSelectedPrintfulOrder] = useState<UnmappedPrintfulOrder | null>(null);
  const [selectedClassification, setSelectedClassification] = useState<OrderClassification>('normal');
  const [selectedShopifyOrder, setSelectedShopifyOrder] = useState<number | null>(null);
  const [mappingNotes, setMappingNotes] = useState('');

  // Load data
  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Prepare filters
      const currentFilters: OrderMappingFilters = {
        ...filters,
        search_query: searchQuery || undefined,
        date_from: dateRange?.from?.toISOString(),
        date_to: dateRange?.to?.toISOString()
      };

      // Load mappings and unmapped orders in parallel
      const [mappingsResult, unmappedResult] = await Promise.all([
        OrderMappingService.getOrderMappings(currentFilters),
        OrderMappingService.getUnmappedPrintfulOrders(50, 0)
      ]);

      setMappings(mappingsResult.mappings);
      setTotalMappings(mappingsResult.total_count);
      setStats(mappingsResult.stats);
      setUnmappedOrders(unmappedResult.orders);
      setTotalUnmapped(unmappedResult.total_count);

    } catch (error) {
      console.error('Failed to load order mapping data:', error);
      toast.error('Failed to load order data', {
        description: 'Please try refreshing the page'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters, searchQuery, dateRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle manual mapping
  const handleCreateMapping = async () => {
    if (!selectedPrintfulOrder) return;

    try {
      await OrderMappingService.createOrderMapping({
        printful_order_id: selectedPrintfulOrder.printful_internal_id,
        shopify_order_id: selectedShopifyOrder,
        classification: selectedClassification,
        notes: mappingNotes || undefined
      });

      toast.success('Order mapping created successfully');
      setMappingModalOpen(false);
      setSelectedPrintfulOrder(null);
      setSelectedShopifyOrder(null);
      setSelectedClassification('normal');
      setMappingNotes('');
      loadData(true);
    } catch (error) {
      console.error('Failed to create mapping:', error);
      toast.error('Failed to create mapping');
    }
  };

  // Handle auto-mapping
  const handleAutoMap = async () => {
    try {
      setRefreshing(true);
      const result = await OrderMappingService.autoMapOrders();
      
      toast.success(`Auto-mapping completed`, {
        description: `${result.successful_mappings} orders mapped successfully`
      });
      
      loadData(true);
    } catch (error) {
      console.error('Failed to auto-map orders:', error);
      toast.error('Auto-mapping failed');
    }
  };

  // Utility functions
  const getClassificationBadge = (classification: OrderClassification) => {
    const variants = {
      normal: 'default',
      corrective: 'secondary',
      gift: 'outline'
    } as const;

    const icons = {
      normal: Link,
      corrective: Wrench,
      gift: Gift
    };

    const Icon = icons[classification];

    return (
      <Badge variant={variants[classification]} className="gap-1">
        <Icon className="h-3 w-3" />
        {classification}
      </Badge>
    );
  };

  const formatCurrency = (amount: number, currency: string) => {
    try {
      return new Intl.NumberFormat(undefined, { 
        style: 'currency', 
        currency: currency 
      }).format(amount);
    } catch {
      return `${amount.toFixed(2)} ${currency}`;
    }
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="container mx-auto px-4 py-8 flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-4 text-lg">Loading order reports...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              Order Reports & Mapping
            </h1>
            <p className="text-muted-foreground">
              Map Printful orders to Shopify orders and manage order classifications
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => loadData(true)} disabled={refreshing}>
              {refreshing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>
            <Button onClick={handleAutoMap} disabled={refreshing}>
              <Zap className="mr-2 h-4 w-4" />
              Auto-Map Orders
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                    <p className="text-2xl font-bold">{stats.total_printful_orders}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Mapped Orders</p>
                    <p className="text-2xl font-bold text-green-600">{stats.mapped_orders}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Unmapped Orders</p>
                    <p className="text-2xl font-bold text-orange-600">{stats.unmapped_orders}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Mapping %</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.mapping_percentage}%</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                {showFilters ? 'Hide' : 'Show'} Filters
              </Button>
            </div>
          </CardHeader>
          
          {showFilters && (
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Order ID, customer name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Classification</label>
                  <Select
                    value={filters.classification}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, classification: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Classifications</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="corrective">Corrective</SelectItem>
                      <SelectItem value="gift">Gift</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select
                    value={filters.mapped_status}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, mapped_status: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Orders</SelectItem>
                      <SelectItem value="mapped">Mapped</SelectItem>
                      <SelectItem value="unmapped">Unmapped</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Date Range</label>
                  <DatePickerWithRange
                    date={dateRange}
                    onDateChange={setDateRange}
                    placeholder="Select date range"
                  />
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="unmapped" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="unmapped" className="flex items-center gap-2">
              <Unlink className="h-4 w-4" />
              Unmapped Orders ({totalUnmapped})
            </TabsTrigger>
            <TabsTrigger value="mapped" className="flex items-center gap-2">
              <Link className="h-4 w-4" />
              Mapped Orders ({totalMappings})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="unmapped" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Unmapped Printful Orders</CardTitle>
                <CardDescription>
                  Printful orders that haven't been mapped to Shopify orders yet
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Printful Order</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Suggestions</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unmappedOrders.map((order) => (
                      <TableRow key={order.printful_internal_id}>
                        <TableCell className="font-medium">
                          {order.printful_external_id}
                        </TableCell>
                        <TableCell>{order.recipient_name}</TableCell>
                        <TableCell>
                          {formatCurrency(order.total_amount, order.currency)}
                        </TableCell>
                        <TableCell>
                          {format(new Date(order.printful_created_at), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          {order.suggested_shopify_matches?.length || 0} matches
                          {order.suggested_shopify_matches?.[0] && (
                            <div className="text-xs text-muted-foreground">
                              Best: {(order.suggested_shopify_matches[0].match_score * 100).toFixed(0)}% match
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedPrintfulOrder(order);
                              setMappingModalOpen(true);
                            }}
                          >
                            <Link className="mr-2 h-4 w-4" />
                            Map Order
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mapped" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Mapped Orders</CardTitle>
                <CardDescription>
                  Orders that have been successfully mapped between Printful and Shopify
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Printful Order</TableHead>
                      <TableHead>Shopify Order</TableHead>
                      <TableHead>Classification</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Mapped By</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mappings.map((mapping) => (
                      <TableRow key={mapping.id}>
                        <TableCell className="font-medium">
                          {mapping.printful_order?.printful_external_id || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {mapping.shopify_order?.shopify_order_number || 
                           (mapping.classification !== 'normal' ? `${mapping.classification} order` : 'N/A')}
                        </TableCell>
                        <TableCell>
                          {getClassificationBadge(mapping.classification)}
                        </TableCell>
                        <TableCell>
                          {mapping.printful_order?.recipient_name || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {mapping.printful_order ? 
                            formatCurrency(mapping.printful_order.total_amount, mapping.printful_order.currency) : 
                            'N/A'}
                        </TableCell>
                        <TableCell>
                          {mapping.mapped_by_profile?.display_name || 
                           mapping.mapped_by_profile?.discord_username || 
                           'System'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm">
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Edit className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Manual Mapping Modal */}
        <Dialog open={mappingModalOpen} onOpenChange={setMappingModalOpen}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Map Printful Order</DialogTitle>
              <DialogDescription>
                Map Printful order {selectedPrintfulOrder?.printful_external_id} to a Shopify order or mark it as corrective/gift
              </DialogDescription>
            </DialogHeader>

            {selectedPrintfulOrder && (
              <div className="space-y-6">
                {/* Printful Order Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Printful Order Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium">Order ID</p>
                        <p>{selectedPrintfulOrder.printful_external_id}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Customer</p>
                        <p>{selectedPrintfulOrder.recipient_name}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Amount</p>
                        <p>{formatCurrency(selectedPrintfulOrder.total_amount, selectedPrintfulOrder.currency)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Date</p>
                        <p>{format(new Date(selectedPrintfulOrder.printful_created_at), 'MMM dd, yyyy HH:mm')}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Classification Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Order Classification</label>
                  <Select value={selectedClassification} onValueChange={setSelectedClassification}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal - Map to Shopify order</SelectItem>
                      <SelectItem value="corrective">Corrective - No Shopify order</SelectItem>
                      <SelectItem value="gift">Gift - No Shopify order</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Shopify Order Selection (only for normal classification) */}
                {selectedClassification === 'normal' && selectedPrintfulOrder.suggested_shopify_matches && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Suggested Shopify Matches</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {selectedPrintfulOrder.suggested_shopify_matches.map((match) => (
                          <div
                            key={match.shopify_order_id}
                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                              selectedShopifyOrder === match.shopify_order_id
                                ? 'border-primary bg-primary/5'
                                : 'hover:bg-muted/50'
                            }`}
                            onClick={() => setSelectedShopifyOrder(match.shopify_order_id)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{match.shopify_order_number}</p>
                                <p className="text-sm text-muted-foreground">{match.customer_name}</p>
                                <p className="text-sm">{formatCurrency(match.total_amount, match.currency)}</p>
                              </div>
                              <div className="text-right">
                                <Badge 
                                  variant="outline" 
                                  className={getMatchScoreColor(match.match_score)}
                                >
                                  {(match.match_score * 100).toFixed(0)}% match
                                </Badge>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {match.match_reasons.join(', ')}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Notes */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Notes (optional)</label>
                  <Textarea
                    placeholder="Add any notes about this mapping..."
                    value={mappingNotes}
                    onChange={(e) => setMappingNotes(e.target.value)}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setMappingModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateMapping}
                disabled={selectedClassification === 'normal' && !selectedShopifyOrder}
              >
                Create Mapping
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default OrderReports;