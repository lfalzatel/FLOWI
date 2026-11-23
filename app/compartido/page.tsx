'use client';
import { currentLocale, tr } from '@/lib/i18n';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Check } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { AddExpenseModal } from '@/components/forms/AddExpenseModal';
import { formatCurrency } from '@/lib/format';
import { ShareLinkData, ShareLinkItem, readShareLink } from '@/lib/shared';

// Página que abre el enlace "anótalo con un toque" que llega por WhatsApp. Es pública: quien no tiene FLOWI
// ve lo que le toca y la invitación; quien sí la tiene puede guardar cada gasto ya lleno.
// El enlace solo trae lo que la otra persona decidió compartir (descripción, monto, categoría, fecha y su nombre).
export default function CompartidoPage() {
  const { user, loading } = useAuth();
  const [data, setData] = useState<ShareLinkData | null | undefined>(undefined);
  const [saving, setSaving] = useState<number | null>(null);
  const [saved, setSaved] = useState<number[]>([]);

  useEffect(() => {
    const g = new URLSearchParams(window.location.search).get('g');
    setData(readShareLink(g));
  }, []);

  const fmt = (n: number) => formatCurrency(n, 'COP');
  const total = data?.i.reduce((s, x) => s + x.a, 0) ?? 0;
  const when = (x: ShareLinkItem) => new Date(`${x.f}T12:00:00`).toLocaleDateString(currentLocale(), { day: 'numeric', month: 'short' });
  const here = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/compartido';

  return (
    <div className="min-h-screen bg-[#050B14] text-white">
      <main className="max-w-md mx-auto px-4 py-10 space-y-5">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto">
            <Users className="w-7 h-7 text-emerald-400" />
          </div>
          <h1 className="text-xl font-bold font-syne">{tr('Gasto compartido')}</h1>
          {data && (
            <p className="text-sm text-white/60">
              {data.p ? `${data.p} te compartió` : 'Te compartieron'} {data.i.length === 1 ? 'lo que te tocó' : 'lo que quedó pendiente'}.
            </p>
          )}
        </div>

        {data === undefined ? null : !data ? (
          <div className="rounded-3xl bg-[#0D1527] border border-white/5 p-5 text-center text-sm text-white/60">
            {tr('Este enlace está incompleto o dañado. Pídele a quien te lo envió que lo mande otra vez.')}
          </div>
        ) : (
          <>
            <ul className="rounded-3xl bg-[#0D1527] border border-white/5 divide-y divide-white/5">
              {data.i.map((x, k) => (
                <li key={k} className="flex items-center gap-3 p-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{x.d || x.c || 'Gasto'}</p>
                    <p className="text-[11px] text-white/45">{when(x)}{x.c ? ` · ${x.c}` : ''}</p>
                  </div>
                  <span className="text-sm font-bold tabular-nums">{fmt(x.a)}</span>
                  {user && (saved.includes(k) ? (
                    <span className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center" aria-label={tr('Guardado')}><Check className="w-4 h-4" /></span>
                  ) : (
                    <button type="button" onClick={() => setSaving(k)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500 text-black text-xs font-bold">{tr('Anotar')}</button>
                  ))}
                </li>
              ))}
              {data.i.length > 1 && (
                <li className="flex justify-between p-4 text-sm"><span className="text-white/60">{tr('Total')}</span><b className="tabular-nums">{fmt(total)}</b></li>
              )}
            </ul>

            {loading ? null : user ? (
              <div className="text-center space-y-2">
                <p className="text-xs text-white/50">{tr('Toca')} <b>{tr('Anotar')}</b> para guardarlo en tus gastos; puedes revisarlo antes de guardar.</p>
                <Link href="/" className="text-xs text-emerald-400/80 hover:text-emerald-300">{tr('Ir a FLOWI')}</Link>
              </div>
            ) : (
              <div className="rounded-3xl bg-gradient-to-br from-emerald-500/15 to-transparent border border-emerald-500/20 p-5 space-y-3 text-center">
                <p className="font-semibold">{tr('¿Quieres saber en qué se te va la plata?')}</p>
                <p className="text-sm text-white/60">{tr('FLOWI te ayuda a llevar el control de tus gastos y de lo que te deben. Es gratis y sin publicidad.')}</p>
                <Link href={`/login?next=${encodeURIComponent(here)}`}
                      className="block w-full py-3 rounded-xl bg-emerald-500 text-black font-bold">{tr('Probar FLOWI gratis')}</Link>
                <p className="text-[11px] text-white/40">{tr('Al entrar puedes anotar este gasto con un toque.')}</p>
              </div>
            )}
          </>
        )}

        <p className="text-center text-[11px] text-white/30">
          <Link href="/legal#privacidad" className="hover:text-white/60">{tr('Privacidad')}</Link>
        </p>
      </main>

      {saving !== null && data && (
        <AddExpenseModal
          initialValues={{ amount: data.i[saving].a, description: data.i[saving].d, category: data.i[saving].c, date: data.i[saving].f }}
          onClose={() => setSaving(null)}
          onSuccess={() => { setSaved(s => [...s, saving]); setSaving(null); }}
        />
      )}
    </div>
  );
}
