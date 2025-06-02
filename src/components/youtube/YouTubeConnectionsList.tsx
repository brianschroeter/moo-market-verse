
import React from "react";
import { YouTubeConnection } from "@/services/authService";
import YouTubeConnectionCard from "./YouTubeConnectionCard";

interface YouTubeConnectionsListProps {
  accounts: YouTubeConnection[];
}

const YouTubeConnectionsList: React.FC<YouTubeConnectionsListProps> = ({ accounts }) => {
  if (accounts.length === 0) return null;
  
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-white text-lg">Connected Accounts</h3>
        <p className="text-sm text-gray-400 mt-1">
          Channel avatars use colored placeholders with initials as YouTube thumbnails are not always reliable.
        </p>
      </div>
      <div className="space-y-3">
        {accounts.map((account) => (
          <YouTubeConnectionCard key={account.id} account={account} />
        ))}
      </div>
    </div>
  );
};

export default YouTubeConnectionsList;
