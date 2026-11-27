'use client';
import { currentLocale, tr } from '@/lib/i18n';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronDown, Users, Plus, MessageCircle, Check, HandCoins } from 'lucide-react';
import { SharedPaymentModal } from '@/components/shared/SharedPaymentModal';
import { IncomingShared } from '@/components/shared/IncomingShared';
import { useSharedLinks } from '@/components/SharedLinksProvider';
import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { useData } from '@/components/DataProvider';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { AddExpenseModal } from '@/components/forms/AddExpenseModal';
import { updateExpense, type Transaction } from '@/lib/firestore';
import { formatCurrency } from '@/lib/format';
import { PersonBalance, chargeMessage, sharedBalances, whatsappUrl, withSettled } from '@/lib/shared';

import { PageTourButton } from '@/components/tour/PageTourButton';
// Gastos compartidos: el saldo con cada persona (quién te debe y a quién le debes) a partir de los gastos
// que marcaste como compartidos. "Ya me pagó" / "Ya le pagué" los salda; "Cobrar" arma el mensaje de WhatsApp.
export default function CompartidosPage() {
  const { theme } = useTheme();
  const isTech = theme === 'cyberpunk' || theme === 'kiloCode';
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const { transactions, loadingTransactions } = useData();
  const fmt = (n: number) => formatCurrency(n, profile?.currency);
  useEffect(() => { if (!authLoading && !user) router.push('/login'); }, [authLoading, user, router]);

  const [open, setOpen] = useState<string | null>(null);
  const [showSettled, setShowSettled] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [busy, setBusy] = useState(false);
  const [paying, setPaying] = useState<{ tx: Transaction; index: number } | null>(null);
  const { linkFor } = useSharedLinks();

  const balances = useMemo(() => sharedBalances(transactions), [transactions]);
  const pending = balances.filter(b => b.owesMe || b.iOwe);
  const settled = balances.filter(b => !b.owesMe && !b.iOwe);
  const totalToMe = pending.reduce((s, b) => s + b.owesMe, 0);
  const totalFromMe = pending.reduce((s, b) => s + b.iOwe, 0);

  // Salda (o vuelve a dejar pendiente) entradas de una persona; agrupa por gasto para escribir una vez cada uno
  const settle = async (entries: PersonBalance<Transaction>['entries'], value: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      const byTx = new Map<string, { tx: Transaction; idx: number[] }>();
      for (const e of entries) {
        if (!e.tx.id || !e.tx.shared) continue;
        const cur = byTx.get(e.tx.id) || { tx: e.tx, idx: [] };
        cur.idx.push(e.index);
        byTx.set(e.tx.id, cur);
      }
      for (const { tx, idx } of Array.from(byTx.values())) {
        await updateExpense(tx.id!, { shared: withSettled(tx.shared!, idx, value) });
      }
    } catch (err) {
      console.error(tr('No se pudo actualizar el gasto compartido'), err);
    } finally {
      setBusy(false);
    }
  };

  const box = isTech ? 'rounded-none' : 'rounded-2xl';
  const btn = isTech ? 'rounded-none' : 'rounded-xl';

  const PersonCard = ({ b }: { b: PersonBalance<Transaction> }) => {
    const isOpen = open === b.key;
    const owes = b.net > 0, iOwe = b.net < 0;
    const pendingToMe = b.entries.filter(e => e.toMe && !e.settled);
    const pendingFromMe = b.entries.filter(e => !e.toMe && !e.settled);
    return (
      <li className={`glass-card overflow-hidden ${box}`}>
        <button type="button" onClick={() => setOpen(isOpen ? null : b.key)} aria-expanded={isOpen}
                className="w-full flex items-center gap-3 p-3 text-left">
          <div className={`w-10 h-10 flex items-center justify-center shrink-0 font-bold text-sm ${isTech ? 'rounded-none border border-accent/30 text-accent' : 'rounded-full bg-orange-500/15 text-orange-400'}`}>
            {b.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-primary truncate">{b.name}</p>
            <p className="text-[11px] text-text-muted truncate">
              {owes ? tr('Te debe') : iOwe ? tr('Le debes') : b.owesMe && b.iOwe ? tr('Quedan a paz y salvo si se cruzan') : tr('A paz y salvo')}
              {' · '}{b.entries.length} {b.entries.length === 1 ? 'gasto' : 'gastos'}
            </p>
          </div>
          <span className={`text-sm font-bold tabular-nums shrink-0 ${owes ? 'text-accent' : iOwe ? 'text-[var(--red)]' : 'text-text-muted'}`}>
            {b.net ? fmt(Math.abs(b.net)) : '✓'}
          </span>
          <ChevronDown className={`w-4 h-4 text-text-muted shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && (
          <div className="px-3 pb-3 space-y-2">
            {(b.owesMe > 0 && b.iOwe > 0) && (
              <p className="text-[11px] text-text-muted">{tr('Te debe {a} y le debes {b}.', { a: fmt(b.owesMe), b: fmt(b.iOwe) })}</p>
            )}
            <ul className="divide-y divide-glass-border border-t border-glass-border">
              {b.entries.map(e => (
                <li key={`${e.tx.id}-${e.index}`} className="flex items-center gap-2 py-2">
                  <button type="button" onClick={() => setEditing(e.tx)} className="flex-1 min-w-0 text-left">
                    <p className={`text-xs truncate ${e.settled ? 'text-text-muted line-through' : 'text-text-primary'}`}>{e.tx.description?.trim() || e.tx.category}</p>
                    <p className="text-[10px] text-text-muted">
                      {e.date.toLocaleDateString(currentLocale(), { day: 'numeric', month: 'short' })} · {e.toMe ? tr('pagaste tú') : tr('pagó {a}', { a: b.name.split(/\s+/)[0] })}
                      {(() => {
                        // Con un amigo de FLOWI: si ya lo aceptó en su app
                        const fu = e.tx.shared?.people[e.index]?.friendUid;
                        const st = e.toMe && fu && e.tx.id ? linkFor(e.tx.id, fu)?.status : e.tx.sharedLinkId ? 'friend' : undefined;
                        return st === 'accepted' ? tr(' · 🔗 en su FLOWI') : st === 'pending' ? tr(' · 🔗 esperando que lo acepte') : st === 'rejected' ? tr(' · no lo aceptó en su FLOWI') : st === 'friend' ? tr(' · 🔗 compartido por FLOWI') : '';
                      })()}
                    </p>
                  </button>
                  <span className="text-right shrink-0">
                    <span className={`block text-xs font-semibold tabular-nums ${e.settled ? 'text-text-muted' : e.toMe ? 'text-accent' : 'text-[var(--red)]'}`}>
                      {e.toMe ? '+' : '−'}{fmt(e.settled ? e.amount : e.pending)}
                    </span>
                    {!e.settled && e.paid > 0 && <span className="block text-[10px] text-text-muted">abonado {fmt(e.paid)} de {fmt(e.amount)}</span>}
                  </span>
                  {/* Abonar (o ver los abonos de uno ya saldado) */}
                  <button type="button" onClick={() => setPaying({ tx: e.tx, index: e.index })}
                          aria-label={e.settled ? tr('Ver abonos') : tr('Registrar abono')}
                          className={`h-7 px-2 flex items-center gap-1 border shrink-0 text-[11px] font-semibold ${isTech ? 'rounded-none' : 'rounded-full'} ${e.settled ? 'border-accent bg-accent/20 text-accent' : 'border-accent/40 text-accent'}`}>
                    {e.settled ? <Check className="w-3.5 h-3.5" /> : <><HandCoins className="w-3.5 h-3.5" /> {tr('Abonar')}</>}
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2 pt-1">
              {pendingToMe.length > 0 && (
                <>
                  {owes && <a href={whatsappUrl(chargeMessage(b, fmt, profile?.name, currentLocale()))} target="_blank" rel="noopener noreferrer"
                     className={`flex-1 min-w-[8rem] py-2 text-xs font-semibold bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 inline-flex items-center justify-center gap-1.5 ${btn}`}>
                    <MessageCircle className="w-3.5 h-3.5" /> Cobrar {fmt(b.net)} por WhatsApp
                  </a>}
                  <button type="button" disabled={busy} onClick={() => settle(pendingToMe, true)}
                          className={`flex-1 min-w-[8rem] py-2 text-xs font-semibold border border-accent/40 text-accent ${btn}`}>
                    {tr('Ya me pagó todo')}
                  </button>
                </>
              )}
              {pendingFromMe.length > 0 && (
                <button type="button" disabled={busy} onClick={() => settle(pendingFromMe, true)}
                        className={`flex-1 min-w-[8rem] py-2 text-xs font-semibold border border-accent/40 text-accent ${btn}`}>
                  Ya le pagué {fmt(b.iOwe)}
                </button>
              )}
            </div>
          </div>
        )}
      </li>
    );
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-deep">
      <Header />
      <main className={`relative flex-1 max-w-2xl mx-auto w-full p-4 pb-32 space-y-5 animate-fade-in-up ${isTech ? 'font-mono' : ''}`}>
        <div className="flex items-center gap-3">
          <Link href="/servicios" aria-label={tr('Volver a Servicios')} className={`p-2 -ml-2 bg-glass border ${isTech ? 'border-accent/30 rounded-none text-accent' : 'border-glass-border rounded-full text-text-primary'}`}>
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className={`text-2xl font-bold leading-tight ${isTech ? 'text-accent uppercase tracking-wider' : 'font-syne text-text-primary'}`}>{tr('Gastos compartidos')}</h1>
            <p className="text-xs text-text-muted">{tr('Quién te debe, a quién le debes y cobra con un mensaje.')}</p>
          </div>
          <PageTourButton id="compartidos" className="ml-auto" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className={`glass-card glass-static p-3 ${box}`}>
            <p className="text-[11px] text-text-muted">{tr('Te deben')}</p>
            <p className="text-lg font-bold text-accent tabular-nums">{fmt(totalToMe)}</p>
          </div>
          <div className={`glass-card glass-static p-3 ${box}`}>
            <p className="text-[11px] text-text-muted">{tr('Debes')}</p>
            <p className="text-lg font-bold text-[var(--red)] tabular-nums">{fmt(totalFromMe)}</p>
          </div>
        </div>

        <IncomingShared isTech={isTech} />

        <button type="button" onClick={() => setAdding(true)}
                className={`w-full py-3 text-sm font-bold inline-flex items-center justify-center gap-2 ${isTech ? 'rounded-none bg-accent/15 border border-accent text-accent uppercase tracking-wider' : 'rounded-xl bg-accent text-white'}`}>
          <Plus className="w-4 h-4" /> {tr('Nuevo gasto compartido')}
        </button>

        {loadingTransactions ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" /></div>
        ) : !balances.length ? (
          <div className={`glass-card glass-static p-6 text-center space-y-2 ${box}`}>
            <Users className="w-10 h-10 text-accent/40 mx-auto" />
            <p className="text-sm text-text-primary font-medium">{tr('Todavía no tienes gastos compartidos')}</p>
            <p className="text-xs text-text-muted">
              Cuando pagues algo entre varios, al registrar el gasto toca <b className="text-text-secondary">{tr('👥 Compartir este gasto')}</b>.
              {tr('En tus gastos queda solo tu parte, y aquí ves lo que te debe cada persona. Tus amigos no necesitan tener FLOWI.')}
            </p>
          </div>
        ) : (
          <>
            {pending.length > 0 ? (
              <section className="space-y-2">
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-text-muted">{tr('Pendientes')}</h2>
                <ul className="space-y-2">{pending.map(b => <PersonCard key={b.key} b={b} />)}</ul>
              </section>
            ) : (
              <p className="text-center text-sm text-text-muted">{tr('🎉 Estás a paz y salvo con todos.')}</p>
            )}
            {settled.length > 0 && (
              <section className="space-y-2">
                <button type="button" onClick={() => setShowSettled(v => !v)} aria-expanded={showSettled}
                        className="w-full flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-text-muted">
                  A paz y salvo ({settled.length})
                  <ChevronDown className={`w-4 h-4 transition-transform ${showSettled ? 'rotate-180' : ''}`} />
                </button>
                {showSettled && <ul className="space-y-2">{settled.map(b => <PersonCard key={b.key} b={b} />)}</ul>}
              </section>
            )}
          </>
        )}
      </main>
      <BottomNav />
      {adding && <AddExpenseModal initialShared onClose={() => setAdding(false)} />}
      {editing && <AddExpenseModal transactionToEdit={editing} onClose={() => setEditing(null)} />}
      {paying && <SharedPaymentModal tx={paying.tx} index={paying.index} onClose={() => setPaying(null)} />}
    </div>
  );
}
