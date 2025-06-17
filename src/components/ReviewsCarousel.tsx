import React, { useState, useEffect } from "react";
import { Star, Quote, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

interface Review {
  id: number;
  name: string;
  role: string;
  content: string;
  rating: number;
  avatar: string;
}

const reviews: Review[] = [
  {
    id: 1,
    name: "Sarah M.",
    role: "Daily Viewer",
    content: "The absolute chaos of LolCow Live is exactly what I need. Can't stop watching! LolCow Queens had me in tears last night!",
    rating: 5,
    avatar: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
  },
  {
    id: 2,
    name: "Mike Johnson",
    role: "Superfan",
    content: "I've never experienced anything quite like LolCow. LolCow Nerd and TechTalk are terrible in the best possible way!",
    rating: 5,
    avatar: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
  },
  {
    id: 3,
    name: "Emily R.",
    role: "New Convert",
    content: "Started watching ironically during LolCow Rewind, now I'm genuinely addicted. The Milkers show is pure gold!",
    rating: 5,
    avatar: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
  },
  {
    id: 4,
    name: "David Chen",
    role: "Stream Addict",
    content: "This is the streaming equivalent of a train wreck - you can't look away. LolCow Cafe and Test are absolutely brilliant!",
    rating: 5,
    avatar: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
  },
  {
    id: 5,
    name: "Jessica K.",
    role: "Long-time Fan",
    content: "Every episode is a masterpiece of controlled chaos. LolCow Dolls is the worst and best thing I've ever watched!",
    rating: 5,
    avatar: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)"
  },
  {
    id: 6,
    name: "Tom Wilson",
    role: "Recent Discoverer",
    content: "I don't know whether to laugh or cry watching LolCow Aussy. This show has ruined all other streams for me!",
    rating: 5,
    avatar: "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)"
  }
];

const ReviewsCarousel: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [itemsPerView, setItemsPerView] = useState(1);
  const sectionRef = useScrollAnimation({ threshold: 0.2 });

  // Set items per view based on screen size
  useEffect(() => {
    const updateItemsPerView = () => {
      setItemsPerView(window.innerWidth >= 1024 ? 3 : 1);
    };
    
    updateItemsPerView();
    window.addEventListener('resize', updateItemsPerView);
    return () => window.removeEventListener('resize', updateItemsPerView);
  }, []);

  // Auto-rotate reviews
  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        const maxIndex = Math.max(0, reviews.length - itemsPerView);
        return prev >= maxIndex ? 0 : prev + 1;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, itemsPerView]);

  const handlePrevious = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => {
      const maxIndex = Math.max(0, reviews.length - itemsPerView);
      return prev === 0 ? maxIndex : prev - 1;
    });
  };

  const handleNext = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => {
      const maxIndex = Math.max(0, reviews.length - itemsPerView);
      return prev >= maxIndex ? 0 : prev + 1;
    });
  };

  const handleDotClick = (index: number) => {
    setIsAutoPlaying(false);
    setCurrentIndex(index);
  };


  return (
    <section 
      ref={sectionRef.ref}
      className="relative py-24 bg-gradient-to-b from-lolcow-black via-lolcow-darkgray/50 to-lolcow-black overflow-hidden"
    >
      {/* Background elements */}
      <div className="absolute inset-0">
        {/* Gradient orbs */}
        <div className="absolute top-20 left-20 w-64 h-64 bg-lolcow-blue/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-lolcow-red/10 rounded-full blur-3xl" />
        
        {/* Quote patterns */}
        <Quote className="absolute top-10 left-[10%] h-20 w-20 text-white/5 rotate-12" />
        <Quote className="absolute bottom-10 right-[10%] h-24 w-24 text-white/5 -rotate-12" />
        <Quote className="absolute top-1/2 left-[5%] h-16 w-16 text-white/5" />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className={`text-center mb-12 animate-on-scroll fade-up ${sectionRef.isInView ? 'in-view' : ''}`}>
          <h2 className="text-4xl md:text-5xl font-fredoka text-white mb-4">
            <span className="bg-gradient-to-r from-lolcow-blue via-white to-lolcow-red bg-clip-text text-transparent">
              What People Are Saying
            </span>
          </h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Join thousands of fans who've discovered the beautiful disaster that is LolCow
          </p>
        </div>

        {/* Reviews Container */}
        <div className="relative max-w-7xl mx-auto">
          {/* Navigation Buttons - Fixed position outside content area */}
          <button
            onClick={handlePrevious}
            className="absolute left-0 lg:-left-16 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
            aria-label="Previous reviews"
          >
            <ChevronLeft className="h-6 w-6 text-white" />
          </button>
          
          <button
            onClick={handleNext}
            className="absolute right-0 lg:-right-16 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
            aria-label="Next reviews"
          >
            <ChevronRight className="h-6 w-6 text-white" />
          </button>

          {/* Reviews Display */}
          <div className="overflow-hidden px-4 lg:px-0">
            {/* Desktop: Show 3 items */}
            <div className="hidden lg:block">
              <div 
                className="flex transition-transform duration-500 ease-out"
                style={{ transform: `translateX(-${currentIndex * (100 / 3)}%)` }}
              >
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className="w-1/3 flex-shrink-0 px-3"
                  >
                    <ReviewCard review={review} />
                  </div>
                ))}
              </div>
            </div>
            
            {/* Mobile: Show 1 item */}
            <div className="lg:hidden">
              <div 
                className="flex transition-transform duration-500 ease-out"
                style={{ transform: `translateX(-${currentIndex * 100}%)` }}
              >
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className="w-full flex-shrink-0"
                  >
                    <ReviewCard review={review} />
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Dots Indicator */}
          <div className="flex justify-center gap-2 mt-8">
            {Array.from({ length: Math.max(1, reviews.length - itemsPerView + 1) }).map((_, index) => (
              <button
                key={index}
                onClick={() => handleDotClick(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex 
                    ? 'w-8 bg-gradient-to-r from-lolcow-blue to-lolcow-red' 
                    : 'bg-white/30 hover:bg-white/50'
                }`}
                aria-label={`Go to review ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

// Extract review card as a component for reusability
const ReviewCard: React.FC<{ review: Review }> = ({ review }) => {
  return (
    <div className="group relative h-full">
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-lolcow-blue/20 to-lolcow-red/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Card */}
      <div className="relative h-full bg-gradient-to-br from-lolcow-darkgray/80 to-lolcow-black/80 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300 hover:transform hover:scale-[1.02]">
        {/* Quote Icon */}
        <Quote className="absolute top-4 right-4 h-8 w-8 text-white/10" />
        
        {/* Avatar and Info */}
        <div className="flex items-center gap-4 mb-4">
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg"
            style={{ background: review.avatar }}
          >
            {review.name.charAt(0)}
          </div>
          <div>
            <h3 className="text-white font-semibold">{review.name}</h3>
            <p className="text-gray-400 text-sm">{review.role}</p>
          </div>
        </div>
        
        {/* Rating */}
        <div className="flex gap-1 mb-3">
          {[...Array(5)].map((_, i) => (
            <Star 
              key={i} 
              className="h-4 w-4 fill-yellow-400 text-yellow-400" 
            />
          ))}
        </div>
        
        {/* Content */}
        <p className="text-gray-300 leading-relaxed italic">
          "{review.content}"
        </p>
      </div>
    </div>
  );
};

export default ReviewsCarousel;