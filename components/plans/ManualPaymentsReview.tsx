'use client';
import { useEffect, useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { ManualPayment, reviewManualPayment, watchPendingManualPayments } from '@/lib/manualPay';
import { PLANS } from '@/lib/plans';
import { formatCurrency } from '@/lib/format';

// Solo administrador: comprobantes de transferencia por revisar. Aprobar activa Premium.
export function ManualPaymentsReview({ isTech }: { isTech: boolean }) {
  const [list, setList] = useState<ManualPayment[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [zoom, setZoom] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  useEffect(() => watchPendingManualPayments(setList), []);

  const review = async (p: ManualPayment, approve: boolean) => {
    if (!approve && !window.confirm('¿Rechazar este comprobante? La persona verá que no se aprobó.')) return;
    setBusy(p.id);
    setMsg('');
    try {
      const r = await reviewManualPayment(p.id, approve);
      setMsg(approve ? `Premium activado para ${p.userName || p.userEmail}${r.premiumUntil ? ` hasta el ${new Date(r.premiumUntil).toLocaleDateString('es-CO')}` : ''}.` : 'Comprobante rechazado.');
    } catch (e: any) {
      console.error('Revisar pago:', e);
      setMsg('No se pudo guardar la revisión. Intenta de nuevo.');
    } finally {
      setBusy(null);
    }
  };

  const card = isTech ? 'bg-glass border border-amber-400/40 rounded-none' : 'glass-card rounded-3xl border border-amber-400/30';
  return (
    <section className={`${card} p-4 space-y-3`}>
      <h2 className={`text-sm font-bold ${isTech ? 'text-amber-400 uppercase' : 'text-text-primary font-syne'}`}>
        Comprobantes por revisar {list.length > 0 && <span className="ml-1 px-2 py-0.5 text-[11px] rounded-full bg-amber-400 text-black">{list.length}</span>}
      </h2>
      {msg && <p className="text-xs text-accent">{msg}</p>}
      {list.length === 0 ? (
        <p className="text-xs text-text-muted">No hay comprobantes pendientes. Cuando alguien pague por transferencia aparecerá aquí.</p>
      ) : list.map(p => {
        const plan = PLANS.find(x => x.id === p.plan);
        return (
          <div key={p.id} className={`flex gap-3 p-3 border border-glass-border ${isTech ? 'rounded-none' : 'rounded-2xl'}`}>
            <button type="button" onClick={() => setZoom(p.image)} className="shrink-0" aria-label="Ver comprobante">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.image} alt="Comprobante" className={`w-16 h-24 object-cover bg-black/30 ${isTech ? 'rounded-none' : 'rounded-lg'}`} />
            </button>
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-sm font-semibold text-text-primary truncate">{p.userName || 'Sin nombre'}</p>
              <p className="text-[11px] text-text-muted truncate">{p.userEmail}</p>
              <p className="text-xs text-text-secondary">{plan?.label} · <b>{formatCurrency(p.amount, 'COP')}</b></p>
              {p.createdAt && <p className="text-[10px] text-text-muted">{p.createdAt.toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>}
              {p.note && <p className="text-[11px] text-text-secondary italic">“{p.note}”</p>}
              <div className="flex gap-2 pt-1">
                <button type="button" disabled={busy === p.id} onClick={() => review(p, true)}
                        className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs font-bold bg-emerald-500/15 border border-emerald-500/50 text-emerald-400 disabled:opacity-50 ${isTech ? 'rounded-none' : 'rounded-lg'}`}>
                  {busy === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Aprobar
                </button>
                <button type="button" disabled={busy === p.id} onClick={() => review(p, false)}
                        className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs font-bold bg-red-500/10 border border-red-500/40 text-red-400 disabled:opacity-50 ${isTech ? 'rounded-none' : 'rounded-lg'}`}>
                  <X className="w-3.5 h-3.5" /> Rechazar
                </button>
              </div>
            </div>
          </div>
        );
      })}
      <p className="text-[10px] text-text-muted">Antes de aprobar, confirma en tu Nequi o banco que la plata sí llegó.</p>

      {zoom && (
        <div className="fixed inset-0 z-[130] bg-black/90 flex items-center justify-center p-4" onClick={() => setZoom(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom} alt="Comprobante" className="max-w-full max-h-full object-contain" />
        </div>
      )}
    </section>
  );
}
