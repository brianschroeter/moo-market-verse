
import React from "react";
import { YouTubeMembership } from "@/services/types/auth-types";
import YouTubeMembershipCard from "./YouTubeMembershipCard";

interface YouTubeMembershipsListProps {
  memberships: YouTubeMembership[];
  showMemberships: boolean;
}

const YouTubeMembershipsList: React.FC<YouTubeMembershipsListProps> = ({ 
  memberships, 
  showMemberships 
}) => {
  if (!showMemberships) {
    return null;
  }

  return (
    <div className="mt-6">
      <div className="flex items-center mb-4">
        <h3 className="text-xl text-white font-bold">
          Your Memberships
        </h3>
        <div className="ml-2 px-2 py-1 bg-lolcow-blue rounded-full text-xs text-white">
          {memberships.length}
        </div>
      </div>
      
      <div className="bg-lolcow-darkgray/30 rounded-lg p-5 backdrop-blur-sm border border-lolcow-lightgray/30">
        <div className="space-y-4">
          {memberships.map((membership, index) => (
            <YouTubeMembershipCard key={index} membership={membership} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default YouTubeMembershipsList;
