
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";

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
              <Link to="/schedule" className="nav-link">
                Schedule
              </Link>
              <Link to="/leaderboard" className="nav-link">
                Leaderboard
              </Link>
              <Link to="/profile" className="nav-link">
                Profile
              </Link>
              <Link to="/support" className="nav-link">
                Support
              </Link>
            </div>
          </div>

          {/* Right side - Auth button */}
          <div className="flex items-center space-x-4">
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
              to="/schedule"
              className="block px-3 py-2 rounded-md text-base font-medium hover:text-lolcow-blue"
              onClick={toggleMenu}
            >
              Schedule
            </Link>
            <Link
              to="/leaderboard"
              className="block px-3 py-2 rounded-md text-base font-medium hover:text-lolcow-blue"
              onClick={toggleMenu}
            >
              Leaderboard
            </Link>
            <Link
              to="/profile"
              className="block px-3 py-2 rounded-md text-base font-medium hover:text-lolcow-blue"
              onClick={toggleMenu}
            >
              Profile
            </Link>
            <Link
              to="/support"
              className="block px-3 py-2 rounded-md text-base font-medium hover:text-lolcow-blue"
              onClick={toggleMenu}
            >
              Support
            </Link>
            <Link
              to="/login"
              className="block px-3 py-2 rounded-md text-base font-medium hover:text-lolcow-blue"
              onClick={toggleMenu}
            >
              Login
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
