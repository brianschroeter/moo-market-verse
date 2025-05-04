
import React, { useState, useEffect } from "react";
import AdminLayout from "../../components/AdminLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  FeaturedProduct, 
  Announcement,
  fetchFeaturedProducts, 
  fetchAnnouncements,
  createProduct,
  updateProduct,
  toggleProductFeatured,
  createAnnouncement,
  updateAnnouncement,
  toggleAnnouncementActive
} from "@/services/featuredContentService";
import { format } from "date-fns";

const AdminFeaturedContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState("products");
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [showAnnouncementDialog, setShowAnnouncementDialog] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<FeaturedProduct> | null>(null);
  const [currentAnnouncement, setCurrentAnnouncement] = useState<Partial<Announcement> | null>(null);
  const [products, setProducts] = useState<FeaturedProduct[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (activeTab === "products") {
      loadProducts();
    } else if (activeTab === "announcements") {
      loadAnnouncements();
    }
  }, [activeTab]);

  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      const data = await fetchFeaturedProducts();
      setProducts(data);
    } catch (error) {
      console.error("Error loading products:", error);
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive"
      });
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadAnnouncements = async () => {
    try {
      setLoadingAnnouncements(true);
      const data = await fetchAnnouncements();
      setAnnouncements(data);
    } catch (error) {
      console.error("Error loading announcements:", error);
      toast({
        title: "Error",
        description: "Failed to load announcements",
        variant: "destructive"
      });
    } finally {
      setLoadingAnnouncements(false);
    }
  };

  const handleEditProduct = (product: FeaturedProduct) => {
    setCurrentProduct({...product});
    setShowProductDialog(true);
  };

  const handleEditAnnouncement = (announcement: Announcement) => {
    setCurrentAnnouncement({...announcement});
    setShowAnnouncementDialog(true);
  };

  const handleSaveProduct = async () => {
    if (!currentProduct) return;
    
    try {
      setSavingProduct(true);
      
      if (currentProduct.id) {
        // Update existing product
        await updateProduct(currentProduct.id, currentProduct);
        
        // Update local state
        setProducts(products.map(p => 
          p.id === currentProduct.id ? {...p, ...currentProduct} : p
        ));
        
        toast({
          title: "Product Updated",
          description: `Updated ${currentProduct.name} details`,
        });
      } else {
        // Create new product
        const newProduct = await createProduct(currentProduct as Omit<FeaturedProduct, 'id' | 'created_at' | 'updated_at'>);
        
        // Add to local state
        setProducts([newProduct, ...products]);
        
        toast({
          title: "Product Created",
          description: `Created new product: ${newProduct.name}`,
        });
      }
      
      setShowProductDialog(false);
    } catch (error) {
      console.error("Error saving product:", error);
      toast({
        title: "Error",
        description: "Failed to save product",
        variant: "destructive"
      });
    } finally {
      setSavingProduct(false);
    }
  };

  const handleSaveAnnouncement = async () => {
    if (!currentAnnouncement) return;
    
    try {
      setSavingAnnouncement(true);
      
      if (currentAnnouncement.id) {
        // Update existing announcement
        await updateAnnouncement(currentAnnouncement.id, currentAnnouncement);
        
        // Update local state
        setAnnouncements(announcements.map(a => 
          a.id === currentAnnouncement.id ? {...a, ...currentAnnouncement} : a
        ));
        
        toast({
          title: "Announcement Updated",
          description: `Updated ${currentAnnouncement.title} details`,
        });
      } else {
        // Create new announcement
        const newAnnouncement = await createAnnouncement(currentAnnouncement as Omit<Announcement, 'id' | 'created_at' | 'updated_at'>);
        
        // Add to local state
        setAnnouncements([newAnnouncement, ...announcements]);
        
        toast({
          title: "Announcement Created",
          description: `Created new announcement: ${newAnnouncement.title}`,
        });
      }
      
      setShowAnnouncementDialog(false);
    } catch (error) {
      console.error("Error saving announcement:", error);
      toast({
        title: "Error",
        description: "Failed to save announcement",
        variant: "destructive"
      });
    } finally {
      setSavingAnnouncement(false);
    }
  };

  const handleToggleFeatured = async (product: FeaturedProduct) => {
    try {
      const newFeaturedState = !product.featured;
      
      await toggleProductFeatured(product.id, newFeaturedState);
      
      // Update local state
      setProducts(products.map(p => 
        p.id === product.id ? {...p, featured: newFeaturedState} : p
      ));
      
      toast({
        title: newFeaturedState ? "Product Featured" : "Product Unfeatured",
        description: `${product.name} has been ${newFeaturedState ? "added to" : "removed from"} featured products`,
      });
    } catch (error) {
      console.error("Error toggling featured status:", error);
      toast({
        title: "Error",
        description: "Failed to update product status",
        variant: "destructive"
      });
    }
  };

  const handleToggleActive = async (announcement: Announcement) => {
    try {
      const newActiveState = !announcement.active;
      
      await toggleAnnouncementActive(announcement.id, newActiveState);
      
      // Update local state
      setAnnouncements(announcements.map(a => 
        a.id === announcement.id ? {...a, active: newActiveState} : a
      ));
      
      toast({
        title: newActiveState ? "Announcement Activated" : "Announcement Deactivated",
        description: `${announcement.title} has been ${newActiveState ? "activated" : "deactivated"}`,
      });
    } catch (error) {
      console.error("Error toggling active status:", error);
      toast({
        title: "Error",
        description: "Failed to update announcement status",
        variant: "destructive"
      });
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-fredoka text-white mb-2">Featured Content</h1>
        <p className="text-gray-400">Manage featured products and announcements shown on the site</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-lolcow-darkgray">
          <TabsTrigger 
            value="products" 
            className="data-[state=active]:bg-lolcow-blue data-[state=active]:text-white"
          >
            Featured Products
          </TabsTrigger>
          <TabsTrigger 
            value="announcements"
            className="data-[state=active]:bg-lolcow-blue data-[state=active]:text-white"
          >
            Announcements
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="products" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button 
              className="bg-lolcow-blue hover:bg-lolcow-blue/80"
              onClick={() => {
                setCurrentProduct({
                  name: "", 
                  description: "", 
                  image_url: "", 
                  product_url: "",
                  featured: true
                });
                setShowProductDialog(true);
              }}
            >
              Add New Product
            </Button>
          </div>
          
          <div className="lolcow-card overflow-hidden">
            {loadingProducts ? (
              <div className="flex justify-center items-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-lolcow-blue" />
                <span className="ml-2 text-white">Loading products...</span>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-lolcow-lightgray">
                    <TableHead className="text-gray-300">Product</TableHead>
                    <TableHead className="text-gray-300">Description</TableHead>
                    <TableHead className="text-gray-300">Status</TableHead>
                    <TableHead className="text-gray-300 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.length > 0 ? products.map((product) => (
                    <TableRow 
                      key={product.id}
                      className="border-b border-lolcow-lightgray hover:bg-lolcow-lightgray/10"
                    >
                      <TableCell className="py-4">
                        <div className="flex items-center">
                          <img 
                            src={product.image_url || "https://via.placeholder.com/300x200"} 
                            alt={product.name} 
                            className="w-12 h-12 object-cover rounded mr-3"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "https://via.placeholder.com/300x200";
                            }}
                          />
                          <div className="font-medium text-white">{product.name}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300 max-w-xs truncate">
                        {product.description}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${product.featured ? 'bg-green-500' : 'bg-gray-500'}`}>
                          {product.featured ? 'Featured' : 'Not Featured'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="border-lolcow-blue text-lolcow-blue hover:bg-lolcow-blue hover:text-white"
                            onClick={() => handleEditProduct(product)}
                          >
                            Edit
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleToggleFeatured(product)}
                            className={`
                              ${product.featured 
                                ? 'border-red-500 text-red-500 hover:bg-red-500' 
                                : 'border-green-500 text-green-500 hover:bg-green-500'} 
                              hover:text-white
                            `}
                          >
                            {product.featured ? 'Unfeature' : 'Feature'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-32 text-center text-gray-400">
                        No products available. Add your first product using the button above.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="announcements" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button 
              className="bg-lolcow-blue hover:bg-lolcow-blue/80"
              onClick={() => {
                setCurrentAnnouncement({
                  title: "", 
                  content: "", 
                  is_important: false,
                  active: true
                });
                setShowAnnouncementDialog(true);
              }}
            >
              Add New Announcement
            </Button>
          </div>
          
          <div className="lolcow-card overflow-hidden">
            {loadingAnnouncements ? (
              <div className="flex justify-center items-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-lolcow-blue" />
                <span className="ml-2 text-white">Loading announcements...</span>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-lolcow-lightgray">
                    <TableHead className="text-gray-300">Title</TableHead>
                    <TableHead className="text-gray-300">Content</TableHead>
                    <TableHead className="text-gray-300">Date</TableHead>
                    <TableHead className="text-gray-300">Status</TableHead>
                    <TableHead className="text-gray-300 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {announcements.length > 0 ? announcements.map((announcement) => (
                    <TableRow 
                      key={announcement.id}
                      className="border-b border-lolcow-lightgray hover:bg-lolcow-lightgray/10"
                    >
                      <TableCell className="py-4">
                        <div className="font-medium text-white flex items-center">
                          {announcement.is_important && (
                            <span className="mr-2 text-lolcow-red">
                              <i className="fa-solid fa-exclamation-circle"></i>
                            </span>
                          )}
                          {announcement.title}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300 max-w-xs truncate">
                        {announcement.content}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {format(new Date(announcement.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${announcement.active ? 'bg-green-500' : 'bg-gray-500'}`}>
                          {announcement.active ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="border-lolcow-blue text-lolcow-blue hover:bg-lolcow-blue hover:text-white"
                            onClick={() => handleEditAnnouncement(announcement)}
                          >
                            Edit
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleToggleActive(announcement)}
                            className={`
                              ${announcement.active 
                                ? 'border-red-500 text-red-500 hover:bg-red-500' 
                                : 'border-green-500 text-green-500 hover:bg-green-500'} 
                              hover:text-white
                            `}
                          >
                            {announcement.active ? 'Deactivate' : 'Activate'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-gray-400">
                        No announcements available. Add your first announcement using the button above.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Product Dialog */}
      <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
        <DialogContent className="bg-lolcow-darkgray text-white border-lolcow-lightgray">
          <DialogHeader>
            <DialogTitle className="text-xl font-fredoka">
              {currentProduct?.id ? 'Edit Product' : 'Add New Product'}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Update the details for this featured product
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-gray-300 mb-1">Product Name</label>
                <Input 
                  className="w-full py-2 px-3 rounded-md bg-lolcow-lightgray text-white border border-lolcow-lightgray"
                  value={currentProduct?.name || ''}
                  onChange={(e) => setCurrentProduct({...currentProduct, name: e.target.value})}
                  placeholder="Product Name"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 mb-1">Description</label>
                <Textarea
                  className="w-full py-2 px-3 rounded-md bg-lolcow-lightgray text-white border border-lolcow-lightgray min-h-[100px]"
                  value={currentProduct?.description || ''}
                  onChange={(e) => setCurrentProduct({...currentProduct, description: e.target.value})}
                  placeholder="Product Description"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 mb-1">Image URL</label>
                <Input 
                  className="w-full py-2 px-3 rounded-md bg-lolcow-lightgray text-white border border-lolcow-lightgray"
                  value={currentProduct?.image_url || ''}
                  onChange={(e) => setCurrentProduct({...currentProduct, image_url: e.target.value})}
                  placeholder="Image URL"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 mb-1">Product URL</label>
                <Input 
                  className="w-full py-2 px-3 rounded-md bg-lolcow-lightgray text-white border border-lolcow-lightgray"
                  value={currentProduct?.product_url || ''}
                  onChange={(e) => setCurrentProduct({...currentProduct, product_url: e.target.value})}
                  placeholder="Product URL"
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="featured"
                  checked={currentProduct?.featured || false}
                  onChange={(e) => setCurrentProduct({...currentProduct, featured: e.target.checked})}
                  className="mr-2 h-4 w-4"
                />
                <label htmlFor="featured" className="text-gray-300">Feature this product</label>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end mt-6">
            <Button
              className="mr-2 bg-lolcow-blue hover:bg-lolcow-blue/80"
              onClick={handleSaveProduct}
              disabled={savingProduct}
            >
              {savingProduct ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {currentProduct?.id ? 'Save Changes' : 'Add Product'}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowProductDialog(false)}
              disabled={savingProduct}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Edit Announcement Dialog */}
      <Dialog open={showAnnouncementDialog} onOpenChange={setShowAnnouncementDialog}>
        <DialogContent className="bg-lolcow-darkgray text-white border-lolcow-lightgray">
          <DialogHeader>
            <DialogTitle className="text-xl font-fredoka">
              {currentAnnouncement?.id ? 'Edit Announcement' : 'Add New Announcement'}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Update the details for this announcement
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-gray-300 mb-1">Title</label>
                <Input 
                  className="w-full py-2 px-3 rounded-md bg-lolcow-lightgray text-white border border-lolcow-lightgray"
                  value={currentAnnouncement?.title || ''}
                  onChange={(e) => setCurrentAnnouncement({...currentAnnouncement, title: e.target.value})}
                  placeholder="Announcement Title"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 mb-1">Content</label>
                <Textarea
                  className="w-full py-2 px-3 rounded-md bg-lolcow-lightgray text-white border border-lolcow-lightgray min-h-[100px]"
                  value={currentAnnouncement?.content || ''}
                  onChange={(e) => setCurrentAnnouncement({...currentAnnouncement, content: e.target.value})}
                  placeholder="Announcement Content"
                />
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="important"
                    checked={currentAnnouncement?.is_important || false}
                    onChange={(e) => setCurrentAnnouncement({...currentAnnouncement, is_important: e.target.checked})}
                    className="mr-2 h-4 w-4"
                  />
                  <label htmlFor="important" className="text-gray-300">Mark as important</label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="active"
                    checked={currentAnnouncement?.active || false}
                    onChange={(e) => setCurrentAnnouncement({...currentAnnouncement, active: e.target.checked})}
                    className="mr-2 h-4 w-4"
                  />
                  <label htmlFor="active" className="text-gray-300">Active</label>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end mt-6">
            <Button
              className="mr-2 bg-lolcow-blue hover:bg-lolcow-blue/80"
              onClick={handleSaveAnnouncement}
              disabled={savingAnnouncement}
            >
              {savingAnnouncement ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {currentAnnouncement?.id ? 'Save Changes' : 'Add Announcement'}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowAnnouncementDialog(false)}
              disabled={savingAnnouncement}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminFeaturedContent;
