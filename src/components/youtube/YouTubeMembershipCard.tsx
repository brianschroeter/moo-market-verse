
import React from "react";
import { YouTubeMembership } from "@/services/types/auth-types";
import { Crown, DollarSign, Ban } from "lucide-react"; // Import icons from lucide-react

interface YouTubeMembershipCardProps {
  membership: YouTubeMembership;
}

// Helper function to get role details (emoji, color, icon, formatted name)
const getRoleDetails = (role: string) => {
  const lowerCaseRole = role.toLowerCase();
  switch (lowerCaseRole) {
    case "crown": 
      return { 
        emoji: "👑", 
        color: "text-yellow-400", 
        bgColor: "bg-yellow-900/30", 
        borderColor: "border-yellow-600",
        icon: "fa-solid fa-crown", 
        name: "Crown" 
      };
    case "pay pig": 
      return { 
        emoji: "🐷", 
        color: "text-pink-400", 
        bgColor: "bg-pink-900/30", 
        borderColor: "border-pink-600",
        icon: "fa-solid fa-piggy-bank", 
        name: "Pay Pig" 
      };
    case "cash cow": 
      return { 
        emoji: "🐮", 
        color: "text-green-400", 
        bgColor: "bg-green-900/30", 
        borderColor: "border-green-600",
        icon: "fa-solid fa-cow", 
        name: "Cash Cow" 
      };
    case "ban world": 
      return { 
        emoji: "🚫", 
        color: "text-red-500", 
        bgColor: "bg-red-900/50", 
        borderColor: "border-red-600",
        icon: "fa-solid fa-ban", 
        name: "Ban World" 
      };
    default: 
      return { 
        emoji: "🧑‍🤝‍🧑", 
        color: "text-gray-300", 
        bgColor: "bg-gray-700/30", 
        borderColor: "border-gray-500",
        icon: "fa-solid fa-user", 
        name: role 
      };
  }
};

const YouTubeMembershipCard: React.FC<YouTubeMembershipCardProps> = ({ membership }) => {
  const roleDetails = getRoleDetails(membership.membership_level);
  
  // Clean the channel name for checks
  const cleanChannelName = membership.channel_name?.toLowerCase().replace(/\s+/g, '') || '';

  // Check for specific channels
  const isLolcowCafe = cleanChannelName === 'lolcowcafe';
  const isLolcowLive = cleanChannelName === 'lolcowlive';
  const isLolcowMadhouse = cleanChannelName === 'lolcowmadhouse';
  const isLolcowTest = cleanChannelName === 'lolcowtest';
  const isLolcowTechTalk = cleanChannelName === 'lolcowtechtalk';
  const isLolcowAussy = cleanChannelName === 'lolcowaussy';
  const isLolcowMilkers = cleanChannelName === 'lolcowmilkers';
  const isLolcowRewind = cleanChannelName === 'lolcowrewind';
  const isLolcowQueens = cleanChannelName === 'lolcowqueens';
  const isSpecialChannel = isLolcowCafe || isLolcowLive || isLolcowMadhouse || isLolcowTest || isLolcowTechTalk || isLolcowAussy || isLolcowMilkers || isLolcowRewind || isLolcowQueens;

  // Determine the image source or icon
  let imageSrc = null;
  if (isLolcowCafe) {
    imageSrc = "/lovable-uploads/cafe-thumb.jpg";
  } else if (isLolcowLive) {
    imageSrc = "/lovable-uploads/lcl-thumb.jpg";
  } else if (isLolcowMadhouse) {
    imageSrc = "/lovable-uploads/madhouse-thumb.jpg";
  } else if (isLolcowTest) {
    imageSrc = "/lovable-uploads/test-thumb.jpg";
  } else if (isLolcowTechTalk) {
    imageSrc = "/lovable-uploads/techtalk-thumb.jpg";
  } else if (isLolcowAussy) {
    imageSrc = "/lovable-uploads/aussy-thumb.jpg";
  } else if (isLolcowMilkers) {
    imageSrc = "/lovable-uploads/milkers-thumb.jpg";
  } else if (isLolcowRewind) {
    imageSrc = "/lovable-uploads/rewind-thumb.jpg";
  } else if (isLolcowQueens) {
    imageSrc = "/lovable-uploads/queens-thumb.jpg";
  }

  // Determine the displayed channel name
  let displayChannelName = membership.channel_name;
  if (isLolcowCafe) {
    displayChannelName = "Lolcow Cafe";
  } else if (isLolcowLive) {
    displayChannelName = "Lolcow Live";
  } else if (isLolcowMadhouse) {
    displayChannelName = "Lolcow Madhouse";
  } else if (isLolcowTest) {
    displayChannelName = "Lolcow Test";
  } else if (isLolcowTechTalk) {
    displayChannelName = "Lolcow Tech Talk";
  } else if (isLolcowAussy) {
    displayChannelName = "Lolcow Aussy";
  } else if (isLolcowMilkers) {
    displayChannelName = "Lolcow Milkers";
  } else if (isLolcowRewind) {
    displayChannelName = "Lolcow Rewind";
  } else if (isLolcowQueens) {
    displayChannelName = "Lolcow Queens";
  }

  return (
    <div 
      className={`flex items-center p-3 rounded-lg border ${roleDetails.bgColor} ${roleDetails.borderColor} shadow-md hover:shadow-lg transition-shadow duration-200`}
    >
      <div className={`w-10 h-10 rounded-full ${imageSrc ? '' : roleDetails.bgColor} flex items-center justify-center mr-4 flex-shrink-0 border ${imageSrc ? 'border-transparent' : roleDetails.borderColor} overflow-hidden bg-gray-700`}>
        {imageSrc ? (
          <img 
            src={imageSrc} 
            alt={`${displayChannelName} Thumb`}
            className="w-full h-full object-cover"
          />
        ) : (
          <i className={`${roleDetails.icon} ${roleDetails.color} text-lg`}></i>
        )}
      </div>
      <div className="flex-grow min-w-0"> {/* Added min-w-0 for text truncation */}
        <p className="text-white font-medium truncate">
          {displayChannelName}
        </p> 
        <p className={`text-sm font-semibold ${roleDetails.color}`}>
          {roleDetails.emoji} {roleDetails.name}
        </p>
      </div>
    </div>
  );
};

export default YouTubeMembershipCard;
