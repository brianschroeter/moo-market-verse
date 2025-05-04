
import React from "react";

const DiscordConnections: React.FC = () => {
  return (
    <div className="lolcow-card p-6">
      <h2 className="text-xl font-fredoka text-white mb-4 flex items-center">
        <i className="fa-brands fa-discord mr-2 text-lolcow-blue"></i> Discord
      </h2>
      <div className="space-y-4">
        <div className="flex items-center justify-between py-2 border-b border-lolcow-lightgray last:border-0">
          <div className="flex items-center">
            <i className="fa-brands fa-discord text-lg mr-3 text-gray-400"></i>
            <span className="text-gray-300">Connected</span>
          </div>
          <span className="text-green-500">
            <i className="fa-solid fa-check-circle mr-1"></i>
            Active
          </span>
        </div>
        <div className="bg-lolcow-lightgray p-4 rounded-lg">
          <h3 className="text-white text-lg mb-2">Server Access</h3>
          <p className="text-gray-300">
            Based on your membership roles, you have access to the LolCow Discord server.
          </p>
          <a 
            href="#" 
            className="mt-3 inline-flex items-center text-lolcow-blue hover:underline"
          >
            <i className="fa-brands fa-discord mr-1"></i>
            Join Server
            <i className="fa-solid fa-external-link text-xs ml-1"></i>
          </a>
        </div>
      </div>
    </div>
  );
};

export default DiscordConnections;
