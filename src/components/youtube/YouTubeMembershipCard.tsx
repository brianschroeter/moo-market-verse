
import React from "react";
import { YouTubeMembership } from "@/services/authService";

interface YouTubeMembershipCardProps {
  membership: YouTubeMembership;
}

const YouTubeMembershipCard: React.FC<YouTubeMembershipCardProps> = ({ membership }) => {
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
        <p className="text-white">{membership.creator_channel_name}</p>
        <p className={`text-sm ${getRoleColor(membership.membership_level)}`}>
          {formatRoleName(membership.membership_level)}
        </p>
      </div>
    </div>
  );
};

// Helper functions
function formatRoleName(role: string): string {
  switch (role) {
    case "crown": return "Crown Member";
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
