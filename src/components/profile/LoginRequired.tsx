
import React from "react";
import { Link } from "react-router-dom";
import Navbar from "../Navbar";
import Footer from "../Footer";

const LoginRequired: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow flex items-center justify-center p-8">
        <div className="lolcow-card max-w-md w-full p-8 text-center">
          <h2 className="text-2xl font-fredoka text-white mb-6">
            Login Required
          </h2>
          <p className="text-gray-300 mb-6">
            You need to log in with Discord to view your profile.
          </p>
          <Link to="/login" className="btn-primary">
            Login with Discord
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default LoginRequired;
