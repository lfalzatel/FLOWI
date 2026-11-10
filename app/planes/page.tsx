'use client';
import { usePlayStore } from '@/hooks/usePlayStore';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, ChevronLeft, Crown, Loader2, Minus, Receipt } from 'lucide-react';
import { ManualPayModal } from '@/components/plans/ManualPayModal';
import { ManualPaymentsReview } from '@/components/plans/ManualPaymentsReview';
import { ManualPayment, watchMyManualPayments } from '@/lib/manualPay';
import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { FREE_LIMITS, PLANS, PlanOption, usePlan } from '@/lib/plans';
import { confirmPayment, payPlan } from '@/lib/wompi';
import { formatCurrency } from '@/lib/format';

const ROWS: { label: string; free: string | boolean; premium: string | boolean }[] = [
  { label: 'Gastos, ingresos y deudas', free: 'Ilimitados', premium: 'Ilimitados' },
  { label: 'Registrar hablando', free: true, premium: true },
  { label: 'Recordatorios y notas', free: 'Ilimitados', premium: 'Ilimitados' },
  { label: 'Cuentas (Bancolombia, Nequi…)', free: 'Ilimitadas', premium: 'Ilimitadas' },
  { label: 'Inversiones y ahorros', free: `${FREE_LIMITS.investments}`, premium: 'Ilimitadas' },
  { label: 'Metas de ahorro', free: `${FREE_LIMITS.goals}`, premium: 'Ilimitadas' },
  { label: 'Recibos con foto', free: `${FREE_LIMITS.receiptsPerMonth} al mes`, premium: 'Ilimitados' },
  { label: 'Mi negocio (ventas y ganancia)', free: 'Mes actual', premium: 'Completo' },
  { label: 'Sin publicidad', free: true, premium: true },
];

export default function PlanesPage() {
  const { theme } = useTheme();
  const isTech = theme === 'cyberpunk' || theme === 'kiloCode';
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const playStore = usePlayStore();
  const [manualOpen, setManualOpen] = useState(false);
  const [myManual, setMyManual] = useState<ManualPayment[]>([]);
  useEffect(() => (user ? watchMyManualPayments(user.uid, setMyManual) : undefined), [user]);
  const lastManual = myManual[0];
  const { premium, until } = usePlan();
  const [selected, setSelected] = useState<PlanOption['id']>('anual');
  const [paying, setPaying] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => { if (!authLoading && !user) router.push('/login'); }, [authLoading, user, router]);

  // Al volver de Wompi por redirección (?id=...) se espera la activación que hace el servidor
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id');
    if (id) {
      setMessage({ ok: true, text: 'Estamos confirmando tu pago con Wompi…' });
      window.history.replaceState({}, '', '/planes');
      confirmPayment(id).then(s => setMessage(
        s === 'APPROVED' ? { ok: true, text: '¡Pago aprobado! Ya tienes FLOWI Premium.' }
        : s === 'PENDING' ? { ok: true, text: 'Tu pago está en proceso. Premium se activa apenas Wompi lo apruebe.' }
        : s ? { ok: false, text: 'El pago no se aprobó. No se te cobró nada.' }
        : { ok: true, text: 'Estamos confirmando tu pago. Premium se activa solo apenas Wompi lo apruebe.' }));
    }
  }, []);

  const pay = async () => {
    setPaying(true);
    setMessage(null);
    try {
      const r = await payPlan(selected, user?.email);
      if (!r) setMessage(null);
      else if (r.status === 'APPROVED') setMessage({ ok: true, text: '¡Pago aprobado! Premium se activa en unos segundos.' });
      else if (r.status === 'PENDING') setMessage({ ok: true, text: 'Tu pago está en proceso. Premium se activa apenas Wompi lo apruebe.' });
      else setMessage({ ok: false, text: 'El pago no se aprobó. No se te cobró nada; puedes intentar de nuevo.' });
    } catch (e: any) {
      console.error('Pago Wompi:', e);
      setMessage({ ok: false, text: 'No se pudo abrir el pago. Revisa tu conexión e intenta de nuevo.' });
    } finally {
      setPaying(false);
    }
  };

  const card = isTech ? 'bg-glass border border-accent/25 rounded-none' : 'glass-card rounded-3xl';
  const cell = (v: string | boolean) => v === true
    ? <Check className="w-4 h-4 text-accent mx-auto" />
    : v === false ? <Minus className="w-4 h-4 text-text-muted mx-auto" /> : <span>{v}</span>;
  const plan = PLANS.find(p => p.id === selected)!;

  return (
    <div className="relative min-h-screen flex flex-col bg-deep">
      <Header />
      <main className={`relative flex-1 max-w-2xl mx-auto w-full p-4 pb-32 space-y-5 animate-fade-in-up ${isTech ? 'font-mono' : ''}`}>
        <div className="flex items-center gap-3">
          <button type="button" aria-label="Volver"
                  onClick={() => { if (window.history.length > 1) router.back(); else router.push('/'); }}
                  className={`p-2 -ml-2 bg-glass border ${isTech ? 'border-accent/30 rounded-none text-accent' : 'border-glass-border rounded-full text-text-primary'}`}>
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className={`text-xl font-bold ${isTech ? 'text-accent uppercase tracking-wider' : 'font-syne text-text-primary'}`}>Planes de FLOWI</h1>
        </div>

        {premium && (
          <div className={`${card} p-4 flex items-center gap-3 border-accent/50`}>
            <Crown className="w-6 h-6 text-amber-400 shrink-0" />
            <div>
              <p className="text-sm font-bold text-text-primary">Tienes FLOWI Premium</p>
              <p className="text-xs text-text-muted">
                {until ? `Activo hasta el ${until.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}. Puedes renovar antes y se suma a tu tiempo.` : 'Activo.'}
              </p>
            </div>
          </div>
        )}

        {/* Comparación */}
        <div className={`${card} overflow-hidden`}>
          <div className="grid grid-cols-[1fr_80px_90px] text-[11px] font-bold uppercase tracking-wider px-4 py-3 border-b border-glass-border">
            <span className="text-text-muted">Incluye</span>
            <span className="text-center text-text-secondary">Gratis</span>
            <span className="text-center text-amber-400">Premium</span>
          </div>
          {ROWS.map(r => (
            <div key={r.label} className="grid grid-cols-[1fr_80px_90px] items-center text-xs px-4 py-2.5 border-b border-glass-border/50 last:border-0">
              <span className="text-text-primary">{r.label}</span>
              <span className="text-center text-text-secondary">{cell(r.free)}</span>
              <span className="text-center font-semibold text-accent">{cell(r.premium)}</span>
            </div>
          ))}
        </div>

        {playStore && (
          <p className={`text-xs text-center text-text-secondary leading-relaxed p-3 border border-glass-border ${isTech ? 'rounded-none' : 'rounded-2xl'}`}>
            En la app de Play Store todavía no se puede adquirir Premium. Si ya lo tienes, sigue activo en todos tus dispositivos.
          </p>
        )}

        {!playStore && (<>
        {/* Planes de pago */}
        <div className="grid grid-cols-3 gap-2">
          {PLANS.map(p => {
            const on = p.id === selected;
            return (
              <button key={p.id} type="button" onClick={() => setSelected(p.id)}
                      className={`relative p-3 text-center border transition-all active:scale-[0.97] ${isTech ? 'rounded-none' : 'rounded-2xl'} ${on ? 'border-accent bg-accent/10' : 'border-glass-border bg-glass'}`}>
                {p.best && <span className={`absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-bold uppercase px-2 py-0.5 bg-amber-400 text-black ${isTech ? 'rounded-none' : 'rounded-full'}`}>Recomendado</span>}
                <p className="text-[11px] font-semibold text-text-secondary">{p.label}</p>
                <p className={`text-base font-bold ${on ? 'text-accent' : 'text-text-primary'}`}>{formatCurrency(p.price, 'COP')}</p>
                <p className="text-[10px] text-text-muted">{p.months > 1 ? `${formatCurrency(Math.round(p.price / p.months), 'COP')}/mes` : 'por mes'}</p>
              </button>
            );
          })}
        </div>

        <button type="button" onClick={pay} disabled={paying}
                className={`w-full py-3.5 font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60 ${isTech ? 'rounded-none bg-accent/20 border border-accent text-accent uppercase tracking-wider text-sm' : `rounded-2xl bg-accent ${theme === 'light' ? 'text-white' : 'text-black'}`}`}>
          {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
          {premium ? 'Renovar' : 'Pagar'} {plan.label.toLowerCase()} · {formatCurrency(plan.price, 'COP')}
        </button>

        {/* Pagar por transferencia directa y enviar el comprobante */}
        <button type="button" onClick={() => setManualOpen(true)}
                className={`w-full py-3 text-sm font-semibold flex items-center justify-center gap-2 border border-glass-border text-text-primary hover:bg-white/5 ${isTech ? 'rounded-none uppercase text-xs tracking-wider' : 'rounded-2xl'}`}>
          <Receipt className="w-4 h-4 text-accent" /> Pagar por transferencia y enviar comprobante
        </button>
        {lastManual && (
          <p className={`text-xs text-center ${lastManual.status === 'APPROVED' ? 'text-emerald-400' : lastManual.status === 'REJECTED' ? 'text-red-400' : 'text-amber-400'}`}>
            {lastManual.status === 'PENDING' && `Tu comprobante (${formatCurrency(lastManual.amount, 'COP')}) está en revisión. Te activamos Premium apenas lo confirmemos.`}
            {lastManual.status === 'APPROVED' && '¡Tu pago por transferencia fue aprobado! Premium ya está activo.'}
            {lastManual.status === 'REJECTED' && `No pudimos confirmar tu último comprobante.${lastManual.reviewNote ? ` ${lastManual.reviewNote}` : ''} Escríbenos por WhatsApp si ya transferiste.`}
          </p>
        )}

        {isAdmin && <ManualPaymentsReview isTech={isTech} />}

        {message && (
          <p className={`text-sm text-center ${message.ok ? 'text-accent' : 'text-red-400'}`}>{message.text}</p>
        )}

        <p className="text-[11px] text-text-muted text-center leading-relaxed">
          Pagas una sola vez con Nequi, PSE, Bancolombia o tarjeta a través de Wompi. No es un cobro automático:
          cuando se acerque el fin de tu plan te avisamos para renovar. FLOWI no ve ni guarda los datos de tu pago.
          {' '}Al pagar aceptas los <Link href="/legal#terminos" className="underline hover:text-text-secondary">términos de uso</Link>.
        </p>
        </>)}
      </main>
      <BottomNav />
      {manualOpen && <ManualPayModal plan={selected} onClose={() => setManualOpen(false)} />}
    </div>
  );
}
