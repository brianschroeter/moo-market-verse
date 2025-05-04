import React, { useEffect } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import YouTubeConnections from "@/components/YouTubeConnections";
import Announcements from "../components/Announcements";
import ProfileHeader from "../components/profile/ProfileHeader";
import DiscordConnections from "../components/profile/DiscordConnections";
import { useAuth } from "@/context/AuthContext";
import LoginRequired from '@/components/profile/LoginRequired';
import { useNavigate } from 'react-router-dom';

const Profile: React.FC = () => {
  const { user, profile, loading, session, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      if (!session?.provider_token) {
        console.warn("Profile: Missing provider_token in session. Signing out and redirecting to login.");
        signOut().then(() => {
          navigate('/login', { state: { message: 'Your Discord connection needs to be refreshed. Please log in again to continue.' } });
        });
      }
    }
  }, [loading, user, session, navigate, signOut]);

  if (loading) {
    return <div>Loading profile...</div>;
  }

  if (!user || !profile) {
    return <LoginRequired />;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow py-12 px-4 sm:px-6 lg:px-8 bg-lolcow-black">
        <div className="max-w-5xl mx-auto">
          {/* Profile header */}
          <ProfileHeader />

          {/* Profile content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
            {/* Discord Connections */}
            <DiscordConnections />

            {/* YouTube Connections */}
            <div className="col-span-1 lg:col-span-2">
              <YouTubeConnections />
            </div>

            {/* Announcements & Featured */}
            <div className="col-span-1 lg:col-span-3">
              <Announcements loadFromDb={true} />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Profile;
