import React, { useEffect } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import YouTubeConnections from "@/components/YouTubeConnections";
import Announcements from "../components/Announcements";
import ProfileHeader from "../components/profile/ProfileHeader";
import DiscordConnections from "../components/profile/DiscordConnections";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  if (!user || !profile) {
    if (loading) {
      return <div>Loading profile...</div>;
    }
    return <LoginRequired />;
  }
// If user and profile are loaded, we render the main content below,
// regardless of minor flickers in the 'loading' state of AuthContext,
// thus preventing unnecessary remounts of YouTubeConnections.

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
              {session?.provider_token ? (
                <YouTubeConnections />
              ) : (
                <Card className="lolcow-card w-full">
                  <CardHeader>
                    <CardTitle className="text-xl font-fredoka text-white flex items-center">
                      <i className="fa-brands fa-youtube text-red-500 mr-2"></i> YouTube Connections
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-300">Verifying YouTube connection status...</p>
                    {(!loading && user && !session?.provider_token) && (
                      <p className="text-sm text-yellow-400 mt-2">Your session needs to be refreshed. You may be redirected to login.</p>
                    )}
                  </CardContent>
                </Card>
              )}
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
