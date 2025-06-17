import React, { useState, useEffect, useRef } from "react";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Footer from "../components/Footer";
import FeaturedProducts from "../components/FeaturedProducts";
import LeaderboardTeaser from "../components/LeaderboardTeaser";
import ScheduleTeaser from "../components/ScheduleTeaser";
import ReviewsCarousel from "../components/ReviewsCarousel";
import { Users, MessageCircle, Zap, Sparkles, Radio, ChevronRight, Loader2, Mail, Send, CheckCircle2, XCircle } from "lucide-react";
import { useScrollAnimation, useParallax, useStaggeredAnimation, usePageLoader } from "@/hooks/useScrollAnimation";
import "@/styles/discord.css";
import "@/styles/micro-interactions.css";
import "@/styles/newsletter.css";
import "@/styles/animations.css";
import "@/styles/teasers.css";

const Index: React.FC = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [memberCount, setMemberCount] = useState(1610);
  const [activeCount, setActiveCount] = useState(465);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Animation hooks
  const isLoading = usePageLoader(2000);
  const discordSectionRef = useScrollAnimation({ threshold: 0.2 });
  const newsletterSectionRef = useScrollAnimation({ threshold: 0.3 });
  const benefitsRef = useStaggeredAnimation(4, { threshold: 0.2 });
  const statsRef = useStaggeredAnimation(2, { threshold: 0.3 });
  const parallaxCanvasRef = useParallax(0.3);
  const parallaxWaveRef = useParallax(0.5);

  // Animated counter effect
  useEffect(() => {
    const animateValue = (start: number, end: number, duration: number, setter: (value: number) => void) => {
      const startTime = Date.now();
      const update = () => {
        const currentTime = Date.now();
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const currentValue = Math.floor(start + (end - start) * progress);
        setter(currentValue);
        
        if (progress < 1) {
          requestAnimationFrame(update);
        }
      };
      requestAnimationFrame(update);
    };

    // Animate counters on mount
    animateValue(0, 1610, 2000, setMemberCount);
    animateValue(0, 465, 1500, setActiveCount);

    // Simulate live updates
    const interval = setInterval(() => {
      setActiveCount(prev => prev + Math.floor(Math.random() * 5) - 2);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Discord-themed animated background
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

      // Draw Discord-themed gradient orbs
      const drawDiscordOrb = (x: number, y: number, size: number, opacity: number) => {
        const offsetX = Math.sin(time * 0.5) * 30;
        const offsetY = Math.cos(time * 0.3) * 20;
        
        const gradient = ctx.createRadialGradient(
          x + offsetX, y + offsetY, 0,
          x + offsetX, y + offsetY, size
        );
        gradient.addColorStop(0, `rgba(88, 101, 242, ${opacity})`);
        gradient.addColorStop(0.5, `rgba(114, 137, 218, ${opacity * 0.5})`);
        gradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      };

      drawDiscordOrb(canvas.width * 0.2, canvas.height * 0.3, 200, 0.3);
      drawDiscordOrb(canvas.width * 0.8, canvas.height * 0.7, 150, 0.2);
      drawDiscordOrb(canvas.width * 0.5, canvas.height * 0.5, 100, 0.15);

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      // Use fetch to call the Supabase Edge Function
      const response = await fetch('https://dlmbqojnhjsecajxltzj.supabase.co/functions/v1/newsletter-subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Use the error message from the function response if available
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }
      
      setStatus("success");
      setMessage(result.message || "Thanks for subscribing!");
      setEmail(""); // Clear input on success
    } catch (error: any) {
      setStatus("error");
      setMessage(error.message || "Failed to subscribe. Please try again.");
    }
  };

  return (
    <>
      {/* Page Loader */}
      {isLoading && (
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
      
      <div className={`flex flex-col min-h-screen ${isLoading ? 'opacity-0' : 'opacity-100'}`} style={{ transition: 'opacity 0.5s ease-out' }}>
      <Navbar />
      <main className="flex-grow">
        <Hero />
        
        {/* Reviews Carousel section */}
        <div className="animate-on-scroll fade-up duration-slow">
          <ReviewsCarousel />
        </div>
        
        {/* Featured Products section */}
        <div className="animate-on-scroll fade-up duration-slow">
          <FeaturedProducts />
        </div>
        
        {/* Leaderboard Teaser Section */}
        <section className="relative py-24 bg-gradient-to-b from-lolcow-black via-lolcow-black/95 to-lolcow-black overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0">
            {/* Gradient base */}
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 via-transparent to-lolcow-red/10" />
            
            {/* Geometric pattern */}
            <div className="absolute inset-0 opacity-[0.03]" style={{
              backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255, 215, 0, 0.5) 35px, rgba(255, 215, 0, 0.5) 70px)`,
              backgroundSize: '100px 100px'
            }} />
            
            {/* Trophy shapes */}
            <svg className="absolute top-10 right-10 w-32 h-32 text-yellow-500/10" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.2,2H19.5H18C17.1,2 16,3 16,4H8C8,3 6.9,2 6,2H4.5H3.8H2V11C2,12 3,13 4,13H6.2C6.6,15 7.9,16.7 11,17V19.1C8.8,19.3 8,20.4 8,21.7V22H16V21.7C16,20.4 15.2,19.3 13,19.1V17C16.1,16.7 17.4,15 17.8,13H20C21,13 22,12 22,11V2H20.2M4,11V4H6V6V11C5.1,11 4.3,11 4,11M20,11C19.7,11 18.9,11 18,11V6V4H20V11Z" />
            </svg>
            <svg className="absolute bottom-20 left-20 w-24 h-24 text-lolcow-red/10 rotate-12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.2,2H19.5H18C17.1,2 16,3 16,4H8C8,3 6.9,2 6,2H4.5H3.8H2V11C2,12 3,13 4,13H6.2C6.6,15 7.9,16.7 11,17V19.1C8.8,19.3 8,20.4 8,21.7V22H16V21.7C16,20.4 15.2,19.3 13,19.1V17C16.1,16.7 17.4,15 17.8,13H20C21,13 22,12 22,11V2H20.2M4,11V4H6V6V11C5.1,11 4.3,11 4,11M20,11C19.7,11 18.9,11 18,11V6V4H20V11Z" />
            </svg>
            
            {/* Floating circles */}
            <div className="absolute top-1/4 left-1/3 w-64 h-64 bg-yellow-400/5 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/3 w-48 h-48 bg-lolcow-red/5 rounded-full blur-2xl" />
            
            {/* Dot pattern */}
            <div className="absolute inset-0 opacity-[0.02]" style={{
              backgroundImage: `radial-gradient(circle, #FFD700 1px, transparent 1px)`,
              backgroundSize: '20px 20px'
            }} />
          </div>
          
          <div className="relative z-10 animate-on-scroll fade-up">
            <LeaderboardTeaser />
          </div>
        </section>
        
        {/* Schedule Teaser Section */}
        <section className="relative py-24 bg-gradient-to-b from-lolcow-black/95 via-lolcow-black to-lolcow-black overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0">
            {/* Gradient base */}
            <div className="absolute inset-0 bg-gradient-to-r from-lolcow-blue/10 via-transparent to-lolcow-red/10" />
            
            {/* Grid pattern */}
            <div className="absolute inset-0 opacity-[0.03]" style={{
              backgroundImage: `linear-gradient(rgba(78, 205, 196, 0.5) 1px, transparent 1px),
                               linear-gradient(90deg, rgba(78, 205, 196, 0.5) 1px, transparent 1px)`,
              backgroundSize: '50px 50px'
            }} />
            
            {/* Calendar/Schedule icons */}
            <svg className="absolute top-20 left-16 w-28 h-28 text-lolcow-blue/10 -rotate-12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19,3H18V1H16V3H8V1H6V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M19,19H5V8H19V19M16.5,12.5V14.5H14.5V12.5H16.5M12,12.5V14.5H10V12.5H12M7.5,12.5V14.5H5.5V12.5H7.5M16.5,16.5V18.5H14.5V16.5H16.5Z" />
            </svg>
            <svg className="absolute bottom-16 right-20 w-32 h-32 text-lolcow-red/10 rotate-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z" />
            </svg>
            
            {/* Wave pattern */}
            <div className="absolute bottom-0 left-0 right-0 h-32 opacity-5">
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1200 120">
                <path d="M0,60 C200,20 400,100 600,60 C800,20 1000,100 1200,60 L1200,120 L0,120 Z" fill="currentColor" className="text-lolcow-blue" />
              </svg>
            </div>
            
            {/* Floating elements */}
            <div className="absolute top-1/3 right-1/4 w-56 h-56 bg-lolcow-blue/5 rounded-full blur-3xl" />
            <div className="absolute bottom-1/3 left-1/4 w-40 h-40 bg-lolcow-red/5 rounded-full blur-2xl" />
            
            {/* Hexagon pattern */}
            <div className="absolute inset-0 opacity-[0.02]" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%234ECDC4' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              backgroundSize: '60px 60px'
            }} />
          </div>
          
          <div className="relative z-10 animate-on-scroll fade-up">
            <ScheduleTeaser />
          </div>
        </section>
        
        {/* Discord community section */}
        <section 
          ref={discordSectionRef.ref}
          className="relative bg-gradient-to-br from-discord-blurple/20 via-lolcow-black to-lolcow-black animate-on-scroll fade-up overflow-hidden"
        >
          {/* Canvas for animated background */}
          <canvas 
            ref={canvasRef}
            className="absolute inset-0 w-full h-full opacity-50"
            style={{ mixBlendMode: 'screen' }}
          />
          
          {/* Animated gradient mesh */}
          <div className="absolute inset-0 discord-mesh opacity-30" />
          
          {/* Floating Discord elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Floating Discord logos */}
            <i className="fa-brands fa-discord absolute text-discord-blurple/20 text-4xl top-20 left-[10%] icon-float-1" />
            <i className="fa-brands fa-discord absolute text-discord-blurple/15 text-6xl top-40 right-[15%] icon-float-2" />
            <i className="fa-brands fa-discord absolute text-discord-blurple/10 text-3xl bottom-20 left-[70%] icon-float-1" style={{ animationDelay: '-10s' }} />
            
            {/* Floating emojis */}
            <span className="absolute text-4xl top-32 right-[25%] opacity-30 icon-float-2">🎮</span>
            <span className="absolute text-3xl top-60 left-[20%] opacity-25 icon-float-1" style={{ animationDelay: '-5s' }}>🔊</span>
            <span className="absolute text-5xl bottom-40 right-[30%] opacity-20 icon-float-2" style={{ animationDelay: '-15s' }}>💬</span>
            <span className="absolute text-3xl bottom-32 left-[15%] opacity-30 icon-float-1" style={{ animationDelay: '-7s' }}>🎉</span>
            
            {/* Animated chat messages */}
            <div className="absolute top-[20%] left-[5%] discord-glass rounded-lg p-3 max-w-[200px] message-bubble" style={{ animationDelay: '0s' }}>
              <div className="flex items-center space-x-2 mb-1">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-lolcow-red to-lolcow-blue" />
                <span className="text-xs text-gray-400">MooFan42</span>
              </div>
              <p className="text-xs text-gray-300">Just joined the stream! 🐄</p>
            </div>
            
            <div className="absolute top-[40%] right-[8%] discord-glass rounded-lg p-3 max-w-[200px] message-bubble" style={{ animationDelay: '3s' }}>
              <div className="flex items-center space-x-2 mb-1">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-discord-blurple to-lolcow-blue" />
                <span className="text-xs text-gray-400">CowTipper</span>
              </div>
              <p className="text-xs text-gray-300">Can't wait for tonight's episode!</p>
            </div>
            
            <div className="absolute bottom-[30%] left-[12%] discord-glass rounded-lg p-3 max-w-[180px] message-bubble" style={{ animationDelay: '6s' }}>
              <div className="flex items-center space-x-2 mb-1">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-400 to-blue-500" />
                <span className="text-xs text-gray-400">LolCowLover</span>
              </div>
              <p className="text-xs text-gray-300">Voice chat is lit! 🔥</p>
            </div>
            
            {/* Discord particles */}
            <div className="discord-particle w-2 h-2 bg-discord-blurple/30 rounded-full left-[20%]" style={{ animationDelay: '0s' }} />
            <div className="discord-particle w-3 h-3 bg-lolcow-blue/20 rounded-full left-[50%]" style={{ animationDelay: '5s' }} />
            <div className="discord-particle w-2 h-2 bg-lolcow-red/25 rounded-full left-[80%]" style={{ animationDelay: '10s' }} />
          </div>
          
          <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            {/* Animated Discord logo */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="absolute inset-0 bg-discord-blurple/30 rounded-full blur-3xl discord-blob" />
                <i className="fa-brands fa-discord text-7xl text-discord-blurple discord-float relative z-10" />
                <div className="absolute -inset-4">
                  <div className="discord-ripple bg-discord-blurple/20" />
                  <div className="discord-ripple bg-discord-blurple/20" style={{ animationDelay: '0.5s' }} />
                  <div className="discord-ripple bg-discord-blurple/20" style={{ animationDelay: '1s' }} />
                </div>
              </div>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-fredoka text-white mb-6 text-center animate-on-scroll fade-up duration-slow">
              <span className="bg-gradient-to-r from-discord-blurple via-white to-lolcow-blue bg-clip-text text-transparent">
                Join the LolCow Community
              </span>
            </h2>
            
            {/* Live stats cards */}
            <div ref={statsRef.ref} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12 max-w-2xl mx-auto stagger-container">
              {/* Total members */}
              <div className="discord-glass rounded-xl p-4 text-center transform transition-all duration-300 hover:scale-105 animate-on-scroll fade-up">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Users className="h-5 w-5 text-discord-blurple" />
                  <span className="text-gray-400 text-sm">Total Members</span>
                </div>
                <div className="text-3xl font-bold text-white counter-pop">
                  {memberCount.toLocaleString()}
                </div>
              </div>
              
              {/* Online now */}
              <div className="discord-glass rounded-xl p-4 text-center transform transition-all duration-300 hover:scale-105 animate-on-scroll fade-up">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <div className="relative">
                    <div className="w-3 h-3 bg-green-500 rounded-full" />
                    <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full presence-pulse" />
                  </div>
                  <span className="text-gray-400 text-sm">Online Now</span>
                </div>
                <div className="text-3xl font-bold text-white counter-pop">
                  {activeCount}
                </div>
              </div>
            </div>
            
            {/* Benefits section */}
            <div className="mb-12">
              <h3 className="text-2xl font-fredoka text-white mb-6 text-center animate-on-scroll fade-up">Why Join Our Discord?</h3>
              <div ref={benefitsRef.ref} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto stagger-container">
                {/* Benefit cards */}
                <div className="group animate-on-scroll fade-up">
                  <div className="discord-glass rounded-lg p-4 transform transition-all duration-300 group-hover:scale-105 glass-shimmer">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-discord-blurple/20 flex items-center justify-center">
                        <Sparkles className="h-5 w-5 text-discord-blurple" />
                      </div>
                      <h4 className="font-semibold text-white">Exclusive Content</h4>
                    </div>
                    <p className="text-gray-400 text-sm">Early access to new episodes and behind-the-scenes content</p>
                  </div>
                </div>
                
                <div className="group animate-on-scroll fade-up">
                  <div className="discord-glass rounded-lg p-4 transform transition-all duration-300 group-hover:scale-105 glass-shimmer">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-lolcow-red/20 flex items-center justify-center">
                        <MessageCircle className="h-5 w-5 text-lolcow-red" />
                      </div>
                      <h4 className="font-semibold text-white">Live Shows</h4>
                    </div>
                    <p className="text-gray-400 text-sm">Join live podcast recordings and Q&A sessions</p>
                  </div>
                </div>
                
                <div className="group animate-on-scroll fade-up">
                  <div className="discord-glass rounded-lg p-4 transform transition-all duration-300 group-hover:scale-105 glass-shimmer">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-lolcow-blue/20 flex items-center justify-center">
                        <Users className="h-5 w-5 text-lolcow-blue" />
                      </div>
                      <h4 className="font-semibold text-white">Community Events</h4>
                    </div>
                    <p className="text-gray-400 text-sm">Game nights, contests, and community challenges</p>
                  </div>
                </div>
                
                <div className="group animate-on-scroll fade-up">
                  <div className="discord-glass rounded-lg p-4 transform transition-all duration-300 group-hover:scale-105 glass-shimmer">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                        <Zap className="h-5 w-5 text-green-500" />
                      </div>
                      <h4 className="font-semibold text-white">Direct Access</h4>
                    </div>
                    <p className="text-gray-400 text-sm">Chat directly with the hosts and other fans</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* CTA Button */}
            <div className="flex justify-center animate-on-scroll fade-up duration-slow timing-bounce">
              <a 
                href="/login" 
                className="relative inline-flex items-center space-x-2 px-8 py-4 bg-discord-blurple text-white font-semibold rounded-lg transform transition-all duration-300 hover:scale-105 discord-button-glow group no-underline hover:no-underline"
              >
                <i className="fa-brands fa-discord text-2xl group-hover:rotate-12 transition-transform duration-300" />
                <span className="text-lg">Join {memberCount.toLocaleString()}+ Members</span>
                <ChevronRight className="h-5 w-5 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" />
              </a>
            </div>
            
            {/* Server preview hint */}
            <p className="text-center mt-6 text-gray-500 text-sm">
              <span className="inline-flex items-center space-x-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span>Active community with {activeCount} members online now</span>
              </span>
            </p>
          </div>
        </section>
        
        {/* Discord wave separator */}
        <div className="relative -mt-16 z-10 overflow-hidden">
          <svg className="w-[200%] h-32" viewBox="0 0 2400 300" preserveAspectRatio="none">
            <defs>
              <linearGradient id="discord-wave-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#5865F2" stopOpacity="0.15" />
                <stop offset="25%" stopColor="#7289DA" stopOpacity="0.2" />
                <stop offset="50%" stopColor="#5865F2" stopOpacity="0.15" />
                <stop offset="75%" stopColor="#7289DA" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#5865F2" stopOpacity="0.15" />
              </linearGradient>
            </defs>
            
            {/* Multiple wave layers for depth */}
            <g className="discord-wave">
              {/* First wave pattern - repeating */}
              <path 
                d="M0,120 C300,60 600,180 900,120 C1200,60 1500,180 1800,120 C2100,60 2400,180 2400,120 L2400,300 L0,300 Z" 
                fill="url(#discord-wave-gradient)" 
              />
              {/* Second wave pattern - repeating */}
              <path 
                d="M0,160 C300,100 600,220 900,160 C1200,100 1500,220 1800,160 C2100,100 2400,220 2400,160 L2400,300 L0,300 Z" 
                fill="url(#discord-wave-gradient)" 
                opacity="0.3"
              />
              {/* Third subtle wave */}
              <path 
                d="M0,200 C300,150 600,250 900,200 C1200,150 1500,250 1800,200 C2100,150 2400,250 2400,200 L2400,300 L0,300 Z" 
                fill="#5865F2" 
                opacity="0.05"
              />
            </g>
            </svg>
        </div>

        {/* Newsletter section */}
        <section ref={newsletterSectionRef.ref} className="newsletter-section py-24 animate-on-scroll fade-up">
          {/* Animated gradient mesh */}
          <div className="newsletter-gradient-mesh" />
          
          {/* Pattern overlay */}
          <div className="newsletter-pattern" />
          
          {/* Floating elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Floating envelopes */}
            <Mail className="envelope-float envelope-float-1 h-12 w-12 text-white/10 top-[20%] left-[10%]" />
            <Mail className="envelope-float envelope-float-2 h-16 w-16 text-white/10 top-[60%] right-[15%]" />
            <Mail className="envelope-float envelope-float-3 h-10 w-10 text-white/10 bottom-[30%] left-[80%]" />
            
            {/* Paper planes */}
            <Send className="paper-plane h-8 w-8 text-white/10 top-[30%]" style={{ animationDelay: '0s' }} />
            <Send className="paper-plane h-6 w-6 text-white/10 top-[70%]" style={{ animationDelay: '10s' }} />
            <Send className="paper-plane h-10 w-10 text-white/10 top-[50%]" style={{ animationDelay: '20s' }} />
            
            {/* Gradient orbs */}
            <div className="newsletter-orb newsletter-orb-1" />
            <div className="newsletter-orb newsletter-orb-2" />
            <div className="newsletter-orb newsletter-orb-3" />
            
            {/* Floating particles */}
            <div className="newsletter-particle left-[20%]" style={{ animationDelay: '0s' }} />
            <div className="newsletter-particle left-[40%]" style={{ animationDelay: '3s' }} />
            <div className="newsletter-particle left-[60%]" style={{ animationDelay: '6s' }} />
            <div className="newsletter-particle left-[80%]" style={{ animationDelay: '9s' }} />
            <div className="newsletter-particle left-[30%]" style={{ animationDelay: '12s' }} />
            <div className="newsletter-particle left-[70%]" style={{ animationDelay: '15s' }} />
          </div>
          
          {/* Wave pattern at bottom */}
          <div className="newsletter-wave" />
          
          <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="newsletter-container max-w-2xl mx-auto text-center">
              {/* Animated icon */}
              <div className="flex justify-center mb-6 animate-on-scroll scale-in-bounce duration-slow">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-lolcow-blue to-lolcow-red rounded-full blur-xl opacity-50 animate-pulse" />
                  <div className="relative bg-gradient-to-br from-lolcow-blue to-lolcow-red p-4 rounded-full">
                    <Mail className="h-10 w-10 text-white" />
                  </div>
                </div>
              </div>
              
              <h2 className="newsletter-title text-4xl md:text-5xl font-fredoka mb-4 animate-on-scroll fade-up duration-slow">
                Join Our Newsletter
              </h2>
              <p className="text-gray-300 text-lg mb-8 max-w-xl mx-auto animate-on-scroll fade-up duration-slow" style={{ animationDelay: '0.1s' }}>
                Get exclusive updates, early access to drops, and special community announcements delivered to your inbox.
              </p>
              
              <form onSubmit={handleSubmit} className="space-y-4 animate-on-scroll fade-up duration-slow" style={{ animationDelay: '0.2s' }}>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-grow relative">
                    <input 
                      type="email" 
                      placeholder="Enter your email address" 
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        // Reset status when typing
                        if (status !== 'idle') setStatus('idle');
                      }}
                      required
                      disabled={status === 'loading'}
                      className={`newsletter-input w-full ${
                        status === 'error' ? 'invalid' : 
                        status === 'success' ? 'valid' : ''
                      }`}
                    />
                    {/* Email validation icon */}
                    {email && status === 'idle' && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        {/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? (
                          <CheckCircle2 className="h-5 w-5 text-green-400 animate-fade-in" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-400 animate-fade-in" />
                        )}
                      </div>
                    )}
                  </div>
                  <button 
                    type="submit"
                    disabled={status === 'loading' || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))}
                    className={`newsletter-button flex items-center justify-center gap-2 ${
                      status === 'loading' ? 'loading' : ''
                    }`}
                  >
                    {status === 'loading' ? (
                      <span className="opacity-0">Subscribe</span>
                    ) : (
                      <>
                        <span>Subscribe</span>
                        <Send className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </div>
                
                {message && (
                  <div className={`newsletter-message ${status === 'success' ? 'success' : 'error'}`}>
                    {status === 'success' ? (
                      <>
                        <svg className="success-checkmark" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M7 10L9 12L13 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="100" />
                        </svg>
                        <span>{message}</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5" />
                        <span>{message}</span>
                      </>
                    )}
                  </div>
                )}
              </form>
              
              {/* Trust indicators */}
              <div className="mt-8 flex items-center justify-center space-x-6 text-gray-500 text-sm animate-on-scroll fade-up" style={{ animationDelay: '0.3s' }}>
                <div className="flex items-center space-x-2">
                  <Sparkles className="h-4 w-4" />
                  <span>No spam, ever</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>Join 5,000+ subscribers</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      </div>
    </>
  );
};

export default Index;
