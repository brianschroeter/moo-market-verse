import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductGrid from "@/components/shop/ProductGrid";
import { getCollectionProducts } from "@/services/shopify/shopifyStorefrontService";
import { getCollectionProductsFromDB } from "@/services/shopify/databaseProductService";
import { Product } from "@/services/types/shopify-types";
import { ChevronLeft, Home, ShoppingBag, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import "@/styles/collection.css";

const CollectionPage: React.FC = () => {
  const { collection: collectionHandle } = useParams<{ collection: string }>();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();

  const {
    data: collectionData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ["collection-db", collectionHandle, cursor],
    queryFn: async () => {
      // For database, we don't support pagination with cursor yet
      if (!cursor) {
        // Try database first for initial load
        const dbResult = await getCollectionProductsFromDB(collectionHandle!);
        if (dbResult.collection && dbResult.products.length > 0) {
          return {
            collection: dbResult.collection,
            products: dbResult.products,
            pageInfo: { hasNextPage: false } // Database doesn't paginate currently
          };
        }
      }
      
      // Fallback to API for pagination or if database is empty
      console.log('Collection not in database or paginating, falling back to API');
      return getCollectionProducts({ 
        handle: collectionHandle!, 
        limit: 20,
        cursor 
      });
    },
    enabled: !!collectionHandle,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update products list when new data comes in
  React.useEffect(() => {
    if (collectionData?.products) {
      if (!cursor) {
        // First page - replace all products
        setAllProducts(collectionData.products);
      } else {
        // Subsequent pages - append products
        setAllProducts(prev => [...prev, ...collectionData.products]);
      }
    }
  }, [collectionData, cursor]);

  const handleLoadMore = () => {
    if (collectionData?.pageInfo?.endCursor) {
      setCursor(collectionData.pageInfo.endCursor);
    }
  };

  if (!collectionHandle) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow bg-lolcow-black flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-fredoka text-white mb-4">Collection not found</h1>
            <Link to="/shop" className="btn-primary">
              Back to Shop
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const collection = collectionData?.collection;
  const hasMoreProducts = collectionData?.pageInfo?.hasNextPage;

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-grow bg-lolcow-black">
        {/* Breadcrumb */}
        <section className="collection-breadcrumb py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex items-center space-x-2 text-sm">
              <Link to="/" className="text-gray-400 hover:text-white transition-all duration-300 flex items-center group">
                <Home className="h-4 w-4 mr-1 group-hover:scale-110 transition-transform" />
                Home
              </Link>
              <span className="text-gray-600">/</span>
              <Link to="/shop" className="text-gray-400 hover:text-white transition-all duration-300">
                Shop
              </Link>
              <span className="text-gray-600">/</span>
              <span className="text-white font-medium flex items-center">
                <Sparkles className="h-3 w-3 mr-1 text-lolcow-blue" />
                {collection?.title || collectionHandle}
              </span>
            </nav>
          </div>
        </section>

        {/* Collection Header */}
        {collection && (
          <section className="collection-header-bg py-16">
            {/* Animated gradient overlay */}
            <div className="collection-gradient-overlay" />
            
            {/* Grid pattern */}
            <div className="collection-grid-pattern" />
            
            {/* Floating orbs */}
            <div className="collection-orb w-96 h-96 bg-lolcow-blue/20 -top-48 -left-48" />
            <div className="collection-orb w-64 h-64 bg-lolcow-red/20 -bottom-32 -right-32" style={{ animationDelay: '7s' }} />
            
            {/* Floating elements */}
            <div className="collection-float-element top-20 right-20">
              <ShoppingBag className="h-16 w-16 text-lolcow-blue" />
            </div>
            <div className="collection-float-element bottom-20 left-20" style={{ animationDelay: '10s' }}>
              <Sparkles className="h-12 w-12 text-lolcow-red" />
            </div>
            
            {/* Background Image (if available) */}
            {collection.imageUrl && (
              <div className="absolute inset-0">
                <img
                  src={collection.imageUrl}
                  alt={collection.title}
                  className="w-full h-full object-cover opacity-10 blur-sm"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-lolcow-black/80 via-lolcow-darkgray/90 to-lolcow-black/80" />
              </div>
            )}
            
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="flex-1">
                  <Link 
                    to="/shop" 
                    className="inline-flex items-center text-lolcow-blue hover:text-white transition-all duration-300 mb-4 group"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform duration-300" />
                    Back to Collections
                  </Link>
                  
                  <div className="flex items-center gap-4 mb-4">
                    <h1 className="collection-title text-4xl md:text-5xl font-fredoka text-white">
                      {collection.title}
                    </h1>
                    <div className="product-count-badge flex items-center gap-2 text-sm text-white px-4 py-2 rounded-full">
                      <ShoppingBag className="h-4 w-4" />
                      <span className="font-semibold">{allProducts.length} {allProducts.length === 1 ? 'Product' : 'Products'}</span>
                    </div>
                  </div>
                  
                  {collection.description && (
                    <div className="collection-description max-w-2xl">
                      <p className="text-lg text-gray-300 leading-relaxed">
                        {collection.description}
                      </p>
                    </div>
                  )}
                </div>
                
                {collection.imageUrl && (
                  <div className="flex-shrink-0">
                    <div className="relative">
                      <img
                        src={collection.imageUrl}
                        alt={collection.title}
                        className="w-32 h-32 md:w-40 md:h-40 object-cover rounded-xl shadow-2xl border-2 border-white/10"
                      />
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-transparent via-transparent to-black/20" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Products Section */}
        <section className="py-16 relative">
          {/* Subtle background gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-lolcow-darkgray/20 to-transparent opacity-50" />
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            {error ? (
              <div className="text-center py-12">
                <ShoppingBag className="h-16 w-16 text-red-500 opacity-50 mx-auto mb-4" />
                <h3 className="text-xl font-fredoka text-white mb-2">Unable to load collection</h3>
                <p className="text-gray-300 mb-4">
                  {error instanceof Error ? error.message : "Something went wrong while fetching this collection."}
                </p>
                <Button onClick={() => refetch()} className="btn-outline">
                  Try Again
                </Button>
              </div>
            ) : (
              <ProductGrid
                products={allProducts}
                loading={isLoading}
                onLoadMore={hasMoreProducts ? handleLoadMore : undefined}
                hasMore={hasMoreProducts}
                shopDomain="lolcow.co" // Configure this based on your store
              />
            )}
          </div>
        </section>

        {/* Related Collections */}
        {collection && allProducts.length > 0 && (
          <section className="py-16 bg-lolcow-darkgray">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <h2 className="text-3xl font-fredoka text-white mb-4">
                Explore More Collections
              </h2>
              <p className="text-gray-300 text-lg mb-8">
                Discover other amazing collections in our store
              </p>
              
              <Button asChild className="btn-primary">
                <Link to="/shop">Browse All Collections</Link>
              </Button>
            </div>
          </section>
        )}
      </main>
      
      <Footer />
    </div>
  );
};

export default CollectionPage;