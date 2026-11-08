'use client';
import { useTheme } from '@/components/ThemeProvider';
import { Bell, StickyNote, Target, PieChart, Users, Receipt, ChevronRight, Settings, User, BarChart2, FileSpreadsheet, Landmark, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { ServiceGrid, ServiceItem } from '@/components/services/ServiceGrid';
import { BottomNav } from '@/components/layout/BottomNav';
import { ProfileModal } from '@/components/forms/ProfileModal';
import { triggerPowerAnimation, triggerConfettiWithSynth } from '@/components/dashboard/PowerAnimation';
import { triggerDualBurst } from '@/components/dashboard/DualTrajectoryBurst';
import { speakText } from '@/lib/voiceParser';
import { Sparkles, TrendingUp, TrendingDown, RefreshCw, Trash2, Volume2 } from 'lucide-react';
import confetti from 'canvas-confetti';

// Orden por defecto, por grupos: lo que más se usa arriba; lo que aún no funciona y los ajustes, al final
const SERVICE_GROUPS = ['Tu plata', 'Entiende tus gastos', 'Herramientas', 'Próximamente', 'Tu cuenta'];

const SERVICES: ServiceItem[] = [
  { id: 'recordatorios', group: 'Tu plata', title: 'Recordatorios', description: 'Pagos y fechas importantes para que no se te pasen',
    icon: Bell, href: '/servicios/recordatorios', color: 'text-pink-500', bgColor: 'bg-pink-500/10' },
  { id: 'cuentas', group: 'Tu plata', title: 'Cuentas y patrimonio', description: 'Cuánto tienes en cada banco y en efectivo',
    icon: Wallet, href: '/servicios/cuentas', color: 'text-lime-500', bgColor: 'bg-lime-500/10', isNew: true },
  { id: 'presupuestos', group: 'Tu plata', title: 'Presupuestos', description: 'Cuánto quieres gastar por categoría (50/30/20)',
    icon: PieChart, href: '/servicios/presupuestos', color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
  { id: 'metas', group: 'Tu plata', title: 'Metas', description: '¿Para qué ahorras? Viaje, moto, emergencias…',
    icon: Target, href: '/servicios/metas', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
  { id: 'inversiones', group: 'Tu plata', title: 'Ahorro e inversiones', description: 'Donde tu plata crece: CDT, Nu, Trii, fondos',
    icon: Landmark, href: '/servicios/inversiones', color: 'text-teal-500', bgColor: 'bg-teal-500/10', isNew: true },
  { id: 'estadisticas', group: 'Entiende tus gastos', title: 'Estadísticas', description: 'En qué se te va la plata, mes a mes',
    icon: BarChart2, href: '/servicios/estadisticas', color: 'text-cyan-500', bgColor: 'bg-cyan-500/10' },
  { id: 'importar', group: 'Entiende tus gastos', title: 'Importar extracto', description: 'Sube el Excel del banco y registro todo de una',
    icon: FileSpreadsheet, href: '/servicios/importar', color: 'text-sky-500', bgColor: 'bg-sky-500/10' },
  { id: 'notas', group: 'Herramientas', title: 'Notas', description: 'Datos que no quieres olvidar',
    icon: StickyNote, href: '/servicios/notas', color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  { id: 'compartidos', group: 'Próximamente', title: 'Gastos compartidos', description: 'Divide cuentas con amigos o en pareja',
    icon: Users, href: '#', color: 'text-orange-500', bgColor: 'bg-orange-500/10', soon: true },
  { id: 'facturas', group: 'Próximamente', title: 'Mis facturas', description: 'Tus facturas guardadas en un solo lugar',
    icon: Receipt, href: '#', color: 'text-rose-500', bgColor: 'bg-rose-500/10', soon: true },
  { id: 'configuracion', group: 'Tu cuenta', title: 'Configuración', description: 'Moneda, temas, sonidos y avisos',
    icon: Settings, href: '/configuracion', color: 'text-gray-500', bgColor: 'bg-gray-500/10' },
  { id: 'perfil', group: 'Tu cuenta', title: 'Mi perfil', description: 'Tu nombre, foto y datos de la cuenta',
    icon: User, href: '#', color: 'text-gray-500', bgColor: 'bg-gray-500/10' },
];

export default function ServiciosPage() {
  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';
  const [showProfileModal, setShowProfileModal] = useState(false);


  return (
    <div className="relative min-h-screen flex flex-col bg-deep">
      <Header />
      <main className={`relative flex-1 pb-32 p-4 pt-6 max-w-lg mx-auto w-full ${isTechTheme ? 'font-mono' : ''}`}>
        <h1 className={`text-2xl font-bold mb-6 ${isTechTheme ? 'text-accent uppercase tracking-wider' : 'text-text-primary'}`}>
          Servicios
        </h1>

      <div className="mb-4 flex items-center gap-2">
        <GridIcon className={`w-5 h-5 ${isTechTheme ? 'text-accent' : 'text-text-primary'}`} />
        <h2 className={`text-lg font-bold ${isTechTheme ? 'text-accent uppercase tracking-wider' : 'text-text-primary'}`}>
          Categorías
        </h2>
      </div>

      {/* Grid de Servicios (agrupada; se puede reordenar manteniendo presionada una tarjeta) */}
      <ServiceGrid services={SERVICES} groups={SERVICE_GROUPS} query="" onProfile={() => setShowProfileModal(true)} />

      {/* 3 Botones de prueba para ver las animaciones */}
      <div className="mt-8 space-y-2">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className={`w-4 h-4 ${isTechTheme ? 'text-accent' : 'text-emerald-500'}`} />
          <span className={`text-xs font-bold uppercase tracking-wider ${isTechTheme ? 'font-mono text-accent' : 'text-text-secondary'}`}>
            Probar Animaciones & Sonidos Web Audio
          </span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
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
            onClick={() => triggerConfettiWithSynth(3.0)}
            className={`flex flex-col items-center justify-center p-2.5 text-center transition-all active:scale-95 ${
              isTechTheme
                ? 'border border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                : 'bg-amber-500/10 border border-amber-500/30 text-amber-600 rounded-2xl hover:bg-amber-500/20'
            }`}
          >
            <Sparkles className="w-4 h-4 mb-1" />
            <span className="text-[10px] font-extrabold uppercase">Confeti</span>
            <span className="text-[9px] opacity-80">Celebración</span>
          </button>

          <button
            onClick={() => speakText('Transacción guardada con éxito en FLOWI', 'es-CO', undefined, true)}
            className={`flex flex-col items-center justify-center p-2.5 text-center transition-all active:scale-95 ${
              isTechTheme
                ? 'border border-purple-500/40 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20'
                : 'bg-purple-500/10 border border-purple-500/30 text-purple-600 rounded-2xl hover:bg-purple-500/20'
            }`}
          >
            <Volume2 className="w-4 h-4 mb-1 animate-bounce" />
            <span className="text-[10px] font-extrabold uppercase">Voz Hablada</span>
            <span className="text-[9px] opacity-80">Confirmación</span>
          </button>
        </div>
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
