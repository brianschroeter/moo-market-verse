
import React from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
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
  guilds: [
    { id: "1", name: "LolCow Official", icon: "https://via.placeholder.com/50" },
    { id: "2", name: "Cow Collectors", icon: "https://via.placeholder.com/50" }
  ],
  joined: "Jan 15, 2023"
};

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

              {/* Action button */}
              <div>
                <button className="btn-outline">
                  Edit Profile
                </button>
              </div>
            </div>
          </div>

          {/* Profile content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Connections */}
            <div className="lolcow-card p-6">
              <h2 className="text-xl font-fredoka text-white mb-4 flex items-center">
                <i className="fa-solid fa-link mr-2 text-lolcow-blue"></i> Connections
              </h2>
              <div className="space-y-4">
                {mockUser.connections.map((connection, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-lolcow-lightgray last:border-0">
                    <div className="flex items-center">
                      <i className={`fa-brands fa-${connection.platform.toLowerCase()} text-lg mr-3 text-gray-400`}></i>
                      <span className="text-gray-300">{connection.platform}</span>
                    </div>
                    <span className="text-lolcow-blue">{connection.username}</span>
                  </div>
                ))}
              </div>
              <button className="mt-4 w-full btn-primary">
                Add Connection
              </button>
            </div>

            {/* Discord Guilds */}
            <div className="lolcow-card p-6 col-span-1 lg:col-span-2">
              <h2 className="text-xl font-fredoka text-white mb-4 flex items-center">
                <i className="fa-brands fa-discord mr-2 text-lolcow-red"></i> Discord Guilds
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {mockUser.guilds.map((guild) => (
                  <div 
                    key={guild.id} 
                    className="flex items-center p-4 rounded-lg bg-lolcow-lightgray hover:bg-lolcow-lightgray/70 transition-colors"
                  >
                    <img 
                      src={guild.icon} 
                      alt={guild.name} 
                      className="w-10 h-10 rounded-full mr-3" 
                    />
                    <span className="text-white">{guild.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Collection stats */}
            <div className="lolcow-card p-6 col-span-1 lg:col-span-3">
              <h2 className="text-xl font-fredoka text-white mb-6 flex items-center">
                <i className="fa-solid fa-trophy mr-2 text-lolcow-green"></i> Your Collection
              </h2>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-lolcow-lightgray p-4 rounded-lg text-center">
                  <div className="text-3xl font-fredoka text-lolcow-blue mb-2">12</div>
                  <div className="text-gray-300">Items Owned</div>
                </div>
                
                <div className="bg-lolcow-lightgray p-4 rounded-lg text-center">
                  <div className="text-3xl font-fredoka text-lolcow-red mb-2">4</div>
                  <div className="text-gray-300">Rare Cows</div>
                </div>
                
                <div className="bg-lolcow-lightgray p-4 rounded-lg text-center">
                  <div className="text-3xl font-fredoka text-lolcow-green mb-2">2</div>
                  <div className="text-gray-300">Limited Edition</div>
                </div>
                
                <div className="bg-lolcow-lightgray p-4 rounded-lg text-center">
                  <div className="text-3xl font-fredoka text-purple-500 mb-2">5</div>
                  <div className="text-gray-300">Sets Completed</div>
                </div>
              </div>
              
              <div className="mt-6 text-center">
                <Link to="/collection" className="btn-outline">
                  View Full Collection
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Profile;
