'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/components/ThemeProvider';
import { BottomNav } from '@/components/layout/BottomNav';
import { Header } from '@/components/layout/Header';
import { ProfileModal } from '@/components/forms/ProfileModal';
import { ManageCategoriesModal } from '@/components/forms/ManageCategoriesModal';
import { ManageThemesModal } from '@/components/forms/ManageThemesModal';
import { ManageUsersModal } from '@/components/forms/ManageUsersModal';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { 
  ArrowLeft, Sun, Moon, Terminal, Layers, Zap, Palette,
  User, Wallet, Bell, Shield, RefreshCw,
  ChevronRight, Lock, Key, Globe, Type, 
  Calendar, PieChart, Download, Trash2, 
  FileText, Settings, Volume2, Smartphone, MessageSquare, Music
} from 'lucide-react';

export default function ConfigPage() {
  const router = useRouter();
  const { theme, setTheme, allowedThemes, setAllowedThemes } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';
  const { user, profile, loading: authLoading } = useAuth();
  
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
  const [isClearDataConfirmOpen, setIsClearDataConfirmOpen] = useState(false);
  const [isRegeneratingThemes, setIsRegeneratingThemes] = useState(false);
  const [isThemesModalOpen, setIsThemesModalOpen] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const handleRestoreBaseCategories = async () => {
    if (!user) return;
    if (!window.confirm('¿Quieres restaurar todas las categorías base que habías ocultado o reemplazado?')) return;
    
    setRestoring(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        hiddenCategories: []
      });
      alert('Categorías base restauradas con éxito. Recarga la página si es necesario.');
    } catch (e) {
      console.error(e);
      alert('Error al restaurar categorías.');
    } finally {
      setRestoring(false);
    }
  };

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [inAppEnabled, setInAppEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationSound, setNotificationSound] = useState('notification.mp3');

  // Load from local storage
  useEffect(() => {
    setNotificationsEnabled(localStorage.getItem('notifications_enabled') !== 'false');
    setPushEnabled(localStorage.getItem('push_enabled') !== 'false');
    setInAppEnabled(localStorage.getItem('in_app_enabled') !== 'false');
    setSoundEnabled(localStorage.getItem('sound_enabled') !== 'false');
    setNotificationSound(localStorage.getItem('notification_sound') || 'notification.mp3');
  }, []);

  const toggleNotifications = () => {
    const newState = !notificationsEnabled;
    setNotificationsEnabled(newState);
    localStorage.setItem('notifications_enabled', String(newState));
  };

  const togglePush = () => {
    const newState = !pushEnabled;
    setPushEnabled(newState);
    localStorage.setItem('push_enabled', String(newState));
  };

  const toggleInApp = () => {
    const newState = !inAppEnabled;
    setInAppEnabled(newState);
    localStorage.setItem('in_app_enabled', String(newState));
  };

  const toggleSound = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    localStorage.setItem('sound_enabled', String(newState));
  };

  const changeSound = (sound: string) => {
    setNotificationSound(sound);
    localStorage.setItem('notification_sound', sound);
    
    // Play a preview of the sound
    if (notificationsEnabled) {
      const audio = new Audio(`/assets/sounds/${sound}`);
      audio.play().catch(e => console.error('Failed to play preview:', e));
    }
  };

  const handleClearData = async () => {
    if (!user) return;
    if (!window.confirm('¿Quieres restaurar todas las categorías base que habías ocultado o reemplazado?')) return;
    
    setRestoring(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        hiddenCategories: []
      });
      alert('Categorías base restauradas con éxito. Recarga la página si es necesario.');
    } catch (e) {
      console.error(e);
      alert('Error al restaurar categorías.');
    } finally {
      setRestoring(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  if (authLoading) return <div className="min-h-screen bg-deep flex flex-col items-center justify-center"><div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen flex flex-col bg-deep">
      <Header />
      <main className="flex-1 max-w-2xl lg:max-w-none mx-auto w-full space-y-6 animate-fade-in-up p-4 pb-24">
        {/* Header section */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className={`p-2 -ml-2 rounded-xl transition-colors ${isTechTheme ? 'text-accent hover:bg-accent/10' : 'text-text-secondary hover:bg-glass'}`}>
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <span className={`text-xs font-medium uppercase tracking-wider ${isTechTheme ? 'font-mono text-accent/70' : 'text-text-muted'}`}>Centro de Control</span>
            <h1 className={`${isTechTheme ? 'font-mono font-bold text-3xl text-accent uppercase tracking-widest' : 'font-syne font-bold text-3xl text-text-primary'}`}>Configuración</h1>
          </div>
        </div>

        {/* 1. Cuenta y Perfil */}
        <section className="space-y-3">
          <h2 className={`${isTechTheme ? 'font-mono font-bold text-sm text-accent uppercase tracking-wide border-b border-accent/20 pb-1' : 'font-syne font-semibold text-sm text-text-secondary ml-2'}`}>Cuenta y Perfil</h2>
          <div className={`overflow-hidden transition-all ${isTechTheme ? 'border border-accent/20 rounded-none bg-deep' : 'glass-card rounded-2xl'}`}>
            <button onClick={() => setIsProfileModalOpen(true)} className={`w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors border-b ${isTechTheme ? 'border-accent/15' : 'border-glass-border'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 flex items-center justify-center ${isTechTheme ? 'border border-accent/30 rounded-none bg-accent/5' : 'rounded-xl bg-accent/10'}`}>
                  <User className={`w-4 h-4 ${isTechTheme ? 'text-accent' : 'text-accent'}`} />
                </div>
                <div className="text-left">
                  <p className={`text-sm font-medium ${isTechTheme ? 'font-mono text-accent uppercase tracking-wider' : 'text-text-primary'}`}>{isTechTheme ? 'MI_PERFIL' : 'Mi perfil'}</p>
                  <p className={`text-[10px] ${isTechTheme ? 'font-mono text-accent/60' : 'text-text-muted'}`}>{isTechTheme ? 'EDITAR_NOMBRE_FOTO_Y_TELEFONO' : 'Editar nombre, foto y teléfono'}</p>
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 ${isTechTheme ? 'text-accent/60' : 'text-text-muted'}`} />
            </button>
            <div className={`w-full flex items-center justify-between p-4 border-b opacity-50 cursor-not-allowed ${isTechTheme ? 'border-accent/15' : 'border-glass-border'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 flex items-center justify-center ${isTechTheme ? 'border border-blue-500/20 rounded-none bg-blue-500/5' : 'rounded-xl bg-blue-500/10'}`}>
                  <Key className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-left">
                  <p className={`text-sm font-medium ${isTechTheme ? 'font-mono text-blue-400/80 uppercase tracking-wider' : 'text-text-primary'}`}>{isTechTheme ? 'CAMBIAR_CONTRASENA' : 'Cambiar contraseña'}</p>
                  <p className={`text-[10px] ${isTechTheme ? 'font-mono text-blue-400/50' : 'text-text-muted'}`}>{isTechTheme ? 'ENVIAR_EMAIL_DE_RECUPERACION' : 'Enviar email de recuperación'}</p>
                </div>
              </div>
              <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider ${isTechTheme ? 'font-mono border border-blue-500/30 text-blue-400 bg-blue-500/5' : 'bg-glass-strong text-text-muted'}`}>Pronto</span>
            </div>
            <div className="w-full flex items-center justify-between p-4 bg-white/[0.01]">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 flex items-center justify-center ${isTechTheme ? 'border border-purple-500/20 rounded-none bg-purple-500/5' : 'rounded-xl bg-purple-500/10'}`}>
                  <Shield className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-left">
                  <p className={`text-sm font-medium ${isTechTheme ? 'font-mono text-purple-400/80 uppercase tracking-wider' : 'text-text-primary'}`}>{isTechTheme ? 'ROL_DE_LA_CUENTA' : 'Rol de la cuenta'}</p>
                  <p className={`text-[10px] ${isTechTheme ? 'font-mono text-purple-400/50' : 'text-text-muted'}`}>{isTechTheme ? 'NIVEL_DE_ACCESO_ACTUAL' : 'Nivel de acceso actual'}</p>
                </div>
              </div>
              <span className={`text-[10px] px-2 py-0.5 ${isTechTheme ? 'font-mono bg-accent/10 text-accent border border-accent/20 rounded-none' : 'bg-glass-strong text-text-secondary rounded-full'}`}>{profile?.role || 'Usuario'}</span>
            </div>
          </div>
        </section>

        {/* 1.5 Notificaciones */}
        <section className="space-y-3">
          <h2 className={`${isTechTheme ? 'font-mono font-bold text-sm text-accent uppercase tracking-wide border-b border-accent/20 pb-1' : 'font-syne font-semibold text-sm text-text-secondary ml-2'}`}>Notificaciones</h2>
          <div className={`overflow-hidden transition-all ${isTechTheme ? 'border border-accent/20 rounded-none bg-deep' : 'glass-card rounded-2xl'}`}>
            {/* Activar Notificaciones (Master) */}
            <div className={`w-full flex items-center justify-between p-4 border-b ${isTechTheme ? 'border-accent/15' : 'border-glass-border'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 flex items-center justify-center ${isTechTheme ? 'border border-[var(--yellow)]/30 rounded-none bg-[var(--yellow)]/5' : 'rounded-xl bg-[var(--yellow)]/10'}`}>
                  <Bell className="w-4 h-4 text-[var(--yellow)]" />
                </div>
                <div className="text-left">
                  <p className={`text-sm font-medium ${isTechTheme ? 'font-mono text-accent uppercase tracking-wider' : 'text-text-primary'}`}>{isTechTheme ? 'ACTIVAR_NOTIFICACIONES' : 'Activar Notificaciones'}</p>
                  <p className={`text-[10px] ${isTechTheme ? 'font-mono text-accent/60' : 'text-text-muted'}`}>{isTechTheme ? 'PERMITIR_ALERTAS_LOCALES' : 'Permitir alertas locales'}</p>
                </div>
              </div>
              <button 
                onClick={toggleNotifications}
                className={`w-12 h-6 rounded-full transition-colors relative ${notificationsEnabled ? (isTechTheme ? 'bg-accent/40 border border-accent' : 'bg-[var(--yellow)]') : (isTechTheme ? 'bg-black/50 border border-accent/20' : 'bg-gray-600')}`}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-transform ${notificationsEnabled ? 'translate-x-6 bg-white' : 'translate-x-0 bg-gray-300'}`} />
              </button>
            </div>

            {/* Notificación Push */}
            <div className={`w-full flex items-center justify-between p-4 border-b ${isTechTheme ? 'border-accent/15' : 'border-glass-border'} ${!notificationsEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 flex items-center justify-center ${isTechTheme ? 'border border-[var(--yellow)]/30 rounded-none bg-[var(--yellow)]/5' : 'rounded-xl bg-[var(--yellow)]/10'}`}>
                  <Smartphone className="w-4 h-4 text-[var(--yellow)]" />
                </div>
                <div className="text-left">
                  <p className={`text-sm font-medium ${isTechTheme ? 'font-mono text-accent uppercase tracking-wider' : 'text-text-primary'}`}>{isTechTheme ? 'NOTIFICACION_PUSH' : 'Notificación Push'}</p>
                  <p className={`text-[10px] ${isTechTheme ? 'font-mono text-accent/60' : 'text-text-muted'}`}>{isTechTheme ? 'SEGUNDO_PLANO' : 'Segundo plano'}</p>
                </div>
              </div>
              <button 
                onClick={togglePush}
                disabled={!notificationsEnabled}
                className={`w-12 h-6 rounded-full transition-colors relative ${pushEnabled ? (isTechTheme ? 'bg-accent/40 border border-accent' : 'bg-[var(--yellow)]') : (isTechTheme ? 'bg-black/50 border border-accent/20' : 'bg-gray-600')}`}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-transform ${pushEnabled ? 'translate-x-6 bg-white' : 'translate-x-0 bg-gray-300'}`} />
              </button>
            </div>

            {/* Notificación In-App */}
            <div className={`w-full flex items-center justify-between p-4 border-b ${isTechTheme ? 'border-accent/15' : 'border-glass-border'} ${!notificationsEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 flex items-center justify-center ${isTechTheme ? 'border border-[var(--yellow)]/30 rounded-none bg-[var(--yellow)]/5' : 'rounded-xl bg-[var(--yellow)]/10'}`}>
                  <MessageSquare className="w-4 h-4 text-[var(--yellow)]" />
                </div>
                <div className="text-left">
                  <p className={`text-sm font-medium ${isTechTheme ? 'font-mono text-accent uppercase tracking-wider' : 'text-text-primary'}`}>{isTechTheme ? 'NOTIFICACION_IN_APP' : 'Notificación In-App'}</p>
                  <p className={`text-[10px] ${isTechTheme ? 'font-mono text-accent/60' : 'text-text-muted'}`}>{isTechTheme ? 'MENSAJES_TOAST' : 'Mensajes toast'}</p>
                </div>
              </div>
              <button 
                onClick={toggleInApp}
                disabled={!notificationsEnabled}
                className={`w-12 h-6 rounded-full transition-colors relative ${inAppEnabled ? (isTechTheme ? 'bg-accent/40 border border-accent' : 'bg-[var(--yellow)]') : (isTechTheme ? 'bg-black/50 border border-accent/20' : 'bg-gray-600')}`}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-transform ${inAppEnabled ? 'translate-x-6 bg-white' : 'translate-x-0 bg-gray-300'}`} />
              </button>
            </div>

            {/* Efecto de Sonido (Toggle) */}
            <div className={`w-full flex items-center justify-between p-4 border-b ${isTechTheme ? 'border-accent/15' : 'border-glass-border'} ${!notificationsEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 flex items-center justify-center ${isTechTheme ? 'border border-[var(--yellow)]/30 rounded-none bg-[var(--yellow)]/5' : 'rounded-xl bg-[var(--yellow)]/10'}`}>
                  <Volume2 className="w-4 h-4 text-[var(--yellow)]" />
                </div>
                <div className="text-left">
                  <p className={`text-sm font-medium ${isTechTheme ? 'font-mono text-accent uppercase tracking-wider' : 'text-text-primary'}`}>{isTechTheme ? 'EFECTO_DE_SONIDO' : 'Efecto de Sonido'}</p>
                  <p className={`text-[10px] ${isTechTheme ? 'font-mono text-accent/60' : 'text-text-muted'}`}>{isTechTheme ? 'REPRODUCIR_TONOS' : 'Reproducir tonos'}</p>
                </div>
              </div>
              <button 
                onClick={toggleSound}
                disabled={!notificationsEnabled}
                className={`w-12 h-6 rounded-full transition-colors relative ${soundEnabled ? (isTechTheme ? 'bg-accent/40 border border-accent' : 'bg-[var(--yellow)]') : (isTechTheme ? 'bg-black/50 border border-accent/20' : 'bg-gray-600')}`}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-transform ${soundEnabled ? 'translate-x-6 bg-white' : 'translate-x-0 bg-gray-300'}`} />
              </button>
            </div>
            
            {/* Tono de Alerta (Dropdown) */}
            <div className={`w-full flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 ${!notificationsEnabled || !soundEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 flex items-center justify-center ${isTechTheme ? 'border border-[var(--yellow)]/30 rounded-none bg-[var(--yellow)]/5' : 'rounded-xl bg-[var(--yellow)]/10'}`}>
                  <Music className="w-4 h-4 text-[var(--yellow)]" />
                </div>
                <div className="text-left">
                  <p className={`text-sm font-medium ${isTechTheme ? 'font-mono text-accent uppercase tracking-wider' : 'text-text-primary'}`}>{isTechTheme ? 'TONO_DE_ALERTA' : 'Tono de Alerta'}</p>
                  <p className={`text-[10px] ${isTechTheme ? 'font-mono text-accent/60' : 'text-text-muted'}`}>{isTechTheme ? 'ELIGE_TU_TONO_PREFERIDO' : 'Elige tu tono preferido'}</p>
                </div>
              </div>
              <select
                value={notificationSound}
                onChange={(e) => changeSound(e.target.value)}
                disabled={!notificationsEnabled || !soundEnabled}
                className={`px-3 py-1.5 text-xs focus:outline-none transition-all ${isTechTheme ? 'bg-black/40 border border-accent/40 text-accent font-mono rounded-none uppercase' : 'bg-white/5 border border-white/10 text-text-primary rounded-xl'}`}
              >
                <option value="notification.mp3">Suave (Burbuja)</option>
                <option value="notification-sound.mp3">Clásico (Campana)</option>
              </select>
            </div>
          </div>
        </section>

        {/* 2. Gestión */}
        <section className="space-y-3">
          <h2 className={`${isTechTheme ? 'font-mono font-bold text-sm text-accent uppercase tracking-wide border-b border-accent/20 pb-1' : 'font-syne font-semibold text-sm text-text-secondary ml-2'}`}>Gestión</h2>
          <div className={`overflow-hidden transition-all ${isTechTheme ? 'border border-accent/20 rounded-none bg-deep' : 'glass-card rounded-2xl'}`}>
            <button onClick={() => setIsCategoriesModalOpen(true)} className={`w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors border-b ${isTechTheme ? 'border-accent/15' : 'border-glass-border'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 flex items-center justify-center ${isTechTheme ? 'border border-[var(--yellow)]/30 rounded-none bg-[var(--yellow)]/5' : 'rounded-xl bg-[var(--yellow)]/10'}`}>
                  <PieChart className="w-4 h-4 text-[var(--yellow)]" />
                </div>
                <div className="text-left">
                  <p className={`text-sm font-medium ${isTechTheme ? 'font-mono text-accent uppercase tracking-wider' : 'text-text-primary'}`}>{isTechTheme ? 'GESTIONAR_CATEGORIAS' : 'Gestionar Categorías'}</p>
                  <p className={`text-[10px] ${isTechTheme ? 'font-mono text-accent/60' : 'text-text-muted'}`}>{isTechTheme ? 'COLORES_E_ICONOS_DE_GASTOS' : 'Colores e iconos de gastos'}</p>
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 ${isTechTheme ? 'text-accent/60' : 'text-text-muted'}`} />
            </button>
            
            {/* Admin only: Manage Users */}
            {profile?.role === 'admin' && (
              <>
                <button onClick={() => setIsUsersModalOpen(true)} className={`w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors border-b ${isTechTheme ? 'border-accent/15' : 'border-glass-border'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 flex items-center justify-center ${isTechTheme ? 'border border-red-500/30 rounded-none bg-red-500/5' : 'rounded-xl bg-red-500/10'}`}>
                      <Shield className="w-4 h-4 text-red-500" />
                    </div>
                    <div className="text-left">
                      <p className={`text-sm font-medium ${isTechTheme ? 'font-mono text-red-400 uppercase tracking-wider' : 'text-text-primary'}`}>{isTechTheme ? 'GESTIONAR_USUARIOS' : 'Gestionar Usuarios'}</p>
                      <p className={`text-[10px] ${isTechTheme ? 'font-mono text-red-400/60' : 'text-text-muted'}`}>{isTechTheme ? 'CAMBIAR_ROLES_Y_ADMINISTRAR_ACCESOS' : 'Cambiar roles y administrar accesos'}</p>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 ${isTechTheme ? 'text-accent/60' : 'text-text-muted'}`} />
                </button>

                <button 
                  onClick={handleRestoreBaseCategories} 
                  disabled={restoring}
                  className={`w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors border-b disabled:opacity-50 ${isTechTheme ? 'border-accent/15' : 'border-glass-border'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 flex items-center justify-center ${isTechTheme ? 'border border-cyan-500/30 rounded-none bg-cyan-500/5' : 'rounded-xl bg-cyan-500/10'}`}>
                      <RefreshCw className={`w-4 h-4 text-cyan-400 ${restoring ? 'animate-spin' : ''}`} />
                    </div>
                    <div className="text-left">
                      <p className={`text-sm font-medium ${isTechTheme ? 'font-mono text-cyan-400 uppercase tracking-wider' : 'text-text-primary'}`}>{isTechTheme ? 'RESTAURAR_CATEGORIAS_BASE' : 'Restaurar Categorías Base'}</p>
                      <p className={`text-[10px] ${isTechTheme ? 'font-mono text-cyan-400/60' : 'text-text-muted'}`}>{isTechTheme ? 'VOLVER_A_VER_LAS_CATEGORIAS_POR_DEFECTO_OCULTAS' : 'Volver a ver las categorías por defecto ocultas'}</p>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 ${isTechTheme ? 'text-accent/60' : 'text-text-muted'}`} />
                </button>
              </>
            )}
          </div>
        </section>

        {/* 3. Apariencia */}
        <section className="space-y-3">
          <h2 className={`${isTechTheme ? 'font-mono font-bold text-sm text-accent uppercase tracking-wide border-b border-accent/20 pb-1' : 'font-syne font-semibold text-sm text-text-secondary ml-2'}`}>Apariencia</h2>
          <div className={`overflow-hidden transition-all ${isTechTheme ? 'border border-accent/20 rounded-none bg-deep' : 'glass-card rounded-2xl'}`}>
            
            {/* Botón de Temas */}
            <button onClick={() => setIsThemesModalOpen(true)} className={`w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors border-b ${isTechTheme ? 'border-accent/15' : 'border-glass-border'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 flex items-center justify-center ${isTechTheme ? 'border border-pink-500/30 rounded-none bg-pink-500/5' : 'rounded-xl bg-pink-500/10'}`}>
                  <Palette className="w-4 h-4 text-pink-400" />
                </div>
                <div className="text-left">
                  <p className={`text-sm font-medium ${isTechTheme ? 'font-mono text-accent uppercase tracking-wider' : 'text-text-primary'}`}>{isTechTheme ? 'TEMAS' : 'Temas'}</p>
                  <p className={`text-[10px] ${isTechTheme ? 'font-mono text-accent/60' : 'text-text-muted'}`}>{isTechTheme ? 'TEMA_ACTIVO_Y_MENU_DESPLEGABLE' : 'Tema activo y menú desplegable'}</p>
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 ${isTechTheme ? 'text-accent/60' : 'text-text-muted'}`} />
            </button>

            {/* Idioma y Moneda */}
            <div className={`w-full flex items-center justify-between p-4 border-b opacity-50 cursor-not-allowed ${isTechTheme ? 'border-accent/15' : 'border-glass-border'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 flex items-center justify-center ${isTechTheme ? 'border border-green-500/20 rounded-none bg-green-500/5' : 'rounded-xl bg-green-500/10'}`}>
                  <Globe className="w-4 h-4 text-green-400" />
                </div>
                <div className="text-left">
                  <p className={`text-sm font-medium ${isTechTheme ? 'font-mono text-green-400/80 uppercase tracking-wider' : 'text-text-primary'}`}>{isTechTheme ? 'IDIOMA_Y_MONEDA' : 'Idioma y Moneda'}</p>
                  <p className={`text-[10px] ${isTechTheme ? 'font-mono text-green-400/50' : 'text-text-muted'}`}>{isTechTheme ? 'ACTUALMENTE_ES_MX_/_MXN' : 'Actualmente: es-MX / MXN'}</p>
                </div>
              </div>
              <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider ${isTechTheme ? 'font-mono border border-green-500/30 text-green-400 bg-green-500/5' : 'bg-glass-strong text-text-muted'}`}>Pronto</span>
            </div>

            {/* Tamaño de texto */}
            <div className="w-full flex items-center justify-between p-4 opacity-50 cursor-not-allowed">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 flex items-center justify-center ${isTechTheme ? 'border border-orange-500/20 rounded-none bg-orange-500/5' : 'rounded-xl bg-orange-500/10'}`}>
                  <Type className="w-4 h-4 text-orange-400" />
                </div>
                <div className="text-left">
                  <p className={`text-sm font-medium ${isTechTheme ? 'font-mono text-orange-400/80 uppercase tracking-wider' : 'text-text-primary'}`}>{isTechTheme ? 'TAMANO_DE_TEXTO' : 'Tamaño de texto'}</p>
                  <p className={`text-[10px] ${isTechTheme ? 'font-mono text-orange-400/50' : 'text-text-muted'}`}>{isTechTheme ? 'COMPACTO_/_NORMAL_/_GRANDE' : 'Tamaño: Compacto / Normal / Grande'}</p>
                </div>
              </div>
              <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider ${isTechTheme ? 'font-mono border border-orange-500/30 text-orange-400 bg-orange-500/5' : 'bg-glass-strong text-text-muted'}`}>Pronto</span>
            </div>
          </div>
        </section>

        {/* 4. Finanzas */}
        <section className="space-y-3">
          <h2 className={`${isTechTheme ? 'font-mono font-bold text-sm text-accent uppercase tracking-wide border-b border-accent/20 pb-1' : 'font-syne font-semibold text-sm text-text-secondary ml-2'}`}>Finanzas</h2>
          <div className={`overflow-hidden transition-all ${isTechTheme ? 'border border-accent/20 rounded-none bg-deep' : 'glass-card rounded-2xl'}`}>
            <div className={`w-full flex items-center justify-between p-4 border-b opacity-50 cursor-not-allowed ${isTechTheme ? 'border-accent/15' : 'border-glass-border'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 flex items-center justify-center ${isTechTheme ? 'border border-accent/20 rounded-none bg-accent/5' : 'rounded-xl bg-accent/10'}`}>
                  <Wallet className="w-4 h-4 text-accent" />
                </div>
                <div className="text-left">
                  <p className={`text-sm font-medium ${isTechTheme ? 'font-mono text-accent/80 uppercase tracking-wider' : 'text-text-primary'}`}>{isTechTheme ? 'PRESUPUESTO_MENSUAL' : 'Presupuesto mensual'}</p>
                  <p className={`text-[10px] ${isTechTheme ? 'font-mono text-accent/50' : 'text-text-muted'}`}>{isTechTheme ? 'DEFINE_UN_LIMITE_DE_GASTOS' : 'Define un límite de gastos'}</p>
                </div>
              </div>
              <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider ${isTechTheme ? 'font-mono border border-accent/30 text-accent bg-accent/5' : 'bg-glass-strong text-text-muted'}`}>Pronto</span>
            </div>
            <div className={`w-full flex items-center justify-between p-4 border-b opacity-50 cursor-not-allowed ${isTechTheme ? 'border-accent/15' : 'border-glass-border'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 flex items-center justify-center ${isTechTheme ? 'border border-blue-500/20 rounded-none bg-blue-500/5' : 'rounded-xl bg-blue-500/10'}`}>
                  <Calendar className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-left">
                  <p className={`text-sm font-medium ${isTechTheme ? 'font-mono text-blue-400/80 uppercase tracking-wider' : 'text-text-primary'}`}>{isTechTheme ? 'DIA_DE_INICIO_DE_MES' : 'Día de inicio de mes'}</p>
                  <p className={`text-[10px] ${isTechTheme ? 'font-mono text-blue-400/50' : 'text-text-muted'}`}>{isTechTheme ? 'EJ_DIA_15_O_DIA_30' : 'Ej: Día 15 o Día 30'}</p>
                </div>
              </div>
              <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider ${isTechTheme ? 'font-mono border border-blue-500/30 text-blue-400 bg-blue-500/5' : 'bg-glass-strong text-text-muted'}`}>Pronto</span>
            </div>
            <div className="w-full flex items-center justify-between p-4 opacity-50 cursor-not-allowed">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 flex items-center justify-center ${isTechTheme ? 'border border-[var(--red)]/20 rounded-none bg-[var(--red)]/5' : 'rounded-xl bg-[var(--red)]/10'}`}>
                  <FileText className="w-4 h-4 text-[var(--red)]" />
                </div>
                <div className="text-left">
                  <p className={`text-sm font-medium ${isTechTheme ? 'font-mono text-[var(--red)]/80 uppercase tracking-wider' : 'text-text-primary'}`}>{isTechTheme ? 'GASTOS_RECURRENTES' : 'Gastos recurrentes'}</p>
                  <p className={`text-[10px] ${isTechTheme ? 'font-mono text-[var(--red)]/50' : 'text-text-muted'}`}>{isTechTheme ? 'NETFLIX_INTERNET_ETC' : 'Netflix, Internet, etc.'}</p>
                </div>
              </div>
              <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider ${isTechTheme ? 'font-mono border border-[var(--red)]/30 text-[var(--red)] bg-[var(--red)]/5' : 'bg-glass-strong text-text-muted'}`}>Pronto</span>
            </div>
          </div>
        </section>

        {/* 5. Notificaciones */}
        <section className="space-y-3">
          <h2 className={`${isTechTheme ? 'font-mono font-bold text-sm text-accent uppercase tracking-wide border-b border-accent/20 pb-1' : 'font-syne font-semibold text-sm text-text-secondary ml-2'}`}>Notificaciones</h2>
          <div className={`p-4 opacity-50 cursor-not-allowed flex items-center justify-between ${isTechTheme ? 'border border-accent/20 rounded-none bg-deep' : 'glass-card rounded-2xl'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 flex items-center justify-center ${isTechTheme ? 'border border-orange-500/20 rounded-none bg-orange-500/5' : 'rounded-xl bg-orange-500/10'}`}>
                <Bell className="w-4 h-4 text-orange-400" />
              </div>
              <div className="text-left">
                <p className={`text-sm font-medium ${isTechTheme ? 'font-mono text-orange-400/80 uppercase tracking-wider' : 'text-text-primary'}`}>{isTechTheme ? 'ALERTAS_Y_RECORDATORIOS' : 'Alertas y Recordatorios'}</p>
                <p className={`text-[10px] ${isTechTheme ? 'font-mono text-orange-400/50' : 'text-text-muted'}`}>{isTechTheme ? 'GASTO_EXCESIVO_Y_RECORDATORIO_DIARIO' : 'Gasto excesivo y recordatorio diario'}</p>
              </div>
            </div>
            <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider ${isTechTheme ? 'font-mono border border-orange-500/30 text-orange-400 bg-orange-500/5' : 'bg-glass-strong text-text-muted'}`}>Pronto</span>
          </div>
        </section>

        {/* 6. Datos y Privacidad */}
        <section className="space-y-3">
          <h2 className={`${isTechTheme ? 'font-mono font-bold text-sm text-red-400 uppercase tracking-wide border-b border-red-500/20 pb-1' : 'font-syne font-semibold text-sm text-red-400 ml-2'}`}>Datos y Privacidad</h2>
          <div className={`overflow-hidden transition-all ${isTechTheme ? 'border border-red-500/20 rounded-none bg-deep' : 'glass-card border-red-500/20 rounded-2xl'}`}>
            <div className={`w-full flex items-center justify-between p-4 border-b opacity-50 cursor-not-allowed ${isTechTheme ? 'border-accent/15' : 'border-glass-border'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 flex items-center justify-center ${isTechTheme ? 'border border-blue-500/20 rounded-none bg-blue-500/5' : 'rounded-xl bg-blue-500/10'}`}>
                  <Download className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-left">
                  <p className={`text-sm font-medium ${isTechTheme ? 'font-mono text-blue-400/80 uppercase tracking-wider' : 'text-text-primary'}`}>{isTechTheme ? 'EXPORTAR_MIS_DATOS' : 'Exportar mis datos'}</p>
                  <p className={`text-[10px] ${isTechTheme ? 'font-mono text-blue-400/50' : 'text-text-muted'}`}>{isTechTheme ? 'DESCARGAR_CSV_O_JSON' : 'Descargar CSV o JSON'}</p>
                </div>
              </div>
              <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider ${isTechTheme ? 'font-mono border border-blue-500/30 text-blue-400 bg-blue-500/5' : 'bg-glass-strong text-text-muted'}`}>Pronto</span>
            </div>
            <div className={`w-full flex items-center justify-between p-4 border-b opacity-50 cursor-not-allowed ${isTechTheme ? 'border-accent/15' : 'border-glass-border'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 flex items-center justify-center ${isTechTheme ? 'border border-orange-500/20 rounded-none bg-orange-500/5' : 'rounded-xl bg-orange-500/10'}`}>
                  <Trash2 className="w-4 h-4 text-orange-400" />
                </div>
                <div className="text-left">
                  <p className={`text-sm font-medium ${isTechTheme ? 'font-mono text-orange-400/80 uppercase tracking-wider' : 'text-text-primary'}`}>{isTechTheme ? 'ELIMINAR_TODOS_LOS_DATOS' : 'Eliminar todos los datos'}</p>
                  <p className={`text-[10px] ${isTechTheme ? 'font-mono text-orange-400/50' : 'text-text-muted'}`}>{isTechTheme ? 'BORRAR_TRANSACCIONES_PERO_MANTENER_CUENTA' : 'Borrar transacciones pero mantener cuenta'}</p>
                </div>
              </div>
              <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider ${isTechTheme ? 'font-mono border border-orange-500/30 text-orange-400 bg-orange-500/5' : 'bg-glass-strong text-text-muted'}`}>Pronto</span>
            </div>
            <div className="w-full flex items-center justify-between p-4 opacity-50 cursor-not-allowed">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 flex items-center justify-center ${isTechTheme ? 'border border-red-500/30 rounded-none bg-red-500/5' : 'rounded-xl bg-red-500/10'}`}>
                  <Lock className="w-4 h-4 text-red-500" />
                </div>
                <div className="text-left">
                  <p className={`text-sm font-medium ${isTechTheme ? 'font-mono text-red-400 uppercase tracking-wider' : 'text-red-400'}`}>{isTechTheme ? 'ELIMINAR_CUENTA' : 'Eliminar cuenta'}</p>
                  <p className={`text-[10px] ${isTechTheme ? 'font-mono text-red-400/60' : 'text-red-400/70'}`}>{isTechTheme ? 'ACCION_IRREVERSIBLE' : 'Acción irreversible'}</p>
                </div>
              </div>
              <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider ${isTechTheme ? 'font-mono border border-red-500/30 text-red-400 bg-red-500/5' : 'bg-red-500/20 text-red-400'}`}>Pronto</span>
            </div>
          </div>
        </section>

      </main>
      
      <BottomNav />

      {isProfileModalOpen && (
        <ProfileModal onClose={() => setIsProfileModalOpen(false)} />
      )}
      {isCategoriesModalOpen && (
        <ManageCategoriesModal onClose={() => setIsCategoriesModalOpen(false)} />
      )}
      {isUsersModalOpen && (
        <ManageUsersModal onClose={() => setIsUsersModalOpen(false)} currentUserEmail={user?.email || undefined} />
      )}
      {isThemesModalOpen && (
        <ManageThemesModal onClose={() => setIsThemesModalOpen(false)} />
      )}
    </div>
  );
}
