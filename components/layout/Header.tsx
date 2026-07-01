'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ProfileCapsule } from './ProfileCapsule';
import { X } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [showLogoModal, setShowLogoModal] = useState(false);
  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (showLogoModal) {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    } else {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    }
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, [showLogoModal]);

  return (
    <header
      className={`
        sticky top-0 z-[60] w-full px-4 py-3
        flex items-center justify-between
        transition-all duration-300 ease-out
        ${scrolled
          ? 'bg-deep/75 backdrop-blur-2xl border-b border-glass-border shadow-xl shadow-black/10'
          : 'bg-transparent'
        }
      `}
    >
      {/* Logo */}
      <div 
        onClick={() => setShowLogoModal(true)}
        className="flex items-center gap-2.5 cursor-pointer active:scale-95 transition-transform"
      >
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
          <div className="absolute inset-[15%] rounded-full overflow-hidden border border-glass-border bg-card">
            <img src="/icons/icon-192.png" alt="Logo" className="w-full h-full object-cover scale-[1.15]" />
          </div>
        </div>
        <span className="font-syne font-bold text-lg tracking-tight text-text-primary hidden sm:block">
          flowi
        </span>
      </div>

      {/* Navigation Menu for Desktop */}
      <nav className="hidden md:flex items-center gap-1.5 p-1 bg-glass border border-glass-border rounded-2xl">
        {[
          { path: '/', label: 'Inicio', techLabel: '[ 01_INICIO ]' },
          { path: '/gastos', label: 'Gastos', techLabel: '[ 02_GASTOS ]' },
          { path: '/ingresos', label: 'Ingresos', techLabel: '[ 03_INGRESOS ]' },
          { path: '/deudas', label: 'Deudas', techLabel: '[ 04_DEUDAS ]' },
          { path: '/configuracion', label: 'Configuración', techLabel: '[ 05_CONFIG ]' },
        ].map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`
                px-4 py-2 text-xs font-semibold tracking-wide transition-all duration-200
                ${isActive
                  ? isTechTheme
                    ? 'bg-accent/25 border border-accent text-accent rounded-none'
                    : 'bg-accent text-black rounded-xl shadow-lg shadow-accent/15'
                  : isTechTheme
                    ? 'text-accent/60 hover:text-accent border border-transparent rounded-none'
                    : 'text-text-secondary hover:text-text-primary rounded-xl'
                }
                ${isTechTheme ? 'font-mono uppercase text-[11px]' : 'font-syne'}
              `}
            >
              {isTechTheme ? item.techLabel : item.label}
            </Link>
          );
        })}
      </nav>

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

      {/* 🚀 Giant Centered Logo Modal 🚀 */}
      {showLogoModal && typeof document !== 'undefined' && createPortal(
        <div 
          onClick={() => setShowLogoModal(false)}
          className="fixed inset-0 bg-black/90 backdrop-blur-lg z-[120] flex flex-col items-center justify-center p-4 cursor-pointer animate-fade-in"
        >
          {/* Giant Logo (Without card frame) */}
          <div className="relative w-56 h-56 mb-8 select-none pointer-events-none">
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
              <circle
                cx="50" cy="50" r="46"
                fill="none"
                stroke="#10B981"
                strokeWidth="2"
                strokeDasharray="150 100"
                className="animate-[spin_4s_linear_infinite] origin-center"
                strokeLinecap="round"
              />
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
            <div className="absolute inset-[16%] rounded-full overflow-hidden border border-white/10 bg-[#0A0A14]/90 shadow-2xl">
              <img src="/icons/icon-512.png" alt="Logo" className="w-full h-full object-cover scale-[1.12]" />
            </div>
          </div>

          {/* Brand Text */}
          <div className="text-center select-none pointer-events-none">
            <h2 className={`text-3xl font-bold tracking-widest ${isTechTheme ? 'font-mono text-accent uppercase' : 'font-syne text-text-primary'}`}>
              flowi
            </h2>
            <p className={`text-xs mt-2 ${isTechTheme ? 'font-mono text-accent/60' : 'text-text-muted'}`}>
              Tu dinero, en flujo.
            </p>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
}
