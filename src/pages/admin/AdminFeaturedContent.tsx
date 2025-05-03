
import React, { useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Mock data for featured products and announcements
const mockProducts = [
  {
    id: "p1",
    name: "LolCow T-Shirt",
    description: "Limited edition LolCow mascot t-shirt. Available in multiple sizes.",
    imageUrl: "https://via.placeholder.com/300x200",
    url: "#",
    featured: true
  },
  {
    id: "p2",
    name: "LolCow Mug",
    description: "Start your day with the official LolCow coffee mug.",
    imageUrl: "https://via.placeholder.com/300x200",
    url: "#",
    featured: true
  },
  {
    id: "p3",
    name: "LolCow Hoodie",
    description: "Stay warm with this premium LolCow hoodie.",
    imageUrl: "https://via.placeholder.com/300x200",
    url: "#",
    featured: false
  }
];

const mockAnnouncements = [
  {
    id: "a1",
    title: "New Discord Server Rules",
    content: "We've updated our Discord server rules. Please review them before participating in discussions.",
    date: "May 1, 2025",
    isImportant: true,
    active: true
  },
  {
    id: "a2",
    title: "Upcoming Live Stream",
    content: "Join us this Friday at 8PM EST for a special live stream event!",
    date: "Apr 30, 2025",
    isImportant: false,
    active: true
  },
  {
    id: "a3",
    title: "Website Maintenance",
    content: "The website will be down for maintenance on Sunday from 2AM to 4AM EST.",
    date: "Apr 25, 2025",
    isImportant: true,
    active: false
  }
];

const AdminFeaturedContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState("products");
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [showAnnouncementDialog, setShowAnnouncementDialog] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<any>(null);
  const [currentAnnouncement, setCurrentAnnouncement] = useState<any>(null);
  const { toast } = useToast();

  const handleEditProduct = (product: any) => {
    setCurrentProduct({...product});
    setShowProductDialog(true);
  };

  const handleEditAnnouncement = (announcement: any) => {
    setCurrentAnnouncement({...announcement});
    setShowAnnouncementDialog(true);
  };

  const handleSaveProduct = () => {
    // In a real app, we would send this to the API
    toast({
      title: "Product Updated",
      description: `Updated ${currentProduct.name} details`,
    });
    setShowProductDialog(false);
  };

  const handleSaveAnnouncement = () => {
    // In a real app, we would send this to the API
    toast({
      title: "Announcement Updated",
      description: `Updated ${currentAnnouncement.title} details`,
    });
    setShowAnnouncementDialog(false);
  };

  const handleToggleFeatured = (product: any) => {
    // In a real app, we would send this to the API
    toast({
      title: product.featured ? "Product Unfeatured" : "Product Featured",
      description: `${product.name} has been ${product.featured ? "removed from" : "added to"} featured products`,
    });
  };

  const handleToggleActive = (announcement: any) => {
    // In a real app, we would send this to the API
    toast({
      title: announcement.active ? "Announcement Deactivated" : "Announcement Activated",
      description: `${announcement.title} has been ${announcement.active ? "deactivated" : "activated"}`,
    });
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
                  id: "", 
                  name: "", 
                  description: "", 
                  imageUrl: "", 
                  url: "",
                  featured: true
                });
                setShowProductDialog(true);
              }}
            >
              Add New Product
            </Button>
          </div>
          
          <div className="lolcow-card overflow-hidden">
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
                {mockProducts.map((product) => (
                  <TableRow 
                    key={product.id}
                    className="border-b border-lolcow-lightgray hover:bg-lolcow-lightgray/10"
                  >
                    <TableCell className="py-4">
                      <div className="flex items-center">
                        <img 
                          src={product.imageUrl} 
                          alt={product.name} 
                          className="w-12 h-12 object-cover rounded mr-3"
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
                          onClick={() => handleToggleFeatured({...product, featured: !product.featured})}
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
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        
        <TabsContent value="announcements" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button 
              className="bg-lolcow-blue hover:bg-lolcow-blue/80"
              onClick={() => {
                setCurrentAnnouncement({
                  id: "", 
                  title: "", 
                  content: "", 
                  date: new Date().toISOString().split('T')[0],
                  isImportant: false,
                  active: true
                });
                setShowAnnouncementDialog(true);
              }}
            >
              Add New Announcement
            </Button>
          </div>
          
          <div className="lolcow-card overflow-hidden">
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
                {mockAnnouncements.map((announcement) => (
                  <TableRow 
                    key={announcement.id}
                    className="border-b border-lolcow-lightgray hover:bg-lolcow-lightgray/10"
                  >
                    <TableCell className="py-4">
                      <div className="font-medium text-white flex items-center">
                        {announcement.isImportant && (
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
                    <TableCell className="text-gray-300">{announcement.date}</TableCell>
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
                          onClick={() => handleToggleActive({...announcement, active: !announcement.active})}
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
                ))}
              </TableBody>
            </Table>
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
                <input 
                  type="text" 
                  className="w-full py-2 px-3 rounded-md bg-lolcow-lightgray text-white border border-lolcow-lightgray"
                  value={currentProduct?.name || ''}
                  onChange={(e) => setCurrentProduct({...currentProduct, name: e.target.value})}
                  placeholder="Product Name"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 mb-1">Description</label>
                <textarea
                  className="w-full py-2 px-3 rounded-md bg-lolcow-lightgray text-white border border-lolcow-lightgray min-h-[100px]"
                  value={currentProduct?.description || ''}
                  onChange={(e) => setCurrentProduct({...currentProduct, description: e.target.value})}
                  placeholder="Product Description"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 mb-1">Image URL</label>
                <input 
                  type="text" 
                  className="w-full py-2 px-3 rounded-md bg-lolcow-lightgray text-white border border-lolcow-lightgray"
                  value={currentProduct?.imageUrl || ''}
                  onChange={(e) => setCurrentProduct({...currentProduct, imageUrl: e.target.value})}
                  placeholder="Image URL"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 mb-1">Product URL</label>
                <input 
                  type="text" 
                  className="w-full py-2 px-3 rounded-md bg-lolcow-lightgray text-white border border-lolcow-lightgray"
                  value={currentProduct?.url || ''}
                  onChange={(e) => setCurrentProduct({...currentProduct, url: e.target.value})}
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
            >
              {currentProduct?.id ? 'Save Changes' : 'Add Product'}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowProductDialog(false)}
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
                <input 
                  type="text" 
                  className="w-full py-2 px-3 rounded-md bg-lolcow-lightgray text-white border border-lolcow-lightgray"
                  value={currentAnnouncement?.title || ''}
                  onChange={(e) => setCurrentAnnouncement({...currentAnnouncement, title: e.target.value})}
                  placeholder="Announcement Title"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 mb-1">Content</label>
                <textarea
                  className="w-full py-2 px-3 rounded-md bg-lolcow-lightgray text-white border border-lolcow-lightgray min-h-[100px]"
                  value={currentAnnouncement?.content || ''}
                  onChange={(e) => setCurrentAnnouncement({...currentAnnouncement, content: e.target.value})}
                  placeholder="Announcement Content"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 mb-1">Date</label>
                <input 
                  type="date" 
                  className="w-full py-2 px-3 rounded-md bg-lolcow-lightgray text-white border border-lolcow-lightgray"
                  value={currentAnnouncement?.date || ''}
                  onChange={(e) => setCurrentAnnouncement({...currentAnnouncement, date: e.target.value})}
                />
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="important"
                    checked={currentAnnouncement?.isImportant || false}
                    onChange={(e) => setCurrentAnnouncement({...currentAnnouncement, isImportant: e.target.checked})}
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
            >
              {currentAnnouncement?.id ? 'Save Changes' : 'Add Announcement'}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowAnnouncementDialog(false)}
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
