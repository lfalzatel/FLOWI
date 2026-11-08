'use client';
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
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { ConfirmDialog } from '@/components/layout/ConfirmDialog';
import { AccountFormModal, AdjustBalanceModal, TransferModal } from '@/components/accounts/AccountModals';
import { AccountIcon } from '@/components/accounts/AccountIcon';
import { Account, deleteAccount, deleteTransfer } from '@/lib/firestore';
import { AccountState, KIND_LABEL, accountStates, netWorth } from '@/lib/accounts';
import { formatCurrency } from '@/lib/format';

export default function CuentasPage() {
  const { theme } = useTheme();
  const isTech = theme === 'cyberpunk' || theme === 'kiloCode';
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const { accounts, transfers, loading, error } = useAccounts();
  const { transactions } = useExpenses();
  const { investments } = useInvestments();
  const { debts } = useDebts();
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
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  const states = useMemo(() => accountStates(accounts, transactions, transfers, investments), [accounts, transactions, transfers, investments]);
  const worth = useMemo(() => netWorth(states, investments, debts), [states, investments, debts]);

  const card = isTech ? 'bg-glass border border-accent/25 rounded-none' : 'glass-card rounded-3xl';
  const btn = `flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold active:scale-95 transition-all ${isTech ? 'rounded-none border border-accent text-accent bg-accent/10 uppercase text-xs' : `rounded-2xl bg-gradient-to-br from-accent to-accent-dim ${theme === 'light' ? 'text-white' : 'text-black'} shadow-lg shadow-accent/20`}`;
  const ghost = `flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold border transition-all active:scale-95 ${isTech ? 'rounded-none border-accent/40 text-accent' : 'rounded-xl border-glass-border text-text-secondary hover:text-text-primary hover:bg-glass'}`;

  const rows: { label: string; value: number; sign: 1 | -1; href?: string; icon: any }[] = [
    { label: 'En tus cuentas', value: worth.accounts, sign: 1, icon: Wallet },
    { label: 'En CDT', value: worth.investments, sign: 1, href: '/servicios/inversiones', icon: Landmark },
    { label: 'Te deben', value: worth.owedToMe, sign: 1, href: '/deudas', icon: HandCoins },
    { label: 'Debes en tarjetas', value: worth.cards, sign: -1, icon: CreditCard },
    { label: 'Debes en préstamos', value: worth.debts, sign: -1, href: '/deudas', icon: CreditCard },
  ];

  return (
    <div className="relative min-h-screen flex flex-col bg-deep">
      <Header />
      <main className={`relative flex-1 max-w-2xl mx-auto w-full p-4 pb-32 space-y-5 animate-fade-in-up ${isTech ? 'font-mono' : ''}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/servicios" aria-label="Volver a Servicios" className={`p-2 -ml-2 bg-glass border ${isTech ? 'border-accent/30 rounded-none text-accent' : 'border-glass-border rounded-full text-text-primary'}`}>
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <h1 className={`text-xl font-bold truncate ${isTech ? 'text-accent uppercase tracking-wider' : 'font-syne text-text-primary'}`}>Cuentas y patrimonio</h1>
          </div>
          {states.length > 0 && <button onClick={() => { setEditing(null); setShowForm(true); }} className={btn}><Plus className="w-4 h-4" /> Cuenta</button>}
        </div>

        {error === 'permission-denied' && (
          <div className="p-4 text-sm rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-500">
            La base de datos todavía no permite leer cuentas. Hay que publicar las reglas de <b>fl_accounts</b> y <b>fl_transfers</b>.
          </div>
        )}

        {/* Patrimonio neto */}
        <section className={`${card} p-5`}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-medium ${isTech ? 'text-accent/70 uppercase tracking-wide' : 'text-text-secondary'}`}>Tu patrimonio neto</span>
            <button onClick={() => setShowHelp(v => !v)} aria-label="¿Qué es el patrimonio neto?" className="p-1 text-text-muted hover:text-text-primary"><Info className="w-4 h-4" /></button>
          </div>
          <p className={`font-bold text-[clamp(26px,9vw,38px)] leading-none ${worth.total >= 0 ? 'text-accent' : 'text-[var(--red)]'} ${isTech ? '' : 'font-syne'}`}>
            {worth.total < 0 ? '−' : ''}<AnimatedNumber value={Math.abs(worth.total)} format={fmt} />
          </p>
          <p className="text-xs text-text-muted mt-1">Tienes {fmt(worth.assets)} · debes {fmt(worth.liabilities)}</p>

          <div className={`mt-4 pt-3 border-t ${isTech ? 'border-accent/20' : 'border-glass-border'} space-y-1`}>
            {rows.filter(r => r.value > 0 || r.label === 'En tus cuentas').map(r => {
              const content = (
                <>
                  <r.icon className={`w-4 h-4 shrink-0 ${r.sign > 0 ? 'text-accent' : 'text-red-400'}`} />
                  <span className="flex-1 text-sm text-text-secondary">{r.label}</span>
                  <span className={`text-sm font-semibold ${r.sign > 0 ? 'text-text-primary' : 'text-red-400'}`}>{r.sign < 0 ? '−' : ''}<AnimatedNumber value={r.value} format={fmt} /></span>
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
            <h2 className={`font-bold text-lg mb-1 ${isTech ? 'text-accent uppercase' : 'text-text-primary'}`}>¿Dónde está tu plata?</h2>
            <p className="text-sm text-text-secondary mb-5">
              Agrega tus cuentas (Bancolombia, Nequi, efectivo…) con lo que tienes hoy. Desde ahí tus gastos e ingresos las van moviendo y ves tu patrimonio completo.
            </p>
            <button onClick={() => { setEditing(null); setShowForm(true); }}
                    className={`inline-flex items-center gap-2 px-6 py-3 font-semibold active:scale-95 transition-all ${isTech ? 'rounded-none border border-accent text-accent bg-accent/10 uppercase text-sm' : `rounded-xl bg-accent ${theme === 'light' ? 'text-white' : 'text-black'}`}`}>
              <Plus className="w-5 h-5" /> Agregar mi primera cuenta
            </button>
          </section>
        ) : (
          <>
            {states.length > 1 && (
              <button onClick={() => setTransferFrom('')} className={`w-full ${ghost} py-3 text-sm`}>
                <ArrowLeftRight className="w-4 h-4" /> Mover plata entre cuentas
              </button>
            )}
            <div className="space-y-3">
              {states.map(st => {
                const a = st.account;
                const open = expanded === a.id;
                const credit = a.kind === 'credito';
                const shown = st.movements.slice(0, 8);
                return (
                  <article key={a.id} className={`${card} p-4`}>
                    <button type="button" onClick={() => setExpanded(open ? null : a.id!)} className="w-full flex items-center gap-3 text-left">
                      <div className={`shrink-0 w-11 h-11 flex items-center justify-center text-2xl bg-glass border ${isTech ? 'rounded-none border-accent/30' : 'rounded-2xl border-glass-border'}`}><AccountIcon account={a} className="w-7 h-7 text-2xl flex items-center justify-center" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className={`font-bold truncate ${isTech ? 'text-accent uppercase text-sm' : 'text-text-primary'}`}>{a.name}</h3>
                          {a.purpose === 'ahorro' && <span className={`shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-emerald-500/15 text-emerald-400 ${isTech ? 'rounded-none' : 'rounded-full'}`}>Ahorro</span>}
                          {a.isDefault && <span className={`shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-accent/15 text-accent ${isTech ? 'rounded-none' : 'rounded-full'}`}>Principal</span>}
                        </div>
                        <p className="text-[11px] text-text-muted truncate">{KIND_LABEL[a.kind]}{a.methods.length ? ` · ${a.methods.join(', ')}` : ''}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`font-bold ${st.balance < 0 ? 'text-red-400' : 'text-text-primary'} ${isTech ? '' : 'font-syne'}`}>
                          {credit && st.balance < 0
                            ? <>Debes <AnimatedNumber value={-st.balance} format={fmt} /></>
                            : <>{st.balance < 0 ? '−' : ''}<AnimatedNumber value={Math.abs(st.balance)} format={fmt} /></>}
                        </p>
                        <ChevronDown className={`w-4 h-4 ml-auto text-text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
                      </div>
                    </button>

                    {open && (
                      <div className={`mt-3 pt-3 border-t ${isTech ? 'border-accent/20' : 'border-glass-border'}`}>
                        <ul className="space-y-1.5">
                          {shown.map((m, i) => (
                            <li key={i} className="flex items-center gap-2 text-xs">
                              <span className="w-14 shrink-0 text-text-muted">{m.date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}</span>
                              <span className="flex-1 min-w-0 truncate text-text-secondary">{m.label}</span>
                              {m.kind === 'base'
                                ? <span className="text-text-muted"><AnimatedNumber value={m.amount} format={fmt} /></span>
                                : <span className={m.amount >= 0 ? 'text-emerald-400 font-semibold' : 'text-text-primary'}>{m.amount >= 0 ? '+' : '−'}<AnimatedNumber value={Math.abs(m.amount)} format={fmt} /></span>}
                              {m.kind === 'transfer' && m.transfer.id && (
                                <button type="button" onClick={() => deleteTransfer(m.transfer.id!)} aria-label="Borrar transferencia" className="text-text-muted hover:text-[var(--red)] px-1">×</button>
                              )}
                            </li>
                          ))}
                        </ul>
                        {st.movements.length > shown.length && <p className="text-[10px] text-text-muted mt-1">y {st.movements.length - shown.length} movimientos más antiguos</p>}
                        <div className="mt-3 flex gap-2">
                          <button type="button" onClick={() => setAdjusting(st)} className={ghost}><Scale className="w-3.5 h-3.5" /> Ajustar saldo</button>
                          {states.length > 1 && <button type="button" onClick={() => setTransferFrom(a.id!)} className={ghost}><ArrowLeftRight className="w-3.5 h-3.5" /> Mover</button>}
                          <button type="button" onClick={() => { setEditing(a); setShowForm(true); }} className={ghost}><Pencil className="w-3.5 h-3.5" /> Editar</button>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>

            <p className="text-[11px] text-text-muted text-center px-4">
              Al registrar un gasto o ingreso, elige con qué lo pagaste para que se mueva la cuenta correcta. Si no lo dices, va a tu cuenta principal.
              Cuando el saldo no cuadre con el banco, usa "Ajustar saldo".
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
      {transferFrom !== null && <TransferModal accounts={accounts} initialFrom={transferFrom || undefined} currency={currency} onClose={() => setTransferFrom(null)} />}
      <ConfirmDialog
        isOpen={!!deleting}
        title="Eliminar cuenta"
        message={deleting ? `¿Eliminar "${deleting.name}"? Tus gastos e ingresos no se borran; solo dejan de contarse en esta cuenta.` : ''}
        confirmText="Eliminar"
        onConfirm={async () => { if (deleting?.id) await deleteAccount(deleting.id); setDeleting(null); setEditing(null); }}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
