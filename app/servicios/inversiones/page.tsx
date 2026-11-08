'use client';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Plus, Landmark, Pencil, CalendarClock, TrendingUp, RefreshCw, CheckCircle2, Info, PlusCircle } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { useInvestments } from '@/hooks/useInvestments';
import { useAccounts } from '@/hooks/useAccounts';
import { AccountPicker } from '@/components/accounts/AccountPicker';
import { formatMoneyInput, parseMoneyInput } from '@/components/accounts/AccountModals';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { ConfirmDialog } from '@/components/layout/ConfirmDialog';
import { InvestmentFormModal } from '@/components/investments/InvestmentFormModal';
import { Investment, addExpense, deleteInvestment, updateInvestment } from '@/lib/firestore';
import { formatCurrency } from '@/lib/format';
import { CategoryIcon } from '@/components/CategoryIcon';
import { findCatalogEntry } from '@/lib/categories';
import { formatDay, investmentStatus, parseDay, portfolioSummary, whenText } from '@/lib/investments';

export default function InversionesPage() {
  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const { investments, loading, error } = useInvestments();
  const currency = profile?.currency || 'COP';

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Investment | null>(null);
  const [renewing, setRenewing] = useState<Investment | null>(null);
  const [closing, setClosing] = useState<Investment | null>(null);
  const [deleting, setDeleting] = useState<Investment | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const { accounts } = useAccounts();
  const hasAccounts = accounts.some(a => !a.archived);
  const [closeAccount, setCloseAccount] = useState<string | null | undefined>(undefined);
  // Abonar plata a un CDT abierto
  const [abonando, setAbonando] = useState<Investment | null>(null);
  const [abonoAmount, setAbonoAmount] = useState('');
  const [abonoAccount, setAbonoAccount] = useState<string | null | undefined>(undefined);
  const [abonoSaving, setAbonoSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  const summary = useMemo(() => portfolioSummary(investments), [investments]);
  const closed = investments.filter(i => i.status === 'cerrado');

  const card = isTechTheme ? 'bg-glass border border-accent/25 rounded-none' : 'glass-card rounded-3xl';
  const fmt = (n: number) => formatCurrency(n, currency);
  const openNew = () => { setEditing(null); setShowForm(true); };
  const primaryBtn = `flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold active:scale-95 transition-all ${isTechTheme ? 'rounded-none border border-accent text-accent bg-accent/10 uppercase text-xs' : `rounded-2xl bg-gradient-to-br from-accent to-accent-dim ${theme === 'light' ? 'text-white' : 'text-black'} shadow-lg shadow-accent/20`}`;

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

  async function saveAbono() {
    const inv = abonando;
    const value = parseMoneyInput(abonoAmount);
    if (!inv?.id || value <= 0 || abonoSaving || (hasAccounts && abonoAccount === undefined)) return;
    setAbonoSaving(true);
    try {
      await updateInvestment(inv.id, {
        amount: inv.amount + value,
        bankInterest: null, // con más capital, los intereses que dio el banco ya no aplican: se estiman
        fundings: [...(inv.fundings || []), { at: new Date().toISOString(), amount: value, accountId: abonoAccount ?? null, kind: 'abono' }],
      });
      setAbonando(null);
      setAbonoAmount('');
      setAbonoAccount(undefined);
    } finally {
      setAbonoSaving(false);
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col bg-deep">
      <Header />
      <main className={`relative flex-1 max-w-2xl mx-auto w-full p-4 pb-32 space-y-5 animate-fade-in-up ${isTechTheme ? 'font-mono' : ''}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/servicios" aria-label="Volver a Servicios" className={`p-2 -ml-2 bg-glass border ${isTechTheme ? 'border-accent/30 rounded-none text-accent' : 'border-glass-border rounded-full text-text-primary'}`}>
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <h1 className={`text-xl font-bold ${isTechTheme ? 'text-accent uppercase tracking-wider' : 'font-syne text-text-primary'}`}>Mis inversiones</h1>
          </div>
          {investments.length > 0 && <button onClick={openNew} className={primaryBtn}><Plus className="w-4 h-4" /> Nuevo CDT</button>}
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
              <div className="w-7 h-7 rounded-xl bg-accent/15 flex items-center justify-center"><Landmark className="w-4 h-4 text-accent" /></div>
              <span className={`text-xs font-medium ${isTechTheme ? 'text-accent/70 uppercase tracking-wide' : 'text-text-secondary'}`}>Invertido en CDT</span>
            </div>
            <button onClick={() => setShowHelp(v => !v)} aria-label="¿Cómo se calcula?" className="p-1 text-text-muted hover:text-text-primary"><Info className="w-4 h-4" /></button>
          </div>
          <p className={`font-bold text-[clamp(24px,8vw,34px)] leading-none text-accent ${isTechTheme ? '' : 'font-syne'}`}>{fmt(summary.invested)}</p>
          {summary.active.length > 0 && (
            <p className="text-xs text-text-muted mt-1">
              en {summary.active.length} CDT · tasa promedio {summary.avgRate.toFixed(2).replace('.', ',')}% E.A.
            </p>
          )}
          {summary.active.length > 0 && (
            <div className={`mt-4 pt-4 border-t ${isTechTheme ? 'border-accent/20' : 'border-glass-border'} grid grid-cols-2 gap-3`}>
              <div>
                <p className="text-[11px] text-text-muted">Llevas ganado</p>
                <p className="font-bold text-text-primary">{fmt(summary.earnedToDate)}</p>
              </div>
              <div>
                <p className="text-[11px] text-text-muted">Recibirás en intereses</p>
                <p className="font-bold text-emerald-500">{fmt(summary.netInterest)}</p>
                <p className="text-[10px] text-text-muted">después de retención</p>
              </div>
            </div>
          )}
          {showHelp && (
            <p className={`mt-4 pt-4 border-t ${isTechTheme ? 'border-accent/20' : 'border-glass-border'} text-xs text-text-secondary leading-relaxed`}>
              Un CDT es <b className="text-text-primary">ahorro, no gasto</b>: esta plata no cuenta en lo que puedes gastar en el mes y tampoco se resta como gasto.
              Los intereses se pagan al vencer; "llevas ganado" reparte los del periodo según los días corridos.
              Si el banco te da la cifra exacta de intereses, la uso; si no, la calculo con la tasa E.A. y la marco como estimada.
              Al recibirlos, el banco descuenta la retención en la fuente.
            </p>
          )}
        </section>

        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" /></div>
        ) : investments.length === 0 ? (
          <section className={`${card} p-6 text-center`}>
            <div className={`w-14 h-14 mx-auto mb-3 flex items-center justify-center bg-accent/10 ${isTechTheme ? 'rounded-none border border-accent/40' : 'rounded-2xl'}`}>
              <Landmark className="w-7 h-7 text-accent" />
            </div>
            <h2 className={`font-bold text-lg mb-1 ${isTechTheme ? 'text-accent uppercase' : 'text-text-primary'}`}>¿Tienes plata en un CDT?</h2>
            <p className="text-sm text-text-secondary mb-5">Regístralo con su tasa y te digo cuánto vas ganando, cuánto recibirás y te aviso antes de que venza.</p>
            <button onClick={openNew} className={`inline-flex items-center gap-2 px-6 py-3 font-semibold active:scale-95 transition-all ${isTechTheme ? 'rounded-none border border-accent text-accent bg-accent/10 uppercase text-sm' : `rounded-xl bg-accent ${theme === 'light' ? 'text-white' : 'text-black'}`}`}>
              <Plus className="w-5 h-5" /> Registrar mi primer CDT
            </button>
          </section>
        ) : (
          <>
            <div className="space-y-3">
              {summary.active.map(inv => {
                const s = investmentStatus(inv);
                const pct = Math.round(s.progress * 100);
                const soon = s.daysLeft <= 3;
                return (
                  <article key={inv.id} className={`${card} p-4`}>
                    <div className="flex items-start gap-3">
                      <div className={`shrink-0 w-11 h-11 flex items-center justify-center bg-glass border ${isTechTheme ? 'rounded-none border-accent/30' : 'rounded-2xl border-glass-border'}`}>
                        {findCatalogEntry(inv.bank)
                          ? <CategoryIcon icon={findCatalogEntry(inv.bank)!.icon} label={inv.bank} className="w-6 h-6 text-xl flex items-center justify-center" />
                          : <Landmark className="w-5 h-5 text-accent" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className={`font-bold truncate ${isTechTheme ? 'text-accent uppercase text-sm' : 'text-text-primary'}`}>CDT {inv.bank}</h3>
                          <span className={`shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-accent/15 text-accent ${isTechTheme ? 'rounded-none' : 'rounded-full'}`}>
                            {String(inv.rateEA).replace('.', ',')}% E.A.
                          </span>
                        </div>
                        <p className="text-xs text-text-secondary mt-0.5"><b className="text-text-primary">{fmt(inv.amount)}</b> · {s.termDays} días</p>
                        {inv.note && <p className="text-[11px] text-text-muted truncate">{inv.note}</p>}
                      </div>
                      <button onClick={() => { setEditing(inv); setShowForm(true); }} aria-label={`Editar CDT ${inv.bank}`}
                              className={`shrink-0 p-2 -mr-1 -mt-1 ${isTechTheme ? 'text-accent/70 hover:text-accent' : 'text-text-muted hover:text-text-primary'}`}>
                        <Pencil className="w-4 h-4" />
                      </button>
                    </div>

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
                        <p className="font-semibold text-text-primary">{fmt(s.earnedToDate)}</p>
                      </div>
                      <div>
                        <p className="text-text-muted">Intereses del periodo{s.isEstimate ? ' (aprox.)' : ''}</p>
                        <p className="font-semibold text-text-primary">{fmt(s.interest)}</p>
                      </div>
                      <div>
                        <p className="text-text-muted">Recibirás al vencer</p>
                        <p className="font-semibold text-emerald-500">{fmt(s.netAtMaturity)}</p>
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
                    ) : (
                      <>
                        {soon && (
                          <p className="mt-3 flex items-start gap-1.5 text-[12px] text-amber-500">
                            <CalendarClock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            <span>Antes de que se renueve, compara la tasa con otros bancos.</span>
                          </p>
                        )}
                        <button onClick={() => { setAbonando(inv); setAbonoAmount(''); setAbonoAccount(undefined); }}
                                className={`mt-3 w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold border transition-all active:scale-[0.98] ${isTechTheme ? 'rounded-none border-accent/40 text-accent uppercase' : 'rounded-xl border-glass-border text-text-secondary hover:text-text-primary hover:bg-glass'}`}>
                          <PlusCircle className="w-4 h-4" /> Abonar a este CDT
                        </button>
                      </>
                    )}
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
                      <button key={inv.id} onClick={() => { setEditing(inv); setShowForm(true); }} className={`${card} w-full p-3.5 flex items-center gap-3 text-left`}>
                        <TrendingUp className="w-5 h-5 text-emerald-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold truncate ${isTechTheme ? 'text-accent text-sm uppercase' : 'text-text-primary'}`}>CDT {inv.bank} · {fmt(inv.amount)}</p>
                          <p className="text-xs text-text-muted">Venció el {formatDay(inv.maturityDate)}{last ? ` · ganó ${fmt(last.interest)}` : ''}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            <p className="text-[11px] text-text-muted text-center px-4">
              Tus CDT no cuentan como gastos ni en lo que puedes gastar en el mes. No guardes números de CDT ni de cuenta.
            </p>
          </>
        )}
      </main>
      <BottomNav />

      {(showForm || renewing) && (
        <InvestmentFormModal
          investment={renewing ? null : editing}
          renewFrom={renewing}
          currency={currency}
          onClose={() => { setShowForm(false); setEditing(null); setRenewing(null); }}
          onDelete={(inv) => { setShowForm(false); setDeleting(inv); }}
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
              <button onClick={() => closeInvestment(closing, false)} disabled={hasAccounts && closeAccount === undefined} className={`w-full py-3 text-sm font-semibold border ${isTechTheme ? 'rounded-none border-accent/30 text-accent' : 'rounded-xl border-glass-border text-text-secondary'}`}>
                Solo marcarlo como terminado
              </button>
              <button onClick={() => setClosing(null)} className="w-full py-2 text-xs text-text-muted">Cancelar</button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {abonando && typeof document !== 'undefined' && createPortal(
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 ${isTechTheme ? 'font-mono' : ''}`}>
          <div className={`absolute inset-0 ${theme === 'light' ? 'bg-black/10' : 'bg-black/40'}`} onClick={() => setAbonando(null)} aria-hidden="true" />
          <div className={`w-full max-w-sm relative z-10 animate-fade-in-up glass-dropdown p-6 space-y-4 ${isTechTheme ? 'rounded-none border border-accent/50' : 'rounded-3xl'}`}>
            <h2 className={`font-bold text-lg ${isTechTheme ? 'text-accent uppercase' : 'font-syne text-text-primary'}`}>Abonar al CDT {abonando.bank}</h2>
            <div>
              <label htmlFor="abono-amount" className="text-xs text-text-muted mb-1.5 block">¿Cuánto le agregas?</label>
              <input id="abono-amount" type="text" inputMode="decimal" placeholder="$ 0" value={abonoAmount} autoFocus
                     onChange={(e) => setAbonoAmount(formatMoneyInput(e.target.value))}
                     className={`w-full bg-glass border px-4 py-3 font-bold text-text-primary focus:outline-none ${isTechTheme ? 'border-accent/30 rounded-none focus:border-accent' : 'border-glass-border rounded-xl focus:border-accent'}`} />
              {parseMoneyInput(abonoAmount) > 0 && (
                <p className="text-[11px] text-text-muted mt-1.5">El CDT queda en {fmt(abonando.amount + parseMoneyInput(abonoAmount))}. Los intereses se recalculan con la tasa.</p>
              )}
            </div>
            <AccountPicker accounts={accounts} value={abonoAccount} onChange={setAbonoAccount}
                           label="¿De qué cuenta sale?" noneLabel="No descontar"
                           hint="Lo descuento del saldo de la cuenta y de lo que puedes gastar este mes (es ahorro, no gasto)." />
            <div className="space-y-2">
              <button onClick={saveAbono} disabled={parseMoneyInput(abonoAmount) <= 0 || abonoSaving || (hasAccounts && abonoAccount === undefined)}
                      className={`w-full py-3 font-bold disabled:opacity-50 ${isTechTheme ? 'rounded-none bg-accent/20 border border-accent text-accent uppercase' : 'rounded-xl bg-accent text-white'}`}>
                {abonoSaving ? 'Guardando...' : 'Abonar'}
              </button>
              <button onClick={() => setAbonando(null)} className="w-full py-2 text-xs text-text-muted">Cancelar</button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      <ConfirmDialog
        isOpen={!!deleting}
        title="Eliminar CDT"
        message={deleting ? `¿Eliminar el CDT de ${deleting.bank} por ${fmt(deleting.amount)}? No se borra ningún gasto ni ingreso.` : ''}
        confirmText="Eliminar"
        onConfirm={async () => { if (deleting?.id) await deleteInvestment(deleting.id); setDeleting(null); setEditing(null); }}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
