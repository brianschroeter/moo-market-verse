
import React from "react";
import { YouTubeMembership } from "@/services/authService";
import YouTubeMembershipCard from "./YouTubeMembershipCard";

interface YouTubeMembershipsListProps {
  memberships: YouTubeMembership[];
  showMemberships: boolean;
}

const YouTubeMembershipsList: React.FC<YouTubeMembershipsListProps> = ({ 
  memberships, 
  showMemberships 
}) => {
  if (!showMemberships || memberships.length === 0) return null;
  
  return (
    <div className="mt-6 space-y-4">
      <h3 className="text-white text-lg">Your Memberships</h3>
      <div className="space-y-3">
        {memberships.map((membership) => (
          <YouTubeMembershipCard key={membership.id} membership={membership} />
        ))}
      </div>
    </div>
  );
};

export default YouTubeMembershipsList;
