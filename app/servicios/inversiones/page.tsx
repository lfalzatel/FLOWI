'use client';
import { AnimatedNumber } from '@/components/dashboard/AnimatedNumber';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Plus, Landmark, Pencil, CalendarClock, TrendingUp, TrendingDown, RefreshCw, CheckCircle2, Info, ArrowDownToLine, ArrowUpFromLine, Scale, PiggyBank, LineChart, Umbrella } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { useInvestments } from '@/hooks/useInvestments';
import { useAccounts } from '@/hooks/useAccounts';
import { AccountPicker } from '@/components/accounts/AccountPicker';
import { formatMoneyInput, parseMoneyInput } from '@/components/accounts/AccountModals';
import { BankLogo } from '@/components/accounts/BankPickerSheet';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { ConfirmDialog } from '@/components/layout/ConfirmDialog';
import { InvestmentFormModal } from '@/components/investments/InvestmentFormModal';
import { SavingsFormModal } from '@/components/investments/SavingsFormModal';
import { Investment, InvestmentKind, addExpense, deleteInvestment, updateInvestment } from '@/lib/firestore';
import { formatCurrency } from '@/lib/format';
import { KIND_INFO, dayKey, formatDay, investmentStatus, investmentValue, kindOf, parseDay, portfolioSummary, whenText } from '@/lib/investments';

const KIND_ICON: Record<InvestmentKind, any> = { cdt: Landmark, ahorro: PiggyBank, fondo: LineChart, pension: Umbrella };
const nameOf = (inv: Investment) => kindOf(inv) === 'cdt' ? `CDT ${inv.bank}` : inv.note ? `${inv.note}` : inv.bank;

export default function InversionesPage() {
  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const { investments, loading, error } = useInvestments();
  const currency = profile?.currency || 'COP';

  const [choosingKind, setChoosingKind] = useState(false);
  const [newKind, setNewKind] = useState<InvestmentKind | null>(null);
  const [editing, setEditing] = useState<Investment | null>(null);
  const [renewing, setRenewing] = useState<Investment | null>(null);
  const [closing, setClosing] = useState<Investment | null>(null);
  const [deleting, setDeleting] = useState<Investment | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const { accounts } = useAccounts();
  const hasAccounts = accounts.some(a => !a.archived);
  const [closeAccount, setCloseAccount] = useState<string | null | undefined>(undefined);
  // Depositar / retirar / ajustar saldo / actualizar valor (ahorro, fondos y pensión)
  const [moving, setMoving] = useState<{ inv: Investment; mode: 'deposito' | 'retiro' | 'ajuste' } | null>(null);
  const [moveAmount, setMoveAmount] = useState('');
  const [moveAccount, setMoveAccount] = useState<string | null | undefined>(undefined);
  const [moveSaving, setMoveSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  const summary = useMemo(() => portfolioSummary(investments), [investments]);
  const closed = investments.filter(i => i.status === 'cerrado');
  const hasCdt = summary.active.some(i => kindOf(i) === 'cdt');

  const card = isTechTheme ? 'bg-glass border border-accent/25 rounded-none' : 'glass-card rounded-3xl';
  const fmt = (n: number) => formatCurrency(Math.round(n), currency);
  const primaryBtn = `flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold active:scale-95 transition-all ${isTechTheme ? 'rounded-none border border-accent text-accent bg-accent/10 uppercase text-xs' : `rounded-2xl bg-gradient-to-br from-accent to-accent-dim ${theme === 'light' ? 'text-white' : 'text-black'} shadow-lg shadow-accent/20`}`;
  const ghost = `flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold border transition-all active:scale-95 ${isTechTheme ? 'rounded-none border-accent/40 text-accent' : 'rounded-xl border-glass-border text-text-secondary hover:text-text-primary hover:bg-glass'}`;
  const openEdit = (inv: Investment) => { setEditing(inv); setNewKind(null); };

  async function closeInvestment(inv: Investment, registerIncome: boolean) {
    if (!inv.id || !user) return;
    const s = investmentStatus(inv);
    const at = parseDay(inv.maturityDate) > new Date() ? new Date() : parseDay(inv.maturityDate);
    const acc = closeAccount ?? null;
    await updateInvestment(inv.id, {
      status: 'cerrado', closedAt: new Date().toISOString(),
      // El capital (y los intereses, si no se registran como ingreso) vuelven a la cuenta
      payouts: [...(inv.payouts || []), { at: at.toISOString(), amount: inv.amount + (registerIncome ? 0 : s.netInterest), accountId: acc, kind: 'pago' }],
      history: [...(inv.history || []), {
        startDate: inv.startDate, maturityDate: inv.maturityDate, amount: inv.amount,
        rateEA: inv.rateEA, interest: s.interest, outcome: 'pagado',
      }],
    });
    if (registerIncome && s.netInterest > 0) {
      await addExpense({
        userId: user.uid, type: 'ingreso', amount: s.netInterest, category: 'Rendimientos / intereses',
        description: `Intereses CDT ${inv.bank}`, date: at, isFixed: false,
        ...(acc ? { accountId: acc } : {}),
      });
    }
    setClosing(null);
    setCloseAccount(undefined);
  }

  async function saveMove() {
    if (!moving?.inv.id) return;
    const { inv, mode } = moving;
    const id = inv.id as string;
    const value = parseMoneyInput(moveAmount);
    if (value <= 0 || moveSaving || (mode !== 'ajuste' && hasAccounts && moveAccount === undefined)) return;
    setMoveSaving(true);
    try {
      const now = new Date();
      const k = kindOf(inv);
      const v = investmentValue(inv, now);
      if (mode === 'ajuste') {
        // Ahorro: el saldo real de hoy pasa a ser la nueva base. Fondos: nuevo valor actual.
        if (k === 'ahorro') await updateInvestment(id, { amount: value, startDate: dayKey(now) });
        else await updateInvestment(id, { currentValue: value, valueAt: now.toISOString() });
      } else {
        const entry = { at: now.toISOString(), amount: value, accountId: moveAccount ?? null, kind: mode };
        const data: Partial<Investment> = mode === 'deposito'
          ? { fundings: [...(inv.fundings || []), entry] }
          : { payouts: [...(inv.payouts || []), entry] };
        if (k !== 'ahorro') data.currentValue = Math.max(0, v.value + (mode === 'deposito' ? value : -value));
        await updateInvestment(id, data);
      }
      setMoving(null);
      setMoveAmount('');
      setMoveAccount(undefined);
    } finally {
      setMoveSaving(false);
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col bg-deep">
      <Header />
      <main className={`relative flex-1 max-w-2xl mx-auto w-full p-4 pb-32 space-y-5 animate-fade-in-up ${isTechTheme ? 'font-mono' : ''}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/servicios" aria-label="Volver a Servicios" className={`p-2 -ml-2 bg-glass border ${isTechTheme ? 'border-accent/30 rounded-none text-accent' : 'border-glass-border rounded-full text-text-primary'}`}>
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <h1 className={`text-xl font-bold truncate ${isTechTheme ? 'text-accent uppercase tracking-wider' : 'font-syne text-text-primary'}`}>Ahorro e inversiones</h1>
          </div>
          {investments.length > 0 && <button onClick={() => setChoosingKind(true)} className={primaryBtn}><Plus className="w-4 h-4" /> Nueva</button>}
        </div>

        {error === 'permission-denied' && (
          <div className="p-4 text-sm rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-500">
            La base de datos todavía no permite leer inversiones. Hay que publicar las reglas de <b>fl_investments</b>.
          </div>
        )}

        {/* Resumen */}
        <section className={`${card} p-5`}>
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-accent/15 flex items-center justify-center"><TrendingUp className="w-4 h-4 text-accent" /></div>
              <span className={`text-xs font-medium ${isTechTheme ? 'text-accent/70 uppercase tracking-wide' : 'text-text-secondary'}`}>Tienes ahorrado e invertido</span>
            </div>
            <button onClick={() => setShowHelp(v => !v)} aria-label="¿Cómo se calcula?" className="p-1 text-text-muted hover:text-text-primary"><Info className="w-4 h-4" /></button>
          </div>
          <p className={`font-bold text-[clamp(24px,8vw,34px)] leading-none text-accent ${isTechTheme ? '' : 'font-syne'}`}><AnimatedNumber value={summary.invested} format={fmt} /></p>
          {summary.active.length > 0 && (
            <p className="text-xs text-text-muted mt-1">
              en {summary.active.length} {summary.active.length === 1 ? 'lugar' : 'lugares'}{summary.avgRate ? ` · tasa promedio ${summary.avgRate.toFixed(2).replace('.', ',')}% E.A.` : ''}
            </p>
          )}
          {summary.active.length > 0 && (
            <div className={`mt-4 pt-4 border-t ${isTechTheme ? 'border-accent/20' : 'border-glass-border'} grid grid-cols-2 gap-3`}>
              <div>
                <p className="text-[11px] text-text-muted">Llevas ganado</p>
                <p className={`font-bold ${summary.earnedToDate < 0 ? 'text-red-400' : 'text-text-primary'}`}>{summary.earnedToDate < 0 ? '−' : ''}<AnimatedNumber value={Math.abs(summary.earnedToDate)} format={fmt} /></p>
              </div>
              {hasCdt && (
                <div>
                  <p className="text-[11px] text-text-muted">Intereses de CDT al vencer</p>
                  <p className="font-bold text-emerald-500"><AnimatedNumber value={summary.netInterest} format={fmt} /></p>
                  <p className="text-[10px] text-text-muted">después de retención</p>
                </div>
              )}
            </div>
          )}
          {showHelp && (
            <p className={`mt-4 pt-4 border-t ${isTechTheme ? 'border-accent/20' : 'border-glass-border'} text-xs text-text-secondary leading-relaxed`}>
              Es <b className="text-text-primary">ahorro, no gasto</b>: no cuenta en lo que puedes gastar en el mes. Si sacas la plata de una de tus cuentas, la descuento de esa cuenta.
              <br />· <b className="text-text-primary">CDT</b>: los intereses se pagan al vencer; "llevas ganado" reparte los del periodo según los días corridos.
              <br />· <b className="text-text-primary">Ahorro que paga intereses</b> (Nu, Lulo…): calculo los intereses día a día con la tasa E.A. Si no cuadra con la app, usa "Ajustar saldo".
              <br />· <b className="text-text-primary">Acciones, fondos y pensión</b>: su valor sube y baja; actualízalo con lo que dice la app y te muestro la ganancia o pérdida.
            </p>
          )}
        </section>

        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" /></div>
        ) : investments.length === 0 ? (
          <section className={`${card} p-6 text-center`}>
            <div className={`w-14 h-14 mx-auto mb-3 flex items-center justify-center bg-accent/10 ${isTechTheme ? 'rounded-none border border-accent/40' : 'rounded-2xl'}`}>
              <TrendingUp className="w-7 h-7 text-accent" />
            </div>
            <h2 className={`font-bold text-lg mb-1 ${isTechTheme ? 'text-accent uppercase' : 'text-text-primary'}`}>¿Dónde crece tu plata?</h2>
            <p className="text-sm text-text-secondary mb-5">Un CDT, una Cajita de Nu, Lulo, Trii, un fondo o tu pensión voluntaria. Regístralo y te digo cuánto vas ganando.</p>
            <button onClick={() => setChoosingKind(true)} className={`inline-flex items-center gap-2 px-6 py-3 font-semibold active:scale-95 transition-all ${isTechTheme ? 'rounded-none border border-accent text-accent bg-accent/10 uppercase text-sm' : `rounded-xl bg-accent ${theme === 'light' ? 'text-white' : 'text-black'}`}`}>
              <Plus className="w-5 h-5" /> Registrar la primera
            </button>
          </section>
        ) : (
          <>
            <div className="space-y-3">
              {summary.active.map(inv => {
                const k = kindOf(inv);
                const KIcon = KIND_ICON[k];
                const header = (sub: React.ReactNode, tag?: string) => (
                  <div className="flex items-start gap-3">
                    <div className={`shrink-0 w-11 h-11 flex items-center justify-center bg-glass border ${isTechTheme ? 'rounded-none border-accent/30' : 'rounded-2xl border-glass-border'}`}>
                      <BankLogo label={inv.bank} className="w-6 h-6 text-xl flex items-center justify-center" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className={`font-bold truncate ${isTechTheme ? 'text-accent uppercase text-sm' : 'text-text-primary'}`}>{nameOf(inv)}</h3>
                        {tag && <span className={`shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-accent/15 text-accent ${isTechTheme ? 'rounded-none' : 'rounded-full'}`}>{tag}</span>}
                      </div>
                      <p className="text-xs text-text-secondary mt-0.5 flex items-center gap-1"><KIcon className="w-3 h-3 text-text-muted" />{sub}</p>
                    </div>
                    <button onClick={() => openEdit(inv)} aria-label={`Editar ${nameOf(inv)}`}
                            className={`shrink-0 p-2 -mr-1 -mt-1 ${isTechTheme ? 'text-accent/70 hover:text-accent' : 'text-text-muted hover:text-text-primary'}`}>
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                );

                if (k !== 'cdt') {
                  const v = investmentValue(inv);
                  const pctGain = v.invested > 0 ? (v.earned / v.invested) * 100 : 0;
                  const loss = v.earned < 0;
                  return (
                    <article key={inv.id} className={`${card} p-4`}>
                      {header(<>{k === 'fondo' && inv.assetType === 'acciones' ? 'Acciones' : KIND_INFO[k].short}{inv.note ? ` · ${inv.bank}` : ''}</>, k === 'ahorro' && inv.rateEA ? `${String(inv.rateEA).replace('.', ',')}% E.A.` : undefined)}
                      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[12px]">
                        <div>
                          <p className="text-text-muted">{k === 'ahorro' ? 'Saldo hoy (aprox.)' : 'Vale hoy'}</p>
                          <p className="font-bold text-base text-text-primary"><AnimatedNumber value={v.value} format={fmt} /></p>
                          {k !== 'ahorro' && inv.valueAt && <p className="text-[10px] text-text-muted">actualizado el {new Date(inv.valueAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}</p>}
                        </div>
                        <div>
                          <p className="text-text-muted">{k === 'ahorro' ? 'Intereses ganados' : loss ? 'Pérdida' : 'Ganancia'}</p>
                          <p className={`font-bold text-base flex items-center gap-1 ${loss ? 'text-red-400' : 'text-emerald-500'}`}>
                            {loss ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                            {loss ? '−' : '+'}{fmt(Math.abs(v.earned))}
                          </p>
                          {k !== 'ahorro' && v.invested > 0 && <p className={`text-[10px] ${loss ? 'text-red-400' : 'text-text-muted'}`}>{pctGain >= 0 ? '+' : ''}{pctGain.toFixed(1).replace('.', ',')}% sobre {fmt(v.invested)}</p>}
                          {k === 'ahorro' && <p className="text-[10px] text-text-muted">desde el {formatDay(inv.startDate)}</p>}
                        </div>
                      </div>
                      {k === 'fondo' && (inv.symbol || inv.units || inv.dividends || inv.yearReturn) && (
                        <p className="mt-2 text-[11px] text-text-secondary">
                          {[
                            inv.symbol && `${inv.symbol}`,
                            inv.units && `${String(inv.units).replace('.', ',')} ${inv.units === 1 ? 'acción' : 'acciones'}`,
                            inv.dividends && `dividendos recibidos ${fmt(inv.dividends)}`,
                            inv.yearReturn && `rentabilidad último año ${String(inv.yearReturn).replace('.', ',')}% (referencia)`,
                          ].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      {k !== 'ahorro' && inv.valueAt && Date.now() - new Date(inv.valueAt).getTime() > 30 * 86400000 && (
                        <p className="mt-2 text-[11px] text-amber-500">Hace más de un mes no actualizas el valor: toca "Actualizar valor" con lo que dice la app.</p>
                      )}
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <button onClick={() => { setMoving({ inv, mode: 'deposito' }); setMoveAmount(''); setMoveAccount(undefined); }} className={ghost}><ArrowDownToLine className="w-3.5 h-3.5" /> Depositar</button>
                        <button onClick={() => { setMoving({ inv, mode: 'retiro' }); setMoveAmount(''); setMoveAccount(undefined); }} className={ghost}><ArrowUpFromLine className="w-3.5 h-3.5" /> Retirar</button>
                        <button onClick={() => { setMoving({ inv, mode: 'ajuste' }); setMoveAmount(formatMoneyInput(v.value)); }} className={ghost}>
                          {k === 'ahorro' ? <><Scale className="w-3.5 h-3.5" /> Ajustar</> : <><RefreshCw className="w-3.5 h-3.5" /> Valor</>}
                        </button>
                      </div>
                    </article>
                  );
                }

                const s = investmentStatus(inv);
                const pct = Math.round(s.progress * 100);
                const soon = s.daysLeft <= 3;
                return (
                  <article key={inv.id} className={`${card} p-4`}>
                    {header(<><b className="text-text-primary"><AnimatedNumber value={inv.amount} format={fmt} /></b>&nbsp;· {s.termDays} días</>, `${String(inv.rateEA).replace('.', ',')}% E.A.`)}
                    {inv.note && <p className="text-[11px] text-text-muted truncate mt-1">{inv.note}</p>}

                    <div className="mt-3 flex items-center gap-3">
                      <div className={`flex-1 h-2.5 overflow-hidden bg-glass border border-glass-border ${isTechTheme ? 'rounded-none' : 'rounded-full'}`}
                           role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Plazo corrido del CDT ${inv.bank}`}>
                        <div className={`h-full bg-gradient-to-r from-accent-dim to-accent transition-all duration-700 ${isTechTheme ? '' : 'rounded-full'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-bold text-accent w-9 text-right">{pct}%</span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[12px]">
                      <div>
                        <p className="text-text-muted">Llevas ganado</p>
                        <p className="font-semibold text-text-primary"><AnimatedNumber value={s.earnedToDate} format={fmt} /></p>
                      </div>
                      <div>
                        <p className="text-text-muted">Intereses del periodo{s.isEstimate ? ' (aprox.)' : ''}</p>
                        <p className="font-semibold text-text-primary"><AnimatedNumber value={s.interest} format={fmt} /></p>
                      </div>
                      <div>
                        <p className="text-text-muted">Recibirás al vencer</p>
                        <p className="font-semibold text-emerald-500"><AnimatedNumber value={s.netAtMaturity} format={fmt} /></p>
                        <p className="text-[10px] text-text-muted">menos {fmt(s.withholding)} de retención</p>
                      </div>
                      <div>
                        <p className="text-text-muted">Vence</p>
                        <p className={`font-semibold ${soon ? 'text-amber-500' : 'text-text-primary'}`}>{formatDay(inv.maturityDate)}</p>
                        <p className={`text-[10px] ${soon ? 'text-amber-500' : 'text-text-muted'}`}>{whenText(s.daysLeft)}{inv.autoRenew ? ' · se renueva solo' : ''}</p>
                      </div>
                    </div>

                    {s.matured ? (
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <button onClick={() => setRenewing(inv)}
                                className={`flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-all active:scale-[0.98] ${isTechTheme ? 'rounded-none border border-accent text-accent bg-accent/10 uppercase text-xs' : 'rounded-xl bg-accent/15 text-accent hover:bg-accent/25'}`}>
                          <RefreshCw className="w-4 h-4" /> Lo renové
                        </button>
                        <button onClick={() => setClosing(inv)}
                                className={`flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-all active:scale-[0.98] ${isTechTheme ? 'rounded-none border border-emerald-500 text-emerald-500 uppercase text-xs' : 'rounded-xl bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25'}`}>
                          <CheckCircle2 className="w-4 h-4" /> Me lo pagaron
                        </button>
                      </div>
                    ) : soon ? (
                      <p className="mt-3 flex items-start gap-1.5 text-[12px] text-amber-500">
                        <CalendarClock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span>Antes de que se renueve, compara la tasa con otros bancos.</span>
                      </p>
                    ) : null}
                  </article>
                );
              })}
            </div>

            {closed.length > 0 && (
              <section>
                <h2 className={`text-xs font-bold uppercase tracking-wider mb-2 ${isTechTheme ? 'text-accent/70' : 'text-text-muted'}`}>Terminados</h2>
                <div className="space-y-2">
                  {closed.map(inv => {
                    const last = inv.history?.[inv.history.length - 1];
                    return (
                      <button key={inv.id} onClick={() => openEdit(inv)} className={`${card} w-full p-3.5 flex items-center gap-3 text-left`}>
                        <TrendingUp className="w-5 h-5 text-emerald-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold truncate ${isTechTheme ? 'text-accent text-sm uppercase' : 'text-text-primary'}`}>{nameOf(inv)} · {fmt(inv.amount)}</p>
                          <p className="text-xs text-text-muted">{inv.maturityDate ? `Venció el ${formatDay(inv.maturityDate)}` : 'Cerrado'}{last ? ` · ganó ${fmt(last.interest)}` : ''}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            <p className="text-[11px] text-text-muted text-center px-4">
              Esta plata no cuenta como gasto ni en lo que puedes gastar en el mes. No guardes números de producto ni de cuenta.
            </p>
          </>
        )}
      </main>
      <BottomNav />

      {/* ¿Qué vas a registrar? */}
      {choosingKind && typeof document !== 'undefined' && createPortal(
        <div className={`fixed inset-0 z-[100] flex items-end sm:items-center justify-center ${isTechTheme ? 'font-mono' : ''}`}>
          <div className={`absolute inset-0 ${theme === 'light' ? 'bg-black/20' : 'bg-black/60'}`} onClick={() => setChoosingKind(false)} aria-hidden="true" />
          <div className={`relative w-full max-w-md p-5 pb-7 border animate-fade-in-up ${isTechTheme ? 'bg-deep rounded-none border-accent/50' : 'bg-card rounded-t-[28px] sm:rounded-3xl border-glass-border'}`}>
            <h2 className={`mb-3 ${isTechTheme ? 'font-bold text-accent uppercase' : 'font-syne font-bold text-lg text-text-primary'}`}>¿Qué vas a registrar?</h2>
            <div className="space-y-2">
              {(Object.keys(KIND_INFO) as InvestmentKind[]).map(k => {
                const KIcon = KIND_ICON[k];
                return (
                  <button key={k} type="button" onClick={() => { setChoosingKind(false); setEditing(null); setNewKind(k); }}
                          className={`w-full flex items-center gap-3 p-3.5 border text-left transition-all active:scale-[0.99] ${isTechTheme ? 'rounded-none border-accent/30 hover:bg-accent/10' : 'rounded-2xl border-glass-border hover:bg-white/5'}`}>
                    <span className={`w-10 h-10 flex items-center justify-center bg-accent/15 ${isTechTheme ? 'rounded-none' : 'rounded-xl'}`}><KIcon className="w-5 h-5 text-accent" /></span>
                    <span className="flex-1 min-w-0">
                      <span className={`block font-semibold ${isTechTheme ? 'text-accent' : 'text-text-primary'}`}>{KIND_INFO[k].label}</span>
                      <span className="block text-[11px] text-text-muted">{KIND_INFO[k].examples}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>,
        document.body,
      )}

      {(newKind === 'cdt' || (editing && kindOf(editing) === 'cdt') || renewing) && (
        <InvestmentFormModal
          investment={renewing ? null : editing}
          renewFrom={renewing}
          currency={currency}
          onClose={() => { setNewKind(null); setEditing(null); setRenewing(null); }}
          onDelete={(inv) => { setEditing(null); setDeleting(inv); }}
        />
      )}
      {((newKind && newKind !== 'cdt') || (editing && kindOf(editing) !== 'cdt')) && (
        <SavingsFormModal
          kind={(editing ? kindOf(editing) : newKind) as Exclude<InvestmentKind, 'cdt'>}
          investment={editing}
          onClose={() => { setNewKind(null); setEditing(null); }}
          onDelete={(inv) => { setEditing(null); setDeleting(inv); }}
        />
      )}

      {closing && typeof document !== 'undefined' && createPortal(
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 ${isTechTheme ? 'font-mono' : ''}`}>
          <div className={`absolute inset-0 ${theme === 'light' ? 'bg-black/10' : 'bg-black/40'}`} onClick={() => setClosing(null)} aria-hidden="true" />
          <div className={`w-full max-w-sm relative z-10 animate-fade-in-up glass-dropdown p-6 ${isTechTheme ? 'rounded-none border border-accent/50' : 'rounded-3xl'}`}>
            <h2 className={`font-bold text-lg mb-2 ${isTechTheme ? 'text-accent uppercase' : 'font-syne text-text-primary'}`}>CDT {closing.bank} pagado</h2>
            <p className="text-sm text-text-secondary mb-5">
              ¿Registro los {fmt(investmentStatus(closing).netInterest)} de intereses como un ingreso? El capital ({fmt(closing.amount)}) era tuyo, así que no lo cuento como ingreso.
            </p>
            {hasAccounts && (
              <div className="mb-4">
                <AccountPicker accounts={accounts} value={closeAccount} onChange={setCloseAccount}
                               label="¿A qué cuenta llegó la plata?" noneLabel="A ninguna de mis cuentas" />
              </div>
            )}
            <div className="space-y-2">
              <button onClick={() => closeInvestment(closing, true)} disabled={hasAccounts && closeAccount === undefined} className={`w-full py-3 font-bold disabled:opacity-50 ${isTechTheme ? 'rounded-none bg-accent/20 border border-accent text-accent uppercase' : 'rounded-xl bg-accent text-white'}`}>
                Sí, registrar intereses
              </button>
              <button onClick={() => closeInvestment(closing, false)} disabled={hasAccounts && closeAccount === undefined} className={`w-full py-3 text-sm font-semibold border disabled:opacity-50 ${isTechTheme ? 'rounded-none border-accent/30 text-accent' : 'rounded-xl border-glass-border text-text-secondary'}`}>
                Solo marcarlo como terminado
              </button>
              <button onClick={() => setClosing(null)} className="w-full py-2 text-xs text-text-muted">Cancelar</button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {moving && typeof document !== 'undefined' && createPortal(
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 ${isTechTheme ? 'font-mono' : ''}`}>
          <div className={`absolute inset-0 ${theme === 'light' ? 'bg-black/10' : 'bg-black/40'}`} onClick={() => setMoving(null)} aria-hidden="true" />
          <div className={`w-full max-w-sm relative z-10 animate-fade-in-up glass-dropdown p-6 space-y-4 ${isTechTheme ? 'rounded-none border border-accent/50' : 'rounded-3xl'}`}>
            <h2 className={`font-bold text-lg ${isTechTheme ? 'text-accent uppercase' : 'font-syne text-text-primary'}`}>
              {moving.mode === 'deposito' ? 'Depositar en' : moving.mode === 'retiro' ? 'Retirar de' : kindOf(moving.inv) === 'ahorro' ? 'Ajustar saldo de' : 'Actualizar valor de'} {nameOf(moving.inv)}
            </h2>
            <div>
              <label htmlFor="mv-amount" className="text-xs text-text-muted mb-1.5 block">
                {moving.mode === 'ajuste' ? (kindOf(moving.inv) === 'ahorro' ? '¿Cuánto dice la app que tienes hoy?' : '¿Cuánto vale hoy según la app?') : '¿Cuánto?'}
              </label>
              <input id="mv-amount" type="text" inputMode="decimal" placeholder="$ 0" value={moveAmount} autoFocus
                     onChange={(e) => setMoveAmount(formatMoneyInput(e.target.value))}
                     className={`w-full bg-glass border px-4 py-3 font-bold text-text-primary focus:outline-none ${isTechTheme ? 'border-accent/30 rounded-none focus:border-accent' : 'border-glass-border rounded-xl focus:border-accent'}`} />
              {moving.mode === 'ajuste' && kindOf(moving.inv) === 'ahorro' && (
                <p className="text-[11px] text-text-muted mt-1.5">Desde hoy calculo los intereses a partir de ese saldo.</p>
              )}
            </div>
            {moving.mode !== 'ajuste' && (
              <AccountPicker accounts={accounts} value={moveAccount} onChange={setMoveAccount}
                             label={moving.mode === 'deposito' ? '¿De qué cuenta sale?' : '¿A qué cuenta llega?'}
                             noneLabel={moving.mode === 'deposito' ? 'No descontar' : 'A ninguna'}
                             hint={moving.mode === 'deposito' ? 'Lo descuento de la cuenta y de lo que puedes gastar este mes (es ahorro, no gasto).' : 'La plata vuelve a esa cuenta; no cuenta como ingreso.'} />
            )}
            <div className="space-y-2">
              <button onClick={saveMove} disabled={parseMoneyInput(moveAmount) <= 0 || moveSaving || (moving.mode !== 'ajuste' && hasAccounts && moveAccount === undefined)}
                      className={`w-full py-3 font-bold disabled:opacity-50 ${isTechTheme ? 'rounded-none bg-accent/20 border border-accent text-accent uppercase' : 'rounded-xl bg-accent text-white'}`}>
                {moveSaving ? 'Guardando...' : 'Guardar'}
              </button>
              <button onClick={() => setMoving(null)} className="w-full py-2 text-xs text-text-muted">Cancelar</button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      <ConfirmDialog
        isOpen={!!deleting}
        title="Eliminar"
        message={deleting ? `¿Eliminar ${nameOf(deleting)}? No se borra ningún gasto ni ingreso.` : ''}
        confirmText="Eliminar"
        onConfirm={async () => { if (deleting?.id) await deleteInvestment(deleting.id); setDeleting(null); setEditing(null); }}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
