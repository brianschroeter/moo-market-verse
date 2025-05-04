import React from 'react';
import { ArrowRight } from 'lucide-react';

export interface ProductCardProps {
  id: string;  // Changed from number to string to match UUID from database
  name: string;
  price: number;
  description: string;
  imageUrl: string;
  productUrl?: string; // Add optional product URL prop
}

const ProductCard: React.FC<ProductCardProps> = ({ id, name, price, description, imageUrl, productUrl }) => {
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
        {productUrl ? (
          <a 
            href={productUrl} 
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary flex items-center space-x-2 py-2"
          >
            <ArrowRight className="h-4 w-4" />
            <span>Learn More</span>
          </a>
        ) : (
          <span className="text-sm text-gray-500">Details unavailable</span>
        )}
      </div>
    </div>
  );
};

export default ProductCard;
