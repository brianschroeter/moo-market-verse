import React from "react";
import { Link } from "react-router-dom";

const Footer: React.FC = () => {
  return (
    <footer className="bg-lolcow-darkgray border-t border-lolcow-lightgray">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and description */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2">
              <img
                src="/lovable-uploads/logo.png"
                alt="LolCow Logo"
                className="w-10"
              />
              <div className="text-xl font-fredoka">
                <span className="text-lolcow-blue">LOL</span>
                <span className="text-lolcow-red">COW</span>
                <span className="text-white">.CO</span>
              </div>
            </div>
            <p className="mt-4 text-gray-400 max-w-md">
              Dive into the LolCow Universe! Join our Discord to connect with fans of the worst podcast on the internet, get updates on shows, participate in community events, and access exclusive content.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="text-lg font-fredoka text-white mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-400 hover:text-lolcow-blue transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="https://lolcow.co/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-lolcow-blue transition-colors">
                  Shop
                </Link>
              </li>
              <li>
                <Link to="/profile" className="text-gray-400 hover:text-lolcow-blue transition-colors">
                  Profile
                </Link>
              </li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h3 className="text-lg font-fredoka text-white mb-4">Connect</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://discord.gg/lolcowuniverse"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-lolcow-blue transition-colors flex items-center space-x-2"
                >
                  <i className="fa-brands fa-discord"></i>
                  <span>Discord</span>
                </a>
              </li>
              <li>
                <a
                  href="https://x.com/lolcowlive"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-lolcow-blue transition-colors flex items-center space-x-2"
                >
                  <i className="fa-brands fa-twitter"></i>
                  <span>Twitter</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-lolcow-lightgray mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-500">© 2025 LolCow.co - All rights reserved</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link to="/terms" className="text-gray-500 hover:text-gray-400">Terms</Link>
            <Link to="/privacy" className="text-gray-500 hover:text-gray-400">Privacy</Link>
            <Link to="/faq" className="text-gray-500 hover:text-gray-400">FAQ</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
