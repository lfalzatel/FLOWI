'use client';
import { useTheme } from '@/components/ThemeProvider';
import { Search, Bell, StickyNote, Target, PieChart, Users, Receipt, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';

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
  }
];

export default function ServiciosPage() {
  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';
  const [searchTerm, setSearchTerm] = useState('');

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

      {/* Acceso Rápido / Favoritos (Opcional, estilo Nequi) */}
      <div className={`mb-8 flex items-center justify-between p-4 bg-glass border cursor-pointer hover:bg-white/[0.02] transition-colors ${isTechTheme ? 'border-accent/30 rounded-none' : 'border-glass-border rounded-2xl'}`}>
        <div className="flex items-center gap-3">
          <Receipt className={`w-6 h-6 ${isTechTheme ? 'text-accent' : 'text-text-primary'}`} />
          <span className={`font-semibold ${isTechTheme ? 'text-accent text-sm' : 'text-text-primary'}`}>Mis pagos inscritos</span>
        </div>
        <ChevronRight className="w-5 h-5 text-text-muted" />
      </div>

      <div className="mb-4 flex items-center gap-2">
        <GridIcon className={`w-5 h-5 ${isTechTheme ? 'text-accent' : 'text-text-primary'}`} />
        <h2 className={`text-lg font-bold ${isTechTheme ? 'text-accent uppercase tracking-wider' : 'text-text-primary'}`}>
          Categorías
        </h2>
      </div>

      {/* Grid de Servicios */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {filteredServices.map((service) => (
          <Link 
            href={service.soon ? '#' : service.href} 
            key={service.id}
            className={`relative flex flex-col justify-center p-4 bg-glass border transition-all ${isTechTheme ? 'border-accent/20 rounded-none hover:border-accent/50' : 'border-glass-border rounded-2xl hover:border-glass-border/80'} ${service.soon ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:-translate-y-1'}`}
          >
            {service.isNew && (
              <span className={`absolute -top-2 -right-2 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-accent text-black ${isTechTheme ? 'rounded-none' : 'rounded-full'}`}>
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
          </Link>
        ))}
      </div>
      </main>
      <BottomNav />
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
