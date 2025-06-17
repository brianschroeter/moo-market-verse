import React from "react";
import { Badge } from "@/components/ui/badge";
import { Clock, Sparkles } from "lucide-react";

interface ComingSoonCardProps {
  className?: string;
}

const ComingSoonCard: React.FC<ComingSoonCardProps> = ({ className = "" }) => {
  return (
    <div className={`relative bg-gradient-to-br from-lolcow-darkgray to-lolcow-black rounded-2xl overflow-hidden border border-lolcow-lightgray/20 ${className}`}>
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-lolcow-blue/20 to-lolcow-red/20 animate-pulse" />
      
      {/* Image Section with Heavy Blur */}
      <div className="relative aspect-[4/3] overflow-hidden">
        {/* Mystery Product Image */}
        <div className="w-full h-full bg-gradient-to-br from-lolcow-lightgray to-lolcow-darkgray flex items-center justify-center">
          {/* Simulated blurred clothing silhouette */}
          <div className="relative w-full h-full">
            {/* Base shape */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-48 h-56 bg-white/10 rounded-lg blur-2xl" />
            </div>
            {/* Additional blur layers for depth */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-40 h-48 bg-lolcow-blue/20 rounded-full blur-3xl animate-float" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-40 bg-lolcow-red/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
            </div>
          </div>
        </div>
        
        {/* Heavy Overlay */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-lg" />
        
        {/* Coming Soon Badge */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <Badge className="bg-purple-600/90 hover:bg-purple-600 text-white border-0 backdrop-blur-sm text-lg px-4 py-2 animate-pulse">
            <Clock className="h-5 w-5 mr-2" />
            COMING SOON
          </Badge>
        </div>
        
        {/* Mystery Sparkles */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <Sparkles className="h-16 w-16 text-white/60 animate-pulse" />
            <Sparkles className="absolute top-0 left-0 h-16 w-16 text-white/40 animate-pulse" style={{ animationDelay: '1s' }} />
          </div>
        </div>
      </div>
      
      {/* Content Section */}
      <div className="p-8">
        <div className="min-h-[140px]">
          <h3 className="font-fredoka font-bold text-2xl text-white mb-3 text-center animate-pulse">
            Something Special
          </h3>
          
          <p className="text-gray-300 text-base leading-relaxed text-center mb-6">
            We're cooking up something amazing for you. Stay tuned for our latest drop!
          </p>
          
          {/* Teaser Text */}
          <div className="text-center">
            <p className="text-lolcow-blue text-sm font-medium">
              New releases every month
            </p>
          </div>
        </div>
        
        {/* Footer Section */}
        <div className="flex items-center justify-center mt-6">
          <Badge className="bg-gradient-to-r from-lolcow-blue to-lolcow-red text-white border-0 text-lg px-6 py-3">
            Be Ready
          </Badge>
        </div>
      </div>
    </div>
  );
};

export default ComingSoonCard;