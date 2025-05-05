import React from "react";
import { YouTubeMembership } from "@/services/types/auth-types";

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

  return (
    <div 
      className={`flex items-center p-3 rounded-lg ${
        membership.membership_level === "ban world" 
          ? "bg-lolcow-lightgray/50 border border-lolcow-red" 
          : "bg-lolcow-lightgray"
      }`}
    >
      <div className="w-10 h-10 rounded-full bg-lolcow-darkgray flex items-center justify-center mr-3">
        <i className={getIconForRole(membership.membership_level)}></i>
      </div>
      <div className="flex-grow">
        {/* Display cleaned channel name */}
        <p className="text-white">{cleanChannelName}</p> 
        <p className={`text-sm ${getRoleColor(membership.membership_level)}`}>
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

function getRoleColor(role: string): string {
  switch (role) {
    case "crown": return "text-yellow-400";
    case "pay pig": return "text-purple-400";
    case "cash cow": return "text-green-400";
    case "ban world": return "text-red-500";
    default: return "text-gray-300";
  }
}

function getIconForRole(role: string): string {
  switch (role) {
    case "crown": return "fa-solid fa-crown text-yellow-400";
    case "pay pig": return "fa-solid fa-piggy-bank text-purple-400";
    case "cash cow": return "fa-solid fa-cow text-green-400";
    case "ban world": return "fa-solid fa-ban text-red-500";
    default: return "fa-solid fa-user text-gray-400";
  }
}

export default YouTubeMembershipCard;
