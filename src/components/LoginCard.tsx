import React from "react";
import { useToast } from "@/hooks/use-toast";
import { signInWithDiscord } from "@/services/authService";
import { useNavigate, useLocation } from "react-router-dom";

const LoginCard: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const message = location.state?.message as string | undefined;
  
  const handleLoginWithDiscord = async () => {
    try {
      toast({
        title: "Discord Login",
        description: "Redirecting to Discord authentication...",
      });
      
      await signInWithDiscord();
      
      // Note: This code may not execute as the page will redirect to Discord
    } catch (error) {
      console.error("Discord login error:", error);
      toast({
        title: "Login Failed",
        description: "There was an error connecting to Discord. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="max-w-md w-full mx-auto">
      <div className="lolcow-card p-8">
        <div className="flex justify-center mb-6">
          <img 
            src="/lovable-uploads/logo.png" 
            alt="LolCow Logo" 
            className="w-24" 
          />
        </div>
        
        {message && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6" role="alert">
            <p className="font-bold">Attention</p>
            <p>{message}</p>
          </div>
        )}
        
        <h2 className="text-2xl font-fredoka text-white text-center mb-6">
          Join the LolCow Community
        </h2>
        
        <p className="text-gray-300 text-center mb-8">
          Sign in with your Discord account to access our community server, check your memberships, 
          and get exclusive updates.
        </p>
        
        <button 
          onClick={handleLoginWithDiscord}
          className="w-full flex items-center justify-center space-x-3 bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold py-3 px-4 rounded-lg transition-colors"
        >
          <i className="fa-brands fa-discord text-xl"></i>
          <span>Login with Discord</span>
        </button>
        
        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm mb-2">Having trouble logging in?</p>
          <a href="/support" className="text-lolcow-blue hover:underline text-sm">
            Contact Support
          </a>
        </div>
        
        <p className="text-gray-400 text-center mt-6 text-sm">
          By logging in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
};

export default LoginCard;
