'use client';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';

export default function GastosPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white flex flex-col">
      <Header />
      
      <main className="flex-1 p-4 flex flex-col items-center justify-center">
        <h1 className="text-2xl font-syne font-bold mb-2 text-accent">Gastos</h1>
        <p className="text-white/40 text-sm">Página en construcción</p>
      </main>

      <BottomNav />
    </div>
  );
}
