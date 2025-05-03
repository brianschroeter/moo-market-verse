
import React from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import LoginCard from "../components/LoginCard";

const Login: React.FC = () => {
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
