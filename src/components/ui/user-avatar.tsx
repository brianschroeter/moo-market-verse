import React from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAvatarFallback } from "@/utils/avatarUtils";

interface UserAvatarProps {
  avatarUrl: string | null | undefined;
  displayName: string;
  size?: string;
  className?: string;
}

/**
 * UserAvatar component with automatic fallback handling
 * 
 * Handles failed image loads gracefully by showing initials with a consistent color
 * based on the user's name. Prevents 404 errors in console by using onError handlers.
 */
export const UserAvatar: React.FC<UserAvatarProps> = ({ 
  avatarUrl, 
  displayName, 
  size = "w-10 h-10",
  className = ""
}) => {
  const { imageSrc, handleError, showFallback, fallbackProps } = useAvatarFallback(avatarUrl, displayName);

  return (
    <Avatar className={`${size} rounded-full ${className}`}>
      {!showFallback && imageSrc && (
        <AvatarImage 
          src={imageSrc} 
          alt={displayName}
          onError={handleError}
          className="object-cover"
        />
      )}
      <AvatarFallback 
        className="text-white font-semibold"
        style={{
          backgroundColor: fallbackProps.backgroundColor,
          color: fallbackProps.color
        }}
      >
        {fallbackProps.initials}
      </AvatarFallback>
    </Avatar>
  );
};