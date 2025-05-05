
import React from "react";
import { YouTubeMembership } from "@/services/types/auth-types";
import { Crown, DollarSign, Ban } from "lucide-react"; // Import icons from lucide-react

interface YouTubeMembershipCardProps {
  membership: YouTubeMembership;
}

// Helper function to strip emojis and non-alphanumeric characters (except spaces)
const stripEmojis = (str: string): string => {
  // Remove emojis and various symbols, keep basic alphanumeric and spaces
  // This regex targets a wide range of emoji and symbol Unicode blocks
  return str.replace(/([\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{FE00}-\u{FE0F}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA70}-\u{1FAFF}]|[\u{200D}\u{200B}\u{FEFF}])/gu, '').trim();
};

const YouTubeMembershipCard: React.FC<YouTubeMembershipCardProps> = ({ membership }) => {
  const cleanChannelName = stripEmojis(membership.channel_name || ''); // Ensure name exists and strip emojis
  // Format the role name and then strip emojis from it
  const formattedRole = formatRoleName(membership.membership_level);
  const cleanRoleName = stripEmojis(formattedRole);
  
  // Get the background gradient for the card based on the role
  const cardBackground = getCardBackground(membership.membership_level);

  return (
    <div 
      className={`flex items-center p-4 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl ${cardBackground}`}
    >
      <div className={`w-12 h-12 rounded-full ${getIconBackground(membership.membership_level)} flex items-center justify-center mr-4 shadow-md`}>
        {getRoleIcon(membership.membership_level)}
      </div>
      <div className="flex-grow">
        {/* Display cleaned channel name */}
        <p className="text-white font-bold">{cleanChannelName}</p>
        <p className={`text-sm font-medium ${getRoleTextColor(membership.membership_level)}`}>
          {/* Display cleaned role name */}
          {cleanRoleName}
        </p>
      </div>
    </div>
  );
};

// Helper functions
function formatRoleName(role: string): string {
  switch (role) {
    case "crown": return "Crown";
    case "pay pig": return "Pay Pig";
    case "cash cow": return "Cash Cow";
    case "ban world": return "Ban World";
    default: return role;
  }
}

function getCardBackground(role: string): string {
  switch (role) {
    case "crown": return "bg-gradient-to-r from-yellow-900 to-yellow-600 border border-yellow-400";
    case "pay pig": return "bg-gradient-to-r from-purple-900 to-purple-600 border border-purple-400";
    case "cash cow": return "bg-gradient-to-r from-green-900 to-green-600 border border-green-400";
    case "ban world": return "bg-gradient-to-r from-red-900 to-red-600 border border-red-400";
    default: return "bg-gradient-to-r from-gray-800 to-gray-600 border border-gray-400";
  }
}

function getRoleTextColor(role: string): string {
  switch (role) {
    case "crown": return "text-yellow-300";
    case "pay pig": return "text-purple-300";
    case "cash cow": return "text-green-300";
    case "ban world": return "text-red-300";
    default: return "text-gray-300";
  }
}

function getIconBackground(role: string): string {
  switch (role) {
    case "crown": return "bg-yellow-800 border-2 border-yellow-400";
    case "pay pig": return "bg-purple-800 border-2 border-purple-400";
    case "cash cow": return "bg-green-800 border-2 border-green-400";
    case "ban world": return "bg-red-800 border-2 border-red-400";
    default: return "bg-gray-700 border-2 border-gray-400";
  }
}

function getRoleIcon(role: string) {
  switch (role) {
    case "crown":
      return <Crown className="h-6 w-6 text-yellow-400" />;
    case "pay pig":
      return <DollarSign className="h-6 w-6 text-purple-400" />;
    case "cash cow":
      return (
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className="h-6 w-6 text-green-400"
        >
          <path d="M12 15a5 5 0 1 1 0-10 5 5 0 0 1 0 10Z"></path>
          <path d="M6 14c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2"></path>
          <path d="M2 9V8c0-.6.4-1 1-1h2c.6 0 1 .4 1 1v1c0 .6-.4 1-1 1H3c-.6 0-1-.4-1-1Z"></path>
          <path d="M18 9V8c0-.6.4-1 1-1h2c.6 0 1 .4 1 1v1c0 .6-.4 1-1 1h-2c-.6 0-1-.4-1-1Z"></path>
          <path d="M2 14v-1c0-.6.4-1 1-1h2c.6 0 1 .4 1 1v1c0 .6-.4 1-1 1H3c-.6 0-1-.4-1-1Z"></path>
          <path d="M18 14v-1c0-.6.4-1 1-1h2c.6 0 1 .4 1 1v1c0 .6-.4 1-1 1h-2c-.6 0-1-.4-1-1Z"></path>
          <path d="M6 18h12"></path>
          <path d="M3 18c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2v-2H3v2Z"></path>
          <path d="M11 18v4"></path>
          <path d="M13 18v4"></path>
        </svg>
      );
    case "ban world":
      return <Ban className="h-6 w-6 text-red-400" />;
    default:
      return <span className="text-gray-400">?</span>;
  }
}

export default YouTubeMembershipCard;
