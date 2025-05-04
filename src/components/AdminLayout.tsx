import React, { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { User, Users, List, Link as LinkIcon, Navigation, Megaphone, Mail } from "lucide-react";
import AdminNavbar from "./admin/AdminNavbar";

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const location = useLocation();
  
  const navItems = [
    { path: "/admin/users", label: "Users", icon: <Users className="h-5 w-5" /> },
    { path: "/admin/tickets", label: "Tickets", icon: <List className="h-5 w-5" /> },
    { path: "/admin/products", label: "Featured Content", icon: <LinkIcon className="h-5 w-5" /> },
    { path: "/admin/navigation", label: "Navigation", icon: <Navigation className="h-5 w-5" /> },
    { path: "/admin/announcements", label: "Announcements", icon: <Megaphone className="h-5 w-5" /> },
    { path: "/admin/newsletter-signups", label: "Newsletter Signups", icon: <Mail className="h-5 w-5" /> }
  ];
  
  return (
    <div className="flex flex-col min-h-screen bg-lolcow-black">
      {/* Admin Navbar */}
      <AdminNavbar />
      
      <div className="flex flex-1">
        {/* Sidebar */}
        <div className="w-64 bg-lolcow-darkgray border-r border-lolcow-lightgray flex flex-col">
          <div className="p-4 border-b border-lolcow-lightgray">
            <h1 className="text-xl font-fredoka text-white">
              Admin Panel
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
        </div>
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
