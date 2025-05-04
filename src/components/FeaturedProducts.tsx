
import React, { useEffect, useState } from "react";
import ProductCard from "./ProductCard";
import { fetchActiveProducts } from "@/services/featuredContentService";
import { FeaturedProduct } from "@/services/types/featuredContent-types";
import { Loader2 } from "lucide-react";

const FeaturedProducts: React.FC = () => {
  const [products, setProducts] = useState<FeaturedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        const featuredProducts = await fetchActiveProducts();
        setProducts(featuredProducts);
        setError(null);
      } catch (err) {
        console.error("Failed to load featured products", err);
        setError("Failed to load featured products");
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  // Fallback to display if no active products
  const fallbackProducts = [
    {
      id: "1",
      name: "LolCow Classic Tee",
      price: 29.99,
      description: "The original LolCow design on a premium cotton t-shirt.",
      imageUrl: "https://via.placeholder.com/300x300?text=LolCow+Tee",
    },
    {
      id: "2",
      name: "Madhouse Cow Sticker Pack",
      price: 12.99,
      description: "Set of 5 premium vinyl stickers featuring the Madhouse Cow.",
      imageUrl: "https://via.placeholder.com/300x300?text=Sticker+Pack",
    },
    {
      id: "3",
      name: "Queen Cow Mug",
      price: 19.99,
      description: "Start your morning with the fabulous Queen Cow ceramic mug.",
      imageUrl: "https://via.placeholder.com/300x300?text=Queen+Cow+Mug",
    },
    {
      id: "4",
      name: "Nerd Cow Hoodie",
      price: 49.99,
      description: "Stay cozy with this premium Nerd Cow themed hoodie.",
      imageUrl: "https://via.placeholder.com/300x300?text=Nerd+Cow+Hoodie",
    },
  ];

  const renderProducts = () => {
    if (loading) {
      return (
        <div className="col-span-full flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-lolcow-blue" />
          <span className="ml-2 text-white">Loading featured products...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="col-span-full text-center py-12">
          <p className="text-red-500">{error}</p>
          <p className="text-gray-400 mt-2">Showing placeholder products instead</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
            {fallbackProducts.map((product) => (
              <ProductCard 
                key={product.id}
                id={product.id}
                name={product.name}
                price={product.price}
                description={product.description}
                imageUrl={product.imageUrl}
              />
            ))}
          </div>
        </div>
      );
    }

    if (products.length === 0) {
      return (
        <div className="col-span-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {fallbackProducts.map((product) => (
            <ProductCard 
              key={product.id}
              id={product.id}
              name={product.name}
              price={19.99} // Default price if not in the data model
              description={product.description}
              imageUrl={product.imageUrl}
            />
          ))}
        </div>
      );
    }

    return products.map((product) => (
      <ProductCard
        key={product.id}
        id={product.id}
        name={product.name}
        price={19.99} // Default price if not in the data model
        description={product.description}
        imageUrl={product.image_url}
      />
    ));
  };

  return (
    <div className="bg-lolcow-black py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-fredoka text-white">Featured Products</h2>
          <a href="/shop" className="btn-outline">View All</a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {renderProducts()}
        </div>
      </div>
    </div>
  );
};

export default FeaturedProducts;
