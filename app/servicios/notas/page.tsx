'use client';
import { useTheme } from '@/components/ThemeProvider';
import { StickyNote, Plus, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';

export default function NotasPage() {
  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';

  return (
    <div className="min-h-screen flex flex-col bg-deep">
      <Header />
      <main className={`flex-1 pb-32 p-4 pt-6 max-w-lg mx-auto w-full ${isTechTheme ? 'font-mono' : ''}`}>
        <div className="flex items-center gap-3 mb-6">
        <Link href="/servicios" className={`p-2 -ml-2 bg-glass border hover:bg-white/[0.05] transition-colors ${isTechTheme ? 'border-accent/30 rounded-none text-accent' : 'border-glass-border rounded-full text-text-primary'}`}>
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className={`text-xl font-bold ${isTechTheme ? 'text-accent uppercase tracking-wider' : 'text-text-primary'}`}>
          Notas Importantes
        </h1>
      </div>

      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className={`w-16 h-16 flex items-center justify-center mb-4 ${isTechTheme ? 'border border-accent/40 bg-black' : 'bg-blue-500/10 rounded-2xl'}`}>
          <StickyNote className={`w-8 h-8 ${isTechTheme ? 'text-accent' : 'text-blue-500'}`} />
        </div>
        <h2 className={`text-lg font-bold mb-2 ${isTechTheme ? 'text-accent' : 'text-text-primary'}`}>Aún no tienes notas</h2>
        <p className={`text-sm mb-8 ${isTechTheme ? 'text-text-secondary/70' : 'text-text-secondary'}`}>
          Guarda aquí números de cuenta, direcciones importantes o recordatorios en texto plano.
        </p>

        <button
          className={`flex items-center justify-center gap-2 px-6 py-3 font-semibold transition-all shadow-xl active:scale-95
                     ${isTechTheme ? 'bg-transparent text-accent border border-accent rounded-none hover:bg-accent/10 shadow-[0_0_15px_rgba(0,229,160,0.2)]' : 'bg-blue-500 text-white rounded-xl shadow-blue-500/30'}`}
        >
          <Plus className="w-5 h-5" />
          <span>Crear mi primera nota</span>
        </button>
      </div>
      </main>
      <BottomNav />
    </div>
  );
}
