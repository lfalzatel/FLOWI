'use client';
import { useState, useEffect } from 'react';

interface SplashScreenProps {
  duration?: number;
  onComplete?: () => void;
}

export function SplashScreen({ duration = 2500, onComplete }: SplashScreenProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      if (onComplete) onComplete();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-[#0A0A0F] z-[100] flex flex-col items-center justify-center">
      {/* Glow effects */}
      <div className="absolute -top-32 -right-32 w-64 h-64 bg-accent/10 blur-3xl rounded-full" />
      <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-accent-dim/10 blur-3xl rounded-full" />

      <div className="relative w-40 h-40 mx-auto z-10">
        {/* SVG Lines */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
          {/* Circle 1 (Outer, Green, Clockwise) */}
          <circle
            cx="50" cy="50" r="46"
            fill="none"
            stroke="#10B981"
            strokeWidth="2"
            strokeDasharray="150 100"
            className="animate-[spin_4s_linear_infinite] origin-center"
            strokeLinecap="round"
          />
          {/* Circle 2 (Inner, Blue, Counter-clockwise) */}
          <circle
            cx="50" cy="50" r="41"
            fill="none"
            stroke="#3B82F6"
            strokeWidth="2"
            strokeDasharray="120 80"
            className="animate-[spin_6s_linear_infinite_reverse] origin-center"
            strokeLinecap="round"
          />
        </svg>

        {/* Logo Container */}
        <div className="absolute inset-[15%] rounded-full overflow-hidden border border-white/10 bg-[#0D1527]">
          <img src="/icons/icon-512.png" alt="Logo" className="w-full h-full object-cover scale-[1.15]" />
        </div>
      </div>
      
      {/* Text */}
      <h1 className="mt-6 font-syne font-bold text-4xl text-white tracking-tight relative z-10">
        flowi
      </h1>
      
      {/* Subtitle */}
      <p className="mt-2 text-white/40 text-sm font-dm relative z-10">
        Tus finanzas en equilibrio
      </p>

      {/* Loading bar */}
      <div className="mt-12 w-48 h-1 bg-white/5 rounded-full overflow-hidden relative z-10">
        <div className="h-full bg-accent rounded-full animate-loading-bar w-full" />
      </div>
    </div>
  );
}
