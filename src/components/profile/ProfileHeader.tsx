import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { UserAvatar } from "@/components/ui/user-avatar";
import { getDiscordAvatarUrl } from "@/utils/avatarUtils";

const ProfileHeader: React.FC = () => {
  const { user, profile } = useAuth();

  if (!user || !profile) {
    return <div>Loading profile...</div>;
  }

  const avatarUrl = getDiscordAvatarUrl(profile.discord_id || '', profile.discord_avatar);

  const formatJoinDate = () => {
    const date = new Date(profile.created_at);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="lolcow-card mb-8 p-6">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
        {/* Avatar */}
        <div className="relative">
          <UserAvatar 
            avatarUrl={avatarUrl}
            displayName={profile.discord_username}
            size="w-32 h-32"
            className="border-4 border-lolcow-blue text-4xl"
          />
          <div className="absolute bottom-0 right-0 bg-green-500 w-6 h-6 rounded-full border-4 border-lolcow-darkgray"></div>
        </div>

        {/* User info */}
        <div className="flex-grow text-center sm:text-left">
          <h1 className="text-3xl font-fredoka text-white mb-2">
            {profile.discord_username}
          </h1>
          <p className="text-gray-400 mb-4">ID: {profile.discord_id}</p>
          {user.email && (
            <p className="text-gray-300 mb-1">
              <i className="fa-solid fa-envelope mr-2 text-lolcow-blue"></i> {user.email}
            </p>
          )}
          <p className="text-gray-300">
            <i className="fa-solid fa-calendar mr-2 text-lolcow-red"></i> Joined: {formatJoinDate()}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2">
          <Link to="/support" className="btn-primary">
            <i className="fa-solid fa-ticket mr-2"></i>
            Support
          </Link>
          <Link to="/tickets" className="btn-outline">
            <i className="fa-solid fa-list mr-2"></i>
            My Tickets
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;
