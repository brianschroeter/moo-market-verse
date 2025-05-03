
import React from "react";

const LoginCard: React.FC = () => {
  const handleLoginWithDiscord = () => {
    // This would typically redirect to Supabase Auth with Discord provider
    console.log("Redirecting to Discord login...");
  };

  return (
    <div className="max-w-md w-full mx-auto">
      <div className="lolcow-card p-8">
        <div className="flex justify-center mb-6">
          <img 
            src="/lovable-uploads/bc7a4d90-6d79-44cf-9581-c106f198164b.png" 
            alt="LolCow Logo" 
            className="w-24 h-24" 
          />
        </div>
        
        <h2 className="text-2xl font-fredoka text-white text-center mb-6">
          Join the LolCow Community
        </h2>
        
        <p className="text-gray-300 text-center mb-8">
          Sign in with your Discord account to access our community server and exclusive content.
        </p>
        
        <button 
          onClick={handleLoginWithDiscord}
          className="w-full flex items-center justify-center space-x-3 bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold py-3 px-4 rounded-lg transition-colors"
        >
          <i className="fa-brands fa-discord text-xl"></i>
          <span>Login with Discord</span>
        </button>
        
        <p className="text-gray-400 text-center mt-6 text-sm">
          By logging in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
};

export default LoginCard;
