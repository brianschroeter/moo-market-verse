
import React from "react";
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Link } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-lolcow-black p-4">
      <img
        src="/lovable-uploads/bc7a4d90-6d79-44cf-9581-c106f198164b.png"
        alt="Confused LolCow"
        className="w-32 h-32 mb-8"
      />
      <h1 className="text-5xl font-fredoka text-white mb-4">404</h1>
      <p className="text-xl text-gray-300 mb-8 text-center">
        Moo-oh no! This page has wandered off to another pasture.
      </p>
      <Link to="/" className="btn-primary">
        Return to Home
      </Link>
    </div>
  );
};

export default NotFound;
