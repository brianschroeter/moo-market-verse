
import React from "react";
import { Link } from "react-router-dom";

const Hero: React.FC = () => {
  return (
    <div className="relative py-16 md:py-24 overflow-hidden bg-lolcow-darkgray">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="text-center md:text-left">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-fredoka mb-6">
              <span className="text-white">JOIN THE </span>
              <span className="text-lolcow-blue">LOL</span>
              <span className="text-lolcow-red">COW</span>
              <span className="text-white"> COMMUNITY</span>
            </h1>
            
            <p className="text-gray-300 text-lg md:text-xl mb-8">
              Connect with our Discord community and join the herd of cartoon cow enthusiasts.
              Login now to access exclusive content!
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <Link to="/login" className="btn-primary text-center">
                Login with Discord
              </Link>
            </div>
          </div>
          
          <div className="flex justify-center">
            <img 
              src="/lovable-uploads/bc7a4d90-6d79-44cf-9581-c106f198164b.png" 
              alt="LolCow Mascot" 
              className="w-64 h-64 md:w-80 md:h-80 animate-float" 
            />
          </div>
        </div>
      </div>
      
      {/* Decorative elements */}
      <div className="absolute bottom-0 left-0 w-full h-10 bg-gradient-to-r from-lolcow-blue/20 via-lolcow-red/20 to-lolcow-green/20"></div>
    </div>
  );
};

export default Hero;
