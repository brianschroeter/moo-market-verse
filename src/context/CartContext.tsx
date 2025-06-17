import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { 
  createCart, 
  addToCart, 
  updateCartItem, 
  removeFromCart,
  getCart,
  createCheckout 
} from '@/services/shopify/cartService';

export interface CartItem {
  id: string; // Shopify cart line ID
  variantId: string;
  productId: string;
  title: string;
  variantTitle?: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  handle: string;
  properties?: Array<{ key: string; value: string }>;
}

export interface Cart {
  id: string; // Shopify cart ID
  items: CartItem[];
  totalAmount: number;
  currencyCode: string;
  checkoutUrl?: string;
}

interface CartContextValue {
  cart: Cart | null;
  isLoading: boolean;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  addItem: (item: Omit<CartItem, 'id'>) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  getCheckoutUrl: () => Promise<string | null>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

const CART_STORAGE_KEY = 'lolcow-cart-id';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Load cart on mount
  useEffect(() => {
    const loadCart = async () => {
      try {
        const cartId = localStorage.getItem(CART_STORAGE_KEY);
        if (cartId) {
          const cartData = await getCart(cartId);
          if (cartData) {
            setCart(cartData);
          } else {
            // Cart no longer exists, clear storage
            localStorage.removeItem(CART_STORAGE_KEY);
          }
        }
      } catch (error) {
        console.error('Error loading cart:', error);
        localStorage.removeItem(CART_STORAGE_KEY);
      } finally {
        setIsLoading(false);
      }
    };

    loadCart();
  }, []);

  // Save cart ID to localStorage whenever it changes
  useEffect(() => {
    if (cart?.id) {
      localStorage.setItem(CART_STORAGE_KEY, cart.id);
    }
  }, [cart?.id]);

  const addItem = useCallback(async (item: Omit<CartItem, 'id'>) => {
    try {
      setIsLoading(true);
      
      let currentCart = cart;
      
      // Create cart if it doesn't exist
      if (!currentCart) {
        currentCart = await createCart();
        if (!currentCart) {
          throw new Error('Failed to create cart');
        }
      }

      // Add item to cart
      const updatedCart = await addToCart(currentCart.id, {
        variantId: item.variantId,
        quantity: item.quantity,
        properties: item.properties
      });

      if (updatedCart) {
        setCart(updatedCart);
        setIsCartOpen(true); // Open cart when item is added
        toast.success(`${item.title} added to cart`);
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add item to cart');
    } finally {
      setIsLoading(false);
    }
  }, [cart]);

  const updateQuantity = useCallback(async (itemId: string, quantity: number) => {
    if (!cart) return;

    try {
      setIsLoading(true);
      
      if (quantity === 0) {
        await removeItem(itemId);
        return;
      }

      const updatedCart = await updateCartItem(cart.id, itemId, quantity);
      if (updatedCart) {
        setCart(updatedCart);
      }
    } catch (error) {
      console.error('Error updating cart:', error);
      toast.error('Failed to update quantity');
    } finally {
      setIsLoading(false);
    }
  }, [cart]);

  const removeItem = useCallback(async (itemId: string) => {
    if (!cart) return;

    try {
      setIsLoading(true);
      const updatedCart = await removeFromCart(cart.id, itemId);
      if (updatedCart) {
        setCart(updatedCart);
        toast.success('Item removed from cart');
      }
    } catch (error) {
      console.error('Error removing from cart:', error);
      toast.error('Failed to remove item');
    } finally {
      setIsLoading(false);
    }
  }, [cart]);

  const clearCart = useCallback(async () => {
    setCart(null);
    localStorage.removeItem(CART_STORAGE_KEY);
    setIsCartOpen(false);
  }, []);

  const getCheckoutUrl = useCallback(async () => {
    if (!cart || cart.items.length === 0) return null;

    try {
      // If we already have a checkout URL, return it
      if (cart.checkoutUrl) {
        return cart.checkoutUrl;
      }

      // Create a new checkout
      const checkoutUrl = await createCheckout(cart.id);
      if (checkoutUrl) {
        setCart({ ...cart, checkoutUrl });
        return checkoutUrl;
      }
    } catch (error) {
      console.error('Error getting checkout URL:', error);
      toast.error('Failed to create checkout');
    }

    return null;
  }, [cart]);

  const value: CartContextValue = {
    cart,
    isLoading,
    isCartOpen,
    setIsCartOpen,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    getCheckoutUrl
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};