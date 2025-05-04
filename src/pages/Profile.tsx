
import React from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import YouTubeConnections from "../components/YouTubeConnections";
import Announcements from "../components/Announcements";
import ProfileHeader from "../components/profile/ProfileHeader";
import DiscordConnections from "../components/profile/DiscordConnections";
import { useAuth } from "@/context/AuthContext";
import { mockAnnouncements, mockProducts } from "../data/mockProfileData";
import MakeAdminButton from "../components/admin/MakeAdminButton";

const Profile: React.FC = () => {
  const { user, loading, isAdmin } = useAuth();

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow py-12 px-4 sm:px-6 lg:px-8 bg-lolcow-black">
        <div className="max-w-5xl mx-auto">
          {/* Profile header */}
          <ProfileHeader />

          {/* Admin tools - temporary */}
          {user && !isAdmin && (
            <div className="mb-8 p-4 bg-yellow-900/30 border border-yellow-700 rounded-md">
              <h3 className="text-lg font-medium text-white mb-2">Admin Access</h3>
              <p className="text-gray-300 mb-4">
                If you need admin access to manage the site, use the button below:
              </p>
              <MakeAdminButton />
            </div>
          )}

          {/* Profile content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Discord Connections */}
            <DiscordConnections />

            {/* YouTube Connections */}
            <div className="col-span-1 lg:col-span-2">
              <YouTubeConnections />
            </div>

            {/* Announcements & Featured */}
            <div className="col-span-1 lg:col-span-3">
              <Announcements 
                announcements={mockAnnouncements}
                featuredProducts={mockProducts}
              />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Profile;
