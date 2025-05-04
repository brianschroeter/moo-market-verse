
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, LogOut, LogIn, Shield } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, isAdmin, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

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
              {isAdmin && (
                <Link to="/admin/users" className="nav-link flex items-center">
                  <Shield className="h-4 w-4 mr-1" />
                  Admin
                </Link>
              )}
            </div>
          </div>

          {/* Right side - Auth button */}
          <div className="flex items-center space-x-4">
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
            {isAdmin && (
              <Link
                to="/admin/users"
                className="block px-3 py-2 rounded-md text-base font-medium hover:text-lolcow-blue"
                onClick={toggleMenu}
              >
                Admin
              </Link>
            )}
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
  );
};

export default Navbar;
