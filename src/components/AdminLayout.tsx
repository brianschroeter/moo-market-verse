
import React, { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { User, Users, List, Link as LinkIcon } from "lucide-react";

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const location = useLocation();
  
  const navItems = [
    { path: "/admin/users", label: "Users", icon: <Users className="h-5 w-5" /> },
    { path: "/admin/tickets", label: "Tickets", icon: <List className="h-5 w-5" /> },
    { path: "/admin/products", label: "Featured Content", icon: <LinkIcon className="h-5 w-5" /> }
  ];
  
  return (
    <div className="flex h-screen bg-lolcow-black">
      {/* Sidebar */}
      <div className="w-64 bg-lolcow-darkgray border-r border-lolcow-lightgray flex flex-col">
        <div className="p-4 border-b border-lolcow-lightgray">
          <h1 className="text-xl font-fredoka text-white">
            LolCow Admin
          </h1>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center px-4 py-2 text-base ${
                    location.pathname === item.path 
                      ? "bg-lolcow-blue text-white" 
                      : "text-gray-300 hover:bg-lolcow-lightgray/20"
                  }`}
                >
                  <span className="mr-3">{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="p-4 border-t border-lolcow-lightgray">
          <Link to="/" className="flex items-center text-gray-300 hover:text-white">
            <span className="mr-2">
              <i className="fa-solid fa-arrow-left"></i>
            </span>
            Back to Site
          </Link>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-lolcow-darkgray border-b border-lolcow-lightgray p-4 flex justify-between items-center">
          <h2 className="text-lg font-fredoka text-white">
            Admin Dashboard
          </h2>
          <div>
            <span className="text-gray-300">Admin</span>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
