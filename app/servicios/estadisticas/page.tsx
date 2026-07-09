'use client';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { useTheme } from '@/components/ThemeProvider';
import Link from 'next/link';
import { ArrowLeft, BarChart2 } from 'lucide-react';

export default function EstadisticasPage() {
  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';

  return (
    <div className="min-h-screen bg-deep flex flex-col">
      <Header />
      
      <main className="flex-1 max-w-2xl lg:max-w-none mx-auto w-full space-y-6 animate-fade-in-up p-4 pb-24">
        {/* Header section */}
        <div className="flex items-center gap-3">
          <Link href="/servicios" className={`p-2 -ml-2 rounded-xl transition-colors ${isTechTheme ? 'text-accent hover:bg-accent/10' : 'text-text-secondary hover:bg-glass'}`}>
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <span className={`text-xs font-medium uppercase tracking-wider ${isTechTheme ? 'font-mono text-accent/70' : 'text-text-muted'}`}>Análisis Profundo</span>
            <h1 className={`${isTechTheme ? 'font-mono font-bold text-3xl text-accent uppercase tracking-widest' : 'font-syne font-bold text-3xl text-text-primary'}`}>Estadísticas</h1>
          </div>
        </div>

        <div className={`flex flex-col items-center justify-center p-8 mt-10 text-center ${isTechTheme ? 'bg-accent/5 border border-accent/20 rounded-none' : 'glass-card rounded-3xl'}`}>
          <BarChart2 className={`w-16 h-16 mb-4 ${isTechTheme ? 'text-accent' : 'text-text-muted'}`} />
          <h2 className={`text-xl font-bold mb-2 ${isTechTheme ? 'font-mono text-accent uppercase' : 'font-syne text-text-primary'}`}>Próximamente</h2>
          <p className={`text-sm ${isTechTheme ? 'font-mono text-accent/70' : 'text-text-secondary'}`}>
            Estamos construyendo un dashboard analítico profundo donde podrás ver gráficos interactivos, el top de categorías donde más gastas, mapas de calor, y comparativas mes a mes.
          </p>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
