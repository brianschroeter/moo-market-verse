
import React, { useEffect } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import LoginCard from "../components/LoginCard";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

const Login: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !loading) {
      navigate('/profile');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow flex items-center justify-center py-16 px-4 bg-lolcow-black">
          <div className="lolcow-card p-8 text-center">
            <h2 className="text-2xl font-fredoka text-white mb-4">Loading...</h2>
            <p className="text-gray-300">Checking authentication status...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (user) {
    // This will briefly show before redirect happens
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow flex items-center justify-center py-16 px-4 bg-lolcow-black">
        <LoginCard />
      </main>
      <Footer />
    </div>
  );
};

export default Login;
