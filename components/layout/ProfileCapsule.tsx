'use client';
import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ProfileModal } from '@/components/forms/ProfileModal';
import { ManageCategoriesModal } from '@/components/forms/ManageCategoriesModal';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from '@/lib/auth';
import {
  User, Settings, CreditCard, Bell,
  HelpCircle, LogOut, ChevronDown,
  BarChart2, Shield, Share2, List
} from 'lucide-react';

const menuItems = [
  { icon: User,     label: 'Mi Perfil',      href: '#',         divider: false, soon: true },
  { icon: CreditCard, label: 'Presupuesto',  href: '/presupuesto',     divider: false, soon: false },
  { icon: BarChart2,  label: 'Reportes',     href: '/reportes',        divider: false, soon: false },
  { icon: List,       label: 'Editar Categorías', href: '#',           divider: true, soon: false },
  { icon: Share2,     label: 'Compartir App',  href: '#',                divider: true, soon: false  },
  { icon: Bell,       label: 'Notificaciones', href: '#',       divider: true, soon: true  },
  { icon: Settings,   label: 'Configuración', href: '/configuracion',        divider: false, soon: false },
  { icon: Shield,     label: 'Privacidad',   href: '#',         divider: false, soon: true },
  { icon: HelpCircle, label: 'Ayuda y soporte', href: '#',     divider: false, soon: true },
];

export function ProfileCapsule() {
  const { user, profile } = useAuth();
  const [open, setOpen]   = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
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

  const handleShare = () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: 'FLOWI',
        text: '¡Gestiona tus gastos e ingresos con FLOWI!',
        url: 'https://flowi-woad.vercel.app/',
      });
    } else if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText('https://flowi-woad.vercel.app/');
      alert('¡Enlace copiado al portapapeles!');
    }
  };

  async function handleSignOut() {
    setOpen(false);
    sessionStorage.setItem('justLoggedOut', 'true');
    await signOut();
  }

  return (
    <>
    <div ref={ref} className="relative">
      {/* ── Capsule button ── */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-full
                   bg-glass border border-glass-border
                   hover:bg-glass-hover hover:border-glass-strong
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

        {/* Name + role */}
        <div className="flex flex-col items-start leading-none gap-0.5 mr-0.5">
          <span className="text-[11px] font-semibold text-white/90 leading-none">
            {displayName.split(' ')[0]}
          </span>
          <span className="text-[9px] text-accent font-medium leading-none tracking-wide uppercase">
            {role}
          </span>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-text-secondary transition-transform duration-200
                      ${open ? 'rotate-180 text-text-primary' : ''}`}
        />
      </button>

      {/* 🚀 Dropdown 🚀 */}
      {open && (
        <div className="absolute right-0 top-full mt-2.5 w-68
                        bg-bg-card/95 backdrop-blur-2xl
                        border border-glass-border rounded-2xl
                        shadow-2xl shadow-black/10
                        animate-slide-down origin-top-right
                        overflow-hidden z-50"
             style={{ width: '272px' }}>

          {/* Profile header */}
          <div className="px-4 py-4 flex items-center gap-3 border-b border-glass-border
                          bg-gradient-to-r from-accent/5 to-transparent">
            <div className="relative w-11 h-11 rounded-full overflow-hidden
                            ring-2 ring-accent/30 flex-shrink-0">
              <Image src={photoURL} alt={displayName} fill className="object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary truncate">{displayName}</p>
              <p className="text-xs text-text-secondary truncate">{email}</p>
              <span className="inline-block mt-1 text-[9px] px-2 py-0.5 rounded-full
                               bg-accent/15 text-accent font-semibold tracking-wide uppercase">
                {role}
              </span>
            </div>
          </div>

          {/* Menu items */}
          <div className="p-1.5">
            {menuItems.map((item, i) => (
              <div key={i}>
                {item.divider && <div className="my-1 border-t border-glass-border" />}
                {item.label === 'Compartir App' ? (
                  <button
                    onClick={() => { handleShare(); setOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-text-secondary hover:text-text-primary hover:bg-glass transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-glass-strong flex items-center justify-center">
                      <item.icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-sm">{item.label}</span>
                  </button>
                ) : item.label === 'Editar Categorías' ? (
                  <button
                    onClick={() => { setIsCategoriesModalOpen(true); setOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-text-secondary hover:text-text-primary hover:bg-glass transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-glass-strong flex items-center justify-center">
                      <item.icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-sm">{item.label}</span>
                  </button>
                ) : item.label === 'Mi Perfil' ? (
                  <button
                    onClick={() => { setIsProfileModalOpen(true); setOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-text-secondary hover:text-text-primary hover:bg-glass transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-glass-strong flex items-center justify-center">
                      <item.icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-sm">{item.label}</span>
                  </button>
                ) : item.soon ? (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      alert('¡Próximamente!');
                      setOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-text-secondary hover:text-text-primary hover:bg-glass transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-glass-strong flex items-center justify-center">
                        <item.icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-sm opacity-70">{item.label}</span>
                    </div>
                    <span className="text-[9px] bg-glass-strong px-1.5 py-0.5 rounded uppercase tracking-wider">Pronto</span>
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-text-secondary hover:text-text-primary hover:bg-glass transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-glass-strong flex items-center justify-center">
                      <item.icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-sm">{item.label}</span>
                  </Link>
                )}
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
      {isProfileModalOpen && (
        <ProfileModal onClose={() => setIsProfileModalOpen(false)} />
      )}
      {isCategoriesModalOpen && (
        <ManageCategoriesModal onClose={() => setIsCategoriesModalOpen(false)} />
      )}
    </>
  );
}
