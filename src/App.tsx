
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import Support from "./pages/Support";
import Schedule from "./pages/Schedule";
import Leaderboard from "./pages/Leaderboard";
import NotFound from "./pages/NotFound";
import TicketList from "./pages/TicketList";
import TicketDetail from "./pages/TicketDetail";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminFeaturedContent from "./pages/admin/AdminFeaturedContent";

// Create a new client for every render - this ensures proper React hooks context
const App = () => {
  // Create a client
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: false,
      },
    },
  });

  return (
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/support" element={<Support />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/tickets" element={<TicketList />} />
              <Route path="/tickets/:ticketId" element={<TicketDetail />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/products" element={<AdminFeaturedContent />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </React.StrictMode>
  );
};

export default App;
