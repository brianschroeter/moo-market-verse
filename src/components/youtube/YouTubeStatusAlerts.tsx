
import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface YouTubeStatusAlertsProps {
  hasNoYouTubeConnections: boolean;
  hasOnlyBanWorldRole: boolean;
  hasYouTubeButNoMemberships: boolean;
}

const YouTubeStatusAlerts: React.FC<YouTubeStatusAlertsProps> = ({
  hasNoYouTubeConnections,
  hasOnlyBanWorldRole,
  hasYouTubeButNoMemberships
}) => {
  if (hasNoYouTubeConnections) {
    return (
      <Alert className="bg-lolcow-lightgray border-lolcow-red mb-4">
        <AlertTitle className="text-lolcow-red">No YouTube Account Connected</AlertTitle>
        <AlertDescription>
          Connect your YouTube account to unlock memberships and access special features.
        </AlertDescription>
      </Alert>
    );
  }
  
  if (hasOnlyBanWorldRole) {
    return (
      <Alert className="bg-lolcow-lightgray border-lolcow-red mb-4">
        <AlertTitle className="text-lolcow-red">Limited Access</AlertTitle>
        <AlertDescription>
          Your current role (Ban World) doesn't provide access to the Discord server. 
          Please upgrade your membership or submit a support ticket if you believe this is an error.
        </AlertDescription>
      </Alert>
    );
  }
  
  if (hasYouTubeButNoMemberships) {
    return (
      <Alert className="bg-lolcow-lightgray border-yellow-600 mb-4">
        <AlertTitle className="text-yellow-500">No Memberships Found</AlertTitle>
        <AlertDescription>
          Your YouTube account is connected, but we couldn't find any active memberships. 
          If you believe this is an error, please submit a support ticket.
        </AlertDescription>
      </Alert>
    );
  }
  
  return null;
};

export default YouTubeStatusAlerts;
