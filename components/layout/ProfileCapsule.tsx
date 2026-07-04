'use client';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ProfileModal } from '@/components/forms/ProfileModal';
import { ManageCategoriesModal } from '@/components/forms/ManageCategoriesModal';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from '@/lib/auth';
import { useTheme } from '@/components/ThemeProvider';
import { requestNotificationPermission, registerReminderSW } from '@/lib/notifications';
import {
  User, Settings, CreditCard, Bell,
  HelpCircle, LogOut, ChevronDown,
  BarChart2, Shield, Share2, Download,
  Sun, Monitor, Terminal, Moon, Layers
} from 'lucide-react';

const menuItems = [
  { icon: User,       label: 'Mi perfil',         href: '#',              divider: false, soon: false },
  { icon: BarChart2,  label: 'Reportes',          href: '/reportes',      divider: false, soon: false },
  { icon: Download,   label: 'Instalar app',      href: '#',              divider: false, soon: false },
  { icon: Share2,     label: 'Compartir app',     href: '#',              divider: false, soon: false },
  { icon: Bell,       label: 'Notificaciones',    href: '#',              divider: false, soon: false, isNotificationToggle: true },
  { icon: Settings,   label: 'Configuración',     href: '/configuracion', divider: true,  soon: false },
];

export function ProfileCapsule() {
  const { user, profile } = useAuth();
  const { theme, setTheme, allowedThemes } = useTheme();
  const [open, setOpen]   = useState(false);
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
  const [showInstallAlert, setShowInstallAlert] = useState(false);
  const [notificationsActive, setNotificationsActive] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const allowed = Notification.permission === 'granted';
      const pref = localStorage.getItem('notifications_enabled') !== 'false';
      setNotificationsActive(allowed && pref);
    }
  }, []);

  const handleToggleNotifications = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window === 'undefined') return;

    if (!notificationsActive) {
      const granted = await requestNotificationPermission();
      if (granted) {
        localStorage.setItem('notifications_enabled', 'true');
        await registerReminderSW();
        setNotificationsActive(true);
      } else {
        alert('Por favor, activa los permisos de notificación en la configuración de tu navegador.');
      }
    } else {
      localStorage.setItem('notifications_enabled', 'false');
      setNotificationsActive(false);
    }
  };
  const ref               = useRef<HTMLDivElement>(null);
  const router            = useRouter();

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const [knownAccounts, setKnownAccounts] = useState<any[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('knownAccounts');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setKnownAccounts(parsed.filter((acc: any) => acc.uid !== user?.uid));
        }
      } catch (e) {}
    }
  }, [user]);

  const handleAddAccount = async () => {
    try {
      const { signInWithGoogle } = await import('@/lib/auth');
      const { isNewUser } = await signInWithGoogle(true);
      window.location.href = isNewUser ? '/?newuser=true' : '/?login=true';
    } catch (error) {
      console.error('Error adding account:', error);
    }
  };

  const handleSwitchAccount = async (email: string) => {
    try {
      const { signInWithGoogle } = await import('@/lib/auth');
      const { isNewUser } = await signInWithGoogle(false, email);
      window.location.href = isNewUser ? '/?newuser=true' : '/?login=true';
    } catch (error) {
      console.error('Error switching account:', error);
    }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

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
        url: 'https://flowi-gastos.web.app/',
      });
    } else if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText('https://flowi-gastos.web.app/');
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
        className={`flex items-center gap-2 px-2 py-1.5 transition-all duration-200 group active:scale-[0.97] ${isTechTheme ? 'rounded-none bg-transparent border border-accent hover:bg-accent hover:text-black' : 'rounded-full bg-glass border border-glass-border hover:bg-glass-hover hover:border-glass-strong'}`}
      >
        {/* Avatar */}
        <div className={`relative w-7 h-7 overflow-hidden ring-1 ring-offset-1 ring-offset-transparent ${isTechTheme ? 'rounded-none ring-accent' : 'rounded-full ring-transparent group-hover:ring-[var(--accent-glow)]'}`}>
          <Image
            src={photoURL}
            alt={displayName}
            fill
            className="object-cover"
          />
        </div>

        {/* Name + role */}
        <div className="flex flex-col items-start leading-none gap-0.5 mr-0.5">
          <span className={`text-[11px] font-semibold leading-none ${isTechTheme ? 'font-mono text-accent uppercase tracking-widest' : 'text-text-primary'}`}>
            {displayName.split(' ')[0]}
          </span>
          <span className={`text-[9px] font-medium leading-none tracking-wide uppercase ${isTechTheme ? 'font-mono text-accent opacity-70' : 'text-accent'}`}>
            {role}
          </span>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-text-secondary transition-transform duration-200
                      ${open ? 'rotate-180 text-text-primary' : ''}`}
        />
      </button>

      {/* 🚀 Dropdown 🚀 */}
      {open && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 bg-black/70 z-50 transition-opacity" 
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />,
        document.body
      )}
      {open && (
        <>
          <div className={`absolute right-0 top-full mt-2.5 
                          shadow-2xl shadow-black/10
                          animate-slide-down origin-top-right
                          overflow-y-auto z-50 glass-card
                          max-h-[calc(100vh-120px)] scrollbar-hide
                          ${isTechTheme 
                            ? 'rounded-none border-accent/50' 
                            : 'rounded-2xl border-glass-border/50'}`}
               style={{ width: '272px' }}>

          <div className={`px-4 py-4 flex items-center gap-3 border-b border-glass-border ${isTechTheme ? 'bg-deep' : 'bg-gradient-to-r from-[var(--accent-glow)] to-transparent'}`}>
            <div className={`relative w-11 h-11 overflow-hidden ring-2 ring-accent flex-shrink-0 ${isTechTheme ? 'rounded-none' : 'rounded-full'}`}>
              <Image src={photoURL} alt={displayName} fill className="object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold truncate ${isTechTheme ? 'font-mono text-accent uppercase tracking-widest' : 'text-text-primary'}`}>{displayName}</p>
              <p className={`text-xs truncate ${isTechTheme ? 'font-mono text-accent/50' : 'text-text-secondary'}`}>{email}</p>
              <span className={`inline-block mt-1 text-[9px] px-2 py-0.5 uppercase tracking-widest font-bold ${isTechTheme ? 'font-mono text-black bg-accent rounded-none' : 'rounded-full bg-[var(--accent-glow)] border border-accent text-accent'}`}>
                {role}
              </span>
            </div>
          </div>

          {/* Theme Switcher */}
          {allowedThemes && allowedThemes.length > 0 && (
            <div className="p-1.5 border-b border-glass-border">
              <div className="flex items-center justify-between gap-1 p-1 bg-glass border border-glass-border rounded-xl">
                {allowedThemes.map((t) => {
                  const isActive = theme === t;
                  let icon = <Monitor className="w-4 h-4 mb-1" />;
                  let label = 'Cyber';
                  
                  if (t === 'light') {
                    icon = <Sun className="w-4 h-4 mb-1" />;
                    label = 'Día';
                  } else if (t === 'dark') {
                    icon = <Moon className="w-4 h-4 mb-1" />;
                    label = 'Noche';
                  } else if (t === 'glassmorphism') {
                    icon = <Layers className="w-4 h-4 mb-1" />;
                    label = 'Glass';
                  } else if (t === 'kiloCode') {
                    icon = <Terminal className="w-4 h-4 mb-1" />;
                    label = 'Kilo';
                  }

                  return (
                    <button 
                      key={t}
                      onClick={() => setTheme(t)} 
                      className={`flex-1 flex flex-col items-center justify-center py-2 rounded-lg transition-all ${
                        isActive 
                          ? 'bg-accent text-black shadow-sm font-bold' 
                          : 'text-text-secondary hover:text-text-primary hover:bg-glass'
                      }`}
                    >
                      {icon}
                      <span className="text-[9px] font-semibold">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Menu items */}
          <div className="p-1.5">
            {menuItems.map((item, i) => (
              <div key={i}>
                {item.divider && <div className="my-1 border-t border-glass-border" />}
                {item.label === 'Instalar app' ? (
                  !isInstalled && (
                    <button
                      onClick={async () => {
                        if (deferredPrompt) {
                          deferredPrompt.prompt();
                          const { outcome } = await deferredPrompt.userChoice;
                          if (outcome === 'accepted') {
                            setDeferredPrompt(null);
                          }
                        } else {
                          // Fallback custom modal
                          setShowInstallAlert(true);
                        }
                        setOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-text-secondary hover:text-text-primary hover:bg-glass transition-colors"
                    >
                      <div className="w-7 h-7 rounded-lg bg-glass-strong flex items-center justify-center">
                        <item.icon className="w-3.5 h-3.5 text-accent" />
                      </div>
                      <span className={`text-sm ${isTechTheme ? 'font-mono text-accent uppercase tracking-wide' : 'text-accent font-medium'}`}>{isTechTheme ? '>_ INSTALAR_APP' : item.label}</span>
                    </button>
                  )
                ) : item.label === 'Compartir app' ? (
                  <button
                    onClick={() => { handleShare(); setOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-text-secondary hover:text-text-primary hover:bg-glass transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-glass-strong flex items-center justify-center">
                      <item.icon className="w-3.5 h-3.5" />
                    </div>
                    <span className={`text-sm ${isTechTheme ? 'font-mono text-accent uppercase tracking-wide' : ''}`}>{item.label}</span>
                  </button>
                ) : item.label === 'Mi perfil' ? (
                  <button
                    onClick={() => { setIsProfileModalOpen(true); setOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-text-secondary hover:text-text-primary hover:bg-glass transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-glass-strong flex items-center justify-center">
                      <item.icon className="w-3.5 h-3.5" />
                    </div>
                    <span className={`text-sm ${isTechTheme ? 'font-mono text-accent uppercase tracking-wide' : ''}`}>{item.label}</span>
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
                      <span className={`text-sm opacity-70 ${isTechTheme ? 'font-mono text-accent uppercase tracking-wide' : ''}`}>{item.label}</span>
                    </div>
                    <span className="text-[9px] bg-glass-strong px-1.5 py-0.5 rounded uppercase tracking-wider">Pronto</span>
                  </button>
                ) : item.isNotificationToggle ? (
                  <div
                    onClick={handleToggleNotifications}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-text-secondary hover:text-text-primary hover:bg-glass transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${notificationsActive ? 'bg-accent/25 text-accent' : 'bg-glass-strong'}`}>
                        <item.icon className="w-3.5 h-3.5" />
                      </div>
                      <span className={`text-sm ${isTechTheme ? 'font-mono text-accent uppercase tracking-wide' : ''}`}>{item.label}</span>
                    </div>
                    <div className={`w-8 h-4.5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${notificationsActive ? 'bg-accent' : 'bg-glass-strong border border-glass-border'}`}>
                      <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transform duration-200 ${notificationsActive ? 'translate-x-3.5' : 'translate-x-0'}`} />
                    </div>
                  </div>
                ) : (
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-text-secondary hover:text-text-primary hover:bg-glass transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-glass-strong flex items-center justify-center">
                      <item.icon className="w-3.5 h-3.5" />
                    </div>
                    <span className={`text-sm ${isTechTheme ? 'font-mono text-accent uppercase tracking-wide' : ''}`}>{item.label}</span>
                  </Link>
                )}
              </div>
            ))}
          </div>

          {/* Account Switcher */}
          <div className="p-1.5 border-t border-glass-border">
            {knownAccounts.length > 0 && (
              <div className="mb-2">
                <p className={`px-2 py-1.5 text-[10px] uppercase tracking-widest font-bold ${isTechTheme ? 'font-mono text-accent' : 'text-text-secondary'}`}>
                  {isTechTheme ? '>_ OTRAS_CUENTAS' : 'Otras Cuentas'}
                </p>
                {knownAccounts.map((acc, idx) => (
                  <button 
                    key={idx}
                    onClick={() => handleSwitchAccount(acc.email)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-glass transition-colors text-left group"
                  >
                    <div className={`relative w-6 h-6 overflow-hidden ${isTechTheme ? 'rounded-none' : 'rounded-full'}`}>
                      {acc.photoURL ? (
                        <Image src={acc.photoURL} alt={acc.displayName} fill className="object-cover grayscale group-hover:grayscale-0 transition-all" />
                      ) : (
                        <div className="w-full h-full bg-glass flex items-center justify-center"><User className="w-3 h-3 text-text-secondary" /></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs truncate ${isTechTheme ? 'font-mono text-text-primary' : 'text-text-primary font-medium'}`}>{acc.displayName}</p>
                      <p className={`text-[10px] truncate ${isTechTheme ? 'font-mono text-accent/50' : 'text-text-secondary'}`}>{acc.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            <button
              onClick={handleAddAccount}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-text-secondary hover:text-text-primary hover:bg-glass transition-colors ${isTechTheme ? 'font-mono uppercase tracking-widest' : ''}`}
            >
              <div className="w-7 h-7 rounded-lg bg-glass-strong flex items-center justify-center">
                <span className="text-lg leading-none">+</span>
              </div>
              <span className={`text-sm ${isTechTheme ? 'font-mono tracking-widest uppercase' : ''}`}>
                {isTechTheme ? '>_ ANADIR_CUENTA' : 'Añadir Cuenta'}
              </span>
            </button>
          </div>

          {/* Sign out */}
          <div className="p-1.5 border-t border-glass-border">
            <button
              onClick={handleSignOut}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400/80 hover:text-red-400 hover:bg-red-500/8 active:bg-red-500/15 transition-all duration-150 group/so ${isTechTheme ? 'font-mono uppercase tracking-widest' : ''}`}
            >
              <div className="w-7 h-7 rounded-lg bg-red-500/8 flex items-center justify-center group-hover/so:bg-red-500/15 transition-colors">
                <LogOut className="w-3.5 h-3.5" />
              </div>
              <span className={`text-sm ${isTechTheme ? 'font-mono font-bold tracking-widest uppercase' : ''}`}>
                {isTechTheme ? '>_ CERRAR_SESION' : 'Cerrar sesión'}
              </span>
            </button>
          </div>
        </div>
        </>
      )}
    </div>
      {isProfileModalOpen && (
        <ProfileModal onClose={() => setIsProfileModalOpen(false)} />
      )}
      {isCategoriesModalOpen && (
        <ManageCategoriesModal onClose={() => setIsCategoriesModalOpen(false)} />
      )}

      {/* Detailed PWA Install Instructions Modal */}
      {showInstallAlert && typeof document !== 'undefined' && createPortal(
        <InstallInstructionsModal onClose={() => setShowInstallAlert(false)} isTechTheme={isTechTheme} />,
        document.body
      )}
    </>
  );
}

// Sub-componente para las instrucciones de instalación con pestañas
function InstallInstructionsModal({ onClose, isTechTheme }: { onClose: () => void; isTechTheme: boolean }) {
  const [activeTab, setActiveTab] = useState<'ios' | 'android' | 'desktop'>('ios');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userAgent = window.navigator.userAgent.toLowerCase();
      if (/iphone|ipad|ipod/.test(userAgent)) {
        setActiveTab('ios');
      } else if (/android/.test(userAgent)) {
        setActiveTab('android');
      } else {
        setActiveTab('desktop');
      }
    }
  }, []);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110] flex items-center justify-center p-4">
      <div className={`
        w-full max-w-md overflow-hidden transition-all duration-300
        ${isTechTheme 
          ? 'bg-black border-2 border-accent rounded-none shadow-[0_0_50px_rgba(0,229,160,0.15)]' 
          : 'bg-card border border-glass-border rounded-3xl shadow-2xl'
        }
      `}>
        {/* Cabecera */}
        <div className={`p-5 border-b border-glass-border ${isTechTheme ? 'bg-black' : 'bg-gradient-to-r from-[var(--accent-glow)] to-transparent'}`}>
          <h3 className={`text-lg font-bold ${isTechTheme ? 'font-mono text-accent uppercase tracking-widest' : 'text-text-primary font-syne'}`}>
            {isTechTheme ? '>_ INSTALAR_FLOWI' : 'Instalar aplicación'}
          </h3>
          <p className={`text-xs mt-1 ${isTechTheme ? 'font-mono text-accent/60' : 'text-text-secondary'}`}>
            Disfruta de la experiencia completa en pantalla de inicio.
          </p>
        </div>

        {/* Pestañas de selección */}
        <div className="flex border-b border-glass-border p-1.5 bg-glass gap-1">
          {(['ios', 'android', 'desktop'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                flex-1 py-2 text-xs font-semibold rounded-xl transition-all duration-200
                ${activeTab === tab 
                  ? (isTechTheme ? 'bg-accent text-black font-mono uppercase' : 'bg-accent text-white shadow-sm') 
                  : (isTechTheme ? 'font-mono text-accent/50 hover:text-accent' : 'text-text-secondary hover:text-text-primary hover:bg-glass')
                }
              `}
            >
              {tab === 'ios' && 'iPhone / iPad'}
              {tab === 'android' && 'Android'}
              {tab === 'desktop' && 'Computadora'}
            </button>
          ))}
        </div>

        {/* Contenido instructivo */}
        <div className="p-6 space-y-4">
          {activeTab === 'ios' && (
            <div className="space-y-4 animate-fade-in-up">
              <div className="flex gap-4 items-start">
                <div className="w-6 h-6 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-bold shrink-0">1</div>
                <p className={`text-sm ${isTechTheme ? 'font-mono text-accent/80' : 'text-text-secondary'}`}>
                  Abre la aplicación en el navegador <strong className={isTechTheme ? 'text-accent' : 'text-text-primary'}>Safari</strong> de tu dispositivo Apple.
                </p>
              </div>
              <div className="flex gap-4 items-start">
                <div className="w-6 h-6 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-bold shrink-0">2</div>
                <p className={`text-sm ${isTechTheme ? 'font-mono text-accent/80' : 'text-text-secondary'}`}>
                  Toca el botón de <strong className={isTechTheme ? 'text-accent' : 'text-text-primary'}>Compartir</strong> (el cuadro con una flecha hacia arriba) en la barra de opciones inferior.
                </p>
              </div>
              <div className="flex gap-4 items-start">
                <div className="w-6 h-6 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-bold shrink-0">3</div>
                <p className={`text-sm ${isTechTheme ? 'font-mono text-accent/80' : 'text-text-secondary'}`}>
                  Busca la opción que dice <strong className={isTechTheme ? 'text-accent' : 'text-text-primary'}>"Agregar a inicio"</strong> o <strong className={isTechTheme ? 'text-accent' : 'text-text-primary'}>"Add to Home Screen"</strong> y selecciónala.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'android' && (
            <div className="space-y-4 animate-fade-in-up">
              <div className="flex gap-4 items-start">
                <div className="w-6 h-6 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-bold shrink-0">1</div>
                <p className={`text-sm ${isTechTheme ? 'font-mono text-accent/80' : 'text-text-secondary'}`}>
                  Toca el botón de opciones del navegador (los <strong className={isTechTheme ? 'text-accent' : 'text-text-primary'}>tres puntos verticales</strong> arriba a la derecha).
                </p>
              </div>
              <div className="flex gap-4 items-start">
                <div className="w-6 h-6 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-bold shrink-0">2</div>
                <p className={`text-sm ${isTechTheme ? 'font-mono text-accent/80' : 'text-text-secondary'}`}>
                  Busca y selecciona la opción <strong className={isTechTheme ? 'text-accent' : 'text-text-primary'}>"Instalar aplicación"</strong> o <strong className={isTechTheme ? 'text-accent' : 'text-text-primary'}>"Agregar a la pantalla principal"</strong>.
                </p>
              </div>
              <div className="flex gap-4 items-start">
                <div className="w-6 h-6 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-bold shrink-0">3</div>
                <p className={`text-sm ${isTechTheme ? 'font-mono text-accent/80' : 'text-text-secondary'}`}>
                  Confirma la instalación en el cuadro emergente y se creará un acceso directo en tu menú de aplicaciones.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'desktop' && (
            <div className="space-y-4 animate-fade-in-up">
              <div className="flex gap-4 items-start">
                <div className="w-6 h-6 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-bold shrink-0">1</div>
                <p className={`text-sm ${isTechTheme ? 'font-mono text-accent/80' : 'text-text-secondary'}`}>
                  En la parte derecha de la barra de direcciones de tu navegador (Chrome, Edge, etc.), busca el icono de un <strong className={isTechTheme ? 'text-accent' : 'text-text-primary'}>monitor con una flecha apuntando hacia abajo</strong> o una pequeña ventana de instalación.
                </p>
              </div>
              <div className="flex gap-4 items-start">
                <div className="w-6 h-6 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-bold shrink-0">2</div>
                <p className={`text-sm ${isTechTheme ? 'font-mono text-accent/80' : 'text-text-secondary'}`}>
                  Haz clic en él y confirma la instalación seleccionando <strong className={isTechTheme ? 'text-accent' : 'text-text-primary'}>"Instalar"</strong>.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Botón de cierre */}
        <div className="p-4 bg-glass border-t border-glass-border">
          <button
            onClick={onClose}
            className={`
              w-full py-3 text-center text-xs font-bold transition-all duration-200
              ${isTechTheme 
                ? 'bg-accent/10 border border-accent text-accent hover:bg-accent hover:text-black font-mono uppercase tracking-widest' 
                : 'rounded-xl bg-gradient-to-r from-accent to-accent-dim text-white shadow-lg shadow-accent/20 hover:opacity-95 active:scale-[0.98]'
              }
            `}
          >
            {isTechTheme ? 'CERRAR_MENU.SYS' : '¡Entendido!'}
          </button>
        </div>
      </div>
    </div>
  );
}
