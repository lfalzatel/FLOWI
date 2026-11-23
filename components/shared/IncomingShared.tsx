'use client';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSharedLinks } from '@/components/SharedLinksProvider';
import { deleteExpense } from '@/lib/firestore';
import { updateLink } from '@/lib/sharedLinks';
import { formatCurrency } from '@/lib/format';

// Gastos que un amigo te compartió (para aceptarlos) y avisos de gastos que borró quien pagó.
// Se usa en la campanita y en Gastos compartidos.
export function IncomingShared({ isTech, compact = false }: { isTech: boolean; compact?: boolean }) {
  const { profile } = useAuth();
  const { incoming, deletedForMe, accept, reject } = useSharedLinks();
  const [busy, setBusy] = useState<string | null>(null);
  const fmt = (n: number) => formatCurrency(n, profile?.currency || 'COP');
  if (!incoming.length && !deletedForMe.length) return null;
  const btn = `px-2.5 py-1 text-[11px] font-semibold border ${isTech ? 'rounded-none' : 'rounded-full'}`;
  const card = `p-3 border ${isTech ? 'rounded-none' : 'rounded-xl'}`;
  const run = async (id: string, fn: () => Promise<unknown>) => {
    setBusy(id);
    try { await fn(); } catch (e) { console.error('No se pudo responder el gasto compartido', e); }
    finally { setBusy(null); }
  };

  return (
    <div className={compact ? 'space-y-2 mb-2' : 'space-y-2'}>
      {incoming.map(l => {
        const who = l.ownerName.split(/\s+/)[0];
        const when = new Date(l.date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
        return (
          <div key={l.id} className={`${card} border-accent/40 bg-accent/5`}>
            <p className="text-sm text-text-primary leading-snug">
              👥 <b>{who}</b> compartió contigo <b>{l.description}</b> ({when})
            </p>
            <p className="text-xs text-text-secondary mt-0.5">
              Te toca <b className="text-accent">{fmt(l.share)}</b>. Si lo aceptas, queda en tus gastos con «Pagó {who}» y le debes eso.
            </p>
            <div className="flex gap-1.5 mt-2">
              <button type="button" disabled={busy === l.id} onClick={() => run(l.id, () => accept(l))}
                      className={`${btn} border-accent bg-accent/15 text-accent`}>{busy === l.id ? 'Guardando…' : 'Aceptar'}</button>
              <button type="button" disabled={busy === l.id} onClick={() => run(l.id, () => reject(l))}
                      className={`${btn} border-glass-border text-text-muted`}>No es mío</button>
            </div>
          </div>
        );
      })}
      {deletedForMe.map(l => (
        <div key={l.id} className={`${card} border-amber-400/40 bg-amber-400/5`}>
          <p className="text-sm text-text-primary leading-snug">
            {l.ownerName.split(/\s+/)[0]} borró <b>{l.description}</b> de sus gastos compartidos.
          </p>
          <div className="flex gap-1.5 mt-2">
            <button type="button" disabled={busy === l.id}
                    onClick={() => run(l.id, async () => { if (l.friendTxId) await deleteExpense(l.friendTxId); await updateLink(l.id, { friendTxId: null }); })}
                    className={`${btn} border-amber-400/60 text-amber-300`}>Borrarlo también de mis gastos</button>
            <button type="button" disabled={busy === l.id} onClick={() => run(l.id, () => updateLink(l.id, { friendTxId: null }))}
                    className={`${btn} border-glass-border text-text-muted`}>Dejarlo</button>
          </div>
        </div>
      ))}
    </div>
  );
}
