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
          ? 'bg-[#0A0A0F]/75 backdrop-blur-2xl border-b border-white/5 shadow-xl shadow-black/30'
          : 'bg-transparent'
        }
      `}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-accent to-accent-dim
                        flex items-center justify-center shadow-lg shadow-accent/25">
          <span className="font-syne font-black text-black text-base">₣</span>
        </div>
        <span className="font-syne font-bold text-lg tracking-tight text-white hidden sm:block">
          flowi
        </span>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <button className="relative w-9 h-9 rounded-xl bg-white/5 border border-white/8
                           flex items-center justify-center hover:bg-white/10 transition-colors">
          <svg className="w-4 h-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
