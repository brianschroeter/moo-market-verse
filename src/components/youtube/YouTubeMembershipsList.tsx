import React from "react";
import { YouTubeMembership } from "@/services/types/auth-types";
import YouTubeMembershipCard from "./YouTubeMembershipCard";

interface YouTubeMembershipsListProps {
  memberships: YouTubeMembership[];
  showMemberships: boolean;
}

const membershipOrder: { [key: string]: number } = {
  "Crown": 1,
  "Pay Pig": 2,
  "Cash Cow": 3,
  "Ban World": 4,
};

const YouTubeMembershipsList: React.FC<YouTubeMembershipsListProps> = ({
  memberships,
  showMemberships
}) => {
  if (!showMemberships || memberships.length === 0) return null;

  const sortedMemberships = [...memberships].sort((a, b) => {
    const orderA = membershipOrder[a.membership_level] || 99; // Assign a high number for unknown levels
    const orderB = membershipOrder[b.membership_level] || 99;
    return orderA - orderB;
  });

  const hasSufficientMembershipForServerAccess = sortedMemberships.some(
    membership => (membershipOrder[membership.membership_level] || 99) <= 3 // Cash Cow (3) or higher (Pay Pig (2), Crown (1))
  );

  return (
    <div className="mt-6 space-y-4">
      <h3 className="text-white text-lg mb-3">Your Memberships</h3>
      <div className="mb-3">
        {hasSufficientMembershipForServerAccess ? (
          <p className="text-green-400">
            Server Access: Granted (Membership(s) verified and active).
          </p>
        ) : (
          <p className="text-red-400">
            Server Access: Not Available. Requires at least one "Cash Cow" tier (or higher) membership.
          </p>
        )}
      </div>
      <div className="space-y-3">
        {sortedMemberships.map((membership) => (
          <YouTubeMembershipCard key={membership.id} membership={membership} />
        ))}
      </div>
    </div>
  );
};

export default YouTubeMembershipsList;
