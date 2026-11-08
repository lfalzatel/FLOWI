'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { useData } from '@/components/DataProvider';
import { useCommitments } from '@/hooks/useCommitments';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { CommitmentsCard } from '@/components/dashboard/CommitmentsCard';

// Próximos compromisos también desde Servicios (la misma tarjeta de Inicio)
export default function CompromisosPage() {
  const { theme } = useTheme();
  const isTech = theme === 'cyberpunk' || theme === 'kiloCode';
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const { transactions, loadingTransactions } = useData();
  const commitments = useCommitments(transactions);

  useEffect(() => { if (!authLoading && !user) router.push('/login'); }, [authLoading, user, router]);

  return (
    <div className="relative min-h-screen flex flex-col bg-deep">
      <Header />
      <main className={`relative flex-1 max-w-2xl mx-auto w-full p-4 pb-32 space-y-5 animate-fade-in-up ${isTech ? 'font-mono' : ''}`}>
        <div className="flex items-center gap-3">
          <Link href="/servicios" aria-label="Volver a Servicios" className={`p-2 -ml-2 bg-glass border ${isTech ? 'border-accent/30 rounded-none text-accent' : 'border-glass-border rounded-full text-text-primary'}`}>
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className={`text-xl font-bold ${isTech ? 'text-accent uppercase tracking-wider' : 'font-syne text-text-primary'}`}>Próximos compromisos</h1>
            <p className="text-xs text-text-muted">Los pagos fijos que te faltan este mes</p>
          </div>
        </div>

        {loadingTransactions || commitments.loading ? (
          <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <CommitmentsCard summary={commitments} currency={profile?.currency} onRefresh={() => {}} />
        )}

        <p className="text-[11px] text-text-muted text-center leading-relaxed">
          Salen de tus recordatorios de pago y de los gastos fijos del mes pasado. Para agregar uno nuevo,
          crea un recordatorio en <Link href="/servicios/recordatorios" className="text-accent underline">Recordatorios</Link>.
        </p>
      </main>
      <BottomNav />
    </div>
  );
}
