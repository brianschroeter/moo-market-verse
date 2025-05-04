
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import LoginRequired from "./profile/LoginRequired";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireAdmin = false }) => {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="lolcow-card p-8 text-center">
          <h2 className="text-2xl font-fredoka text-white mb-4">Loading...</h2>
          <p className="text-gray-300">Please wait while we check your authentication status.</p>
        </div>
      </div>
    );
  }

  // If not authenticated, show login required screen
  if (!user) {
    return <LoginRequired />;
  }

  // If route requires admin privileges but user is not an admin
  if (requireAdmin && !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="lolcow-card p-8 text-center">
          <h2 className="text-2xl font-fredoka text-white mb-4">Access Denied</h2>
          <p className="text-gray-300 mb-4">You don't have permission to access this page. Admin privileges are required.</p>
          <Navigate to="/" replace />
        </div>
      </div>
    );
  }

  // If authenticated and has required permissions, render the children components
  return <>{children}</>;
};

export default ProtectedRoute;
