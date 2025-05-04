
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import LoginRequired from "./profile/LoginRequired";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
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

  // If authenticated, render the children components
  return <>{children}</>;
};

export default ProtectedRoute;
