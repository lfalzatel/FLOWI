'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ProfileCapsule } from './ProfileCapsule';
import { X } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useInAppNotifications } from '@/hooks/useInAppNotifications';
import { useReminders } from '@/hooks/useReminders';
import { Reminder } from '@/lib/firestore';
import { Bell, Clock, Info, MessageCircle } from 'lucide-react';

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

  const { notifications } = useInAppNotifications();
  const { reminders } = useReminders();
  const [showDropdown, setShowDropdown] = useState(false);

  // Close dropdown on click outside
  useEffect(() => {
    if (!showDropdown) {
      document.body.style.overflow = '';
      return;
    }
    
    // Prevent body scroll when dropdown is open on mobile
    if (window.innerWidth < 640) {
      document.body.style.overflow = 'hidden';
    }
    
    const clickOut = (e: MouseEvent) => {
      if (!(e.target as Element).closest('#notif-dropdown') && !(e.target as Element).closest('#notif-bell')) {
        setShowDropdown(false);
      }
    };
    window.addEventListener('click', clickOut);
    return () => {
      window.removeEventListener('click', clickOut);
      document.body.style.overflow = '';
    };
  }, [showDropdown]);

  const getUpcomingReminders = () => {
    const upcoming: { reminder: Reminder, daysLeft: number }[] = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Normalize to start of day
    
    for (const r of reminders) {
      if (!r.active) continue;
      
      let days = -1;
      if (r.type === 'monthly' && r.dayOfMonth !== undefined) {
        let currentDayOfMonth = now.getDate();
        days = r.dayOfMonth - currentDayOfMonth;
        if (days < 0) {
          const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
          days = daysInMonth - currentDayOfMonth + r.dayOfMonth;
        }
      } else if (r.type === 'weekly' && r.dayOfWeek !== undefined) {
        let currentDayOfWeek = now.getDay();
        days = r.dayOfWeek - currentDayOfWeek;
        if (days < 0) days += 7;
      } else if (r.type === 'once' && r.date) {
        const targetParts = r.date.split('-');
        if (targetParts.length === 3) {
           const targetDate = new Date(Number(targetParts[0]), Number(targetParts[1]) - 1, Number(targetParts[2]));
           const diff = targetDate.getTime() - now.getTime();
           days = Math.ceil(diff / (1000 * 3600 * 24));
        }
      }

      if (days >= 0 && days <= 7) {
        upcoming.push({ reminder: r, daysLeft: days });
      }
    }
    return upcoming.sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 5); // top 5
  };

  const upcomingReminders = getUpcomingReminders();
  const unread = notifications.length + upcomingReminders.length;

  // Dynamic colors for the logo based on theme
  let logoOuterColor = '#10B981'; // Default / Dark theme
  let logoInnerColor = '#3B82F6';
  let logoDotColor = '#3B82F6';
  
  if (theme === 'cyberpunk') {
    logoOuterColor = '#00FF41'; // Neon Green
    logoInnerColor = '#0FF0FC'; // Cyan
    logoDotColor = '#0FF0FC';
  } else if (theme === 'kiloCode') {
    logoOuterColor = '#F0DB4F'; // JS Yellow
    logoInnerColor = '#F97316'; // Orange
    logoDotColor = '#F97316';
  } else if (theme === 'light') {
    // Colores originales del diseño en modo día
    logoOuterColor = '#00C4CC'; // Cyan (trazos F)
    logoInnerColor = '#10B981'; // Green (barra superior y anillo)
    logoDotColor = '#F97316';   // Orange (punto)
  } else {
    // Default / Dark
    logoDotColor = '#F97316';   // Naranja por defecto para que resalte
    logoOuterColor = '#00C4CC'; // Cyan
    logoInnerColor = '#10B981'; // Green
  }

  return (
    <header
      className={`
        sticky top-0 z-[60] w-full px-4 py-3
        flex items-center justify-between
        transition-all duration-300 ease-out bg-transparent
      `}
    >
      {/* Background that appears on scroll */}
      <div 
        className={`absolute inset-0 transition-opacity duration-300 -z-10 pointer-events-none ${
          scrolled ? 'opacity-100 bg-deep/75 backdrop-blur-2xl border-b border-glass-border shadow-xl shadow-black/10' : 'opacity-0'
        }`}
      />
      
      {/* Logo */}
      <div 
        onClick={() => setShowLogoModal(true)}
        className="flex items-center gap-2.5 cursor-pointer active:scale-95 transition-transform"
      >
        <div className="relative w-9 h-9">
          {/* SVG Lines */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
            {/* Circle 1 (Outer, 3 parts, Clockwise) */}
            <circle
              cx="50" cy="50" r="46"
              fill="none"
              stroke={logoInnerColor}
              strokeWidth="3"
              strokeDasharray="70 26.3"
              className="animate-[spin_4s_linear_infinite] origin-center transition-colors duration-500"
              strokeLinecap="round"
            />
            {/* Circle 2 (Inner, 3 parts, Counter-clockwise) */}
            <circle
              cx="50" cy="50" r="41"
              fill="none"
              stroke={logoOuterColor}
              strokeWidth="3"
              strokeDasharray="60 25.8"
              className="animate-[spin_6s_linear_infinite_reverse] origin-center transition-colors duration-500"
              strokeLinecap="round"
            />
          </svg>

          {/* Logo Container */}
          <div className="absolute inset-[15%] rounded-full overflow-hidden border border-glass-border bg-[#0D1527] flex items-center justify-center">
            <svg className="w-full h-full drop-shadow-md relative z-0" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              {/* Vertical stem */}
              <line x1="28" y1="25" x2="28" y2="75" stroke={logoOuterColor} strokeWidth="14" strokeLinecap="round" className="transition-colors duration-500" />
              {/* Top bar */}
              <line x1="28" y1="25" x2="60" y2="25" stroke={logoInnerColor} strokeWidth="14" strokeLinecap="round" className="transition-colors duration-500" />
              {/* Middle bar */}
              <line x1="28" y1="50" x2="48" y2="50" stroke={logoOuterColor} strokeWidth="14" strokeLinecap="round" className="transition-colors duration-500" />
              {/* Dot */}
              <circle cx="72" cy="50" r="7" fill={logoDotColor} className="transition-colors duration-500" />
            </svg>
            {/* Scanlines Overlay */}
            <div className="absolute inset-0 z-10 pointer-events-none bg-[repeating-linear-gradient(transparent,transparent_2px,rgba(0,0,0,0.15)_2px,rgba(0,0,0,0.15)_3px)]" />
          </div>
        </div>
        <span className={`
          hidden sm:block text-lg tracking-wider transition-all
          ${isTechTheme
            ? 'font-mono font-bold text-accent uppercase tracking-widest text-md'
            : 'font-syne font-bold text-text-primary'
          }
        `}>
          {isTechTheme ? '>_FLOWI' : 'flowi'}
        </span>
      </div>

      {/* Navigation Menu for Desktop */}
      <nav className="hidden md:flex items-center gap-1.5 p-1 bg-glass border border-glass-border rounded-2xl">
        {[
          { path: '/', label: 'Inicio', techLabel: '[ 01_INICIO ]' },
          { path: '/gastos', label: 'Gastos', techLabel: '[ 02_GASTOS ]' },
          { path: '/ingresos', label: 'Ingresos', techLabel: '[ 03_INGRESOS ]' },
          { path: '/deudas', label: 'Deudas', techLabel: '[ 04_DEUDAS ]' },
          { path: '/servicios', label: 'Servicios', techLabel: '[ 05_SERVICIOS ]' },
          { path: '/configuracion', label: 'Configuración', techLabel: '[ 06_CONFIG ]' },
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
      <div className="flex items-center gap-2 sm:gap-3">
        {/* WhatsApp Support Button */}
        <a
          href="https://wa.me/573104604592"
          target="_blank"
          rel="noopener noreferrer"
          className="relative w-9 h-9 rounded-xl bg-glass border border-glass-border
                     flex items-center justify-center hover:bg-[#25D366]/20 transition-colors group"
          title="Soporte y Sugerencias"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            className="w-[18px] h-[18px] text-[#25D366] drop-shadow-md group-hover:scale-110 transition-transform"
            fill="currentColor"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
          </svg>
        </a>

        {/* Notification bell */}
        <div className="relative">
          <button 
            id="notif-bell"
            onClick={() => setShowDropdown(!showDropdown)}
            className="relative w-9 h-9 rounded-xl bg-glass border border-glass-border
                       flex items-center justify-center hover:bg-glass-hover transition-colors"
          >
            <Bell className="w-4 h-4 text-text-secondary" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full
                               bg-accent text-black text-[9px] font-bold
                               flex items-center justify-center animate-pulse">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {/* Dropdown Notificaciones */}
          {showDropdown && typeof document !== 'undefined' && createPortal(
            <div 
              className="fixed inset-0 z-50 transition-opacity" 
              onClick={() => setShowDropdown(false)}
              aria-hidden="true"
            />,
            document.body
          )}
          {showDropdown && (
            <div id="notif-dropdown" className={`fixed sm:absolute right-4 left-4 sm:left-auto sm:right-0 top-20 sm:top-12 w-auto sm:w-80 max-h-[400px] overflow-y-auto glass-dropdown shadow-2xl p-2 z-[100] animate-fade-in-up ${isTechTheme ? 'rounded-none border border-accent/50' : 'rounded-2xl border border-glass-border/50'}`}>
              <div className="p-2 pb-3 mb-2 border-b border-glass-border/50 flex justify-between items-center">
                <span className={`font-semibold text-text-primary ${isTechTheme ? 'font-mono text-sm' : ''}`}>Notificaciones</span>
                <Link href="/servicios/recordatorios" onClick={() => setShowDropdown(false)} className={`text-[11px] text-accent hover:underline uppercase tracking-wider font-semibold ${isTechTheme ? 'font-mono' : ''}`}>Ver ajustes</Link>
              </div>

              {notifications.length === 0 && upcomingReminders.length === 0 ? (
                <div className="py-6 text-center">
                  <Bell className="w-8 h-8 text-text-muted/30 mx-auto mb-2" />
                  <p className={`text-text-secondary text-sm ${isTechTheme ? 'font-mono' : ''}`}>Al día. Nada por aquí.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {/* Alertas inmediatas (InApp) */}
                  {notifications.map(n => (
                    <div key={n.id} className={`p-3 bg-accent/10 mb-2 flex gap-3 items-start border border-accent/20 ${isTechTheme ? 'rounded-none border-l-4 border-l-accent' : 'rounded-xl'}`}>
                      <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Bell className="w-3.5 h-3.5 text-accent" />
                      </div>
                      <div>
                        <p className={`text-sm font-semibold text-text-primary ${isTechTheme ? 'font-mono' : ''}`}>{isTechTheme ? `>_ ${n.title}` : n.title}</p>
                        {n.body && <p className={`text-xs text-text-secondary mt-0.5 leading-snug ${isTechTheme ? 'font-mono' : ''}`}>{n.body}</p>}
                      </div>
                    </div>
                  ))}

                  {/* Próximos eventos (Próximos 7 días) */}
                  {upcomingReminders.length > 0 && (
                    <>
                      <p className={`text-[10px] text-text-muted uppercase tracking-wider font-semibold px-2 pt-2 pb-1 ${isTechTheme ? 'font-mono' : ''}`}>
                        Próximos 7 días
                      </p>
                      {upcomingReminders.map(({ reminder, daysLeft }, i) => (
                        <div key={reminder.id || i} className={`p-2.5 hover:bg-white/5 transition-colors flex gap-3 items-center ${isTechTheme ? 'rounded-none border-l-2 border-transparent hover:border-accent' : 'rounded-xl'}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                                          ${daysLeft === 0 ? 'bg-accent/20 text-accent' : 'bg-glass border border-glass-border text-text-secondary'}`}>
                            <Clock className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                             <p className={`text-sm font-medium text-text-primary truncate ${isTechTheme ? 'font-mono' : ''}`}>{isTechTheme ? `>_ ${reminder.title}` : reminder.title}</p>
                            <p className={`text-xs text-text-muted mt-0.5 truncate ${isTechTheme ? 'font-mono' : ''}`}>
                              {daysLeft === 0 ? '¡Vence hoy!' : daysLeft === 1 ? 'Mañana' : `Faltan ${daysLeft} días`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

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
                stroke={logoInnerColor}
                strokeWidth="2"
                strokeDasharray="70 26.3"
                className="animate-[spin_4s_linear_infinite] origin-center transition-colors duration-500"
                strokeLinecap="round"
              />
              <circle
                cx="50" cy="50" r="41"
                fill="none"
                stroke={logoOuterColor}
                strokeWidth="2"
                strokeDasharray="60 25.8"
                className="animate-[spin_6s_linear_infinite_reverse] origin-center transition-colors duration-500"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-[15%] rounded-full overflow-hidden border border-white/10 bg-[#0D1527] flex items-center justify-center shadow-2xl">
              <svg className="w-full h-full drop-shadow-lg relative z-0" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                {/* Vertical stem */}
                <line x1="28" y1="25" x2="28" y2="75" stroke={logoOuterColor} strokeWidth="14" strokeLinecap="round" className="transition-colors duration-500" />
                {/* Top bar */}
                <line x1="28" y1="25" x2="60" y2="25" stroke={logoInnerColor} strokeWidth="14" strokeLinecap="round" className="transition-colors duration-500" />
                {/* Middle bar */}
                <line x1="28" y1="50" x2="48" y2="50" stroke={logoOuterColor} strokeWidth="14" strokeLinecap="round" className="transition-colors duration-500" />
                {/* Dot */}
                <circle cx="72" cy="50" r="7" fill={logoDotColor} className="transition-colors duration-500" />
              </svg>
              {/* Scanlines Overlay */}
              <div className="absolute inset-0 z-10 pointer-events-none bg-[repeating-linear-gradient(transparent,transparent_2px,rgba(0,0,0,0.15)_2px,rgba(0,0,0,0.15)_3px)]" />
            </div>
          </div>

          {/* Brand Text */}
          <div className="text-center select-none pointer-events-none">
            <h2 
              className={`text-3xl font-bold tracking-widest ${isTechTheme ? 'font-mono uppercase' : 'font-syne uppercase'}`}
              style={{ color: logoOuterColor, textShadow: `0 0 12px ${logoOuterColor}80` }}
            >
              {isTechTheme ? '>_FLOWI' : 'FLOWI'}
            </h2>
            <p 
              className={`text-xs mt-2 tracking-widest ${isTechTheme ? 'font-mono' : ''}`}
              style={{ color: '#A1A1AA' }}
            >
              Tu dinero, en flujo.
            </p>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
}
