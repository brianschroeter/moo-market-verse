import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getActiveFlashSales, FlashSale } from "@/services/flashSalesService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, ArrowRight } from "lucide-react";

interface FlashSaleBannerItemProps {
  flashSale: FlashSale;
}

const FlashSaleBannerItem: React.FC<FlashSaleBannerItemProps> = ({ flashSale }) => {
  const handleActionClick = () => {
    if (flashSale.action_url) {
      window.open(flashSale.action_url, '_blank');
    }
  };

  return (
    <div 
      className="relative overflow-hidden rounded-2xl p-8 md:p-12 py-10 md:py-16 shadow-2xl border border-white/10"
      style={{ 
        background: `linear-gradient(135deg, ${flashSale.banner_color} 0%, ${flashSale.banner_color}dd 100%)`,
        color: flashSale.text_color 
      }}
    >
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Noise texture overlay */}
        <div 
          className="absolute inset-0 opacity-10 mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            backgroundSize: '128px 128px'
          }}
        />
        
        {/* Dot pattern texture */}
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '20px 20px'
          }}
        />
        
        {/* Diagonal lines texture */}
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, white 2px, white 4px)',
            backgroundSize: '28px 28px'
          }}
        />
        
        {/* Animated gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 animate-pulse" />
        
        {/* Moving shine effect */}
        <div className="absolute top-0 left-0 w-32 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 animate-[shimmer_6s_ease-in-out_infinite]" />
        
        {/* Floating particles */}
        <div className="absolute top-4 left-1/4 w-2 h-2 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
        <div className="absolute top-8 right-1/3 w-1 h-1 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-6 left-1/3 w-1.5 h-1.5 bg-white/25 rounded-full animate-bounce" style={{ animationDelay: '2s' }} />
        
        {/* Textured gradient orbs */}
        <div className="absolute -top-8 -right-8 w-24 h-24 bg-white/10 rounded-full blur-xl animate-pulse" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1.5s' }} />
        
        {/* Geometric shapes for texture */}
        <div className="absolute top-1/4 right-1/4 w-8 h-8 border border-white/10 rotate-45 animate-spin" style={{ animationDuration: '20s' }} />
        <div className="absolute bottom-1/3 left-1/5 w-6 h-6 border border-white/15 rotate-12 animate-pulse" />
        <div className="absolute top-2/3 right-1/3 w-4 h-4 bg-white/5 transform rotate-45" />
      </div>


      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center gap-6">
        {/* Flash Sale Icon and Content */}
        <div className="flex items-center gap-4 flex-1">
          <div className="relative">
            <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 shadow-lg">
              <Zap className="h-8 w-8 animate-pulse" style={{ color: flashSale.text_color }} />
            </div>
            {/* Pulsing ring around icon */}
            <div className="absolute inset-0 rounded-full border-2 border-white/30 animate-ping" />
          </div>
          
          <div className="flex-1">
            <h3 className="font-fredoka font-bold text-2xl md:text-3xl leading-tight mb-2 animate-[fadeInUp_0.6s_ease-out]">
              {flashSale.title}
            </h3>
            {flashSale.description && (
              <div 
                className="text-base md:text-lg opacity-90 leading-relaxed animate-[fadeInUp_0.8s_ease-out]"
                dangerouslySetInnerHTML={{ __html: flashSale.description }}
              />
            )}
          </div>
        </div>

        {/* Discount Badge */}
        {flashSale.discount_text && (
          <div className="flex justify-center lg:justify-start">
            <div className="relative animate-[bounceIn_1s_ease-out]">
              <Badge 
                className="bg-white/25 backdrop-blur-sm border-2 border-white/40 font-bold text-xl md:text-2xl px-6 py-3 shadow-lg hover:scale-105 transition-transform duration-300"
                style={{ color: flashSale.text_color }}
              >
                {flashSale.discount_text}
              </Badge>
              {/* Glowing effect */}
              <div className="absolute inset-0 bg-white/20 rounded-full blur-md animate-pulse" />
            </div>
          </div>
        )}

        {/* Action Button */}
        {flashSale.action_text && flashSale.action_text.trim() && (
          <div className="flex justify-center lg:justify-end">
            <Button
              onClick={handleActionClick}
              className="bg-white/25 hover:bg-white/35 backdrop-blur-sm border-2 border-white/40 font-bold text-lg px-8 py-4 rounded-xl shadow-lg transition-all duration-300 group hover:scale-105 hover:shadow-xl animate-[slideInRight_1s_ease-out]"
              style={{ color: flashSale.text_color }}
            >
              {flashSale.action_text}
              <ArrowRight className="h-5 w-5 ml-3 group-hover:translate-x-2 transition-transform duration-300" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

const FlashSalesBanner: React.FC = () => {
  const { data: flashSales = [], isLoading } = useQuery({
    queryKey: ["flash-sales"],
    queryFn: getActiveFlashSales,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  if (isLoading || flashSales.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {flashSales.map((sale) => (
        <FlashSaleBannerItem
          key={sale.id}
          flashSale={sale}
        />
      ))}
    </div>
  );
};

export default FlashSalesBanner;