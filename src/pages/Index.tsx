import React, { useState, useEffect, useRef } from "react";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Footer from "../components/Footer";
import FeaturedProducts from "../components/FeaturedProducts";
import { Users, MessageCircle, Zap, Sparkles, Radio, ChevronRight, Loader2, Mail, Send, CheckCircle2, XCircle } from "lucide-react";
import "@/styles/discord.css";
import "@/styles/micro-interactions.css";
import "@/styles/newsletter.css";

const Index: React.FC = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [memberCount, setMemberCount] = useState(4823);
  const [activeCount, setActiveCount] = useState(127);
  const [voiceCount, setVoiceCount] = useState(23);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
    animateValue(0, 4823, 2000, setMemberCount);
    animateValue(0, 127, 1500, setActiveCount);
    animateValue(0, 23, 1000, setVoiceCount);

    // Simulate live updates
    const interval = setInterval(() => {
      setActiveCount(prev => prev + Math.floor(Math.random() * 5) - 2);
      setVoiceCount(prev => Math.max(10, prev + Math.floor(Math.random() * 3) - 1));
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
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow">
        <Hero />
        
        {/* Featured Products section */}
        <FeaturedProducts />
        
        {/* Discord community section */}
        <section className="relative py-24 bg-gradient-to-br from-discord-blurple/20 via-lolcow-black to-lolcow-black overflow-hidden">
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
          
          {/* Animated wave pattern */}
          <div className="absolute bottom-0 left-0 right-0 h-64 overflow-hidden">
            <svg className="absolute bottom-0 w-[200%] h-full discord-wave" viewBox="0 0 1200 300" preserveAspectRatio="none">
              <path 
                d="M0,150 C150,100 350,200 600,150 C850,100 1050,200 1200,150 L1200,300 L0,300 Z" 
                fill="url(#discord-gradient)" 
                fillOpacity="0.1"
              />
              <path 
                d="M0,200 C200,150 400,250 600,200 C800,150 1000,250 1200,200 L1200,300 L0,300 Z" 
                fill="url(#discord-gradient)" 
                fillOpacity="0.05"
              />
              <defs>
                <linearGradient id="discord-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#5865F2" />
                  <stop offset="50%" stopColor="#7289DA" />
                  <stop offset="100%" stopColor="#5865F2" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          
          <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
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
            
            <h2 className="text-4xl md:text-5xl font-fredoka text-white mb-6 text-center">
              <span className="bg-gradient-to-r from-discord-blurple via-white to-lolcow-blue bg-clip-text text-transparent">
                Join the LolCow Community
              </span>
            </h2>
            
            {/* Live stats cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12 max-w-3xl mx-auto">
              {/* Total members */}
              <div className="discord-glass rounded-xl p-4 text-center transform transition-all duration-300 hover:scale-105">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Users className="h-5 w-5 text-discord-blurple" />
                  <span className="text-gray-400 text-sm">Total Members</span>
                </div>
                <div className="text-3xl font-bold text-white counter-pop">
                  {memberCount.toLocaleString()}
                </div>
              </div>
              
              {/* Online now */}
              <div className="discord-glass rounded-xl p-4 text-center transform transition-all duration-300 hover:scale-105">
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
              
              {/* In voice */}
              <div className="discord-glass rounded-xl p-4 text-center transform transition-all duration-300 hover:scale-105">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Radio className="h-5 w-5 text-discord-blurple animate-pulse" />
                  <span className="text-gray-400 text-sm">In Voice Chat</span>
                </div>
                <div className="text-3xl font-bold text-white counter-pop">
                  {voiceCount}
                </div>
              </div>
            </div>
            
            {/* Benefits section */}
            <div className="mb-12">
              <h3 className="text-2xl font-fredoka text-white mb-6 text-center">Why Join Our Discord?</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
                {/* Benefit cards */}
                <div className="group">
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
                
                <div className="group">
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
                
                <div className="group">
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
                
                <div className="group">
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
            <div className="flex justify-center">
              <a 
                href="/login" 
                className="relative inline-flex items-center space-x-2 px-8 py-4 bg-discord-blurple text-white font-semibold rounded-lg transform transition-all duration-300 hover:scale-105 discord-button-glow group"
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

        {/* Newsletter section */}
        <section className="newsletter-section py-24">
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
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-lolcow-blue to-lolcow-red rounded-full blur-xl opacity-50 animate-pulse" />
                  <div className="relative bg-gradient-to-br from-lolcow-blue to-lolcow-red p-4 rounded-full">
                    <Mail className="h-10 w-10 text-white" />
                  </div>
                </div>
              </div>
              
              <h2 className="newsletter-title text-4xl md:text-5xl font-fredoka mb-4">
                Join Our Newsletter
              </h2>
              <p className="text-gray-300 text-lg mb-8 max-w-xl mx-auto">
                Get exclusive updates, early access to drops, and special community announcements delivered to your inbox.
              </p>
              
              <form onSubmit={handleSubmit} className="space-y-4">
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
              <div className="mt-8 flex items-center justify-center space-x-6 text-gray-500 text-sm">
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
  );
};

export default Index;
