
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  isImportant?: boolean;
}

interface FeaturedProduct {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  url: string;
}

interface AnnouncementsProps {
  announcements?: Announcement[];
  featuredProducts?: FeaturedProduct[];
}

const Announcements: React.FC<AnnouncementsProps> = ({ 
  announcements = [], 
  featuredProducts = [] 
}) => {
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
                  announcement.isImportant 
                    ? "bg-lolcow-red/20 border border-lolcow-red" 
                    : "bg-lolcow-lightgray"
                }`}
              >
                <div className="flex justify-between items-start">
                  <h4 className="text-white font-medium">{announcement.title}</h4>
                  <span className="text-gray-400 text-sm">{announcement.date}</span>
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
                      src={product.imageUrl} 
                      alt={product.name} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <h4 className="text-white font-medium">{product.name}</h4>
                    <p className="text-gray-300 text-sm mt-1 line-clamp-2">{product.description}</p>
                    <Button 
                      asChild
                      className="mt-3 bg-lolcow-blue hover:bg-lolcow-blue/80 text-white w-full"
                    >
                      <a href={product.url} target="_blank" rel="noopener noreferrer">View Product</a>
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
