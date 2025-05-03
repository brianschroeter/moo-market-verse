
import React from "react";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Footer from "../components/Footer";

const Index: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow">
        <Hero />
        
        {/* Discord community section */}
        <section className="py-16 bg-lolcow-black">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-fredoka text-white mb-4">
              Join the LolCow Discord
            </h2>
            <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
              Connect with fellow cow enthusiasts, get updates on community events, 
              and access exclusive content by joining our Discord server.
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
            
            <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <input 
                type="email" 
                placeholder="Your email address" 
                className="flex-grow px-4 py-3 rounded-lg bg-lolcow-lightgray text-white border border-lolcow-lightgray focus:outline-none focus:ring-2 focus:ring-lolcow-blue"
              />
              <button className="btn-primary whitespace-nowrap">
                Subscribe
              </button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
