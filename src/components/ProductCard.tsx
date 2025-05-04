
import React from 'react';
import { ShoppingCart } from 'lucide-react';

export interface ProductCardProps {
  id: string;  // Changed from number to string to match UUID from database
  name: string;
  price: number;
  description: string;
  imageUrl: string;
}

const ProductCard: React.FC<ProductCardProps> = ({ id, name, price, description, imageUrl }) => {
  return (
    <div className="product-card">
      <div className="product-card-image-container">
        <img src={imageUrl} alt={name} className="product-card-image" />
      </div>
      
      <div className="flex-grow">
        <h3 className="product-card-title">{name}</h3>
        <p className="product-card-description">{description}</p>
      </div>
      
      <div className="flex items-center justify-between mt-4">
        <span className="product-card-price">${price.toFixed(2)}</span>
        <button className="btn-primary flex items-center space-x-2 py-2">
          <ShoppingCart className="h-4 w-4" />
          <span>Add to Cart</span>
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
