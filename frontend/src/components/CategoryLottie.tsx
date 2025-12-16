"use client";

import { useEffect, useState } from "react";
import Lottie from "lottie-react";

// Category configuration with gradients and fallback icons - 10 exact categories
const categoryConfig = {
  culture: {
    gradient: "from-orange-500 to-yellow-600",
    fallbackIcon: "🎭",
    lottieFile: "culture.json"
  },
  economics: {
    gradient: "from-green-600 to-teal-600",
    fallbackIcon: "💰",
    lottieFile: "economics.json"
  },
  finance: {
    gradient: "from-green-600 to-emerald-700",
    fallbackIcon: "💳",
    lottieFile: "finance.json"
  },
  "fitness / health": {
    gradient: "from-pink-500 to-rose-600",
    fallbackIcon: "💪",
    lottieFile: "fitness.json"
  },
  "fitness/health": {
    gradient: "from-pink-500 to-rose-600",
    fallbackIcon: "💪",
    lottieFile: "fitness.json"
  },
  "global issues & world affairs": {
    gradient: "from-blue-600 to-indigo-600",
    fallbackIcon: "🌍",
    lottieFile: "global-issues.json"
  },
  "global issues/world affairs": {
    gradient: "from-blue-600 to-indigo-600",
    fallbackIcon: "🌍",
    lottieFile: "global-issues.json"
  },
  "pop culture / media": {
    gradient: "from-purple-500 to-pink-600",
    fallbackIcon: "📺",
    lottieFile: "media.json"
  },
  "pop culture/media": {
    gradient: "from-purple-500 to-pink-600",
    fallbackIcon: "📺",
    lottieFile: "media.json"
  },
  science: {
    gradient: "from-cyan-500 to-blue-600",
    fallbackIcon: "🔬",
    lottieFile: "science.json"
  },
  society: {
    gradient: "from-violet-500 to-purple-600",
    fallbackIcon: "👥",
    lottieFile: "society.json"
  },
  sports: {
    gradient: "from-indigo-500 to-purple-600",
    fallbackIcon: "⚽",
    lottieFile: "sports.json"
  },
  technology: {
    gradient: "from-blue-500 to-purple-600",
    fallbackIcon: "💻",
    lottieFile: "technology.json"
  },
  // Legacy mappings for backward compatibility
  tech: {
    gradient: "from-blue-500 to-purple-600",
    fallbackIcon: "💻",
    lottieFile: "technology.json"
  },
  // Lesson type mappings
  skills: {
    gradient: "from-slate-600 to-slate-700",
    fallbackIcon: "🎯",
    lottieFile: "skills.json"
  },
  knowledge: {
    gradient: "from-blue-600 to-blue-700",
    fallbackIcon: "📚",
    lottieFile: "knowledge.json"
  },
  default: {
    gradient: "from-gray-500 to-slate-600",
    fallbackIcon: "📰",
    lottieFile: "default.json"
  }
};

interface CategoryLottieProps {
  category: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function CategoryLottie({ category, size = "md", className = "" }: CategoryLottieProps) {
  const cat = category?.toLowerCase() || "default";
  const categoryData = categoryConfig[cat as keyof typeof categoryConfig] || categoryConfig.default;
  const [animationData, setAnimationData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-20 h-20 sm:w-24 sm:h-24", 
    lg: "w-24 h-24 sm:w-32 sm:h-32",
    xl: "w-32 h-32 sm:w-40 sm:h-40"
  };

  // Load Lottie animation data
  useEffect(() => {
    const loadLottie = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/lottie/${categoryData.lottieFile}`);
        if (response.ok) {
          const data = await response.json();
          setAnimationData(data);
        }
      } catch (error) {
        console.log(`Lottie file not found for ${cat}, using fallback`);
      } finally {
        setIsLoading(false);
      }
    };

    loadLottie();
  }, [cat, categoryData.lottieFile]);

  // If we have Lottie animation data, use it
  if (animationData && !isLoading) {
    return (
      <div className={`${sizeClasses[size]} ${className}`}>
        <Lottie
          animationData={animationData}
          loop={true}
          autoplay={true}
          className="w-full h-full"
        />
      </div>
    );
  }

  // Fallback to emoji with glassmorphism effect
  return (
    <div className={`${sizeClasses[size]} ${className} flex items-center justify-center`}>
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Glassmorphism background */}
        <div className="absolute inset-0 bg-white/20 backdrop-blur-sm rounded-2xl border border-white/30 shadow-lg"></div>
        
        {/* Icon */}
        <div className="relative z-10 text-2xl sm:text-3xl opacity-90">
          {categoryData.fallbackIcon}
        </div>
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/10 backdrop-blur-sm rounded-2xl">
            <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
          </div>
        )}
      </div>
    </div>
  );
}

export function getCategoryGradient(category: string | null): string {
  const cat = category?.toLowerCase() || "default";
  const categoryData = categoryConfig[cat as keyof typeof categoryConfig] || categoryConfig.default;
  return categoryData.gradient;
}