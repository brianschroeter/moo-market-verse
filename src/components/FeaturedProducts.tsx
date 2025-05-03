
import React from "react";
import ProductCard from "./ProductCard";

const featuredProducts = [
  {
    id: 1,
    name: "LolCow Classic Tee",
    price: 29.99,
    description: "The original LolCow design on a premium cotton t-shirt.",
    imageUrl: "https://via.placeholder.com/300x300?text=LolCow+Tee",
  },
  {
    id: 2,
    name: "Madhouse Cow Sticker Pack",
    price: 12.99,
    description: "Set of 5 premium vinyl stickers featuring the Madhouse Cow.",
    imageUrl: "https://via.placeholder.com/300x300?text=Sticker+Pack",
  },
  {
    id: 3,
    name: "Queen Cow Mug",
    price: 19.99,
    description: "Start your morning with the fabulous Queen Cow ceramic mug.",
    imageUrl: "https://via.placeholder.com/300x300?text=Queen+Cow+Mug",
  },
  {
    id: 4,
    name: "Nerd Cow Hoodie",
    price: 49.99,
    description: "Stay cozy with this premium Nerd Cow themed hoodie.",
    imageUrl: "https://via.placeholder.com/300x300?text=Nerd+Cow+Hoodie",
  },
];

const FeaturedProducts: React.FC = () => {
  return (
    <div className="bg-lolcow-black py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-fredoka text-white">Featured Products</h2>
          <a href="/shop" className="btn-outline">View All</a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} {...product} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default FeaturedProducts;
