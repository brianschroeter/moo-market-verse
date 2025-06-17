import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, LogOut, LogIn, Shield, ShoppingCart } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { getMenuItems, MenuItem } from "@/services/menu/menu.service";
import ImpersonationBanner from "./ImpersonationBanner";

const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, isAdmin, signOut } = useAuth();
  const { cart, setIsCartOpen } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();

  const { data: menuItems = [], isLoading: isLoadingMenuItems } = useQuery<MenuItem[]>({
    queryKey: ["menuItems"],
    queryFn: getMenuItems,
  });

  const baseNavStructure = [
    { key: "home", label: "Home", path: "/" },
    { key: "shop", label: "Shop", path: "/shop" },
    { key: "schedule", label: "Schedule", path: "/schedule" },
    { key: "leaderboard", label: "Leaderboard", path: "/leaderboard" },
    { key: "profile", label: "Profile", path: "/profile" },
    { key: "support", label: "Support", path: "/support" },
  ];

  const enabledNavItems = baseNavStructure.filter(item => {
    const dbItem = menuItems.find(db => db.item_key === item.key);
    // If the item exists in the database, use its enabled state
    if (dbItem) {
      return dbItem.is_enabled;
    }
    // If not in database, show all items except shop (which should be explicitly enabled)
    return item.key !== 'shop';
  });

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleAuthAction = async () => {
    if (user) {
      try {
        await signOut();
        toast({
          title: "Logged out",
          description: "You have been successfully logged out",
        });
        navigate('/');
      } catch (error) {
        console.error('Error signing out:', error);
        toast({
          title: "Error",
          description: "Failed to sign out. Please try again.",
          variant: "destructive",
        });
      }
    } else {
      navigate('/login');
    }
  };

  return (
    <>
      <ImpersonationBanner />
      <nav className="bg-lolcow-black border-b border-lolcow-lightgray sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo and brand name */}
          <div className="flex items-center space-x-4">
            <Link to="/" className="flex items-center space-x-2">
              <img
                src="/lovable-uploads/logo.png"
                alt="LolCow Logo"
                className="w-12"
              />
              <div className="text-2xl font-fredoka">
                <span className="text-lolcow-blue">LOL</span>
                <span className="text-lolcow-red">COW</span>
                <span className="text-white">.CO</span>
              </div>
            </Link>
          </div>

          {/* Desktop navigation links */}
          <div className="hidden md:block">
            <div className="flex items-center space-x-6">
              {/* Map over enabled items */}
              {enabledNavItems.map(item => (
                <Link key={item.key} to={item.path} className="nav-link">
                  {item.label}
                </Link>
              ))}
              {/* Keep Admin link separate as it's based on role, not menu_items table */}
              {isAdmin && (
                <Link to="/admin/users" className="nav-link flex items-center">
                  <Shield className="h-4 w-4 mr-1" />
                  Admin
                </Link>
              )}
            </div>
          </div>

          {/* Right side - Cart and Auth button */}
          <div className="flex items-center space-x-4">
            {/* Cart Icon */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative text-white hover:text-lolcow-blue transition-colors duration-200"
              aria-label="Open cart"
            >
              <ShoppingCart className="h-6 w-6" />
              {cart && cart.totalQuantity > 0 && (
                <span className="absolute -top-2 -right-2 bg-lolcow-blue text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {cart.totalQuantity}
                </span>
              )}
            </button>
            
            <button onClick={handleAuthAction} className="btn-primary flex items-center space-x-2">
              {user ? (
                <>
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  <span>Login</span>
                </>
              )}
            </button>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={toggleMenu}
                className="text-white hover:text-lolcow-blue focus:outline-none"
              >
                {isMenuOpen ? (
                  <X className="h-7 w-7" />
                ) : (
                  <Menu className="h-7 w-7" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-lolcow-darkgray border-t border-lolcow-lightgray">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {/* Map over enabled items */}
            {enabledNavItems.map(item => (
              <Link
                key={item.key}
                to={item.path}
                className="block px-3 py-2 rounded-md text-base font-medium hover:text-lolcow-blue"
                onClick={toggleMenu}
              >
                {item.label}
              </Link>
            ))}
            {/* Keep Admin link separate */}
            {isAdmin && (
              <Link
                to="/admin/users"
                className="block px-3 py-2 rounded-md text-base font-medium hover:text-lolcow-blue"
                onClick={toggleMenu}
              >
                Admin
              </Link>
            )}
            {/* Keep Auth button separate */}
            <button
              onClick={() => {
                handleAuthAction();
                toggleMenu();
              }}
              className="w-full text-left block px-3 py-2 rounded-md text-base font-medium hover:text-lolcow-blue"
            >
              {user ? "Logout" : "Login"}
            </button>
          </div>
        </div>
      )}
    </nav>
    </>
  );
};

export default Navbar;
