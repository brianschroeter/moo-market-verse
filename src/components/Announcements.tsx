
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchActiveAnnouncements, fetchActiveProducts, Announcement, FeaturedProduct } from "@/services/featuredContentService";
import { format } from "date-fns";

interface AnnouncementsProps {
  announcements?: Announcement[];
  featuredProducts?: FeaturedProduct[];
  loadFromDb?: boolean;
}

const Announcements: React.FC<AnnouncementsProps> = ({ 
  announcements: initialAnnouncements = [], 
  featuredProducts: initialProducts = [],
  loadFromDb = false
}) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements);
  const [featuredProducts, setFeaturedProducts] = useState<FeaturedProduct[]>(initialProducts);
  const [isLoading, setIsLoading] = useState<boolean>(loadFromDb);

  useEffect(() => {
    if (loadFromDb) {
      const loadContent = async () => {
        try {
          setIsLoading(true);
          
          const [announcementsData, productsData] = await Promise.all([
            fetchActiveAnnouncements(),
            fetchActiveProducts()
          ]);
          
          setAnnouncements(announcementsData);
          setFeaturedProducts(productsData);
        } catch (error) {
          console.error("Error loading announcements/products:", error);
        } finally {
          setIsLoading(false);
        }
      };

      loadContent();
    }
  }, [loadFromDb]);

  if (isLoading) {
    return (
      <Card className="lolcow-card w-full">
        <CardHeader>
          <CardTitle className="text-xl font-fredoka text-white">
            <i className="fa-solid fa-bell text-lolcow-blue mr-2"></i> Announcements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-gray-300">Loading announcements and featured products...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="lolcow-card w-full">
      <CardHeader>
        <CardTitle className="text-xl font-fredoka text-white">
          <i className="fa-solid fa-bell text-lolcow-blue mr-2"></i> Announcements
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Announcements */}
        {announcements.length > 0 && (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <div 
                key={announcement.id} 
                className={`p-4 rounded-lg ${
                  announcement.is_important 
                    ? "bg-lolcow-red/20 border border-lolcow-red" 
                    : "bg-lolcow-lightgray"
                }`}
              >
                <div className="flex justify-between items-start">
                  <h4 className="text-white font-medium">{announcement.title}</h4>
                  <span className="text-gray-400 text-sm">
                    {format(new Date(announcement.created_at), 'MMM d, yyyy')}
                  </span>
                </div>
                <p className="text-gray-300 mt-2">{announcement.content}</p>
              </div>
            ))}
          </div>
        )}

        {/* Featured Products */}
        {featuredProducts.length > 0 && (
          <div>
            <h3 className="text-white text-lg mb-3">Featured Products</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {featuredProducts.map((product) => (
                <div key={product.id} className="bg-lolcow-lightgray rounded-lg overflow-hidden">
                  <div className="h-40 overflow-hidden">
                    <img 
                      src={product.image_url} 
                      alt={product.name} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://via.placeholder.com/300x200";
                      }}
                    />
                  </div>
                  <div className="p-4">
                    <h4 className="text-white font-medium">{product.name}</h4>
                    <p className="text-gray-300 text-sm mt-1 line-clamp-2">{product.description}</p>
                    <Button 
                      asChild
                      className="mt-3 bg-lolcow-blue hover:bg-lolcow-blue/80 text-white w-full"
                    >
                      <a href={product.product_url || product.link} target="_blank" rel="noopener noreferrer">View Product</a>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {announcements.length === 0 && featuredProducts.length === 0 && (
          <div className="text-center py-6">
            <p className="text-gray-300">No announcements or featured products at this time.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Announcements;
