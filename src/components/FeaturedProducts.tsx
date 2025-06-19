import React, { useEffect, useState, useRef } from "react";
import ProductCard from "./shop/ProductCard";
import { getNewProducts } from "@/services/shopify/shopifyStorefrontService";
import { getNewProductsFromDB } from "@/services/shopify/databaseProductService";
import { Product } from "@/services/types/shopify-types";
import { Loader2, Sparkles, Star, Zap, ShoppingBag, TrendingUp } from "lucide-react";
import { useStaggeredAnimation } from "@/hooks/useScrollAnimation";
import "../styles/featured-products.css";

const FeaturedProducts: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const productsGridRef = useStaggeredAnimation(6, { threshold: 0.1 });

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        // Try database first
        const dbResult = await getNewProductsFromDB(6);
        if (dbResult.data.length > 0) {
          setProducts(dbResult.data);
          setError(null);
        } else {
          // Fallback to API if database is empty
          console.log('No new products in database, falling back to API');
          const newProducts = await getNewProducts(6);
          setProducts(newProducts);
          setError(null);
        }
      } catch (err) {
        console.error("Failed to load newest products", err);
        setError("Failed to load newest products");
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  // Intersection Observer for reveal animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

  // Fallback to display if no active products
  const fallbackProducts: Product[] = [
    {
      id: "1",
      handle: "lolcow-classic-tee",
      title: "LolCow Classic Tee",
      description: "The original LolCow design on a premium cotton t-shirt.",
      vendor: "LolCow",
      productType: "Apparel",
      tags: ["apparel", "t-shirt", "classic"],
      featuredImageUrl: "https://via.placeholder.com/300x300?text=LolCow+Tee",
      priceRange: {
        min: 29.99,
        max: 29.99,
        currencyCode: "USD"
      },
      available: true
    },
    {
      id: "2",
      handle: "madhouse-cow-sticker-pack",
      title: "Madhouse Cow Sticker Pack",
      description: "Set of 5 premium vinyl stickers featuring the Madhouse Cow.",
      vendor: "LolCow",
      productType: "Accessories",
      tags: ["accessories", "stickers", "madhouse"],
      featuredImageUrl: "https://via.placeholder.com/300x300?text=Sticker+Pack",
      priceRange: {
        min: 12.99,
        max: 12.99,
        currencyCode: "USD"
      },
      available: true
    },
    {
      id: "3",
      handle: "queen-cow-mug",
      title: "Queen Cow Mug",
      description: "Start your morning with the fabulous Queen Cow ceramic mug.",
      vendor: "LolCow",
      productType: "Drinkware",
      tags: ["drinkware", "mug", "queen"],
      featuredImageUrl: "https://via.placeholder.com/300x300?text=Queen+Cow+Mug",
      priceRange: {
        min: 19.99,
        max: 19.99,
        currencyCode: "USD"
      },
      available: true
    },
    {
      id: "4",
      handle: "lolcow-hoodie",
      title: "LolCow Premium Hoodie",
      description: "Stay warm with our premium LolCow hoodie.",
      vendor: "LolCow",
      productType: "Apparel",
      tags: ["apparel", "hoodie", "premium"],
      featuredImageUrl: "https://via.placeholder.com/300x300?text=LolCow+Hoodie",
      priceRange: {
        min: 49.99,
        max: 49.99,
        currencyCode: "USD"
      },
      available: true
    },
    {
      id: "5",
      handle: "cow-plushie",
      title: "LolCow Plushie",
      description: "Soft and cuddly LolCow plushie for all ages.",
      vendor: "LolCow",
      productType: "Collectibles",
      tags: ["collectibles", "plushie", "toys"],
      featuredImageUrl: "https://via.placeholder.com/300x300?text=LolCow+Plushie",
      priceRange: {
        min: 24.99,
        max: 24.99,
        currencyCode: "USD"
      },
      available: true
    },
    {
      id: "6",
      handle: "lolcow-poster",
      title: "LolCow Universe Poster",
      description: "High-quality poster featuring the LolCow Universe artwork.",
      vendor: "LolCow",
      productType: "Art",
      tags: ["art", "poster", "decor"],
      featuredImageUrl: "https://via.placeholder.com/300x300?text=LolCow+Poster",
      priceRange: {
        min: 14.99,
        max: 14.99,
        currencyCode: "USD"
      },
      available: true
    }
  ];

  const renderProducts = () => {
    if (loading) {
      return (
        <div className="col-span-full flex flex-col items-center justify-center py-12">
          <div className="relative">
            <Loader2 className="h-8 w-8 animate-spin text-lolcow-blue" />
            <div className="absolute inset-0 h-8 w-8 animate-ping rounded-full bg-lolcow-blue opacity-20" />
          </div>
          <span className="mt-4 text-white animate-pulse">Loading newest products...</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 w-full">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white/5 rounded-lg p-4 skeleton-loader h-96" />
            ))}
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="col-span-full text-center py-12">
          <p className="text-red-500 flex items-center justify-center gap-2">
            <Zap className="h-5 w-5" />
            {error}
          </p>
          <p className="text-gray-400 mt-2">Showing placeholder products instead</p>
          <div ref={productsGridRef.ref} className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 stagger-container">
            {fallbackProducts.slice(0, 6).map((product, index) => (
              <div key={product.id} className={`product-card-animated product-card-enhanced animate-on-scroll fade-up`}>
                <ProductCard 
                  product={product}
                />
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (products.length === 0) {
      return (
        <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-6 stagger-container">
          {fallbackProducts.slice(0, 6).map((product, index) => (
            <div key={product.id} className={`product-card-animated product-card-enhanced animate-on-scroll fade-up`}>
              <ProductCard 
                product={product}
              />
            </div>
          ))}
        </div>
      );
    }

    return products.slice(0, 6).map((product, index) => (
      <div key={product.id} className={`product-card-animated product-card-enhanced animate-on-scroll fade-up`}>
        <ProductCard
          product={product}
        />
      </div>
    ));
  };

  return (
    <section 
      ref={sectionRef}
      className={`relative overflow-hidden bg-lolcow-black py-24 ${isVisible ? 'reveal-on-scroll revealed' : 'reveal-on-scroll'}`}
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0 featured-gradient-bg" />
      
      {/* Texture overlays */}
      <div className="absolute inset-0 dot-pattern opacity-20" />
      <div className="absolute inset-0 line-pattern" />
      
      {/* Floating orbs */}
      <div className="absolute top-20 left-10 w-96 h-96 floating-orb orb-blue" />
      <div className="absolute bottom-20 right-10 w-80 h-80 floating-orb orb-red" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 floating-orb orb-green" />
      
      {/* Geometric shapes */}
      <div className="absolute top-32 right-20 geometric-shape rotate-45" />
      <div className="absolute bottom-40 left-32 geometric-shape" />
      
      {/* Moving gradient blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 gradient-blob">
        <div className="w-full h-full rounded-full bg-gradient-to-br from-lolcow-blue/20 to-transparent" />
      </div>
      <div className="absolute bottom-0 right-1/4 w-80 h-80 gradient-blob" style={{ animationDelay: '-5s' }}>
        <div className="w-full h-full rounded-full bg-gradient-to-br from-lolcow-red/20 to-transparent" />
      </div>
      
      {/* Glowing grid pattern */}
      <div className="absolute inset-0 glowing-grid" />
      
      {/* Shimmer effect overlay */}
      <div className="absolute inset-0 shimmer-effect" />
      
      {/* Content container */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-12 animate-on-scroll fade-up">
          <div className="flex items-center justify-center gap-4 mb-6">
            <TrendingUp className="h-8 w-8 text-lolcow-blue animated-icon" />
            <h2 className="text-4xl lg:text-5xl font-fredoka text-white">
              Newest Products
            </h2>
            <Sparkles className="h-8 w-8 text-lolcow-red animated-icon" style={{ animationDelay: '-1.5s' }} />
          </div>
          
          <a 
            href="/shop/products" 
            className="btn-outline view-all-btn group inline-flex items-center gap-2"
          >
            <span>View All Products</span>
            <ShoppingBag className="h-4 w-4 group-hover:rotate-12 transition-transform duration-300" />
          </a>
        </div>

        {/* Products grid with floating effect */}
        <div ref={productsGridRef.ref} className="grid grid-cols-1 md:grid-cols-2 gap-8 floating-section stagger-container">
          {renderProducts()}
        </div>
        
        {/* Bottom accent elements */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-lolcow-blue/50 to-transparent pulse-accent" />
      </div>
    </section>
  );
};

export default FeaturedProducts;
