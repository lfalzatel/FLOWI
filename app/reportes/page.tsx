'use client';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';

export default function ReportesPage() {
  return (
    <div className="min-h-screen bg-deep flex flex-col">
      <Header />
      
      <main className="flex-1 p-4 flex flex-col items-center justify-center">
        <h1 className="text-2xl font-syne font-bold mb-2 text-accent">Reportes</h1>
        <p className="text-text-secondary text-sm">Página en construcción</p>
      </main>

      <BottomNav />
    </div>
  );
}

