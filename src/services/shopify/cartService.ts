import { Cart, CartItem } from '@/context/CartContext';

const SHOPIFY_API_URL = `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/shopify-storefront`;

interface CartLineInput {
  variantId: string;
  quantity: number;
  properties?: Array<{ key: string; value: string }>;
}

async function fetchShopifyAPI(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${SHOPIFY_API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `API error: ${response.status}`);
  }

  return response.json();
}

export async function createCart(): Promise<Cart | null> {
  try {
    const { cart } = await fetchShopifyAPI('/cart/create', {
      method: 'POST',
    });
    return cart;
  } catch (error) {
    console.error('Error creating cart:', error);
    return null;
  }
}

export async function addToCart(
  cartId: string,
  line: CartLineInput
): Promise<Cart | null> {
  try {
    const { cart } = await fetchShopifyAPI('/cart/add', {
      method: 'POST',
      body: JSON.stringify({
        cartId,
        variantId: line.variantId,
        quantity: line.quantity,
        properties: line.properties || [],
      }),
    });
    return cart;
  } catch (error) {
    console.error('Error adding to cart:', error);
    throw error;
  }
}

export async function updateCartItem(
  cartId: string,
  lineId: string,
  quantity: number
): Promise<Cart | null> {
  try {
    const { cart } = await fetchShopifyAPI('/cart/update', {
      method: 'PUT',
      body: JSON.stringify({
        cartId,
        lineId,
        quantity,
      }),
    });
    return cart;
  } catch (error) {
    console.error('Error updating cart:', error);
    throw error;
  }
}

export async function removeFromCart(
  cartId: string,
  lineId: string
): Promise<Cart | null> {
  try {
    const { cart } = await fetchShopifyAPI('/cart/remove', {
      method: 'DELETE',
      body: JSON.stringify({
        cartId,
        lineId,
      }),
    });
    return cart;
  } catch (error) {
    console.error('Error removing from cart:', error);
    throw error;
  }
}

export async function getCart(cartId: string): Promise<Cart | null> {
  try {
    // Encode the cart ID to handle special characters and query parameters
    const encodedCartId = encodeURIComponent(cartId);
    const { cart } = await fetchShopifyAPI(`/cart/${encodedCartId}`);
    return cart;
  } catch (error) {
    console.error('Error getting cart:', error);
    return null;
  }
}

export async function createCheckout(cartId: string): Promise<string | null> {
  try {
    // For Shopify Storefront API, the cart already has a checkoutUrl
    const cart = await getCart(cartId);
    return cart?.checkoutUrl || null;
  } catch (error) {
    console.error('Error creating checkout:', error);
    return null;
  }
}