
import React from "react";
import { Link } from "react-router-dom";

interface ProfileHeaderProps {
  user: {
    id: string;
    username: string;
    email: string;
    avatar: string;
    joined: string;
  };
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({ user }) => {
  return (
    <div className="lolcow-card mb-8 p-6">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
        {/* Avatar */}
        <div className="relative">
          <img
            src={user.avatar}
            alt="User Avatar"
            className="w-32 h-32 rounded-full border-4 border-lolcow-blue"
          />
          <div className="absolute bottom-0 right-0 bg-green-500 w-6 h-6 rounded-full border-4 border-lolcow-darkgray"></div>
        </div>

        {/* User info */}
        <div className="flex-grow text-center sm:text-left">
          <h1 className="text-3xl font-fredoka text-white mb-2">
            {user.username}
          </h1>
          <p className="text-gray-400 mb-4">ID: {user.id}</p>
          <p className="text-gray-300 mb-1">
            <i className="fa-solid fa-envelope mr-2 text-lolcow-blue"></i> {user.email}
          </p>
          <p className="text-gray-300">
            <i className="fa-solid fa-calendar mr-2 text-lolcow-red"></i> Joined: {user.joined}
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
