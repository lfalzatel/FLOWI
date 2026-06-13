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
import { 
  ArrowLeft, Sun, Moon, Terminal, Layers, Zap, Palette,
  User, Wallet, Bell, Shield, 
  ChevronRight, Lock, Key, Globe, Type, 
  Calendar, PieChart, Download, Trash2, 
  FileText, Settings
} from 'lucide-react';

export default function ConfigPage() {
  const router = useRouter();
  const { theme, setTheme, allowedThemes, setAllowedThemes } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';
  const { user, profile, loading: authLoading } = useAuth();
  
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
  const [isThemesModalOpen, setIsThemesModalOpen] = useState(false);

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
          <div className="glass-card rounded-2xl overflow-hidden">
            <button onClick={() => setIsProfileModalOpen(true)} className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors border-b border-glass-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center">
                  <User className="w-4 h-4 text-accent" />
                </div>
                <div className="text-left">
                  <p className={`text-sm font-medium text-text-primary ${isTechTheme ? 'font-mono' : ''}`}>Mi perfil</p>
                  <p className="text-[10px] text-text-muted">Editar nombre, foto y teléfono</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-text-muted" />
            </button>
            <div className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors border-b border-glass-border opacity-50 cursor-not-allowed">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Key className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-left">
                  <p className={`text-sm font-medium text-text-primary ${isTechTheme ? 'font-mono' : ''}`}>Cambiar contraseña</p>
                  <p className="text-[10px] text-text-muted">Enviar email de recuperación</p>
                </div>
              </div>
              <span className="text-[9px] bg-glass-strong px-1.5 py-0.5 rounded uppercase tracking-wider text-text-muted">Pronto</span>
            </div>
            <div className="w-full flex items-center justify-between p-4 bg-white/[0.01]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-left">
                  <p className={`text-sm font-medium text-text-primary ${isTechTheme ? 'font-mono' : ''}`}>Rol de la cuenta</p>
                  <p className="text-[10px] text-text-muted">Nivel de acceso actual</p>
                </div>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${isTechTheme ? 'font-mono bg-accent/10 text-accent border border-accent/20' : 'bg-glass-strong text-text-secondary'}`}>{profile?.role || 'Usuario'}</span>
            </div>
          </div>
        </section>

        {/* 2. Gestión */}
        <section className="space-y-3">
          <h2 className={`${isTechTheme ? 'font-mono font-bold text-sm text-accent uppercase tracking-wide border-b border-accent/20 pb-1' : 'font-syne font-semibold text-sm text-text-secondary ml-2'}`}>Gestión</h2>
          <div className="glass-card rounded-2xl overflow-hidden">
            <button onClick={() => setIsCategoriesModalOpen(true)} className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors border-b border-glass-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[var(--yellow)]/10 flex items-center justify-center">
                  <PieChart className="w-4 h-4 text-[var(--yellow)]" />
                </div>
                <div className="text-left">
                  <p className={`text-sm font-medium text-text-primary ${isTechTheme ? 'font-mono' : ''}`}>Gestionar Categorías</p>
                  <p className="text-[10px] text-text-muted">Colores e iconos de gastos</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-text-muted" />
            </button>
            
            {/* Admin only: Manage Users */}
            {profile?.role === 'admin' && (
              <button onClick={() => setIsUsersModalOpen(true)} className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors border-b border-glass-border">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-red-500" />
                  </div>
                  <div className="text-left">
                    <p className={`text-sm font-medium text-text-primary ${isTechTheme ? 'font-mono' : ''}`}>Gestionar Usuarios</p>
                    <p className="text-[10px] text-text-muted">Cambiar roles y administrar accesos</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-text-muted" />
              </button>
            )}
          </div>
        </section>

        {/* 3. Apariencia */}
        <section className="space-y-3">
          <h2 className={`${isTechTheme ? 'font-mono font-bold text-sm text-accent uppercase tracking-wide border-b border-accent/20 pb-1' : 'font-syne font-semibold text-sm text-text-secondary ml-2'}`}>Apariencia</h2>
          <div className="glass-card rounded-2xl overflow-hidden">
            
            {/* Botón de Temas */}
            <button onClick={() => setIsThemesModalOpen(true)} className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors border-b border-glass-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-pink-500/10 flex items-center justify-center">
                  <Palette className="w-4 h-4 text-pink-400" />
                </div>
                <div className="text-left">
                  <p className={`text-sm font-medium text-text-primary ${isTechTheme ? 'font-mono' : ''}`}>Temas</p>
                  <p className="text-[10px] text-text-muted">Tema activo y menú desplegable</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-text-muted" />
            </button>

            {/* Idioma y Moneda */}
            <div className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors border-b border-glass-border opacity-50 cursor-not-allowed">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <Globe className="w-4 h-4 text-green-400" />
                </div>
                <div className="text-left">
                  <p className={`text-sm font-medium text-text-primary ${isTechTheme ? 'font-mono' : ''}`}>Idioma y Moneda</p>
                  <p className="text-[10px] text-text-muted">Actualmente: es-MX / MXN</p>
                </div>
              </div>
              <span className="text-[9px] bg-glass-strong px-1.5 py-0.5 rounded uppercase tracking-wider text-text-muted">Pronto</span>
            </div>

            {/* Tamaño de texto */}
            <div className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors opacity-50 cursor-not-allowed">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <Type className="w-4 h-4 text-orange-400" />
                </div>
                <div className="text-left">
                  <p className={`text-sm font-medium text-text-primary ${isTechTheme ? 'font-mono' : ''}`}>Tamaño de texto</p>
                  <p className="text-[10px] text-text-muted">Compacto / Normal / Grande</p>
                </div>
              </div>
              <span className="text-[9px] bg-glass-strong px-1.5 py-0.5 rounded uppercase tracking-wider text-text-muted">Pronto</span>
            </div>
          </div>
        </section>

        {/* 4. Finanzas */}
        <section className="space-y-3">
          <h2 className={`${isTechTheme ? 'font-mono font-bold text-sm text-accent uppercase tracking-wide border-b border-accent/20 pb-1' : 'font-syne font-semibold text-sm text-text-secondary ml-2'}`}>Finanzas</h2>
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="w-full flex items-center justify-between p-4 border-b border-glass-border opacity-50 cursor-not-allowed">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-accent" />
                </div>
                <div className="text-left">
                  <p className={`text-sm font-medium text-text-primary ${isTechTheme ? 'font-mono' : ''}`}>Presupuesto mensual</p>
                  <p className="text-[10px] text-text-muted">Define un límite de gastos</p>
                </div>
              </div>
              <span className="text-[9px] bg-glass-strong px-1.5 py-0.5 rounded uppercase tracking-wider text-text-muted">Pronto</span>
            </div>
            <div className="w-full flex items-center justify-between p-4 border-b border-glass-border opacity-50 cursor-not-allowed">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-left">
                  <p className={`text-sm font-medium text-text-primary ${isTechTheme ? 'font-mono' : ''}`}>Día de inicio de mes</p>
                  <p className="text-[10px] text-text-muted">Ej: Día 15 o Día 30</p>
                </div>
              </div>
              <span className="text-[9px] bg-glass-strong px-1.5 py-0.5 rounded uppercase tracking-wider text-text-muted">Pronto</span>
            </div>
            <div className="w-full flex items-center justify-between p-4 opacity-50 cursor-not-allowed">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[var(--red)]/10 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-[var(--red)]" />
                </div>
                <div className="text-left">
                  <p className={`text-sm font-medium text-text-primary ${isTechTheme ? 'font-mono' : ''}`}>Gastos recurrentes</p>
                  <p className="text-[10px] text-text-muted">Netflix, Internet, etc.</p>
                </div>
              </div>
              <span className="text-[9px] bg-glass-strong px-1.5 py-0.5 rounded uppercase tracking-wider text-text-muted">Pronto</span>
            </div>
          </div>
        </section>

        {/* 5. Notificaciones */}
        <section className="space-y-3">
          <h2 className={`${isTechTheme ? 'font-mono font-bold text-sm text-accent uppercase tracking-wide border-b border-accent/20 pb-1' : 'font-syne font-semibold text-sm text-text-secondary ml-2'}`}>Notificaciones</h2>
          <div className="glass-card rounded-2xl overflow-hidden p-4 opacity-50 cursor-not-allowed flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <Bell className="w-4 h-4 text-orange-400" />
              </div>
              <div className="text-left">
                <p className={`text-sm font-medium text-text-primary ${isTechTheme ? 'font-mono' : ''}`}>Alertas y Recordatorios</p>
                <p className="text-[10px] text-text-muted">Gasto excesivo y recordatorio diario</p>
              </div>
            </div>
            <span className="text-[9px] bg-glass-strong px-1.5 py-0.5 rounded uppercase tracking-wider text-text-muted">Pronto</span>
          </div>
        </section>

        {/* 6. Datos y Privacidad */}
        <section className="space-y-3">
          <h2 className={`${isTechTheme ? 'font-mono font-bold text-sm text-red-400 uppercase tracking-wide border-b border-red-500/20 pb-1' : 'font-syne font-semibold text-sm text-red-400 ml-2'}`}>Datos y Privacidad</h2>
          <div className="glass-card border-red-500/20 rounded-2xl overflow-hidden">
            <div className="w-full flex items-center justify-between p-4 border-b border-glass-border opacity-50 cursor-not-allowed">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Download className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-left">
                  <p className={`text-sm font-medium text-text-primary ${isTechTheme ? 'font-mono' : ''}`}>Exportar mis datos</p>
                  <p className="text-[10px] text-text-muted">Descargar CSV o JSON</p>
                </div>
              </div>
              <span className="text-[9px] bg-glass-strong px-1.5 py-0.5 rounded uppercase tracking-wider text-text-muted">Pronto</span>
            </div>
            <div className="w-full flex items-center justify-between p-4 border-b border-glass-border opacity-50 cursor-not-allowed">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <Trash2 className="w-4 h-4 text-orange-400" />
                </div>
                <div className="text-left">
                  <p className={`text-sm font-medium text-text-primary ${isTechTheme ? 'font-mono' : ''}`}>Eliminar todos los datos</p>
                  <p className="text-[10px] text-text-muted">Borrar transacciones pero mantener cuenta</p>
                </div>
              </div>
              <span className="text-[9px] bg-glass-strong px-1.5 py-0.5 rounded uppercase tracking-wider text-text-muted">Pronto</span>
            </div>
            <div className="w-full flex items-center justify-between p-4 opacity-50 cursor-not-allowed">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <Lock className="w-4 h-4 text-red-500" />
                </div>
                <div className="text-left">
                  <p className={`text-sm font-medium text-red-400 ${isTechTheme ? 'font-mono' : ''}`}>Eliminar cuenta</p>
                  <p className="text-[10px] text-red-400/70">Acción irreversible</p>
                </div>
              </div>
              <span className="text-[9px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded uppercase tracking-wider">Pronto</span>
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
