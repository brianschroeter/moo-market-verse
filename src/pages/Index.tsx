import React, { useState } from "react";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Footer from "../components/Footer";
import FeaturedProducts from "../components/FeaturedProducts";

const Index: React.FC = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      // Construct the Supabase Function URL
      const supabaseProjectRef = import.meta.env.VITE_SUPABASE_PROJECT_REF;
      if (!supabaseProjectRef) {
        throw new Error('Supabase project reference is not configured in environment variables (VITE_SUPABASE_PROJECT_REF).');
      }
      const functionUrl = `https://${supabaseProjectRef}.supabase.co/functions/v1/newsletter-subscribe`;
      
      const response = await fetch(functionUrl, { // Use the function URL
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add Anon key for potential RLS checks within the function if needed
          // 'apikey': process.env.VITE_SUPABASE_ANON_KEY || '' 
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
      }

      setStatus("success");
      setMessage("Thanks for subscribing!");
      setEmail(""); // Clear input on success
    } catch (error: any) {
      setStatus("error");
      setMessage(error.message || "Failed to subscribe. Please try again.");
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow">
        <Hero />
        
        {/* Featured Products section */}
        <FeaturedProducts />
        
        {/* Discord community section */}
        <section className="py-16 bg-lolcow-black">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-fredoka text-white mb-4">
              Join the LolCow Discord
            </h2>
            <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
              Dive into the LolCow Universe! Join our Discord to connect with fans of the worst podcast on the internet, 
              get updates on shows, participate in community events, and access exclusive content.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="/login" className="btn-primary flex items-center justify-center space-x-2">
                <i className="fa-brands fa-discord text-xl"></i>
                <span>Login with Discord</span>
              </a>
            </div>
          </div>
        </section>

        {/* Newsletter section */}
        <section className="py-16 bg-lolcow-darkgray">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-fredoka text-white mb-4">
              Stay Updated
            </h2>
            <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
              Subscribe to our newsletter to get the latest updates on community events 
              and announcements.
            </p>
            
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <input 
                type="email" 
                placeholder="Your email address" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={status === 'loading'}
                className="flex-grow px-4 py-3 rounded-lg bg-lolcow-lightgray text-white border border-lolcow-lightgray focus:outline-none focus:ring-2 focus:ring-lolcow-blue disabled:opacity-50"
              />
              <button 
                type="submit"
                disabled={status === 'loading'}
                className="btn-primary whitespace-nowrap disabled:opacity-50"
              >
                {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
              </button>
            </form>
            {message && (
              <p className={`mt-4 text-sm ${status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                {message}
              </p>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
