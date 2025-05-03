
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ShoppingCart, Menu, X } from "lucide-react";

const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="bg-lolcow-black border-b border-lolcow-lightgray sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo and brand name */}
          <div className="flex items-center space-x-4">
            <Link to="/" className="flex items-center space-x-2">
              <img
                src="/lovable-uploads/bc7a4d90-6d79-44cf-9581-c106f198164b.png"
                alt="LolCow Logo"
                className="h-12 w-12"
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
              <Link to="/" className="nav-link">
                Home
              </Link>
              <Link to="/shop" className="nav-link">
                Shop
              </Link>
              <Link to="/cows" className="nav-link">
                Cows
              </Link>
              <Link to="/profile" className="nav-link">
                Profile
              </Link>
            </div>
          </div>

          {/* Right side - Cart and Auth button */}
          <div className="flex items-center space-x-4">
            <Link
              to="/cart"
              className="p-2 rounded-full hover:bg-lolcow-lightgray relative"
            >
              <ShoppingCart className="h-6 w-6 text-white" />
              <span className="absolute -top-1 -right-1 bg-lolcow-red text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                0
              </span>
            </Link>

            <Link to="/login" className="btn-primary">
              Login
            </Link>

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
            <Link
              to="/"
              className="block px-3 py-2 rounded-md text-base font-medium hover:text-lolcow-blue"
              onClick={toggleMenu}
            >
              Home
            </Link>
            <Link
              to="/shop"
              className="block px-3 py-2 rounded-md text-base font-medium hover:text-lolcow-blue"
              onClick={toggleMenu}
            >
              Shop
            </Link>
            <Link
              to="/cows"
              className="block px-3 py-2 rounded-md text-base font-medium hover:text-lolcow-blue"
              onClick={toggleMenu}
            >
              Cows
            </Link>
            <Link
              to="/profile"
              className="block px-3 py-2 rounded-md text-base font-medium hover:text-lolcow-blue"
              onClick={toggleMenu}
            >
              Profile
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
