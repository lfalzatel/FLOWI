'use client';
import { useTheme } from '@/components/ThemeProvider';
import { Search, Bell, StickyNote, Target, PieChart, Users, Receipt, ChevronRight, Settings, User, BarChart2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { ProfileModal } from '@/components/forms/ProfileModal';
import { triggerPowerAnimation } from '@/components/dashboard/PowerAnimation';
import { triggerDualBurst } from '@/components/dashboard/DualTrajectoryBurst';
import { Sparkles, TrendingUp, TrendingDown, RefreshCw, Trash2 } from 'lucide-react';
import confetti from 'canvas-confetti';

const SERVICES = [
  {
    id: 'recordatorios',
    title: 'Recordatorios',
    icon: Bell,
    href: '/servicios/recordatorios',
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
    isNew: false
  },
  {
    id: 'notas',
    title: 'Notas importantes',
    icon: StickyNote,
    href: '/servicios/notas',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    isNew: true
  },
  {
    id: 'estadisticas',
    title: 'Estadísticas',
    icon: BarChart2,
    href: '/servicios/estadisticas',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
    isNew: true
  },
  {
    id: 'metas',
    title: 'Metas de ahorro',
    icon: Target,
    href: '#',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    isNew: false,
    soon: true
  },
  {
    id: 'presupuestos',
    title: 'Presupuestos',
    icon: PieChart,
    href: '#',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    isNew: false,
    soon: true
  },
  {
    id: 'compartidos',
    title: 'Gastos compartidos',
    icon: Users,
    href: '#',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    isNew: false,
    soon: true
  },
  {
    id: 'facturas',
    title: 'Mis facturas',
    icon: Receipt,
    href: '#',
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10',
    isNew: false,
    soon: true
  },
  {
    id: 'configuracion',
    title: 'Configuración',
    icon: Settings,
    href: '/configuracion',
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/10',
    isNew: false
  },
  {
    id: 'perfil',
    title: 'Mi Perfil',
    icon: User,
    href: '#',
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/10',
    isNew: false
  }
];

export default function ServiciosPage() {
  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';
  const [searchTerm, setSearchTerm] = useState('');
  const [showProfileModal, setShowProfileModal] = useState(false);

  const filteredServices = SERVICES.filter(s => 
    s.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col bg-deep">
      <Header />
      <main className={`flex-1 pb-32 p-4 pt-6 max-w-lg mx-auto w-full ${isTechTheme ? 'font-mono' : ''}`}>
        <h1 className={`text-2xl font-bold mb-6 ${isTechTheme ? 'text-accent uppercase tracking-wider' : 'text-text-primary'}`}>
          Servicios
        </h1>

      {/* Buscador */}
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-text-muted" />
        </div>
        <input
          type="text"
          className={`block w-full pl-10 pr-3 py-3 bg-glass border placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-accent ${isTechTheme ? 'border-accent/30 rounded-none focus:border-accent text-sm' : 'border-glass-border rounded-xl text-sm'}`}
          placeholder="¿Qué servicio necesitas?"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* 3 Botones de prueba para ver las animaciones */}
      <div className="mb-8 space-y-2">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className={`w-4 h-4 ${isTechTheme ? 'text-accent' : 'text-emerald-500'}`} />
          <span className={`text-xs font-bold uppercase tracking-wider ${isTechTheme ? 'font-mono text-accent' : 'text-text-secondary'}`}>
            Probar Animaciones & Sonidos Web Audio
          </span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          <button
            onClick={() => triggerPowerAnimation(50000, 'ingreso')}
            className={`flex flex-col items-center justify-center p-2.5 text-center transition-all active:scale-95 ${
              isTechTheme
                ? 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 rounded-2xl hover:bg-emerald-500/20'
            }`}
          >
            <TrendingUp className="w-4 h-4 mb-1" />
            <span className="text-[10px] font-extrabold uppercase">Ingreso</span>
            <span className="text-[9px] opacity-80">$50k</span>
          </button>

          <button
            onClick={() => triggerPowerAnimation(25000, 'gasto')}
            className={`flex flex-col items-center justify-center p-2.5 text-center transition-all active:scale-95 ${
              isTechTheme
                ? 'border border-rose-500/40 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-600 rounded-2xl hover:bg-rose-500/20'
            }`}
          >
            <TrendingDown className="w-4 h-4 mb-1" />
            <span className="text-[10px] font-extrabold uppercase">Gasto</span>
            <span className="text-[9px] opacity-80">$25k</span>
          </button>

          <button
            onClick={() => triggerPowerAnimation(15000, 'eliminacion')}
            className={`flex flex-col items-center justify-center p-2.5 text-center transition-all active:scale-95 ${
              isTechTheme
                ? 'border border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                : 'bg-red-500/10 border border-red-500/30 text-red-600 rounded-2xl hover:bg-red-500/20'
            }`}
          >
            <Trash2 className="w-4 h-4 mb-1" />
            <span className="text-[10px] font-extrabold uppercase">Eliminación</span>
            <span className="text-[9px] opacity-80">$15k</span>
          </button>

          <button
            onClick={() => triggerDualBurst({ type: 'ingreso' })}
            className={`flex flex-col items-center justify-center p-2.5 text-center transition-all active:scale-95 ${
              isTechTheme
                ? 'border border-cyan-500/40 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20'
                : 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 rounded-2xl hover:bg-cyan-500/20'
            }`}
          >
            <Sparkles className="w-4 h-4 mb-1 animate-pulse" />
            <span className="text-[10px] font-extrabold uppercase">Partículas</span>
            <span className="text-[9px] opacity-80">Voladoras</span>
          </button>

          <button
            onClick={() => {
              try {
                confetti({
                  particleCount: 120,
                  spread: 90,
                  origin: { y: 0.5 },
                  colors: ['#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6']
                });
              } catch (e) {}
            }}
            className={`flex flex-col items-center justify-center p-2.5 text-center transition-all active:scale-95 col-span-2 sm:col-span-1 ${
              isTechTheme
                ? 'border border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                : 'bg-amber-500/10 border border-amber-500/30 text-amber-600 rounded-2xl hover:bg-amber-500/20'
            }`}
          >
            <Sparkles className="w-4 h-4 mb-1" />
            <span className="text-[10px] font-extrabold uppercase">Confeti</span>
            <span className="text-[9px] opacity-80">Celebración</span>
          </button>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <GridIcon className={`w-5 h-5 ${isTechTheme ? 'text-accent' : 'text-text-primary'}`} />
        <h2 className={`text-lg font-bold ${isTechTheme ? 'text-accent uppercase tracking-wider' : 'text-text-primary'}`}>
          Categorías
        </h2>
      </div>

      {/* Grid de Servicios */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {filteredServices.map((service) => {
          const content = (
            <>
              {service.isNew && (
                <span className={`absolute top-2 right-2 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-accent text-black ${isTechTheme ? 'rounded-none' : 'rounded-full'}`}>
                  Nuevo
                </span>
              )}
              {service.soon && (
                <span className={`absolute top-2 right-2 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider bg-text-muted/20 text-text-secondary ${isTechTheme ? 'rounded-none' : 'rounded-full'}`}>
                  Pronto
                </span>
              )}
              <div className={`w-10 h-10 flex items-center justify-center mb-3 ${isTechTheme ? 'bg-transparent border border-accent/40' : service.bgColor + ' rounded-xl'}`}>
                <service.icon className={`w-5 h-5 ${isTechTheme ? 'text-accent' : service.color}`} />
              </div>
              <span className={`text-sm font-medium ${isTechTheme ? 'text-accent/90' : 'text-text-primary'} leading-tight`}>
                {service.title}
              </span>
            </>
          );
          const classNameStr = `relative flex flex-col justify-center p-4 glass-card transition-all ${isTechTheme ? 'border-accent/20 rounded-none hover:border-accent/50' : 'hover:border-glass-border/80'} ${service.soon ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:-translate-y-1'}`;

          if (service.id === 'perfil') {
            return (
              <button key={service.id} onClick={() => setShowProfileModal(true)} className={classNameStr + ' text-left'}>
                {content}
              </button>
            );
          }
          return (
            <Link href={service.soon ? '#' : service.href} key={service.id} className={classNameStr}>
              {content}
            </Link>
          );
        })}
      </div>
      </main>
      <BottomNav />
      {showProfileModal && <ProfileModal onClose={() => setShowProfileModal(false)} />}
    </div>
  );
}

function GridIcon(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
    </svg>
  );
}
