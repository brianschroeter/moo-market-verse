import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Package, AlertCircle, Filter, X, Eye, ExternalLink } from 'lucide-react';
import { toast } from "sonner";
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DatabaseProduct {
  id: string;
  handle: string;
  title: string;
  description: string | null;
  vendor: string;
  product_type: string;
  price: number;
  image_url: string | null;
  tags: string[];
  status: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  collection_products?: Array<{
    collection_id: string;
    shopify_collections?: {
      title: string;
      handle: string;
    } | null;
  }>;
}

const AdminProducts: React.FC = () => {
  const [products, setProducts] = useState<DatabaseProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [vendorFilter, setVendorFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<DatabaseProduct | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  // Get unique vendors and types for filters
  const [vendors, setVendors] = useState<string[]>([]);
  const [productTypes, setProductTypes] = useState<string[]>([]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('shopify_products')
        .select(`
          *,
          collection_products (
            collection_id,
            shopify_collections (
              title,
              handle
            )
          )
        `)
        .order('title');

      if (error) throw error;

      setProducts(data || []);
      
      // Extract unique vendors and types
      const uniqueVendors = [...new Set(data?.map(p => p.vendor).filter(Boolean))];
      const uniqueTypes = [...new Set(data?.map(p => p.product_type).filter(Boolean))];
      
      setVendors(uniqueVendors);
      setProductTypes(uniqueTypes);
      
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = searchQuery === '' || 
      product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.handle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.vendor?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
    const matchesVendor = vendorFilter === 'all' || product.vendor === vendorFilter;
    const matchesType = typeFilter === 'all' || product.product_type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesVendor && matchesType;
  });

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

  const handleViewDetails = (product: DatabaseProduct) => {
    setSelectedProduct(product);
    setIsDetailModalOpen(true);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setVendorFilter('all');
    setTypeFilter('all');
    setCurrentPage(1);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">All Shopify Products</h1>
          <Badge variant="outline" className="text-lg">
            {filteredProducts.length} products
          </Badge>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Product Filters
                </CardTitle>
                <CardDescription>
                  Filter through all synced Shopify products
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
              <div className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products by name, handle, vendor, or tags..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-10"
                  />
                </div>
                
                {/* Filter row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                      <SelectTrigger>
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Vendor</label>
                    <Select value={vendorFilter} onValueChange={(v) => { setVendorFilter(v); setCurrentPage(1); }}>
                      <SelectTrigger>
                        <SelectValue placeholder="All vendors" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All vendors</SelectItem>
                        {vendors.map(vendor => (
                          <SelectItem key={vendor} value={vendor}>{vendor}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Product Type</label>
                    <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setCurrentPage(1); }}>
                      <SelectTrigger>
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        {productTypes.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex justify-between items-center pt-4">
                  <Button variant="outline" onClick={handleClearFilters}>
                    <X className="mr-2 h-4 w-4" />
                    Clear Filters
                  </Button>
                  
                  <div className="text-sm text-muted-foreground">
                    Showing {paginatedProducts.length} of {filteredProducts.length} products
                  </div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Products table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Published</TableHead>
                  <TableHead>Collections</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <div className="flex items-center justify-center">
                        <Package className="h-6 w-6 animate-spin mr-2" />
                        Loading products...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : paginatedProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <div className="flex flex-col items-center">
                        <AlertCircle className="h-12 w-12 text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">No products found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        {product.image_url ? (
                          <img 
                            src={product.image_url} 
                            alt={product.title}
                            className="w-12 h-12 object-cover rounded"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                            <Package className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{product.title}</TableCell>
                      <TableCell>{product.vendor || '-'}</TableCell>
                      <TableCell>{product.product_type || '-'}</TableCell>
                      <TableCell>{formatCurrency(product.price)}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={product.status === 'active' ? 'default' : 'secondary'}
                        >
                          {product.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {product.published_at ? (
                          <span className="text-sm">
                            {format(new Date(product.published_at), 'MMM dd, yyyy')}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Not published</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {product.collection_products?.length ? (
                          <Badge variant="outline">
                            {product.collection_products.length} collections
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(product)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <a 
                              href={`/products/${product.handle}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        )}

        {/* Product Detail Modal */}
        {selectedProduct && (
          <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{selectedProduct.title}</DialogTitle>
                <DialogDescription>
                  Product ID: {selectedProduct.id} | Handle: {selectedProduct.handle}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                {selectedProduct.image_url && (
                  <img 
                    src={selectedProduct.image_url} 
                    alt={selectedProduct.title}
                    className="w-full max-w-md mx-auto rounded-lg"
                  />
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-1">Vendor</h4>
                    <p>{selectedProduct.vendor || 'N/A'}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Product Type</h4>
                    <p>{selectedProduct.product_type || 'N/A'}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Price</h4>
                    <p>{formatCurrency(selectedProduct.price)}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Status</h4>
                    <Badge variant={selectedProduct.status === 'active' ? 'default' : 'secondary'}>
                      {selectedProduct.status}
                    </Badge>
                  </div>
                </div>
                
                {selectedProduct.description && (
                  <div>
                    <h4 className="font-semibold mb-1">Description</h4>
                    <p className="text-sm whitespace-pre-wrap">{selectedProduct.description}</p>
                  </div>
                )}
                
                {selectedProduct.tags && selectedProduct.tags.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-1">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedProduct.tags.map((tag, index) => (
                        <Badge key={index} variant="outline">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedProduct.collection_products && selectedProduct.collection_products.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-1">Collections</h4>
                    <div className="space-y-1">
                      {selectedProduct.collection_products.map((cp, index) => (
                        <div key={index}>
                          {cp.shopify_collections?.title || 'Unknown Collection'}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div>
                    <h4 className="font-semibold mb-1">Created</h4>
                    <p>{format(new Date(selectedProduct.created_at), 'PPpp')}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Updated</h4>
                    <p>{format(new Date(selectedProduct.updated_at), 'PPpp')}</p>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminProducts;