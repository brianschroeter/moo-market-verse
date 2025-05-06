import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const ProfileHeader: React.FC = () => {
  const { user, profile } = useAuth();

  if (!user || !profile) {
    return <div>Loading profile...</div>;
  }

  const getDiscordAvatarUrl = () => {
    if (profile.discord_id && profile.discord_avatar) {
      return `https://cdn.discordapp.com/avatars/${profile.discord_id}/${profile.discord_avatar}.png?size=128`;
    }
    return "https://placehold.co/128x128";
  };

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
          <Avatar className="w-32 h-32 border-4 border-lolcow-blue">
            <AvatarImage 
              src={getDiscordAvatarUrl()} 
              alt={profile.discord_username}
              className="object-cover"
            />
            <AvatarFallback className="bg-lolcow-darkgray text-white text-4xl">
              {profile.discord_username.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="absolute bottom-0 right-0 bg-green-500 w-6 h-6 rounded-full border-4 border-lolcow-darkgray"></div>
        </div>

        {/* User info */}
        <div className="flex-grow text-center sm:text-left">
          <h1 className="text-3xl font-fredoka text-white mb-2">
            {profile.discord_username}
          </h1>
          <p className="text-gray-400 mb-4">ID: {profile.discord_id}</p>
          <p className="text-gray-300 mb-1">
            <i className="fa-solid fa-envelope mr-2 text-lolcow-blue"></i> {user.email || "No email provided"}
          </p>
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
