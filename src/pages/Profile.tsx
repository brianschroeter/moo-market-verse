import React, { useEffect, useRef, useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import SmoothScroll from "@/components/SmoothScroll";
import YouTubeConnections from "@/components/YouTubeConnections";
import ProfileHeader from "../components/profile/ProfileHeader";
import DiscordConnections from "../components/profile/DiscordConnections";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import LoginRequired from '@/components/profile/LoginRequired';
import { useNavigate } from 'react-router-dom';
import { User, Shield, Award, Settings, Users, Youtube, MessageSquare, Sparkles, ChevronRight, Loader2 } from "lucide-react";
import { useScrollAnimation, useParallax, useStaggeredAnimation, usePageLoader, useTextReveal } from "@/hooks/useScrollAnimation";
import "@/styles/animations.css";
import "@/styles/micro-interactions.css";
import "@/styles/profile.css";

const Profile: React.FC = () => {
  const { user, profile, loading, session, signOut } = useAuth();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Animation hooks
  const isPageLoading = usePageLoader(1500);
  const heroRef = useScrollAnimation({ threshold: 0.1 });
  const heroTitleRef = useTextReveal();
  const statsRef = useStaggeredAnimation(4, { threshold: 0.2 });
  const contentRef = useScrollAnimation({ threshold: 0.1 });
  const parallaxHeroRef = useParallax(0.3);
  const parallaxBgRef = useParallax(0.5);

  // Animated background effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const animate = () => {
      time += 0.001;
      
      ctx.fillStyle = 'rgba(18, 18, 18, 0.02)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw profile-themed gradient orbs
      const drawProfileOrb = (x: number, y: number, size: number, opacity: number, color: string) => {
        const offsetX = Math.sin(time * 0.5) * 30;
        const offsetY = Math.cos(time * 0.3) * 20;
        
        const gradient = ctx.createRadialGradient(
          x + offsetX, y + offsetY, 0,
          x + offsetX, y + offsetY, size
        );
        gradient.addColorStop(0, color.replace('rgb', 'rgba').replace(')', `, ${opacity})`));
        gradient.addColorStop(0.5, color.replace('rgb', 'rgba').replace(')', `, ${opacity * 0.5})`));
        gradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x + offsetX, y + offsetY, size, 0, Math.PI * 2);
        ctx.fill();
      };

      // Draw multiple orbs with user-centric colors
      drawProfileOrb(canvas.width * 0.2, canvas.height * 0.3, 150, 0.1, 'rgb(59, 130, 246)');
      drawProfileOrb(canvas.width * 0.8, canvas.height * 0.7, 200, 0.08, 'rgb(139, 92, 246)');
      drawProfileOrb(canvas.width * 0.5, canvas.height * 0.5, 100, 0.12, 'rgb(16, 185, 129)');

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

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
      return (
        <>
          {/* Page Loader */}
          {isPageLoading && (
            <div className="page-loader">
              <div className="loader-content">
                <div className="loader-logo">
                  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="50" cy="50" r="40" stroke="url(#gradient)" strokeWidth="4" fill="none" />
                    <path d="M30 50 Q50 30 70 50 Q50 70 30 50" fill="url(#gradient)" />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#FF3366" />
                        <stop offset="50%" stopColor="#FF6B6B" />
                        <stop offset="100%" stopColor="#4ECDC4" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <div className="loader-progress">
                  <div className="loader-progress-bar" />
                </div>
              </div>
            </div>
          )}
          
          <div className={`flex flex-col min-h-screen bg-gradient-to-b from-lolcow-black to-lolcow-darkgray text-white justify-center items-center ${isPageLoading ? 'opacity-0' : 'opacity-100'}`} style={{ transition: 'opacity 0.5s ease-out' }}>
            <p className="text-xl font-fredoka">Loading profile...</p>
          </div>
        </>
      );
    }
    return <LoginRequired />;
  }
// If user and profile are loaded, we render the main content below,
// regardless of minor flickers in the 'loading' state of AuthContext,
// thus preventing unnecessary remounts of YouTubeConnections.

  return (
    <>
      {/* Page Loader */}
      {isPageLoading && (
        <div className="page-loader">
          <div className="loader-content">
            <div className="loader-logo">
              <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="40" stroke="url(#gradient)" strokeWidth="4" fill="none" />
                <path d="M30 50 Q50 30 70 50 Q50 70 30 50" fill="url(#gradient)" />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FF3366" />
                    <stop offset="50%" stopColor="#FF6B6B" />
                    <stop offset="100%" stopColor="#4ECDC4" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="loader-progress">
              <div className="loader-progress-bar" />
            </div>
          </div>
        </div>
      )}
      
      <div className={`flex flex-col min-h-screen ${isPageLoading ? 'opacity-0' : 'opacity-100'}`} style={{ transition: 'opacity 0.5s ease-out' }}>
        <SmoothScroll>
          <div className="flex flex-col min-h-screen bg-gradient-to-b from-lolcow-black to-lolcow-darkgray text-white">
            <Navbar />
            
            {/* Hero Section */}
            <section 
              ref={heroRef.ref}
              className={`relative py-24 bg-gradient-to-br from-lolcow-darkgray via-lolcow-black to-lolcow-darkgray overflow-hidden animate-on-scroll fade-up ${heroRef.isInView ? 'in-view' : ''}`}
            >
              {/* Animated Background Canvas */}
              <canvas 
                ref={canvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none opacity-60"
              />
              
              {/* Profile Grid Pattern */}
              <div className="profile-grid-pattern" />
              
              {/* Gradient overlay */}
              <div className="absolute inset-0 profile-hero-gradient" />
              
              {/* Profile Mesh */}
              <div className="profile-mesh-bg" />
              
              {/* Parallax Background Elements */}
              <div 
                ref={parallaxHeroRef.ref}
                className="absolute inset-0"
              >
                {/* Profile orbs */}
                <div className="profile-orb orb-blue top-[20%] left-[25%] w-96 h-96" />
                <div className="profile-orb orb-purple bottom-[20%] right-[20%] w-80 h-80" />
                <div className="profile-orb orb-green top-[50%] left-[50%] w-64 h-64" />
              </div>
              
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                {/* User Avatar with Glow */}
                <div className="flex justify-center mb-8">
                  <div className="relative">
                    <div className="avatar-ring" />
                    <div className="relative z-10 w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center overflow-hidden">
                      {profile?.avatar_url ? (
                        <img 
                          src={profile.avatar_url} 
                          alt={profile.display_name || 'Profile'} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="h-12 w-12 text-white" />
                      )}
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full p-1.5 border-4 border-lolcow-black z-20">
                      <Shield className="h-4 w-4 text-white" />
                    </div>
                  </div>
                </div>
                
                <div className="text-center">
                  <div 
                    ref={heroTitleRef.ref}
                    className={`hero-animate hero-title animate-on-scroll fade-up duration-slow ${heroRef.isInView ? 'in-view' : ''}`}
                  >
                    <h1 className="text-4xl md:text-6xl font-fredoka text-white mb-4 leading-tight">
                      <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent hover-scale inline-block transition-transform duration-300 cursor-pointer">
                        {profile?.display_name || 'Welcome'}
                      </span>
                    </h1>
                  </div>
                  
                  <div className={`hero-animate hero-subtitle animate-on-scroll fade-up duration-slow ${heroRef.isInView ? 'in-view' : ''}`}>
                    <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed mb-8">
                      Manage your connections, track your memberships, and customize your LolCow experience.
                    </p>
                  </div>
                  
                  {/* Quick Stats */}
                  <div ref={statsRef.ref} className={`grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 max-w-3xl mx-auto stagger-container ${statsRef.isInView ? 'in-view' : ''}`}>
                    <div className="bg-blue-500/10 rounded-xl p-4 text-center transform transition-all duration-300 hover:scale-105 animate-on-scroll fade-up border border-blue-500/20">
                      <div className="flex items-center justify-center space-x-2 mb-2">
                        <MessageSquare className="h-5 w-5 text-blue-400" />
                      </div>
                      <div className="text-2xl font-bold text-white profile-stat-value" style={{ '--stat-delay': '0s' } as React.CSSProperties}>
                        {profile?.discord_connections?.length || 0}
                      </div>
                      <span className="text-xs text-gray-500">Discord Servers</span>
                    </div>
                    
                    <div className="bg-purple-500/10 rounded-xl p-4 text-center transform transition-all duration-300 hover:scale-105 animate-on-scroll fade-up border border-purple-500/20">
                      <div className="flex items-center justify-center space-x-2 mb-2">
                        <Youtube className="h-5 w-5 text-purple-400" />
                      </div>
                      <div className="text-2xl font-bold text-white profile-stat-value" style={{ '--stat-delay': '0.5s' } as React.CSSProperties}>
                        {profile?.youtube_connections?.length || 0}
                      </div>
                      <span className="text-xs text-gray-500">YouTube Channels</span>
                    </div>
                    
                    <div className="bg-green-500/10 rounded-xl p-4 text-center transform transition-all duration-300 hover:scale-105 animate-on-scroll fade-up border border-green-500/20">
                      <div className="flex items-center justify-center space-x-2 mb-2">
                        <Award className="h-5 w-5 text-green-400" />
                      </div>
                      <div className="text-2xl font-bold text-white profile-stat-value" style={{ '--stat-delay': '1s' } as React.CSSProperties}>
                        {profile?.user_roles?.includes('admin') ? 'Admin' : 'Member'}
                      </div>
                      <span className="text-xs text-gray-500">Account Type</span>
                    </div>
                    
                    <div className="bg-yellow-500/10 rounded-xl p-4 text-center transform transition-all duration-300 hover:scale-105 animate-on-scroll fade-up border border-yellow-500/20">
                      <div className="flex items-center justify-center space-x-2 mb-2">
                        <Sparkles className="h-5 w-5 text-yellow-400" />
                      </div>
                      <div className="text-2xl font-bold text-white">
                        Active
                      </div>
                      <span className="text-xs text-gray-500">Status</span>
                    </div>
                  </div>
                  
                  <div className={`hero-animate hero-cta animate-on-scroll fade-up duration-slow ${heroRef.isInView ? 'in-view' : ''}`}>
                    <div className="flex flex-wrap justify-center gap-4">
                      <Button 
                        onClick={() => document.getElementById('connections')?.scrollIntoView({ behavior: 'smooth' })}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-4 text-lg hover-lift transition-all duration-300 group"
                      >
                        Manage Connections
                        <Settings className="h-5 w-5 ml-2 group-hover:rotate-90 transition-transform duration-300" />
                      </Button>
                      <Button 
                        onClick={() => navigate('/shop')}
                        variant="outline"
                        className="border-purple-500 text-purple-500 hover:bg-purple-500 hover:text-white font-semibold px-8 py-4 text-lg hover-lift transition-all duration-300 group"
                      >
                        Browse Shop
                        <ChevronRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
            
            <main className="flex-grow py-12 px-4 sm:px-6 lg:px-8">
              <div className="max-w-5xl mx-auto">
                {/* Profile header */}
                <div ref={contentRef.ref} className={`animate-on-scroll fade-up ${contentRef.isInView ? 'in-view' : ''}`}>
                  <ProfileHeader />
                </div>

                {/* Profile content */}
                <div id="connections" className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
                  {/* Discord Connections */}
                  <div className={`animate-on-scroll fade-up ${contentRef.isInView ? 'in-view' : ''}`}>
                    <DiscordConnections />
                  </div>

                  {/* YouTube Connections */}
                  <div className={`col-span-1 lg:col-span-2 animate-on-scroll fade-up ${contentRef.isInView ? 'in-view' : ''}`}>
                    {session?.provider_token ? (
                      <YouTubeConnections />
                    ) : (
                      <Card className="lolcow-card w-full connection-card-active profile-card-hover">
                        <CardHeader>
                          <CardTitle className="text-xl font-fredoka text-white flex items-center">
                            <Youtube className="text-red-500 mr-2 h-6 w-6" /> YouTube Connections
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

                </div>
              </div>
            </main>
            <Footer />
          </div>
        </SmoothScroll>
      </div>
    </>
  );
};

export default Profile;
