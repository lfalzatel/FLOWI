'use client';
import { useTourAction } from '@/components/tour/useTourEdit';
import { currentLocale, tr } from '@/lib/i18n';
import { AnimatedNumber } from '@/components/dashboard/AnimatedNumber';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronDown, Plus, Wallet, ArrowLeftRight, Pencil, Scale, Info, Landmark, CreditCard, HandCoins } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { useAccounts } from '@/hooks/useAccounts';
import { useExpenses } from '@/hooks/useExpenses';
import { useInvestments } from '@/hooks/useInvestments';
import { useDebts } from '@/hooks/useDebts';
import { AddDebtModal } from '@/components/forms/AddDebtModal';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { ConfirmDialog } from '@/components/layout/ConfirmDialog';
import { AccountFormModal, AdjustBalanceModal, TransferModal } from '@/components/accounts/AccountModals';
import { AccountIcon } from '@/components/accounts/AccountIcon';
import { Account, Debt, Transfer, deleteAccount } from '@/lib/firestore';
import { AccountState, KIND_LABEL, accountPeriod, accountStates, netWorth } from '@/lib/accounts';
import { DateFilter, FilterType } from '@/components/dashboard/DateFilter';
import { getLocalMonthString } from '@/lib/dateUtils';
import { businessMoneyByAccount } from '@/lib/business';
import { formatCurrency } from '@/lib/format';

import { MONEY_TEXT, toneOf } from '@/lib/moneyTone';
import { PageTourButton } from '@/components/tour/PageTourButton';
export default function CuentasPage() {
  const { theme } = useTheme();
  const isTech = theme === 'cyberpunk' || theme === 'kiloCode';
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const { accounts, transfers, loading, error } = useAccounts();
  const { transactions } = useExpenses();
  const { investments } = useInvestments();
  const { debts, refresh: refreshDebts } = useDebts();
  const currency = profile?.currency || 'COP';
  // Las cuentas pueden tener centavos (como en la app del banco): se muestran solo si los hay
  const fmt = (n: number) => {
    const v = Math.round(n * 100) / 100;
    const cents = Math.abs(v % 1) > 0.004;
    try {
      return new Intl.NumberFormat('es-CO', { style: 'currency', currency, minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: 2 }).format(v);
    } catch { return formatCurrency(v, currency); }
  };

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [deleting, setDeleting] = useState<Account | null>(null);
  const [adjusting, setAdjusting] = useState<AccountState | null>(null);
  const [transferFrom, setTransferFrom] = useState<string | null>(null);
  const [paying, setPaying] = useState<AccountState | null>(null);
  const [editingTransfer, setEditingTransfer] = useState<Transfer | null>(null);
  const [openDebt, setOpenDebt] = useState<Debt | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  // Periodo de los movimientos de cada cuenta (por defecto el mes actual); el saldo de arriba siempre es el de hoy
  const [periodType, setPeriodType] = useState<FilterType>('month');
  const [periodValue, setPeriodValue] = useState(getLocalMonthString());
  const [showAllMoves, setShowAllMoves] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  // "Nueva cuenta" desde el botón + (en esta página) o desde otra página (?nueva=1)
  useEffect(() => {
    const open = () => { setEditing(null); setShowForm(true); };
    if (new URLSearchParams(window.location.search).get('nueva') === '1') {
      window.history.replaceState(null, '', window.location.pathname);
      open();
    }
    window.addEventListener('flowi-new-account', open);
    // "Mover plata" desde el menú del botón + (aquí mismo o desde otra página con ?mover=1)
    const move = () => setTransferFrom('');
    if (new URLSearchParams(window.location.search).get('mover') === '1') {
      window.history.replaceState(null, '', window.location.pathname);
      move();
    }
    window.addEventListener('flowi-new-transfer', move);
    // El tutorial abre el formulario para mostrarlo y lo cierra al pasar de paso o terminar
    let byTour = false;
    const tourOpen = (e: Event) => { if ((e as CustomEvent).detail === 'account') { byTour = true; open(); } };
    const tourClose = () => { if (byTour) { byTour = false; setShowForm(false); setEditing(null); } };
    window.addEventListener('flowi-tour-open', tourOpen);
    window.addEventListener('flowi-tour-close', tourClose);
    return () => {
      window.removeEventListener('flowi-new-account', open);
      window.removeEventListener('flowi-new-transfer', move);
      window.removeEventListener('flowi-tour-open', tourOpen);
      window.removeEventListener('flowi-tour-close', tourClose);
    };
  }, []);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  const states = useMemo(() => accountStates(accounts, transactions, transfers, investments, debts), [accounts, transactions, transfers, investments, debts]);
  // Tutorial: despliega la primera cuenta para mostrar Ajustar saldo, Mover y Editar
  useTourAction('acc-expand', () => { const id = states[0]?.account.id; if (!id) return false; setExpanded(id); return true; }, () => setExpanded(null));
  // Parte del saldo que es plata del negocio (ventas − costos por esa cuenta); el resto es personal
  const bizMap = useMemo(() => businessMoneyByAccount(accounts, transactions), [accounts, transactions]);
  const worth = useMemo(() => netWorth(states, investments, debts), [states, investments, debts]);

  const card = isTech ? 'bg-glass border border-accent/25 rounded-none' : 'glass-card rounded-3xl';
  const btn = `flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold active:scale-95 transition-all ${isTech ? 'rounded-none border border-accent text-accent bg-accent/10 uppercase text-xs' : `rounded-2xl bg-gradient-to-br from-accent to-accent-dim ${(theme === 'light' || theme === 'nova') ? 'text-white' : 'text-black'} shadow-lg shadow-accent/20`}`;
  const ghost = `flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold border transition-all active:scale-95 ${isTech ? 'rounded-none border-accent/40 text-accent' : 'rounded-xl border-glass-border text-text-secondary hover:text-text-primary hover:bg-glass'}`;

  const rows: { label: string; value: number; sign: 1 | -1; href?: string; icon: any; tone: 'pos' | 'save' | 'debt' }[] = [
    { label: tr('En tus cuentas'), value: worth.accounts, sign: 1, icon: Wallet, tone: 'pos' },
    { label: tr('En CDT'), value: worth.investments, sign: 1, href: '/servicios/inversiones', icon: Landmark, tone: 'save' },
    { label: tr('Te deben'), value: worth.owedToMe, sign: 1, href: '/deudas', icon: HandCoins, tone: 'pos' },
    { label: tr('Debes en tarjetas'), value: worth.cards, sign: -1, icon: CreditCard, tone: 'debt' },
    { label: tr('Debes en préstamos'), value: worth.debts, sign: -1, href: '/deudas', icon: CreditCard, tone: 'debt' },
  ];

  return (
    <div className="relative min-h-screen flex flex-col bg-deep">
      <Header />
      <main className={`relative flex-1 max-w-2xl mx-auto w-full p-4 pb-32 space-y-5 animate-fade-in-up ${isTech ? 'font-mono' : ''}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/servicios" aria-label={tr('Volver a Servicios')} className={`p-2 -ml-2 bg-glass border ${isTech ? 'border-accent/30 rounded-none text-accent' : 'border-glass-border rounded-full text-text-primary'}`}>
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <h1 className={`text-2xl font-bold leading-tight truncate ${isTech ? 'text-accent uppercase tracking-wider' : 'font-syne text-text-primary'}`}>{tr('Cuentas y patrimonio')}</h1>
            <PageTourButton id="cuentas" className="ml-auto" />
          </div>
          {states.length > 0 && <button onClick={() => { setEditing(null); setShowForm(true); }} className={btn}><Plus className="w-4 h-4" /> {tr('Cuenta')}</button>}
        </div>

        {error === 'permission-denied' && (
          <div className="p-4 text-sm rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-500">
            La base de datos todavía no permite leer cuentas. Hay que publicar las reglas de <b>fl_accounts</b> y <b>fl_transfers</b>.
          </div>
        )}

        {/* Patrimonio neto */}
        <section className={`${card} p-5`} data-tour="acc-networth">
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-medium ${isTech ? 'text-accent/70 uppercase tracking-wide' : 'text-text-secondary'}`}>{tr('Tu patrimonio neto')}</span>
            <button onClick={() => setShowHelp(v => !v)} aria-label={tr('¿Qué es el patrimonio neto?')} className="p-1 text-text-muted hover:text-text-primary"><Info className="w-4 h-4" /></button>
          </div>
          <p className={`font-bold text-[clamp(26px,9vw,38px)] leading-none ${worth.total >= 0 ? 'text-money-pos' : 'text-money-neg'} ${isTech ? '' : 'font-syne'}`}>
            {worth.total < 0 ? '−' : ''}<AnimatedNumber value={Math.abs(worth.total)} format={fmt} />
          </p>
          <p className="text-xs text-text-muted mt-1">{tr('Tienes {a} · debes {b}', { a: fmt(worth.assets), b: fmt(worth.liabilities) })}</p>

          <div className={`mt-4 pt-3 border-t ${isTech ? 'border-accent/20' : 'border-glass-border'} space-y-1`}>
            {rows.filter(r => r.value > 0 || r.label === 'En tus cuentas').map(r => {
              const content = (
                <>
                  <r.icon className={`w-4 h-4 shrink-0 ${MONEY_TEXT[r.tone]}`} />
                  <span className="flex-1 text-sm text-text-secondary">{r.label}</span>
                  <span className={`text-sm font-semibold ${MONEY_TEXT[r.tone]}`}>{r.sign < 0 ? '−' : ''}<AnimatedNumber value={r.value} format={fmt} /></span>
                </>
              );
              return r.href
                ? <Link key={r.label} href={r.href} className="flex items-center gap-2.5 py-1.5 hover:opacity-80">{content}</Link>
                : <div key={r.label} className="flex items-center gap-2.5 py-1.5">{content}</div>;
            })}
          </div>

          {showHelp && (
            <p className={`mt-3 pt-3 border-t ${isTech ? 'border-accent/20' : 'border-glass-border'} text-xs text-text-secondary leading-relaxed`}>
              Es todo lo que tienes menos todo lo que debes: la plata en tus cuentas, tus CDT (con lo que llevan ganado) y lo que te deben,
              menos lo que debes en tarjetas y préstamos (con los intereses a la fecha). Si sube mes a mes, vas bien aunque un mes gastes más.
            </p>
          )}
        </section>

        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" /></div>
        ) : states.length === 0 ? (
          <section className={`${card} p-6 text-center`}>
            <div className={`w-14 h-14 mx-auto mb-3 flex items-center justify-center bg-accent/10 ${isTech ? 'rounded-none border border-accent/40' : 'rounded-2xl'}`}>
              <Wallet className="w-7 h-7 text-accent" />
            </div>
            <h2 className={`font-bold text-lg mb-1 ${isTech ? 'text-accent uppercase' : 'text-text-primary'}`}>{tr('¿Dónde está tu plata?')}</h2>
            <p className="text-sm text-text-secondary mb-5">
              Agrega tus cuentas (Bancolombia, Nequi, efectivo…) con lo que tienes hoy. Desde ahí tus gastos e ingresos las van moviendo y ves tu patrimonio completo.
            </p>
            <button onClick={() => { setEditing(null); setShowForm(true); }}
                    className={`inline-flex items-center gap-2 px-6 py-3 font-semibold active:scale-95 transition-all ${isTech ? 'rounded-none border border-accent text-accent bg-accent/10 uppercase text-sm' : `rounded-xl bg-accent ${(theme === 'light' || theme === 'nova') ? 'text-white' : 'text-black'}`}`}>
              <Plus className="w-5 h-5" /> {tr('Agregar mi primera cuenta')}
            </button>
          </section>
        ) : (
          <>
            {states.length > 1 && (
              <button data-tour="acc-transfer" onClick={() => setTransferFrom('')} className={`w-full ${ghost} py-3 text-sm`}>
                <ArrowLeftRight className="w-4 h-4" /> {tr('Mover plata entre cuentas')}
              </button>
            )}
            <div className="space-y-3">
              {states.map(st => {
                const a = st.account;
                const open = expanded === a.id;
                const credit = a.kind === 'credito';
                const per = open ? accountPeriod(st, periodType, periodValue) : null;
                const shown = per ? (showAllMoves ? per.movements : per.movements.slice(0, 15)) : [];
                return (
                  <article key={a.id} data-tour="list-item" className={`${card} p-4`}>
                    <button type="button" onClick={() => { setExpanded(open ? null : a.id!); setShowAllMoves(false); }} className="w-full flex items-center gap-3 text-left">
                      <div className={`shrink-0 w-11 h-11 flex items-center justify-center text-2xl bg-glass border ${isTech ? 'rounded-none border-accent/30' : 'rounded-2xl border-glass-border'}`}><AccountIcon account={a} className="w-7 h-7 text-2xl flex items-center justify-center" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className={`font-bold truncate ${isTech ? 'text-accent uppercase text-sm' : 'text-text-primary'}`}>{a.name}</h3>
                          {a.purpose === 'ahorro' && <span className={`shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-money-save/15 text-money-save ${isTech ? 'rounded-none' : 'rounded-full'}`}>{tr('Ahorro')}</span>}
                          {a.isDefault && <span className={`shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-accent/15 text-accent ${isTech ? 'rounded-none' : 'rounded-full'}`}>{tr('Principal')}</span>}
                        </div>
                        <p className="text-[11px] text-text-muted truncate">{tr(KIND_LABEL[a.kind])}{a.methods.length ? ` · ${a.methods.join(', ')}` : ''}</p>
                        {Math.round(bizMap.get(a.id!) || 0) !== 0 && !credit && (
                          <p className="text-[11px] truncate">
                            <span className="text-orange-400">🏪 Negocio {fmt(bizMap.get(a.id!) || 0)}</span>
                            <span className="text-text-muted"> · tuyo {fmt(st.balance - (bizMap.get(a.id!) || 0))}</span>
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`font-bold ${credit && st.balance < 0 ? MONEY_TEXT.debt : MONEY_TEXT[toneOf(st.balance, a.purpose === 'ahorro' ? 'save' : 'pos')]} ${isTech ? '' : 'font-syne'}`}>
                          {credit && st.balance < 0
                            ? <>{tr('Debes')} <AnimatedNumber value={-st.balance} format={fmt} /></>
                            : <>{st.balance < 0 ? '−' : ''}<AnimatedNumber value={Math.abs(st.balance)} format={fmt} /></>}
                        </p>
                        <ChevronDown className={`w-4 h-4 ml-auto text-text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
                      </div>
                    </button>

                    {!credit && st.balance < -0.5 && (
                      <div className={`mt-3 p-2.5 flex items-center gap-2 border border-red-400/30 bg-red-500/10 ${isTech ? 'rounded-none' : 'rounded-xl'}`}>
                        <p className="flex-1 text-[11px] text-red-300 leading-snug">{tr('Saldo negativo. Si en el banco no es así, algún movimiento quedó en la cuenta equivocada o falta uno.')}</p>
                        <button type="button" onClick={() => setAdjusting(st)}
                                className={`shrink-0 px-2.5 py-1.5 text-[11px] font-semibold border border-red-400/50 text-red-300 ${isTech ? 'rounded-none' : 'rounded-lg'}`}>
                          {tr('Ajustar al saldo del banco')}
                        </button>
                      </div>
                    )}

                    {credit && (a.creditLimit || 0) > 0 && (() => {
                      const used = Math.max(0, -st.balance);
                      const pct = Math.min(100, (used / a.creditLimit!) * 100);
                      return (
                        <div className="mt-3">
                          <p className="text-[11px] text-text-muted truncate">{tr('Disponible')} <span className={used > a.creditLimit! ? 'text-red-400 font-semibold' : 'text-text-primary font-semibold'}>{fmt(Math.max(0, a.creditLimit! - used))}</span> {tr('de')} {fmt(a.creditLimit!)}</p>
                          <div className={`mt-1 h-1.5 bg-white/10 overflow-hidden ${isTech ? 'rounded-none' : 'rounded-full'}`}>
                            <div className={`h-full ${pct >= 90 ? 'bg-red-400' : pct >= 70 ? 'bg-amber-400' : 'bg-accent'}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })()}
                    {credit && (() => {
                      // Préstamos que viven en esta tarjeta: se abonan en la deuda (con sus intereses y cuotas)
                      const linkedDebts = st.movements.filter(m => m.kind === 'debt').map(m => (m as { debt: Debt }).debt);
                      const ownOwed = -st.balance - st.movements.filter(m => m.kind === 'debt').reduce((s, m) => s - m.amount, 0);
                      return (
                        <>
                          {linkedDebts.map(d => (
                            <button key={d.id} type="button" onClick={() => setOpenDebt(d)} className={`mt-3 w-full ${ghost} py-2.5 text-sm !text-accent !border-accent/50`}>
                              <HandCoins className="w-4 h-4" /> Abonar a {d.title}
                            </button>
                          ))}
                          {states.length > 1 && (!linkedDebts.length || ownOwed > 0) && (
                            <button type="button" onClick={() => setPaying(st)} className={`mt-3 w-full ${ghost} py-2.5 text-sm !text-accent !border-accent/50`}>
                              <HandCoins className="w-4 h-4" /> {tr('Abonar a la tarjeta')}
                            </button>
                          )}
                        </>
                      );
                    })()}

                    {open && (
                      <div className={`mt-3 pt-3 border-t ${isTech ? 'border-accent/20' : 'border-glass-border'}`}>
                        <DateFilter inline transactions={transactions} filterType={periodType} filterValue={periodValue}
                                    onChangeType={(t) => { setPeriodType(t); setShowAllMoves(false); }} onChangeValue={(v) => { setPeriodValue(v); setShowAllMoves(false); }} />
                        {per && (
                          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                            {[
                              { l: per.base !== null ? tr('Saldo inicial o ajuste') : tr('Al empezar'), v: per.startBalance + (per.base || 0), c: 'text-text-primary' },
                              { l: tr('Entró'), v: per.income, c: MONEY_TEXT.pos, s: '+' },
                              { l: tr('Salió'), v: per.outcome, c: MONEY_TEXT.neg, s: '−' },
                              { l: Math.abs(per.endBalance - st.balance) < 0.5 ? tr('Saldo hoy') : tr('Al terminar'), v: per.endBalance, c: MONEY_TEXT[toneOf(per.endBalance)] },
                            ].map(x => (
                              <div key={x.l} className={`p-2.5 bg-glass border border-glass-border ${isTech ? 'rounded-none' : 'rounded-xl'}`}>
                                <p className="text-[10px] text-text-muted">{x.l}</p>
                                <p className={`font-bold tabular-nums ${x.c}`}>{x.s || (x.v < 0 ? '−' : '')}{fmt(Math.abs(x.v))}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        {per && per.base !== null && (
                          <p className="mt-1.5 text-[10px] text-text-muted">{tr('Lo de antes del saldo inicial o del último ajuste ya está incluido en él.')}</p>
                        )}
                        {per && !per.movements.length && <p className="mt-3 text-xs text-text-muted text-center">{tr('Sin movimientos en este periodo.')}</p>}
                        <ul className="mt-3 space-y-1.5">
                          {shown.map((m, i) => (
                            <li key={i} className="flex items-center gap-2 text-xs">
                              <span className="w-14 shrink-0 text-text-muted">{m.date.toLocaleDateString(currentLocale(), { day: 'numeric', month: 'short' })}</span>
                              <span className="flex-1 min-w-0 truncate text-text-secondary">{m.label}</span>
                              {m.kind === 'base'
                                ? <span className="text-text-muted"><AnimatedNumber value={m.amount} format={fmt} /></span>
                                : <span className={m.amount >= 0 ? `${MONEY_TEXT.pos} font-semibold` : MONEY_TEXT.neg}>{m.amount >= 0 ? '+' : '−'}<AnimatedNumber value={Math.abs(m.amount)} format={fmt} /></span>}
                              {m.kind === 'debt' && (
                                <button type="button" onClick={() => setOpenDebt(m.debt)} aria-label={tr('Ver la deuda')} className="text-text-muted hover:text-accent px-1"><Pencil className="w-3 h-3" /></button>
                              )}
                              {m.kind === 'transfer' && m.transfer.id && (
                                <button type="button" onClick={() => setEditingTransfer(m.transfer)} aria-label={tr('Editar transferencia')} className="text-text-muted hover:text-accent px-1"><Pencil className="w-3 h-3" /></button>
                              )}
                            </li>
                          ))}
                        </ul>
                        {per && per.movements.length > shown.length && (
                          <button type="button" onClick={() => setShowAllMoves(true)} className="mt-1.5 text-[11px] font-semibold text-accent">
                            {tr('Ver los {n} movimientos', { n: per.movements.length })}
                          </button>
                        )}
                        {credit && (() => {
                          const abonos = st.movements.filter(m => m.kind === 'transfer' && m.amount > 0);
                          if (!abonos.length) return null;
                          const total = abonos.reduce((s, m) => s + m.amount, 0);
                          return (
                            <div className={`mt-3 pt-3 border-t ${isTech ? 'border-accent/20' : 'border-glass-border'}`}>
                              <p className="text-xs font-semibold text-text-secondary mb-1.5">Abonos ({abonos.length}) · {fmt(total)} <span className="font-normal text-text-muted">{tr('· toca uno para editarlo')}</span></p>
                              <ul className="space-y-1">
                                {abonos.map((m, i) => (
                                  <li key={i} onClick={() => m.kind === 'transfer' && setEditingTransfer(m.transfer)} className="flex items-center gap-2 text-xs cursor-pointer hover:opacity-80">
                                    <span className="shrink-0 whitespace-nowrap text-text-muted">{m.date.toLocaleDateString(currentLocale(), { day: 'numeric', month: 'short' })} · {m.date.toLocaleTimeString(currentLocale(), { hour: 'numeric', minute: '2-digit' })}</span>
                                    <span className="flex-1 min-w-0 truncate text-text-secondary">{m.label.replace(/^Abono desde /, 'De ')}</span>
                                    <span className="text-emerald-400 font-semibold">{fmt(m.amount)}</span>
                                    <Pencil className="w-3 h-3 text-text-muted shrink-0" />
                                  </li>
                                ))}
                              </ul>
                            </div>
                          );
                        })()}
                        <div className="mt-3 flex gap-2" data-tour="acc-actions">
                          <button type="button" onClick={() => setAdjusting(st)} className={ghost}><Scale className="w-3.5 h-3.5" /> {tr('Ajustar saldo')}</button>
                          {states.length > 1 && <button type="button" onClick={() => setTransferFrom(a.id!)} className={ghost}><ArrowLeftRight className="w-3.5 h-3.5" /> {tr('Mover')}</button>}
                          <button type="button" onClick={() => { setEditing(a); setShowForm(true); }} className={ghost}><Pencil className="w-3.5 h-3.5" /> {tr('Editar')}</button>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>

            <p className="text-[11px] text-text-muted text-center px-4">
              {tr('Al registrar un gasto o ingreso, elige con qué lo pagaste para que se mueva la cuenta correcta. Si no lo dices, va a tu cuenta principal.')}
              {tr('Cuando el saldo no cuadre con el banco, usa "Ajustar saldo".')}
            </p>
          </>
        )}
      </main>
      <BottomNav />

      {showForm && (
        <AccountFormModal account={editing} accounts={accounts}
                          onClose={() => { setShowForm(false); setEditing(null); }}
                          onDelete={(a) => { setShowForm(false); setDeleting(a); }} />
      )}
      {adjusting && <AdjustBalanceModal account={adjusting.account} current={adjusting.balance} currency={currency} onClose={() => setAdjusting(null)} />}
      {editingTransfer && <TransferModal accounts={accounts} editing={editingTransfer} currency={currency} onClose={() => setEditingTransfer(null)} />}
      {openDebt && <AddDebtModal debtToEdit={openDebt} onClose={() => setOpenDebt(null)} onSuccess={() => refreshDebts()} />}
      {paying && <TransferModal accounts={accounts} payCard={paying.account.id} owed={Math.max(0, -paying.balance)} currency={currency} onClose={() => setPaying(null)} />}
      {transferFrom !== null && <TransferModal accounts={accounts} initialFrom={transferFrom || undefined} currency={currency} onClose={() => setTransferFrom(null)} />}
      <ConfirmDialog
        isOpen={!!deleting}
        title={tr('Eliminar cuenta')}
        message={deleting ? tr('¿Eliminar "{a}"? Tus gastos e ingresos no se borran; solo dejan de contarse en esta cuenta.', { a: deleting.name }) : ''}
        confirmText="Eliminar"
        onConfirm={async () => { if (deleting?.id) await deleteAccount(deleting.id); setDeleting(null); setEditing(null); }}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
