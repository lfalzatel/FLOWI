'use client';
import { useState, useEffect } from 'react';
import { ProfileCapsule } from './ProfileCapsule';

export function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`
        sticky top-0 z-50 w-full px-4 py-3
        flex items-center justify-between
        transition-all duration-300 ease-out
        ${scrolled
          ? 'bg-bg-deep/75 backdrop-blur-2xl border-b border-glass-border shadow-xl shadow-black/10'
          : 'bg-transparent'
        }
      `}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <div className="relative w-9 h-9">
          {/* SVG Lines */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
            {/* Circle 1 (Outer, Green, Clockwise) */}
            <circle
              cx="50" cy="50" r="46"
              fill="none"
              stroke="#10B981"
              strokeWidth="3"
              strokeDasharray="150 100"
              className="animate-[spin_4s_linear_infinite] origin-center"
              strokeLinecap="round"
            />
            {/* Circle 2 (Inner, Blue, Counter-clockwise) */}
            <circle
              cx="50" cy="50" r="41"
              fill="none"
              stroke="#3B82F6"
              strokeWidth="3"
              strokeDasharray="120 80"
              className="animate-[spin_6s_linear_infinite_reverse] origin-center"
              strokeLinecap="round"
            />
          </svg>

          {/* Logo Container */}
          <div className="absolute inset-[15%] rounded-full overflow-hidden border border-glass-border bg-bg-card">
            <img src="/icons/icon-192.png" alt="Logo" className="w-full h-full object-cover scale-[1.15]" />
          </div>
        </div>
        <span className="font-syne font-bold text-lg tracking-tight text-text-primary hidden sm:block">
          flowi
        </span>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <button className="relative w-9 h-9 rounded-xl bg-glass border border-glass-border
                           flex items-center justify-center hover:bg-glass-hover transition-colors">
          <svg className="w-4 h-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {/* Notification dot */}
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full" />
        </button>

        <ProfileCapsule />
      </div>
    </header>
  );
}
