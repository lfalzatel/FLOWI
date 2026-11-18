'use client';
import { currentLocale } from '@/lib/i18n';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronDown, ReceiptText, Search, ShoppingBasket } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { useData } from '@/components/DataProvider';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { AddExpenseModal } from '@/components/forms/AddExpenseModal';
import { CategoryIcon } from '@/components/CategoryIcon';
import { findCatalogEntry } from '@/lib/categories';
import { formatCurrency } from '@/lib/format';
import { formatQty, groupByCategory } from '@/lib/receiptItems';
import { matchesProduct } from '@/lib/productSpend';
import type { Transaction } from '@/lib/firestore';

const toDate = (d: Transaction['date']) => (d instanceof Date ? d : d.toDate());
const monthTitle = (d: Date) => {
  const s = d.toLocaleDateString(currentLocale(), { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

// Mis recibos: las compras que tienen productos (escaneadas o escritas a mano), por mes, con su detalle
export default function RecibosPage() {
  const { theme } = useTheme();
  const isTech = theme === 'cyberpunk' || theme === 'kiloCode';
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const { transactions, loadingTransactions } = useData();
  const fmt = (n: number) => formatCurrency(n, profile?.currency || 'COP');
  useEffect(() => { if (!authLoading && !user) router.push('/login'); }, [authLoading, user, router]);

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const receipts = useMemo(() => transactions
    .filter(t => t.type === 'gasto' && t.items?.length)
    .filter(t => !query.trim() || matchesProduct(`${t.description || ''} ${t.merchant || ''} ${t.items!.map(i => i.name).join(' ')}`, query))
    .sort((a, b) => toDate(b.date).getTime() - toDate(a.date).getTime()), [transactions, query]);

  const byMonth = useMemo(() => {
    const m = new Map<string, Transaction[]>();
    receipts.forEach(t => { const d = toDate(t.date); const k = `${d.getFullYear()}-${d.getMonth()}`; m.set(k, [...(m.get(k) || []), t]); });
    return Array.from(m.values());
  }, [receipts]);

  const box = isTech ? 'rounded-none' : 'rounded-2xl';

  return (
    <div className="relative min-h-screen flex flex-col bg-deep">
      <Header />
      <main className={`relative flex-1 max-w-2xl mx-auto w-full p-4 pb-32 space-y-5 animate-fade-in-up ${isTech ? 'font-mono' : ''}`}>
        <div className="flex items-center gap-3">
          <Link href="/servicios" aria-label="Volver a Servicios" className={`p-2 -ml-2 bg-glass border ${isTech ? 'border-accent/30 rounded-none text-accent' : 'border-glass-border rounded-full text-text-primary'}`}>
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className={`text-xl font-bold ${isTech ? 'text-accent uppercase tracking-wider' : 'font-syne text-text-primary'}`}>Mis recibos</h1>
            <p className="text-xs text-text-muted">Tus compras con todos sus productos. Toca una para ver el detalle.</p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por tienda o producto…" aria-label="Buscar recibos"
                 className={`w-full bg-glass border border-glass-border py-3 pl-10 pr-4 text-text-primary placeholder-text-muted focus:outline-none focus:border-accent ${isTech ? 'rounded-none' : 'rounded-xl'}`} />
        </div>

        {loadingTransactions ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" /></div>
        ) : !receipts.length ? (
          <div className={`glass-card p-6 text-center ${box}`}>
            <ReceiptText className="w-10 h-10 text-accent/40 mx-auto mb-3" />
            <p className="text-sm text-text-primary font-medium">{query ? `No hay recibos con «${query}»` : 'Todavía no tienes recibos con productos'}</p>
            {!query && <p className="text-xs text-text-muted mt-1">Escanea un recibo con el ＋ o agrega los productos al registrar un gasto, y aparecerá aquí.</p>}
          </div>
        ) : (
          byMonth.map(list => (
            <section key={toDate(list[0].date).toISOString().slice(0, 7)} className="space-y-2">
              <div className="flex items-baseline justify-between">
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-text-muted">{monthTitle(toDate(list[0].date))}</h2>
                <p className="text-[11px] text-text-muted">{list.length} {list.length === 1 ? 'recibo' : 'recibos'} · {fmt(list.reduce((s, t) => s + t.amount, 0))}</p>
              </div>
              <ul className="space-y-2">
                {list.map(t => {
                  const d = toDate(t.date);
                  const groups = groupByCategory(t.items!, t.category);
                  const isOpen = open === t.id;
                  const c = findCatalogEntry(t.category);
                  return (
                    <li key={t.id} className={`glass-card overflow-hidden ${box}`}>
                      <button type="button" onClick={() => setOpen(isOpen ? null : t.id || null)} aria-expanded={isOpen}
                              className="w-full flex items-center gap-3 p-3 text-left">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${c?.color || '#10B981'}18` }}>
                          <CategoryIcon icon={c?.icon || t.category} label={t.category} className="w-5 h-5 text-lg" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-text-primary truncate">{t.merchant || t.description || t.category}</p>
                          <p className="text-[11px] text-text-muted truncate">
                            {d.toLocaleDateString(currentLocale(), { weekday: 'short', day: 'numeric', month: 'short' })} · {t.items!.length} productos
                            {groups.length > 1 ? ` · ${groups.length} categorías` : ''}{t.paymentMethod ? ` · ${t.paymentMethod}` : ''}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-text-primary tabular-nums shrink-0">{fmt(t.amount)}</span>
                        <ChevronDown className={`w-4 h-4 text-text-muted shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isOpen && (
                        <div className="px-3 pb-3 space-y-2">
                          {groups.length > 1 && (
                            <div className="flex flex-wrap gap-1.5">
                              {groups.map(g => (
                                <span key={g.category} className={`px-2 py-0.5 text-[10px] font-semibold border border-glass-border text-text-secondary ${isTech ? 'rounded-none' : 'rounded-full'}`}>
                                  {g.category} {fmt(g.sum)}
                                </span>
                              ))}
                            </div>
                          )}
                          <ul className="divide-y divide-glass-border border-t border-glass-border">
                            {t.items!.map((it, k) => (
                              <li key={k} className="flex items-start gap-2 py-1.5">
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-text-primary break-words">{it.name}</p>
                                  <p className="text-[10px] text-text-muted">{formatQty(it)}{it.price ? ` × ${fmt(it.price)}` : ''}{groups.length > 1 && it.category ? ` · ${it.category}` : ''}</p>
                                </div>
                                <span className="text-xs font-semibold text-text-primary tabular-nums">{fmt(it.total)}</span>
                              </li>
                            ))}
                          </ul>
                          <div className="flex gap-2 pt-1">
                            <button type="button" onClick={() => setEditing(t)}
                                    className={`flex-1 py-2 text-xs font-semibold border border-accent/40 text-accent ${isTech ? 'rounded-none' : 'rounded-xl'}`}>
                              Editar compra
                            </button>
                            <Link href="/servicios/productos"
                                  className={`flex-1 py-2 text-xs font-semibold border border-glass-border text-text-secondary text-center inline-flex items-center justify-center gap-1 ${isTech ? 'rounded-none' : 'rounded-xl'}`}>
                              <ShoppingBasket className="w-3.5 h-3.5" /> ¿Cuánto gasto en…?
                            </Link>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </main>
      {editing && <AddExpenseModal transactionToEdit={editing} onClose={() => setEditing(null)} onSuccess={() => setEditing(null)} />}
      <BottomNav />
    </div>
  );
}
