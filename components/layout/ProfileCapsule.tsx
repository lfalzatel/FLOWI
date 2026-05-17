'use client';
import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from '@/lib/auth';
import {
  User, Settings, CreditCard, Bell,
  HelpCircle, LogOut, ChevronDown,
  BarChart2, Shield,
} from 'lucide-react';

const menuItems = [
  { icon: User,     label: 'Mi Perfil',      href: '/ajustes',         divider: false },
  { icon: CreditCard, label: 'Presupuesto',  href: '/presupuesto',     divider: false },
  { icon: BarChart2,  label: 'Reportes',     href: '/reportes',        divider: false },
  { icon: Bell,       label: 'Notificaciones', href: '/ajustes',       divider: true  },
  { icon: Settings,   label: 'Configuración', href: '/ajustes',        divider: false },
  { icon: Shield,     label: 'Privacidad',   href: '/ajustes',         divider: false },
  { icon: HelpCircle, label: 'Ayuda y soporte', href: '/ajustes',     divider: false },
];

export function ProfileCapsule() {
  const { user, profile } = useAuth();
  const [open, setOpen]   = useState(false);
  const ref               = useRef<HTMLDivElement>(null);
  const router            = useRouter();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!user) return null;
 
  const displayName = profile?.name || user.displayName || 'Usuario';
  const photoURL = profile?.photoURL || user.photoURL || '/default-avatar.png';
  const role = profile?.role || 'Usuario';
  const email = profile?.email || user.email || '';

  async function handleSignOut() {
    setOpen(false);
    await signOut();
  }

  return (
    <div ref={ref} className="relative">
      {/* ── Capsule button ── */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-full
                   bg-white/5 border border-white/10
                   hover:bg-white/10 hover:border-white/20
                   active:scale-[0.97]
                   transition-all duration-200 group"
      >
        {/* Avatar */}
        <div className="relative w-7 h-7 rounded-full overflow-hidden
                        ring-2 ring-accent/40 ring-offset-1 ring-offset-transparent">
          <Image
            src={photoURL}
            alt={displayName}
            fill
            className="object-cover"
          />
        </div>

        {/* Name + role (md+) */}
        <div className="hidden md:flex flex-col items-start leading-none gap-0.5 mr-0.5">
          <span className="text-[11px] font-semibold text-white/90 leading-none">
            {displayName.split(' ')[0]}
          </span>
          <span className="text-[9px] text-accent font-medium leading-none tracking-wide uppercase">
            {role}
          </span>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-white/40 transition-transform duration-200
                      ${open ? 'rotate-180 text-white/70' : ''}`}
        />
      </button>

      {/* ── Dropdown ── */}
      {open && (
        <div className="absolute right-0 top-full mt-2.5 w-68
                        bg-[#12122A]/95 backdrop-blur-2xl
                        border border-white/10 rounded-2xl
                        shadow-2xl shadow-black/60
                        animate-slide-down origin-top-right
                        overflow-hidden z-50"
             style={{ width: '272px' }}>

          {/* Profile header */}
          <div className="px-4 py-4 flex items-center gap-3 border-b border-white/5
                          bg-gradient-to-r from-accent/5 to-transparent">
            <div className="relative w-11 h-11 rounded-full overflow-hidden
                            ring-2 ring-accent/30 flex-shrink-0">
              <Image src={photoURL} alt={displayName} fill className="object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{displayName}</p>
              <p className="text-xs text-white/40 truncate">{email}</p>
              <span className="inline-block mt-1 text-[9px] px-2 py-0.5 rounded-full
                               bg-accent/15 text-accent font-semibold tracking-wide uppercase">
                {role}
              </span>
            </div>
          </div>

          {/* Menu items */}
          <div className="p-1.5">
            {menuItems.map(({ icon: Icon, label, href, divider }, i) => (
              <div key={i}>
                {divider && <div className="my-1 border-t border-white/5" />}
                <Link href={href} onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl
                             text-white/65 hover:text-white hover:bg-white/6
                             active:bg-white/10
                             transition-all duration-150 group/item">
                  <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center
                                  group-hover/item:bg-accent/10 transition-colors">
                    <Icon className="w-3.5 h-3.5 group-hover/item:text-accent transition-colors" />
                  </div>
                  <span className="text-sm">{label}</span>
                </Link>
              </div>
            ))}
          </div>

          {/* Sign out */}
          <div className="p-1.5 border-t border-white/5">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                         text-red-400/80 hover:text-red-400 hover:bg-red-500/8
                         active:bg-red-500/15
                         transition-all duration-150 group/so"
            >
              <div className="w-7 h-7 rounded-lg bg-red-500/8 flex items-center justify-center
                              group-hover/so:bg-red-500/15 transition-colors">
                <LogOut className="w-3.5 h-3.5" />
              </div>
              <span className="text-sm">Cerrar sesión</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
