import React, { useEffect, useRef } from 'react';
import { X, Minus, Plus, ShoppingBag, Loader2, ExternalLink, Zap, CreditCard } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const MiniCart: React.FC = () => {
  const { cart, isLoading, isCartOpen, setIsCartOpen, updateQuantity, removeItem, getCheckoutUrl } = useCart();
  const cartRef = useRef<HTMLDivElement>(null);

  // Close cart when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cartRef.current && !cartRef.current.contains(event.target as Node)) {
        setIsCartOpen(false);
      }
    };

    if (isCartOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCartOpen, setIsCartOpen]);

  // Prevent body scroll when cart is open
  useEffect(() => {
    if (isCartOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isCartOpen]);

  const handleCheckout = async () => {
    const checkoutUrl = await getCheckoutUrl();
    if (checkoutUrl) {
      window.location.href = checkoutUrl;
    } else {
      toast.error('Failed to create checkout. Please try again.');
    }
  };

  const formatPrice = (amount: number, currencyCode: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(amount);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 z-40 ${
          isCartOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
      />

      {/* Cart Slide-out */}
      <div
        ref={cartRef}
        className={`fixed right-0 top-0 h-full w-full max-w-md bg-lolcow-black border-l border-lolcow-lightgray shadow-2xl transition-transform duration-300 z-50 ${
          isCartOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-lolcow-lightgray">
            <h2 className="text-xl font-fredoka text-white flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Your Cart
              {cart && cart.totalQuantity > 0 && (
                <span className="text-sm text-gray-400">({cart.totalQuantity} items)</span>
              )}
            </h2>
            <button
              onClick={() => setIsCartOpen(false)}
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="Close cart"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Cart Content */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-lolcow-blue" />
              </div>
            ) : !cart || cart.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <ShoppingBag className="h-16 w-16 text-gray-600 mb-4" />
                <p className="text-gray-400 mb-6">Your cart is empty</p>
                <Button
                  onClick={() => setIsCartOpen(false)}
                  className="bg-lolcow-blue hover:bg-lolcow-blue/80"
                >
                  Continue Shopping
                </Button>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                {cart.items.map((item) => (
                  <div
                    key={item.id}
                    className="bg-lolcow-darkgray rounded-lg p-4 space-y-3"
                  >
                    <div className="flex gap-4">
                      {/* Product Image */}
                      {item.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-20 h-20 object-cover rounded-md"
                        />
                      )}
                      
                      {/* Product Details */}
                      <div className="flex-1 space-y-1">
                        <h3 className="text-white font-medium line-clamp-1">{item.title}</h3>
                        {item.variantTitle && item.variantTitle !== 'Default Title' && (
                          <p className="text-sm text-gray-400">{item.variantTitle}</p>
                        )}
                        {item.properties && item.properties.length > 0 && (
                          <div className="text-xs text-gray-500 space-y-0.5">
                            {item.properties.map((prop, idx) => (
                              <div key={idx}>
                                {prop.key}: {prop.value}
                              </div>
                            ))}
                          </div>
                        )}
                        <p className="text-lolcow-blue font-semibold">
                          {formatPrice(item.price, cart.currencyCode)}
                        </p>
                      </div>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          disabled={isLoading || item.quantity <= 1}
                          className="text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="text-white w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={isLoading}
                          className="text-gray-400 hover:text-white disabled:opacity-50 transition-colors"
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        disabled={isLoading}
                        className="text-red-400 hover:text-red-300 text-sm transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer with Checkout */}
          {cart && cart.items.length > 0 && (
            <div className="border-t border-lolcow-lightgray p-6 space-y-4">
              <div className="flex items-center justify-between text-lg">
                <span className="text-white font-semibold">Total</span>
                <span className="text-white font-bold">
                  {formatPrice(cart.totalAmount, cart.currencyCode)}
                </span>
              </div>
              
              {/* Express Checkout Button */}
              <Button
                onClick={handleCheckout}
                disabled={isLoading}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-6 text-lg shadow-lg hover:shadow-xl transition-all duration-300"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Zap className="h-5 w-5 mr-2" />
                    Express Checkout
                  </>
                )}
              </Button>
              
              {/* Regular Checkout Button */}
              <Button
                onClick={handleCheckout}
                disabled={isLoading}
                variant="outline"
                className="w-full border-lolcow-lightgray hover:bg-lolcow-darkgray text-white font-semibold py-6 text-lg"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <CreditCard className="h-5 w-5 mr-2" />
                    Checkout
                  </>
                )}
              </Button>
              
              {/* Express Payment Options */}
              <div className="flex items-center justify-center gap-4 pt-2">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>Express checkout available:</span>
                </div>
              </div>
              
              {/* Payment Method Icons */}
              <div className="flex items-center justify-center gap-3">
                {/* Shop Pay */}
                <div className="bg-purple-600 text-white text-xs font-bold px-3 py-1.5 rounded">
                  Shop Pay
                </div>
                
                {/* Apple Pay */}
                <div className="bg-black text-white text-xs font-medium px-3 py-1.5 rounded flex items-center gap-1">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
                  </svg>
                  Pay
                </div>
                
                {/* Google Pay */}
                <div className="bg-white text-gray-800 border border-gray-300 text-xs font-medium px-3 py-1.5 rounded flex items-center gap-1">
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Pay
                </div>
              </div>
              
              <p className="text-xs text-gray-500 text-center">
                Secure checkout powered by Shopify
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default MiniCart;