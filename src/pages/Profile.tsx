
import React from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import YouTubeConnections from "../components/YouTubeConnections";
import Announcements from "../components/Announcements";
import { Link } from "react-router-dom";

// Mock user data - would come from Supabase in a real implementation
const mockUser = {
  id: "123456789",
  username: "CowFan123",
  email: "cowfan@example.com",
  avatar: "https://cdn.discordapp.com/avatars/123456789/abcdef.png",
  connections: [
    { platform: "Twitter", username: "@cowfan123" },
    { platform: "Instagram", username: "cowfan123" }
  ],
  joined: "Jan 15, 2023",
  youtubeAccounts: [
    { 
      id: "yt1", 
      channelName: "CowFan Gaming", 
      avatar: "https://via.placeholder.com/50", 
      isConnected: true 
    }
  ],
  memberships: [
    {
      channelId: "ch1",
      channelName: "LolCow Main Channel",
      role: "crown" as const,
      icon: "fa-solid fa-crown text-yellow-400"
    },
    {
      channelId: "ch2",
      channelName: "LolCow Side Channel",
      role: "pay pig" as const,
      icon: "fa-solid fa-piggy-bank text-purple-400"
    },
    {
      channelId: "ch3",
      channelName: "LolCow Archives",
      role: "ban world" as const,
      icon: "fa-solid fa-ban text-red-500"
    }
  ]
};

// Mock announcements and featured products
const mockAnnouncements = [
  {
    id: "a1",
    title: "New Discord Server Rules",
    content: "We've updated our Discord server rules. Please review them before participating in discussions.",
    date: "May 1, 2025",
    isImportant: true
  },
  {
    id: "a2",
    title: "Upcoming Live Stream",
    content: "Join us this Friday at 8PM EST for a special live stream event!",
    date: "Apr 30, 2025"
  }
];

const mockProducts = [
  {
    id: "p1",
    name: "LolCow T-Shirt",
    description: "Limited edition LolCow mascot t-shirt. Available in multiple sizes.",
    imageUrl: "https://via.placeholder.com/300x200",
    url: "#"
  },
  {
    id: "p2",
    name: "LolCow Mug",
    description: "Start your day with the official LolCow coffee mug.",
    imageUrl: "https://via.placeholder.com/300x200",
    url: "#"
  }
];

const Profile: React.FC = () => {
  // In a real app, we'd check auth state and redirect to login if needed
  const isAuthenticated = true; // This would be a real auth check

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow flex items-center justify-center p-8">
          <div className="lolcow-card max-w-md w-full p-8 text-center">
            <h2 className="text-2xl font-fredoka text-white mb-6">
              Login Required
            </h2>
            <p className="text-gray-300 mb-6">
              You need to log in with Discord to view your profile.
            </p>
            <Link to="/login" className="btn-primary">
              Login with Discord
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow py-12 px-4 sm:px-6 lg:px-8 bg-lolcow-black">
        <div className="max-w-5xl mx-auto">
          {/* Profile header */}
          <div className="lolcow-card mb-8 p-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
              {/* Avatar */}
              <div className="relative">
                <img
                  src={mockUser.avatar}
                  alt="User Avatar"
                  className="w-32 h-32 rounded-full border-4 border-lolcow-blue"
                />
                <div className="absolute bottom-0 right-0 bg-green-500 w-6 h-6 rounded-full border-4 border-lolcow-darkgray"></div>
              </div>

              {/* User info */}
              <div className="flex-grow text-center sm:text-left">
                <h1 className="text-3xl font-fredoka text-white mb-2">
                  {mockUser.username}
                </h1>
                <p className="text-gray-400 mb-4">ID: {mockUser.id}</p>
                <p className="text-gray-300 mb-1">
                  <i className="fa-solid fa-envelope mr-2 text-lolcow-blue"></i> {mockUser.email}
                </p>
                <p className="text-gray-300">
                  <i className="fa-solid fa-calendar mr-2 text-lolcow-red"></i> Joined: {mockUser.joined}
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

          {/* Profile content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Discord Connections */}
            <div className="lolcow-card p-6">
              <h2 className="text-xl font-fredoka text-white mb-4 flex items-center">
                <i className="fa-brands fa-discord mr-2 text-lolcow-blue"></i> Discord
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-lolcow-lightgray last:border-0">
                  <div className="flex items-center">
                    <i className="fa-brands fa-discord text-lg mr-3 text-gray-400"></i>
                    <span className="text-gray-300">Connected</span>
                  </div>
                  <span className="text-green-500">
                    <i className="fa-solid fa-check-circle mr-1"></i>
                    Active
                  </span>
                </div>
                <div className="bg-lolcow-lightgray p-4 rounded-lg">
                  <h3 className="text-white text-lg mb-2">Server Access</h3>
                  <p className="text-gray-300">
                    Based on your membership roles, you have access to the LolCow Discord server.
                  </p>
                  <a 
                    href="#" 
                    className="mt-3 inline-flex items-center text-lolcow-blue hover:underline"
                  >
                    <i className="fa-brands fa-discord mr-1"></i>
                    Join Server
                    <i className="fa-solid fa-external-link text-xs ml-1"></i>
                  </a>
                </div>
              </div>
            </div>

            {/* YouTube Connections - uses our new component */}
            <div className="col-span-1 lg:col-span-2">
              <YouTubeConnections 
                accounts={mockUser.youtubeAccounts}
                memberships={mockUser.memberships}
              />
            </div>

            {/* Announcements & Featured - uses our new component */}
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
