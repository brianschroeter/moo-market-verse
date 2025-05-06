import React, { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { User, Users, List, Link as LinkIcon, Navigation, Megaphone, Mail, Menu, X } from "lucide-react";
import AdminNavbar from "./admin/AdminNavbar";

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname]);

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
      <AdminNavbar isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
      
      <div className="flex flex-1 pt-16">
        <div 
          className={`fixed inset-y-0 left-0 z-30 pt-16 bg-lolcow-darkgray border-r border-lolcow-lightgray flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 lg:pt-0
                      ${isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64 lg:w-20'}`}
        >
          <div className={`p-4 border-b border-lolcow-lightgray ${isSidebarOpen ? 'lg:block' : 'lg:hidden'}`}>
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
                    className={`flex items-center px-4 py-3 text-base transition-colors duration-150
                      ${location.pathname === item.path 
                        ? "bg-lolcow-blue text-white" 
                        : "text-gray-300 hover:bg-lolcow-lightgray/20 hover:text-white"
                      }
                      ${isSidebarOpen ? '' : 'lg:justify-center'} `}
                    title={isSidebarOpen ? item.label : `Large: ${item.label}`}
                  >
                    <span className={`mr-3 ${isSidebarOpen ? '' : 'lg:mr-0'}`}>{item.icon}</span>
                    <span className={`${isSidebarOpen ? 'inline' : 'lg:hidden'}`}>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        
        <div 
          className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out 
                      ${isSidebarOpen ? 'ml-64' : 'ml-0 lg:ml-20'} `}
        >
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
