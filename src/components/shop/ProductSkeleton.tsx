import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

const ProductSkeleton: React.FC = () => {
  return (
    <div className="group relative bg-gradient-to-br from-lolcow-darkgray to-lolcow-black rounded-2xl overflow-hidden border border-lolcow-lightgray/20">
      {/* Image skeleton */}
      <div className="relative overflow-hidden aspect-square">
        <Skeleton className="w-full h-full bg-lolcow-lightgray/20" />
      </div>
      
      {/* Content skeleton */}
      <div className="p-8">
        <div className="min-h-[140px]">
          {/* Title skeleton */}
          <Skeleton className="h-8 w-3/4 mb-3 bg-lolcow-lightgray/20" />
          
          {/* Description skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-full bg-lolcow-lightgray/20" />
            <Skeleton className="h-4 w-5/6 bg-lolcow-lightgray/20" />
            <Skeleton className="h-4 w-2/3 bg-lolcow-lightgray/20" />
          </div>
        </div>
        
        {/* Footer skeleton */}
        <div className="flex items-center justify-between mt-6">
          <Skeleton className="h-8 w-24 bg-lolcow-lightgray/20" />
          <Skeleton className="h-12 w-32 bg-lolcow-lightgray/20 rounded-md" />
        </div>
      </div>
    </div>
  );
};

export default ProductSkeleton;