
import React from "react";
import { Link } from "react-router-dom";
import { Shield } from "lucide-react";

const AdminNavbar: React.FC = () => {
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

          {/* Admin Label */}
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-lolcow-blue" />
            <span className="text-white font-medium">Admin Dashboard</span>
          </div>

          {/* Back to site link */}
          <div className="flex items-center">
            <Link to="/" className="btn-secondary flex items-center space-x-2">
              <span>Back to Site</span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default AdminNavbar;
