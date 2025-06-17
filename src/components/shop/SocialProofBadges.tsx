import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Eye, Flame, Clock, Users } from "lucide-react";

interface SocialProofBadgesProps {
  productId: string;
  isHot?: boolean;
  className?: string;
}

interface ProductMetrics {
  viewerCount: number;
  stockLevel: number;
  lastUpdated: number;
}

const STORAGE_KEY = "lolcow_product_metrics";
const UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes
const SESSION_DURATION = 60 * 60 * 1000; // 1 hour

const generateMetrics = (productId: string, isHot: boolean): ProductMetrics => {
  // Use product ID as seed for consistent randomization
  const seed = productId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const random = (seed * 9301 + 49297) % 233280 / 233280; // Seeded random
  
  const baseViewers = isHot ? 8 : 3;
  const viewerCount = Math.floor(baseViewers + random * (isHot ? 15 : 8));
  
  const stockLevel = Math.floor(2 + random * 8); // 2-10 items left
  
  return {
    viewerCount,
    stockLevel,
    lastUpdated: Date.now(),
  };
};

const getStoredMetrics = (productId: string): ProductMetrics | null => {
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}_${productId}`);
    if (stored) {
      const metrics: ProductMetrics = JSON.parse(stored);
      // Check if metrics are still valid (within session duration)
      if (Date.now() - metrics.lastUpdated < SESSION_DURATION) {
        return metrics;
      }
    }
  } catch (error) {
    console.error("Error reading stored metrics:", error);
  }
  return null;
};

const storeMetrics = (productId: string, metrics: ProductMetrics) => {
  try {
    localStorage.setItem(`${STORAGE_KEY}_${productId}`, JSON.stringify(metrics));
  } catch (error) {
    console.error("Error storing metrics:", error);
  }
};

const SocialProofBadges: React.FC<SocialProofBadgesProps> = ({ 
  productId, 
  isHot = false, 
  className = "" 
}) => {
  const [metrics, setMetrics] = useState<ProductMetrics | null>(null);
  const [showUrgency, setShowUrgency] = useState(false);

  useEffect(() => {
    // Get or generate metrics for this product
    let productMetrics = getStoredMetrics(productId);
    
    if (!productMetrics) {
      productMetrics = generateMetrics(productId, isHot);
      storeMetrics(productId, productMetrics);
    }
    
    setMetrics(productMetrics);
    
    // Show urgency indicators for low stock or hot products
    setShowUrgency(productMetrics.stockLevel <= 5 || isHot);
    
    // Update viewer count periodically
    const interval = setInterval(() => {
      const currentMetrics = getStoredMetrics(productId);
      if (currentMetrics && Date.now() - currentMetrics.lastUpdated > UPDATE_INTERVAL) {
        // Slightly adjust viewer count to simulate real activity
        const adjustment = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
        const newViewerCount = Math.max(1, currentMetrics.viewerCount + adjustment);
        
        const updatedMetrics = {
          ...currentMetrics,
          viewerCount: newViewerCount,
          lastUpdated: Date.now(),
        };
        
        storeMetrics(productId, updatedMetrics);
        setMetrics(updatedMetrics);
      }
    }, UPDATE_INTERVAL);
    
    return () => clearInterval(interval);
  }, [productId, isHot]);

  if (!metrics) return null;

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Live Viewer Count */}
      <Badge className="bg-blue-600/90 hover:bg-blue-600 text-white border-0 backdrop-blur-sm text-xs animate-pulse">
        <Eye className="h-3 w-3 mr-1" />
        {metrics.viewerCount} viewing
      </Badge>
      
      {/* Stock Urgency */}
      {showUrgency && metrics.stockLevel <= 5 && (
        <Badge className="bg-red-600/90 hover:bg-red-600 text-white border-0 backdrop-blur-sm text-xs animate-pulse">
          <Clock className="h-3 w-3 mr-1" />
          Only {metrics.stockLevel} left!
        </Badge>
      )}
      
      {/* Hot Item Indicator */}
      {isHot && (
        <Badge className="bg-orange-600/90 hover:bg-orange-600 text-white border-0 backdrop-blur-sm text-xs">
          <Flame className="h-3 w-3 mr-1" />
          Selling fast! 🔥
        </Badge>
      )}
      
      {/* Popular Item (for products with high viewer count) */}
      {metrics.viewerCount > 10 && (
        <Badge className="bg-purple-600/90 hover:bg-purple-600 text-white border-0 backdrop-blur-sm text-xs">
          <Users className="h-3 w-3 mr-1" />
          Popular choice
        </Badge>
      )}
    </div>
  );
};

export default SocialProofBadges;