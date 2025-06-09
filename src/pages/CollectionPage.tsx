import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductGrid from "@/components/shop/ProductGrid";
import { getCollectionProducts } from "@/services/shopify/shopifyStorefrontService";
import { Product } from "@/services/types/shopify-types";
import { ChevronLeft, Home, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    queryKey: ["collection", collectionHandle, cursor],
    queryFn: () => getCollectionProducts({ 
      handle: collectionHandle!, 
      limit: 20,
      cursor 
    }),
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
        <section className="py-6 bg-lolcow-darkgray border-b border-lolcow-lightgray">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex items-center space-x-2 text-sm">
              <Link to="/" className="text-gray-300 hover:text-lolcow-blue transition-colors flex items-center">
                <Home className="h-4 w-4 mr-1" />
                Home
              </Link>
              <span className="text-gray-500">/</span>
              <Link to="/shop" className="text-gray-300 hover:text-lolcow-blue transition-colors">
                Shop
              </Link>
              <span className="text-gray-500">/</span>
              <span className="text-white font-medium">
                {collection?.title || collectionHandle}
              </span>
            </nav>
          </div>
        </section>

        {/* Collection Header */}
        {collection && (
          <section className="relative py-12 bg-gradient-to-br from-lolcow-darkgray via-lolcow-black to-lolcow-darkgray overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5">
              <div 
                style={{
                  backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                  backgroundSize: '30px 30px'
                }}
                className="w-full h-full"
              />
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
                  
                  <div className="flex items-center gap-3 mb-3">
                    <h1 className="text-3xl md:text-4xl font-fredoka text-white">
                      {collection.title}
                    </h1>
                    <div className="flex items-center gap-2 text-sm text-lolcow-blue bg-lolcow-blue/10 px-3 py-1 rounded-full border border-lolcow-blue/20">
                      <ShoppingBag className="h-4 w-4" />
                      <span>{allProducts.length} {allProducts.length === 1 ? 'Product' : 'Products'}</span>
                    </div>
                  </div>
                  
                  {collection.description && (
                    <p className="text-lg text-gray-300 leading-relaxed max-w-2xl">
                      {collection.description}
                    </p>
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
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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