'use client';
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Copy, ImagePlus, Loader2, X } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { CategoryIcon } from '@/components/CategoryIcon';
import { DONATION_KEYS } from '@/lib/donations';
import { PLANS, PlanOption } from '@/lib/plans';
import { compressProof, submitManualPayment } from '@/lib/manualPay';
import { formatCurrency } from '@/lib/format';

// Pagar un plan por transferencia (Bre-B) y enviar el comprobante para que el administrador lo active.
export function ManualPayModal({ plan: initialPlan, onClose }: { plan: PlanOption['id']; onClose: () => void }) {
  const { theme } = useTheme();
  const isTech = theme === 'cyberpunk' || theme === 'kiloCode';
  const { user, profile } = useAuth();
  const [planId, setPlanId] = useState(initialPlan);
  const [image, setImage] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [state, setState] = useState<'idle' | 'reading' | 'sending' | 'sent' | 'error'>('idle');
  const fileRef = useRef<HTMLInputElement>(null);
  const plan = PLANS.find(p => p.id === planId)!;

  const copy = async (k: string) => {
    try { await navigator.clipboard.writeText(k); setCopied(k); setTimeout(() => setCopied(c => (c === k ? null : c)), 2000); } catch { /* sin portapapeles */ }
  };

  const pick = async (f?: File) => {
    if (!f) return;
    setState('reading');
    try { setImage(await compressProof(f)); setState('idle'); } catch { setState('error'); }
  };

  const send = async () => {
    if (!user || !image) return;
    setState('sending');
    try {
      await submitManualPayment({
        userId: user.uid, userName: profile?.name || user.displayName || '', userEmail: user.email || '',
        plan: planId, amount: plan.price, image, note,
      });
      setState('sent');
    } catch (e) {
      console.error('Comprobante:', e);
      setState('error');
    }
  };

  if (typeof document === 'undefined') return null;
  const btn = isTech ? 'rounded-none uppercase text-xs tracking-wider' : 'rounded-xl text-sm';
  return createPortal(
    <div className={`fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-4 ${isTech ? 'font-mono' : ''}`}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className={`relative w-full max-w-md max-h-[90dvh] overflow-y-auto p-5 space-y-4 animate-fade-in-up glass-dropdown ${isTech ? 'rounded-none border border-accent/50' : 'rounded-3xl'}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className={`text-base font-bold text-text-primary ${isTech ? 'uppercase tracking-wide' : 'font-syne'}`}>Pagar por transferencia</h3>
            <p className="text-xs text-text-muted">Envías la plata desde tu banco y nos mandas el comprobante.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="p-1 text-text-muted hover:text-text-primary"><X className="w-5 h-5" /></button>
        </div>

        {state === 'sent' ? (
          <div className="text-center space-y-3 py-4">
            <div className="text-4xl">✅</div>
            <p className="text-sm font-bold text-text-primary">¡Recibimos tu comprobante!</p>
            <p className="text-xs text-text-secondary leading-relaxed">Lo revisamos y activamos tu Premium, normalmente el mismo día. Verás el estado en esta página.</p>
            <button type="button" onClick={onClose} className={`w-full py-3 font-bold bg-accent ${theme === 'light' ? 'text-white' : 'text-black'} ${btn}`}>Entendido</button>
          </div>
        ) : (
          <>
            {/* 1. Plan */}
            <div>
              <p className="text-[11px] font-semibold text-text-secondary mb-1.5">1. Elige el plan</p>
              <div className="grid grid-cols-3 gap-2">
                {PLANS.map(p => (
                  <button key={p.id} type="button" onClick={() => setPlanId(p.id)}
                          className={`p-2 text-center border ${isTech ? 'rounded-none' : 'rounded-xl'} ${p.id === planId ? 'border-accent bg-accent/10' : 'border-glass-border bg-glass'}`}>
                    <span className="block text-[10px] text-text-secondary">{p.label}</span>
                    <span className={`block text-sm font-bold ${p.id === planId ? 'text-accent' : 'text-text-primary'}`}>{formatCurrency(p.price, 'COP')}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Transferir */}
            <div>
              <p className="text-[11px] font-semibold text-text-secondary mb-1.5">2. Transfiere {formatCurrency(plan.price, 'COP')} a una de estas llaves (Bre-B)</p>
              <div className="space-y-1.5">
                {DONATION_KEYS.flatMap(g => g.keys.map(k => (
                  <button key={k} type="button" onClick={() => copy(k)}
                          className={`w-full flex items-center justify-between gap-2 px-3 py-2 border border-glass-border bg-glass text-left ${isTech ? 'rounded-none' : 'rounded-xl'}`}>
                    <span className="flex items-center gap-2 min-w-0">
                      <CategoryIcon icon={g.icon} label={g.bank} className="w-5 h-5 flex items-center justify-center" />
                      <span className="text-sm text-text-primary truncate">{k}</span>
                    </span>
                    <span className={`shrink-0 flex items-center gap-1 text-[11px] font-semibold ${copied === k ? 'text-emerald-400' : 'text-accent'}`}>
                      {copied === k ? <><Check className="w-3.5 h-3.5" /> Copiada</> : <><Copy className="w-3.5 h-3.5" /> Copiar</>}
                    </span>
                  </button>
                )))}
              </div>
              <p className="text-[10px] text-text-muted mt-1.5">En tu app: Transferir → a una llave. Tu banco te muestra el nombre del titular antes de confirmar.</p>
            </div>

            {/* 3. Comprobante */}
            <div>
              <p className="text-[11px] font-semibold text-text-secondary mb-1.5">3. Sube el pantallazo del comprobante</p>
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                     onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; pick(f); }} />
              {image ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image} alt="Comprobante" className={`w-full max-h-64 object-contain bg-black/30 ${isTech ? 'rounded-none' : 'rounded-xl'}`} />
                  <button type="button" onClick={() => fileRef.current?.click()} className="absolute top-2 right-2 px-2 py-1 text-[11px] font-semibold bg-black/70 text-white rounded-lg">Cambiar</button>
                </div>
              ) : (
                <button type="button" onClick={() => fileRef.current?.click()} disabled={state === 'reading'}
                        className={`w-full flex flex-col items-center justify-center gap-1 py-6 border-2 border-dashed border-glass-border text-text-secondary hover:border-accent/50 ${isTech ? 'rounded-none' : 'rounded-xl'}`}>
                  {state === 'reading' ? <Loader2 className="w-6 h-6 animate-spin" /> : <ImagePlus className="w-6 h-6 text-accent" />}
                  <span className="text-xs">Toca para elegir la captura</span>
                </button>
              )}
              <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Nota (opcional): desde qué cuenta enviaste"
                     className={`mt-2 w-full bg-glass border border-glass-border px-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent ${isTech ? 'rounded-none' : 'rounded-xl'}`} />
            </div>

            {state === 'error' && <p className="text-xs text-red-400">No se pudo enviar. Revisa tu conexión e inténtalo de nuevo.</p>}

            <button type="button" onClick={send} disabled={!image || state === 'sending'}
                    className={`w-full py-3.5 font-bold flex items-center justify-center gap-2 disabled:opacity-50 ${isTech ? 'bg-accent/20 border border-accent text-accent' : `bg-accent ${theme === 'light' ? 'text-white' : 'text-black'}`} ${btn}`}>
              {state === 'sending' && <Loader2 className="w-4 h-4 animate-spin" />}
              Enviar comprobante
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
