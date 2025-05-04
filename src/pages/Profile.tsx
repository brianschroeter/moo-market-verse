
import React from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import YouTubeConnections from "../components/YouTubeConnections";
import Announcements from "../components/Announcements";
import ProfileHeader from "../components/profile/ProfileHeader";
import DiscordConnections from "../components/profile/DiscordConnections";
import LoginRequired from "../components/profile/LoginRequired";
import { mockUser, mockAnnouncements, mockProducts } from "../data/mockProfileData";

const Profile: React.FC = () => {
  // In a real app, we'd check auth state and redirect to login if needed
  const isAuthenticated = true; // This would be a real auth check

  if (!isAuthenticated) {
    return <LoginRequired />;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow py-12 px-4 sm:px-6 lg:px-8 bg-lolcow-black">
        <div className="max-w-5xl mx-auto">
          {/* Profile header */}
          <ProfileHeader user={mockUser} />

          {/* Profile content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Discord Connections */}
            <DiscordConnections />

            {/* YouTube Connections */}
            <div className="col-span-1 lg:col-span-2">
              <YouTubeConnections 
                accounts={mockUser.youtubeAccounts}
                memberships={mockUser.memberships}
              />
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
