import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Sparkles, Zap, Star } from "lucide-react";
import "@/styles/hero.css";

const Hero: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [particles, setParticles] = useState<Array<{ id: number; left: number; delay: number; duration: number }>>([]);

  // Generate floating particles
  useEffect(() => {
    const generateParticles = () => {
      const newParticles = Array.from({ length: 15 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 10,
        duration: 10 + Math.random() * 20
      }));
      setParticles(newParticles);
    };
    generateParticles();
  }, []);

  // Animated gradient background effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const animate = () => {
      time += 0.002;
      
      // Clear canvas with slight fade effect
      ctx.fillStyle = 'rgba(18, 18, 18, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw animated gradient orbs
      const drawOrb = (x: number, y: number, size: number, color: string, speed: number) => {
        const offsetX = Math.sin(time * speed) * 50;
        const offsetY = Math.cos(time * speed * 0.7) * 30;
        
        const gradient = ctx.createRadialGradient(
          x + offsetX, y + offsetY, 0,
          x + offsetX, y + offsetY, size
        );
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      };

      // Blue orb
      drawOrb(canvas.width * 0.2, canvas.height * 0.3, 400, 'rgba(0, 163, 255, 0.15)', 1);
      
      // Red orb
      drawOrb(canvas.width * 0.8, canvas.height * 0.7, 350, 'rgba(255, 0, 0, 0.15)', 0.8);
      
      // Additional smaller orbs
      drawOrb(canvas.width * 0.5, canvas.height * 0.5, 250, 'rgba(46, 204, 64, 0.1)', 1.2);
      drawOrb(canvas.width * 0.9, canvas.height * 0.2, 200, 'rgba(0, 163, 255, 0.1)', 0.6);

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <section className="relative min-h-[80vh] flex items-center overflow-hidden bg-gradient-to-br from-lolcow-black via-lolcow-darkgray to-lolcow-black">
      {/* Animated gradient canvas */}
      <canvas 
        ref={canvasRef}
        className="absolute inset-0 w-full h-full gpu-accelerated"
        style={{ opacity: 0.8 }}
      />
      
      {/* Texture overlay */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.1) 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      {/* Diagonal lines pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 10px,
            rgba(0, 163, 255, 0.1) 10px,
            rgba(0, 163, 255, 0.1) 20px
          )`
        }} />
      </div>

      {/* Cyberpunk grid overlay */}
      <div className="absolute inset-0 cyber-grid opacity-20" />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Text content */}
          <div className="text-center md:text-left space-y-8">
            {/* Badge */}
            <div className="hero-animate relative z-20">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-gray-900 to-gray-800 border border-yellow-400/50 shadow-xl">
                <Sparkles className="h-4 w-4 text-yellow-400 animate-pulse flex-shrink-0" />
                <span className="text-sm font-semibold text-yellow-400" style={{ WebkitTextFillColor: 'currentColor' }}>The Worst Podcast on the Internet</span>
              </div>
            </div>
            
            {/* Main heading with gradient text */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-fredoka hero-animate hero-title">
              <span className="block mb-2">
                <span className="text-white">JOIN THE </span>
              </span>
              <span className="block relative">
                <span className="bg-gradient-to-r from-lolcow-blue via-blue-400 to-lolcow-blue bg-clip-text text-transparent animate-gradient-text glitch-text">LOL</span>
                <span className="bg-gradient-to-r from-lolcow-red via-red-400 to-lolcow-red bg-clip-text text-transparent animate-gradient-text glitch-text" style={{ animationDelay: '0.5s' }}>COW</span>
              </span>
              <span className="block mt-2">
                <span className="text-white">COMMUNITY</span>
              </span>
            </h1>
            
            {/* Description with glassmorphism background */}
            <div className="hero-animate hero-subtitle">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-lolcow-blue/20 via-transparent to-lolcow-red/20 blur-xl" />
                <p className="relative text-gray-300 text-lg md:text-xl leading-relaxed backdrop-blur-md bg-white/5 rounded-xl p-6 border border-white/10 glass-hover">
                  Join the LolCow herd on Discord! Connect with fellow fans, get the latest updates on the show, and unlock exclusive content. Log in now!
                </p>
              </div>
            </div>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start hero-animate hero-cta">
              <Link 
                to="/login" 
                className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-lolcow-blue to-blue-600 rounded-xl overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-lolcow-blue/50 tilt-3d"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-blue-600 to-lolcow-blue opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <span className="relative flex items-center gap-2">
                  <i className="fa-brands fa-discord text-xl group-hover:animate-pulse" />
                  Login with Discord
                  <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </span>
                {/* Shimmer effect */}
                <div className="absolute inset-0 -top-2 h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 group-hover:animate-shimmer" style={{ transform: 'translateX(-100%)' }} />
              </Link>
              
              <Link 
                to="/shop" 
                className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-lolcow-darkgray to-lolcow-lightgray rounded-xl border border-white/20 overflow-hidden transition-all duration-300 hover:scale-105 hover:border-white/40 tilt-3d"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-lolcow-lightgray/50 to-lolcow-darkgray/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <span className="relative flex items-center gap-2 z-10">
                  Browse Shop
                  <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </span>
                {/* Border animation on hover */}
                <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-lolcow-blue via-lolcow-red to-lolcow-green animate-gradient-text blur-sm" />
                </div>
              </Link>
            </div>
          </div>
          
          {/* Image with effects */}
          <div className="relative flex justify-center hero-animate hero-cta" style={{ animationDelay: '0.8s' }}>
            {/* Glow effect behind image */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-96 h-96 bg-gradient-to-r from-lolcow-blue/30 to-lolcow-red/30 rounded-full blur-3xl animate-pulse morphing-blob" />
            </div>
            
            {/* Floating decorative elements */}
            <div className="absolute -top-8 -left-8 animate-float">
              <div className="w-16 h-16 bg-gradient-to-br from-lolcow-blue to-blue-600 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/20 glass-hover distort-hover">
                <Star className="h-8 w-8 text-white neon-glow" />
              </div>
            </div>
            
            <div className="absolute -bottom-8 -right-8 animate-float" style={{ animationDelay: '2s' }}>
              <div className="w-20 h-20 bg-gradient-to-br from-lolcow-red to-red-600 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20 glass-hover distort-hover">
                <Zap className="h-10 w-10 text-white neon-glow" />
              </div>
            </div>
            
            {/* Main image with glassmorphism frame */}
            <div className="relative tilt-3d">
              <div className="absolute inset-0 bg-gradient-to-r from-lolcow-blue/20 to-lolcow-red/20 rounded-3xl blur-2xl" />
              <div className="relative backdrop-blur-sm bg-white/5 rounded-3xl p-2 border border-white/10 animated-border">
                <div className="relative z-10">
                  <img 
                    src="/lovable-uploads/logo.png" 
                    alt="LolCow Mascot" 
                    className="w-64 md:w-80 lg:w-96 relative z-10 drop-shadow-2xl animate-float distort-hover" 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Floating particles */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="particle"
          style={{
            left: `${particle.left}%`,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`
          }}
        >
          <div className="w-2 h-2 bg-gradient-to-r from-lolcow-blue to-lolcow-red rounded-full opacity-60" />
        </div>
      ))}

      {/* Bottom gradient wave */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden">
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block w-full h-20">
          <defs>
            <linearGradient id="wave-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00A3FF" stopOpacity="0.3">
                <animate attributeName="stop-color" values="#00A3FF;#FF0000;#2ECC40;#00A3FF" dur="8s" repeatCount="indefinite" />
              </stop>
              <stop offset="50%" stopColor="#FF0000" stopOpacity="0.3">
                <animate attributeName="stop-color" values="#FF0000;#2ECC40;#00A3FF;#FF0000" dur="8s" repeatCount="indefinite" />
              </stop>
              <stop offset="100%" stopColor="#2ECC40" stopOpacity="0.3">
                <animate attributeName="stop-color" values="#2ECC40;#00A3FF;#FF0000;#2ECC40" dur="8s" repeatCount="indefinite" />
              </stop>
            </linearGradient>
          </defs>
          <path d="M0,20 Q300,80 600,40 T1200,20 L1200,120 L0,120 Z" fill="url(#wave-gradient)" />
        </svg>
      </div>
      
      {/* Smooth transition gradient overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-b from-transparent via-lolcow-black/50 to-lolcow-black pointer-events-none" />
    </section>
  );
};

export default Hero;
