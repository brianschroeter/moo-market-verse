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
import Terms from "./pages/Terms";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Faq from "./pages/Faq";
import AdminUsers from "./pages/admin/AdminUsers";
import SharedYoutubeConnectionsPage from "./pages/admin/SharedYoutubeConnectionsPage";
import SharedFingerprintsPage from "./pages/admin/SharedFingerprintsPage";
import AdminFeaturedContent from "./pages/admin/AdminFeaturedContent";
import AdminTickets from "./pages/admin/AdminTickets";
import AdminNavigation from "./pages/admin/AdminNavigation";
import AdminAnnouncements from "./pages/admin/AdminAnnouncements";
import AdminNewsletterSignups from "./pages/admin/newsletter-signups.tsx";
import AdminGuildSearch from "./pages/admin/AdminGuildSearch";
import AdminYouTubeScheduleChannels from "./pages/admin/AdminYouTubeScheduleChannels";
import AdminYouTubeSchedulePage from "./pages/admin/AdminYouTubeSchedulePage";
import AdminPrintfulOrders from "./pages/admin/AdminPrintfulOrders";
import ShopifyOrdersPage from "./pages/admin/ShopifyOrdersPage";
import OrderReports from "./pages/admin/OrderReports";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

// Create a stable QueryClient instance outside the component
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: false,
    },
  },
});

const App = () => {
  return (
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <BrowserRouter>
            <AuthProvider>
              <Toaster />
              <Sonner />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/profile" element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } />
                <Route path="/support" element={
                  <ProtectedRoute>
                    <Support />
                  </ProtectedRoute>
                } />
                <Route path="/schedule" element={<Schedule />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/faq" element={<Faq />} />
                <Route path="/tickets" element={
                  <ProtectedRoute>
                    <TicketList />
                  </ProtectedRoute>
                } />
                <Route path="/tickets/:ticketId" element={
                  <ProtectedRoute>
                    <TicketDetail />
                  </ProtectedRoute>
                } />
                <Route path="/admin/users" element={
                  <ProtectedRoute requireAdmin={true}>
                    <AdminUsers />
                  </ProtectedRoute>
                } />
                <Route path="/admin/shared-youtube" element={
                  <ProtectedRoute requireAdmin={true}>
                    <SharedYoutubeConnectionsPage />
                  </ProtectedRoute>
                } />
                <Route path="/admin/shared-fingerprints" element={
                  <ProtectedRoute requireAdmin={true}>
                    <SharedFingerprintsPage />
                  </ProtectedRoute>
                } />
                <Route path="/admin/tickets" element={
                  <ProtectedRoute requireAdmin={true}>
                    <AdminTickets />
                  </ProtectedRoute>
                } />
                <Route path="/admin/products" element={
                  <ProtectedRoute requireAdmin={true}>
                    <AdminFeaturedContent />
                  </ProtectedRoute>
                } />
                <Route path="/admin/navigation" element={
                  <ProtectedRoute requireAdmin={true}>
                    <AdminNavigation />
                  </ProtectedRoute>
                } />
                <Route path="/admin/announcements" element={
                  <ProtectedRoute requireAdmin={true}>
                    <AdminAnnouncements />
                  </ProtectedRoute>
                } />
                <Route path="/admin/newsletter-signups" element={
                  <ProtectedRoute requireAdmin={true}>
                    <AdminNewsletterSignups />
                  </ProtectedRoute>
                } />
                <Route path="/admin/guild-search" element={
                  <ProtectedRoute requireAdmin={true}>
                    <AdminGuildSearch />
                  </ProtectedRoute>
                } />
                <Route path="/admin/youtube-schedule/channels" element={
                  <ProtectedRoute requireAdmin={true}>
                    <AdminYouTubeScheduleChannels />
                  </ProtectedRoute>
                } />
                <Route path="/admin/youtube-schedule/slots" element={
                  <ProtectedRoute requireAdmin={true}>
                    <AdminYouTubeSchedulePage />
                  </ProtectedRoute>
                } />
                {/* Printful Orders Admin Route */}
                <Route path="/admin/printful-orders" element={
                  <ProtectedRoute requireAdmin={true}>
                    <AdminPrintfulOrders />
                  </ProtectedRoute>
                } />
                {/* Shopify Orders Admin Route */}
                <Route path="/admin/shopify-orders" element={
                  <ProtectedRoute requireAdmin={true}>
                    <ShopifyOrdersPage />
                  </ProtectedRoute>
                } />
                {/* Order Reports Admin Route */}
                <Route path="/admin/order-reports" element={
                  <ProtectedRoute requireAdmin={true}>
                    <OrderReports />
                  </ProtectedRoute>
                } />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </React.StrictMode>
  );
};

export default App;
