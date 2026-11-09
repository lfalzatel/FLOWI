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
import { ManageBudgetModal } from '@/components/forms/ManageBudgetModal';
import { ManageSoundModal, SoundActionType } from '@/components/forms/ManageSoundModal';
import { AiAssistantSettings } from '@/components/settings/AiAssistantSettings';
import { SupportProject } from '@/components/settings/SupportProject';
import { AppLockSettings } from '@/components/settings/AppLockSettings';
import { removePushToken, syncPushToken } from '@/lib/push';
import { requestNotificationPermission } from '@/lib/notifications';
import { askForNotifications, CHANGED_EVENT, notificationsState } from '@/lib/notifPrompt';
import { MyDataRows } from '@/components/settings/MyDataRows';
import { PlanCard } from '@/components/plans/PlanCard';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { CURRENCIES } from '@/lib/format';
import { 
  ArrowLeft, Sun, Moon, Terminal, Layers, Zap, Palette,
  User, Wallet, Bell, Shield, ShieldCheck, RefreshCw, Sparkles,
  ChevronRight, ChevronDown, ChevronUp, Lock, Key, Globe, Type, 
  Calendar, PieChart, Download, Trash2, 
  FileText, Settings, Volume2, Smartphone, MessageSquare, Music, Compass
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
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [soundModalAction, setSoundModalAction] = useState<SoundActionType | null>(null);
  const [restoring, setRestoring] = useState(false);

  const [openSections, setOpenSections] = useState({
    cuenta: false,
    notificaciones: false,
    sonidos: false,
    gestion: false,
    apariencia: false,
    finanzas: false,
    privacidad: false,
    ia: false,
    apoyar: false,
    seguridad: false
  });

  // Desde el menú de perfil ("Apoyar a FLOWI") se llega con #apoyar: abrir esa sección
  useEffect(() => {
    if (window.location.hash === '#apoyar') {
      setOpenSections(prev => ({ ...prev, apoyar: true }));
      setTimeout(() => document.getElementById('apoyar')?.scrollIntoView({ behavior: 'smooth' }), 300);
    }
  }, []);

  const [openSoundSubSections, setOpenSoundSubSections] = useState({
    acciones: true,
    navegacion: false,
    animaciones: false
  });

  const toggleSoundSubSection = (key: keyof typeof openSoundSubSections) => {
    setOpenSoundSubSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => {
      // If the section is already open, close it
      if (prev[section]) {
        return { ...prev, [section]: false };
      }
      
      // Otherwise, open it and close all others
      const closed = Object.keys(prev).reduce((acc, key) => {
        acc[key as keyof typeof openSections] = false;
        return acc;
      }, {} as typeof openSections);
      
      return { ...closed, [section]: true };
    });
  };

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

  // Sonidos por acción
  const [soundIngreso, setSoundIngreso] = useState('synth');
  const [soundGasto, setSoundGasto] = useState('synth');
  const [soundEdicion, setSoundEdicion] = useState('synth');
  const [soundEliminacion, setSoundEliminacion] = useState('synth');
  const [soundUINav, setSoundUINav] = useState('pop');
  const [soundParticles, setSoundParticles] = useState('crystal');
  const [animCardEnabled, setAnimCardEnabled] = useState(true);
  const [animConfettiEnabled, setAnimConfettiEnabled] = useState(true);
  const [animBurstEnabled, setAnimBurstEnabled] = useState(true);
  const [soundSpeechEnabled, setSoundSpeechEnabled] = useState(true);

  // Load from local storage
  useEffect(() => {
    setNotificationsEnabled(notificationsState() === 'enabled');
    setPushEnabled(localStorage.getItem('push_enabled') !== 'false');
    setInAppEnabled(localStorage.getItem('in_app_enabled') !== 'false');
    setSoundEnabled(localStorage.getItem('sound_enabled') !== 'false');
    setNotificationSound(localStorage.getItem('notification_sound') || 'notification.mp3');

    setSoundIngreso(localStorage.getItem('sound_ingreso') || 'synth');
    setSoundGasto(localStorage.getItem('sound_gasto') || 'synth');
    setSoundEdicion(localStorage.getItem('sound_edicion') || 'synth');
    setSoundEliminacion(localStorage.getItem('sound_eliminacion') || 'synth');
    setSoundUINav(localStorage.getItem('sound_ui_nav') || 'pop');
    setSoundParticles(localStorage.getItem('sound_particles') || 'crystal');
    setAnimCardEnabled(localStorage.getItem('anim_card_enabled') !== 'false');
    setAnimConfettiEnabled(localStorage.getItem('anim_confetti_enabled') !== 'false');
    setAnimBurstEnabled(localStorage.getItem('anim_burst_enabled') !== 'false');
    setSoundSpeechEnabled(localStorage.getItem('sound_speech_enabled') !== 'false');
  }, []);

  // General: igual que en el menú de perfil (pide el permiso si hace falta y registra o quita este celular)
  const toggleNotifications = async () => {
    if (!notificationsEnabled) {
      const state = notificationsState();
      if (state === 'blocked' || state === 'ios-needs-install' || state === 'unsupported') { askForNotifications({ force: true }); return; }
      const granted = await requestNotificationPermission();
      if (!granted) { askForNotifications({ force: true }); return; }
      localStorage.setItem('notifications_enabled', 'true');
      setNotificationsEnabled(true);
      if (user) syncPushToken(user.uid);
    } else {
      localStorage.setItem('notifications_enabled', 'false');
      setNotificationsEnabled(false);
      if (user) removePushToken(user.uid);
    }
    window.dispatchEvent(new CustomEvent(CHANGED_EVENT, { detail: { enabled: !notificationsEnabled } }));
  };

  // Push: si se apaga, este celular deja de recibir notificaciones (con la app abierta o cerrada)
  const togglePush = () => {
    const newState = !pushEnabled;
    setPushEnabled(newState);
    localStorage.setItem('push_enabled', String(newState));
    if (!user) return;
    if (newState) syncPushToken(user.uid);
    else removePushToken(user.uid);
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
    
    // Play a preview of the sound with instant cancellation of previous sounds
    if (notificationsEnabled) {
      import('@/lib/audioPlayer').then(({ playSoundPreview }) => {
        playSoundPreview(sound);
      });
    }
  };

  const handleActionSoundChange = (actionType: 'ingreso' | 'gasto' | 'edicion' | 'eliminacion', value: string) => {
    if (actionType === 'ingreso') {
      setSoundIngreso(value);
      localStorage.setItem('sound_ingreso', value);
    } else if (actionType === 'gasto') {
      setSoundGasto(value);
      localStorage.setItem('sound_gasto', value);
    } else if (actionType === 'edicion') {
      setSoundEdicion(value);
      localStorage.setItem('sound_edicion', value);
    } else if (actionType === 'eliminacion') {
      setSoundEliminacion(value);
      localStorage.setItem('sound_eliminacion', value);
    }

    // Disparar prueba de sonido inmediata
    import('@/components/dashboard/PowerAnimation').then(({ playSynthesizedSound }) => {
      playSynthesizedSound(actionType, value);
    });
  };

  const handleUINavSoundChange = (value: string) => {
    setSoundUINav(value);
    localStorage.setItem('sound_ui_nav', value);

    import('@/components/dashboard/PowerAnimation').then(({ playUISound }) => {
      playUISound(value);
    });
  };

  const handleParticlesSoundChange = (value: string) => {
    setSoundParticles(value);
    localStorage.setItem('sound_particles', value);

    if (soundEnabled && value !== 'silent') {
      import('@/components/dashboard/DualTrajectoryBurst').then(({ triggerDualBurst }) => {
        triggerDualBurst({ type: 'ingreso' });
      });
    }
  };

  const toggleAnimCard = () => {
    const newState = !animCardEnabled;
    setAnimCardEnabled(newState);
    localStorage.setItem('anim_card_enabled', String(newState));
  };

  const toggleAnimConfetti = () => {
    const newState = !animConfettiEnabled;
    setAnimConfettiEnabled(newState);
    localStorage.setItem('anim_confetti_enabled', String(newState));
  };

  const toggleAnimBurst = () => {
    const newState = !animBurstEnabled;
    setAnimBurstEnabled(newState);
    localStorage.setItem('anim_burst_enabled', String(newState));
  };

  const toggleSoundSpeech = () => {
    const newState = !soundSpeechEnabled;
    setSoundSpeechEnabled(newState);
    localStorage.setItem('sound_speech_enabled', String(newState));
  };

  const getSoundName = (val: string) => {
    const dict: Record<string, string> = {
      'mario_1up': '🍄 Mario Bros 1-UP',
      'mario_coin': '🪙 Mario Bros Coin',
      'mario_jump': '🍄 Mario Bros Jump',
      'mario_pipe': '🍄 Mario Bros Pipe',
      'synth': '🎵 Arpegio / Acorde Sintetizado',
      'bass': '🔊 Bajo Ciberpunk',
      'bell': '🔔 Campanada Clásica',
      'soft': '🔔 Campanada Suave',
      'rover': '🚀 Rover Landing',
      'pop': '🍿 Pop / Burbuja (Estilo iOS)',
      'click': '⚡ Click Digital',
      'chime': '🎵 Campana Armónica',
      'haptic': '📳 Toque Háptico',
      'arcade': '✨ Chime Brillos',
      'crystal': '🔮 Cristalino Pentatónico',
      'marimba': '🪵 Marimba Acústica',
      'synth_laser': '⚡ Neón Ciberpunk',
      'synth_dissolve': '🌌 Disolución Armónica',
      'boomstick': '💣 Boomstick Ciberpunk',
      'notification.mp3': '🫧 Suave (Burbuja)',
      'notification-sound.mp3': '🔔 Clásico (Campana)',
      'silent': '🔇 Silencioso'
    };
    return dict[val] || val;
  };

  const handleSelectSound = (action: SoundActionType, val: string) => {
    if (action === 'ingreso') {
      setSoundIngreso(val);
      localStorage.setItem('sound_ingreso', val);
    } else if (action === 'gasto') {
      setSoundGasto(val);
      localStorage.setItem('sound_gasto', val);
    } else if (action === 'edicion') {
      setSoundEdicion(val);
      localStorage.setItem('sound_edicion', val);
    } else if (action === 'eliminacion') {
      setSoundEliminacion(val);
      localStorage.setItem('sound_eliminacion', val);
    } else if (action === 'ui_nav') {
      setSoundUINav(val);
      localStorage.setItem('sound_ui_nav', val);
    } else if (action === 'particles') {
      setSoundParticles(val);
      localStorage.setItem('sound_particles', val);
    } else if (action === 'notification') {
      setNotificationSound(val);
      localStorage.setItem('notification_sound', val);
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
    <div className="relative min-h-screen flex flex-col bg-deep">
      <Header />
      <main className="relative flex-1 max-w-2xl lg:max-w-6xl mx-auto w-full space-y-6 animate-fade-in-up p-4 pb-24">
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

        {/* Tu plan (Gratis / Premium) con acceso a Planes */}
        <PlanCard isTechTheme={isTechTheme} />

        {/* En PC, las secciones en dos columnas; en el celular, una sola en el mismo orden */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="min-w-0 space-y-6">
        {/* 1. Cuenta y Perfil */}
        <section className="space-y-3">
          <button 
            onClick={() => toggleSection('cuenta')}
            className={`w-full flex items-center justify-between ${isTechTheme ? 'border-b border-accent/20 pb-1' : 'ml-2 pr-2'}`}
          >
            <h2 className={`${isTechTheme ? 'font-mono font-bold text-sm text-accent uppercase tracking-wide' : 'font-syne font-semibold text-sm text-text-secondary'}`}>Cuenta y Perfil</h2>
            {openSections.cuenta ? <ChevronUp className={`w-4 h-4 ${isTechTheme ? 'text-accent' : 'text-text-muted'}`} /> : <ChevronDown className={`w-4 h-4 ${isTechTheme ? 'text-accent' : 'text-text-muted'}`} />}
          </button>
          
          {openSections.cuenta && (
            <div className={`overflow-hidden transition-all ${isTechTheme ? 'border border-accent/20 rounded-none bg-deep animate-fade-in' : 'glass-card rounded-2xl animate-fade-in'}`}>
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

            <a href="/?tour=1" className={`w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors border-b ${isTechTheme ? 'border-accent/15' : 'border-glass-border'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 flex items-center justify-center ${isTechTheme ? 'border border-accent/30 rounded-none bg-accent/5' : 'rounded-xl bg-accent/10'}`}>
                  <Compass className="w-4 h-4 text-accent" />
                </div>
                <div className="text-left">
                  <p className={`text-sm font-medium ${isTechTheme ? 'font-mono text-accent uppercase tracking-wider' : 'text-text-primary'}`}>{isTechTheme ? 'VER_TUTORIAL' : 'Ver tutorial 🔊'}</p>
                  <p className={`text-[10px] ${isTechTheme ? 'font-mono text-accent/60' : 'text-text-muted'}`}>{isTechTheme ? 'REGISTRAR_Y_LEER_TU_INICIO' : 'Cómo registrar y leer tu inicio, con voz opcional'}</p>
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 ${isTechTheme ? 'text-accent/60' : 'text-text-muted'}`} />
            </a>

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
          )}
        </section>

        {/* 1.5 Notificaciones (Simplificada) */}
        <section className="space-y-3">
          <button 
            onClick={() => toggleSection('notificaciones')}
            className={`w-full flex items-center justify-between ${isTechTheme ? 'border-b border-accent/20 pb-1' : 'ml-2 pr-2'}`}
          >
            <h2 className={`${isTechTheme ? 'font-mono font-bold text-sm text-accent uppercase tracking-wide' : 'font-syne font-semibold text-sm text-text-secondary'}`}>Notificaciones</h2>
            {openSections.notificaciones ? <ChevronUp className={`w-4 h-4 ${isTechTheme ? 'text-accent' : 'text-text-muted'}`} /> : <ChevronDown className={`w-4 h-4 ${isTechTheme ? 'text-accent' : 'text-text-muted'}`} />}
          </button>

          {openSections.notificaciones && (
            <div className={`overflow-hidden transition-all ${isTechTheme ? 'border border-accent/20 rounded-none bg-deep animate-fade-in' : 'glass-card rounded-2xl animate-fade-in'}`}>
            {/* Activar Notificaciones (Master) */}
            <div className={`w-full flex items-center justify-between p-4 border-b ${isTechTheme ? 'border-accent/15' : 'border-glass-border'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 flex items-center justify-center ${isTechTheme ? 'border border-[var(--yellow)]/30 rounded-none bg-[var(--yellow)]/5' : 'rounded-xl bg-[var(--yellow)]/10'}`}>
                  <Bell className="w-4 h-4 text-[var(--yellow)]" />
                </div>
                <div className="text-left">
                  <p className={`text-sm font-medium ${isTechTheme ? 'font-mono text-accent uppercase tracking-wider' : 'text-text-primary'}`}>{isTechTheme ? 'ACTIVAR_NOTIFICACIONES' : 'Activar Notificaciones'}</p>
                  <p className={`text-[10px] ${isTechTheme ? 'font-mono text-accent/60' : 'text-text-muted'}`}>{isTechTheme ? 'TODOS_LOS_AVISOS_EN_ESTE_CELULAR' : 'Todos los avisos en este celular'}</p>
                </div>
              </div>
              <button 
                onClick={toggleNotifications}
                className={`w-12 h-6 rounded-full transition-colors relative ${notificationsEnabled ? (isTechTheme ? 'bg-accent border border-accent' : 'bg-[var(--yellow)]') : (isTechTheme ? 'bg-black/50 border border-accent/20' : 'bg-gray-600')}`}
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
                  <p className={`text-[10px] ${isTechTheme ? 'font-mono text-accent/60' : 'text-text-muted'}`}>{isTechTheme ? 'EN_LA_BARRA_AUN_CON_LA_APP_CERRADA' : 'En la barra del celular, aun con FLOWI cerrada'}</p>
                </div>
              </div>
              <button 
                onClick={togglePush}
                disabled={!notificationsEnabled}
                className={`w-12 h-6 rounded-full transition-colors relative ${pushEnabled ? (isTechTheme ? 'bg-accent border border-accent' : 'bg-[var(--yellow)]') : (isTechTheme ? 'bg-black/50 border border-accent/20' : 'bg-gray-600')}`}
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
                  <p className={`text-[10px] ${isTechTheme ? 'font-mono text-accent/60' : 'text-text-muted'}`}>{isTechTheme ? 'MENSAJE_Y_CAMPANA_CON_LA_APP_ABIERTA' : 'Mensaje y campana con FLOWI abierta'}</p>
                </div>
              </div>
              <button 
                onClick={toggleInApp}
                disabled={!notificationsEnabled}
                className={`w-12 h-6 rounded-full transition-colors relative ${inAppEnabled ? (isTechTheme ? 'bg-accent border border-accent' : 'bg-[var(--yellow)]') : (isTechTheme ? 'bg-black/50 border border-accent/20' : 'bg-gray-600')}`}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-transform ${inAppEnabled ? 'translate-x-6 bg-white' : 'translate-x-0 bg-gray-300'}`} />
              </button>
            </div>

            {/* Tono de Alerta de Notificación (Abre Modal) */}
            <button 
              onClick={() => setSoundModalAction('notification')}
              disabled={!notificationsEnabled}
              className={`w-full flex items-center justify-between p-4 transition-colors ${!notificationsEnabled ? 'opacity-50 pointer-events-none' : 'hover:bg-white/[0.02]'}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 flex items-center justify-center ${isTechTheme ? 'border border-[var(--yellow)]/30 rounded-none bg-[var(--yellow)]/5' : 'rounded-xl bg-[var(--yellow)]/10'}`}>
                  <Music className="w-4 h-4 text-[var(--yellow)]" />
                </div>
                <div className="text-left">
                  <p className={`text-sm font-medium ${isTechTheme ? 'font-mono text-accent uppercase tracking-wider' : 'text-text-primary'}`}>{isTechTheme ? 'TONO_DE_ALERTA' : 'Tono de Alerta'}</p>
                  <p className={`text-[10px] ${isTechTheme ? 'font-mono text-accent/60' : 'text-text-muted'}`}>{getSoundName(notificationSound)}</p>
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 ${isTechTheme ? 'text-accent/60' : 'text-text-muted'}`} />
            </button>
            </div>
          )}
        </section>

        <AppLockSettings isTechTheme={isTechTheme} open={openSections.seguridad} onToggle={() => toggleSection('seguridad')} />

        {/* 1.8 SECCIÓN DEDICADA: Sonidos y Animaciones (Organizada en Acordeones) */}
        <section className="space-y-3">
          <button 
            onClick={() => toggleSection('sonidos')}
            className={`w-full flex items-center justify-between ${isTechTheme ? 'border-b border-accent/20 pb-1' : 'ml-2 pr-2'}`}
          >
            <h2 className={`${isTechTheme ? 'font-mono font-bold text-sm text-accent uppercase tracking-wide' : 'font-syne font-semibold text-sm text-text-secondary'}`}>Sonidos y Animaciones</h2>
            {openSections.sonidos ? <ChevronUp className={`w-4 h-4 ${isTechTheme ? 'text-accent' : 'text-text-muted'}`} /> : <ChevronDown className={`w-4 h-4 ${isTechTheme ? 'text-accent' : 'text-text-muted'}`} />}
          </button>

          {openSections.sonidos && (
            <div className="space-y-3 animate-fade-in">
              {/* ACORDEÓN 1: Sonidos por Acción */}
              <div className={`overflow-hidden border transition-all ${
                isTechTheme ? 'border-accent/20 rounded-none bg-deep' : 'glass-card rounded-2xl'
              }`}>
                <button 
                  onClick={() => toggleSoundSubSection('acciones')}
                  className={`w-full flex items-center justify-between p-4 text-left transition-colors ${
                    openSoundSubSections.acciones ? 'bg-white/5 border-b border-white/10' : 'hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 flex items-center justify-center ${isTechTheme ? 'border border-emerald-500/30 rounded-none bg-emerald-500/5' : 'rounded-xl bg-emerald-500/10'}`}>
                      <Music className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${isTechTheme ? 'font-mono text-accent uppercase' : 'font-syne text-text-primary'}`}>Sonidos por Acción</p>
                      <p className={`text-[10px] ${isTechTheme ? 'font-mono text-accent/60' : 'text-text-muted'}`}>Ingresos, Gastos, Ediciones y Eliminaciones</p>
                    </div>
                  </div>
                  {openSoundSubSections.acciones ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
                </button>

                {openSoundSubSections.acciones && (
                  <div className="divide-y divide-white/5 bg-black/20">
                    <button 
                      onClick={() => setSoundModalAction('ingreso')}
                      className="w-full flex items-center justify-between p-3.5 sm:px-5 hover:bg-white/5 transition-colors text-left"
                    >
                      <div>
                        <p className={`text-xs font-bold ${isTechTheme ? 'font-mono text-emerald-400 uppercase' : 'text-emerald-400'}`}>Ingresos y Abonos</p>
                        <p className="text-[11px] text-text-muted mt-0.5">{getSoundName(soundIngreso)}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-text-muted" />
                    </button>

                    <button 
                      onClick={() => setSoundModalAction('gasto')}
                      className="w-full flex items-center justify-between p-3.5 sm:px-5 hover:bg-white/5 transition-colors text-left"
                    >
                      <div>
                        <p className={`text-xs font-bold ${isTechTheme ? 'font-mono text-rose-400 uppercase' : 'text-rose-400'}`}>Gastos</p>
                        <p className="text-[11px] text-text-muted mt-0.5">{getSoundName(soundGasto)}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-text-muted" />
                    </button>

                    <button 
                      onClick={() => setSoundModalAction('edicion')}
                      className="w-full flex items-center justify-between p-3.5 sm:px-5 hover:bg-white/5 transition-colors text-left"
                    >
                      <div>
                        <p className={`text-xs font-bold ${isTechTheme ? 'font-mono text-purple-400 uppercase' : 'text-purple-400'}`}>Ediciones</p>
                        <p className="text-[11px] text-text-muted mt-0.5">{getSoundName(soundEdicion)}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-text-muted" />
                    </button>

                    <button 
                      onClick={() => setSoundModalAction('eliminacion')}
                      className="w-full flex items-center justify-between p-3.5 sm:px-5 hover:bg-white/5 transition-colors text-left"
                    >
                      <div>
                        <p className={`text-xs font-bold ${isTechTheme ? 'font-mono text-red-400 uppercase' : 'text-red-400'}`}>Eliminaciones</p>
                        <p className="text-[11px] text-text-muted mt-0.5">{getSoundName(soundEliminacion)}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-text-muted" />
                    </button>
                  </div>
                )}
              </div>

              {/* ACORDEÓN 2: Navegación y Efectos Auditivos */}
              <div className={`overflow-hidden border transition-all ${
                isTechTheme ? 'border-accent/20 rounded-none bg-deep' : 'glass-card rounded-2xl'
              }`}>
                <button 
                  onClick={() => toggleSoundSubSection('navegacion')}
                  className={`w-full flex items-center justify-between p-4 text-left transition-colors ${
                    openSoundSubSections.navegacion ? 'bg-white/5 border-b border-white/10' : 'hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 flex items-center justify-center ${isTechTheme ? 'border border-cyan-500/30 rounded-none bg-cyan-500/5' : 'rounded-xl bg-cyan-500/10'}`}>
                      <Volume2 className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${isTechTheme ? 'font-mono text-accent uppercase' : 'font-syne text-text-primary'}`}>Navegación y Efectos</p>
                      <p className={`text-[10px] ${isTechTheme ? 'font-mono text-accent/60' : 'text-text-muted'}`}>Menú inferior y partículas voladoras</p>
                    </div>
                  </div>
                  {openSoundSubSections.navegacion ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
                </button>

                {openSoundSubSections.navegacion && (
                  <div className="divide-y divide-white/5 bg-black/20">
                    <button 
                      onClick={() => setSoundModalAction('ui_nav')}
                      className="w-full flex items-center justify-between p-3.5 sm:px-5 hover:bg-white/5 transition-colors text-left"
                    >
                      <div>
                        <p className={`text-xs font-bold ${isTechTheme ? 'font-mono text-cyan-400 uppercase' : 'text-cyan-400'}`}>Menú Inferior & Navegación (PAE)</p>
                        <p className="text-[11px] text-text-muted mt-0.5">{getSoundName(soundUINav)}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-text-muted" />
                    </button>

                    <button 
                      onClick={() => setSoundModalAction('particles')}
                      className="w-full flex items-center justify-between p-3.5 sm:px-5 hover:bg-white/5 transition-colors text-left"
                    >
                      <div>
                        <p className={`text-xs font-bold ${isTechTheme ? 'font-mono text-purple-400 uppercase' : 'text-purple-400'}`}>Partículas Voladoras</p>
                        <p className="text-[11px] text-text-muted mt-0.5">{getSoundName(soundParticles)}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-text-muted" />
                    </button>
                  </div>
                )}
              </div>

              {/* ACORDEÓN 3: Animaciones Visuales y Voz */}
              <div className={`overflow-hidden border transition-all ${
                isTechTheme ? 'border-accent/20 rounded-none bg-deep' : 'glass-card rounded-2xl'
              }`}>
                <button 
                  onClick={() => toggleSoundSubSection('animaciones')}
                  className={`w-full flex items-center justify-between p-4 text-left transition-colors ${
                    openSoundSubSections.animaciones ? 'bg-white/5 border-b border-white/10' : 'hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 flex items-center justify-center ${isTechTheme ? 'border border-amber-500/30 rounded-none bg-amber-500/5' : 'rounded-xl bg-amber-500/10'}`}>
                      <Sparkles className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${isTechTheme ? 'font-mono text-accent uppercase' : 'font-syne text-text-primary'}`}>Animaciones Visuales y Voz</p>
                      <p className={`text-[10px] ${isTechTheme ? 'font-mono text-accent/60' : 'text-text-muted'}`}>Tarjeta 3D, confeti, explosiones y asistente</p>
                    </div>
                  </div>
                  {openSoundSubSections.animaciones ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
                </button>

                {openSoundSubSections.animaciones && (
                  <div className="p-4 space-y-3 bg-black/20 border-t border-white/5">
                    {/* Toggle Tarjeta 3D Central */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                      <div className="text-left pr-2">
                        <p className={`text-xs font-bold ${isTechTheme ? 'font-mono text-accent uppercase' : 'text-text-primary'}`}>Tarjeta 3D Central (Power Card)</p>
                        <p className="text-[10px] text-text-muted">Efecto 3D holográfico en la tarjeta principal</p>
                      </div>
                      <button 
                        onClick={toggleAnimCard}
                        className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${animCardEnabled ? (isTechTheme ? 'bg-accent border border-accent' : 'bg-accent') : 'bg-gray-600'}`}
                      >
                        <div className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-transform ${animCardEnabled ? 'translate-x-5 bg-black' : 'translate-x-0 bg-gray-300'}`} />
                      </button>
                    </div>

                    {/* Toggle Celebración y Confeti 🎉 */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                      <div className="text-left pr-2">
                        <p className={`text-xs font-bold ${isTechTheme ? 'font-mono text-purple-400 uppercase' : 'text-purple-400'}`}>Celebración y Confeti 🎉</p>
                        <p className="text-[10px] text-text-muted">Lluvia de confeti al guardar registros</p>
                      </div>
                      <button 
                        onClick={toggleAnimConfetti}
                        className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${animConfettiEnabled ? (isTechTheme ? 'bg-purple-400 border border-purple-400' : 'bg-purple-500') : 'bg-gray-600'}`}
                      >
                        <div className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-transform ${animConfettiEnabled ? 'translate-x-5 bg-black' : 'translate-x-0 bg-gray-300'}`} />
                      </button>
                    </div>

                    {/* Toggle Explosión de Partículas ✨ */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                      <div className="text-left pr-2">
                        <p className={`text-xs font-bold ${isTechTheme ? 'font-mono text-cyan-400 uppercase' : 'text-cyan-400'}`}>Explosión de Partículas ✨</p>
                        <p className="text-[10px] text-text-muted">Trayectoria voladora hacia el menú y saldo</p>
                      </div>
                      <button 
                        onClick={toggleAnimBurst}
                        className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${animBurstEnabled ? (isTechTheme ? 'bg-cyan-400 border border-cyan-400' : 'bg-cyan-500') : 'bg-gray-600'}`}
                      >
                        <div className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-transform ${animBurstEnabled ? 'translate-x-5 bg-black' : 'translate-x-0 bg-gray-300'}`} />
                      </button>
                    </div>

                    {/* Toggle Voz Hablada de Confirmación 🔊 */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                      <div className="text-left pr-2">
                        <p className={`text-xs font-bold ${isTechTheme ? 'font-mono text-emerald-400 uppercase' : 'text-emerald-400'}`}>Voz Hablada de Confirmación 🔊</p>
                        <p className="text-[10px] text-text-muted">Respuesta por voz al procesar comandos</p>
                      </div>
                      <button 
                        onClick={toggleSoundSpeech}
                        className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${soundSpeechEnabled ? (isTechTheme ? 'bg-emerald-400 border border-emerald-400' : 'bg-emerald-500') : 'bg-gray-600'}`}
                      >
                        <div className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-transform ${soundSpeechEnabled ? 'translate-x-5 bg-black' : 'translate-x-0 bg-gray-300'}`} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* 2. Gestión */}
        <section className="space-y-3">
          <button 
            onClick={() => toggleSection('gestion')}
            className={`w-full flex items-center justify-between ${isTechTheme ? 'border-b border-accent/20 pb-1' : 'ml-2 pr-2'}`}
          >
            <h2 className={`${isTechTheme ? 'font-mono font-bold text-sm text-accent uppercase tracking-wide' : 'font-syne font-semibold text-sm text-text-secondary'}`}>Gestión</h2>
            {openSections.gestion ? <ChevronUp className={`w-4 h-4 ${isTechTheme ? 'text-accent' : 'text-text-muted'}`} /> : <ChevronDown className={`w-4 h-4 ${isTechTheme ? 'text-accent' : 'text-text-muted'}`} />}
          </button>

          {openSections.gestion && (
            <div className={`overflow-hidden transition-all ${isTechTheme ? 'border border-accent/20 rounded-none bg-deep animate-fade-in' : 'glass-card rounded-2xl animate-fade-in'}`}>
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
          )}
        </section>

        </div>
        <div className="min-w-0 space-y-6">
        {/* 3. Apariencia */}
        <section className="space-y-3">
          <button 
            onClick={() => toggleSection('apariencia')}
            className={`w-full flex items-center justify-between ${isTechTheme ? 'border-b border-accent/20 pb-1' : 'ml-2 pr-2'}`}
          >
            <h2 className={`${isTechTheme ? 'font-mono font-bold text-sm text-accent uppercase tracking-wide' : 'font-syne font-semibold text-sm text-text-secondary'}`}>Apariencia</h2>
            {openSections.apariencia ? <ChevronUp className={`w-4 h-4 ${isTechTheme ? 'text-accent' : 'text-text-muted'}`} /> : <ChevronDown className={`w-4 h-4 ${isTechTheme ? 'text-accent' : 'text-text-muted'}`} />}
          </button>

          {openSections.apariencia && (
            <div className={`overflow-hidden transition-all ${isTechTheme ? 'border border-accent/20 rounded-none bg-deep animate-fade-in' : 'glass-card rounded-2xl animate-fade-in'}`}>
            
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
          )}
        </section>

        <AiAssistantSettings isTechTheme={isTechTheme} open={openSections.ia} onToggle={() => toggleSection('ia')} />

        <SupportProject isTechTheme={isTechTheme} open={openSections.apoyar} onToggle={() => toggleSection('apoyar')} />

        {/* 4. Finanzas */}
        <section className="space-y-3">
          <button 
            onClick={() => toggleSection('finanzas')}
            className={`w-full flex items-center justify-between ${isTechTheme ? 'border-b border-accent/20 pb-1' : 'ml-2 pr-2'}`}
          >
            <h2 className={`${isTechTheme ? 'font-mono font-bold text-sm text-accent uppercase tracking-wide' : 'font-syne font-semibold text-sm text-text-secondary'}`}>Finanzas</h2>
            {openSections.finanzas ? <ChevronUp className={`w-4 h-4 ${isTechTheme ? 'text-accent' : 'text-text-muted'}`} /> : <ChevronDown className={`w-4 h-4 ${isTechTheme ? 'text-accent' : 'text-text-muted'}`} />}
          </button>

          {openSections.finanzas && (
            <div className={`overflow-hidden transition-all ${isTechTheme ? 'border border-accent/20 rounded-none bg-deep animate-fade-in' : 'glass-card rounded-2xl animate-fade-in'}`}>
            <button onClick={() => setIsBudgetModalOpen(true)} className={`w-full flex items-center justify-between p-4 border-b hover:bg-white/[0.02] transition-colors ${isTechTheme ? 'border-accent/15' : 'border-glass-border'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 flex items-center justify-center ${isTechTheme ? 'border border-accent/20 rounded-none bg-accent/5' : 'rounded-xl bg-accent/10'}`}>
                  <Wallet className="w-4 h-4 text-accent" />
                </div>
                <div className="text-left">
                  <p className={`text-sm font-medium ${isTechTheme ? 'font-mono text-accent/80 uppercase tracking-wider' : 'text-text-primary'}`}>{isTechTheme ? 'PRESUPUESTO_MENSUAL' : 'Presupuesto mensual'}</p>
                  <p className={`text-[10px] ${isTechTheme ? 'font-mono text-accent/50' : 'text-text-muted'}`}>{isTechTheme ? 'DEFINE_UN_LIMITE_DE_GASTOS' : 'Define un límite de gastos'}</p>
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 ${isTechTheme ? 'text-accent/60' : 'text-text-muted'}`} />
            </button>
            
            {/* Moneda Global */}
            <div className={`w-full flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b ${isTechTheme ? 'border-accent/15' : 'border-glass-border'}`}>
              <div className="flex items-center gap-3 mb-2 sm:mb-0">
                <div className={`w-8 h-8 flex items-center justify-center ${isTechTheme ? 'border border-green-500/20 rounded-none bg-green-500/5' : 'rounded-xl bg-green-500/10'}`}>
                  <Globe className="w-4 h-4 text-green-400" />
                </div>
                <div className="text-left">
                  <p className={`text-sm font-medium ${isTechTheme ? 'font-mono text-green-400 uppercase tracking-wider' : 'text-text-primary'}`}>{isTechTheme ? 'MONEDA_GLOBAL' : 'Moneda Global'}</p>
                  <p className={`text-[10px] ${isTechTheme ? 'font-mono text-green-400/50' : 'text-text-muted'}`}>{isTechTheme ? 'SELECCIONA_EL_FORMATO' : 'Selecciona el formato'}</p>
                </div>
              </div>
              <select
                value={profile?.currency || 'COP'}
                onChange={async (e) => {
                  if (user) {
                    await updateDoc(doc(db, 'users', user.uid), { currency: e.target.value });
                  }
                }}
                className={`px-3 py-1.5 text-xs focus:outline-none transition-all ${isTechTheme ? 'bg-black/40 border border-accent/40 text-accent font-mono rounded-none uppercase' : 'bg-white/5 border border-white/10 text-text-primary rounded-xl'}`}
              >
                {CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
                ))}
              </select>
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
          )}
        </section>

        {/* 6. Datos y Privacidad */}
        <section className="space-y-3">
          <button 
            onClick={() => toggleSection('privacidad')}
            className={`w-full flex items-center justify-between ${isTechTheme ? 'border-b border-red-500/20 pb-1' : 'ml-2 pr-2'}`}
          >
            <h2 className={`${isTechTheme ? 'font-mono font-bold text-sm text-red-400 uppercase tracking-wide' : 'font-syne font-semibold text-sm text-red-400'}`}>Datos y Privacidad</h2>
            {openSections.privacidad ? <ChevronUp className={`w-4 h-4 ${isTechTheme ? 'text-red-400' : 'text-text-muted'}`} /> : <ChevronDown className={`w-4 h-4 ${isTechTheme ? 'text-red-400' : 'text-text-muted'}`} />}
          </button>

          {openSections.privacidad && (
            <div className={`overflow-hidden transition-all ${isTechTheme ? 'border border-red-500/20 rounded-none bg-deep animate-fade-in' : 'glass-card border-red-500/20 rounded-2xl animate-fade-in'}`}>
            <button type="button" onClick={() => router.push('/legal')}
                    className={`w-full flex items-center justify-between p-4 border-b hover:bg-white/5 transition-colors ${isTechTheme ? 'border-accent/15' : 'border-glass-border'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 flex items-center justify-center ${isTechTheme ? 'border border-emerald-500/20 rounded-none bg-emerald-500/5' : 'rounded-xl bg-emerald-500/10'}`}>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-left">
                  <p className={`text-sm font-medium ${isTechTheme ? 'font-mono text-emerald-400/80 uppercase tracking-wider' : 'text-text-primary'}`}>{isTechTheme ? 'PRIVACIDAD_Y_TERMINOS' : 'Política de privacidad y términos'}</p>
                  <p className={`text-[10px] ${isTechTheme ? 'font-mono text-emerald-400/50' : 'text-text-muted'}`}>{isTechTheme ? 'COMO_CUIDAMOS_TUS_DATOS' : 'Cómo cuidamos tus datos y las reglas del plan'}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-text-muted" />
            </button>
            <MyDataRows isTechTheme={isTechTheme} />
            </div>
          )}
        </section>
        </div>
        </div>

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
      {isBudgetModalOpen && (
        <ManageBudgetModal onClose={() => setIsBudgetModalOpen(false)} />
      )}
      {soundModalAction && (
        <ManageSoundModal
          actionType={soundModalAction}
          currentValue={
            soundModalAction === 'ingreso' ? soundIngreso :
            soundModalAction === 'gasto' ? soundGasto :
            soundModalAction === 'edicion' ? soundEdicion :
            soundModalAction === 'eliminacion' ? soundEliminacion :
            soundModalAction === 'ui_nav' ? soundUINav :
            soundModalAction === 'particles' ? soundParticles :
            notificationSound
          }
          onClose={() => setSoundModalAction(null)}
          onSelect={(val) => handleSelectSound(soundModalAction, val)}
        />
      )}
    </div>
  );
}
