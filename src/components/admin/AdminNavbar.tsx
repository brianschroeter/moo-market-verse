import React from "react";
import { Link } from "react-router-dom";
import { Shield, Menu, X } from "lucide-react";

interface AdminNavbarProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

const AdminNavbar: React.FC<AdminNavbarProps> = ({ isSidebarOpen, toggleSidebar }) => {
  return (
    <nav className="bg-lolcow-darkgray border-b border-lolcow-lightgray fixed top-0 left-0 right-0 z-40 h-16">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <button 
              onClick={toggleSidebar} 
              className="p-2 rounded-md text-gray-300 hover:text-white hover:bg-lolcow-lightgray/30 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white mr-2"
              aria-label="Toggle sidebar"
            >
              {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>

            <div className="flex items-center space-x-4">
              <Link to="/" className="flex items-center space-x-2">
                <img
                  src="/lovable-uploads/logo.png"
                  alt="LolCow Logo"
                  className="w-10 h-10"
                />
                <div className="text-xl font-fredoka hidden sm:block">
                  <span className="text-lolcow-blue">LOL</span>
                  <span className="text-lolcow-red">COW</span>
                  <span className="text-white">.CO</span>
                </div>
              </Link>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-2">
            <Shield className="h-5 w-5 text-lolcow-blue" />
            <span className="text-white font-medium">Admin Dashboard</span>
          </div>

          <div className="flex items-center">
            <Link to="/" className="btn-secondary flex items-center space-x-2 px-3 py-2 text-sm">
              <span className="hidden sm:inline">Back to Site</span>
              <span className="sm:hidden">Site</span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default AdminNavbar;
