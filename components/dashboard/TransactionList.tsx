'use client';
import { Transaction, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/lib/firestore';
import { Timestamp } from 'firebase/firestore';

interface Props { 
  transactions: Transaction[]; 
  limit?: number; 
  onEdit?: (transaction: Transaction) => void;
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
}

function fmtDate(date: Timestamp | Date) {
  const d = date instanceof Timestamp ? date.toDate() : date;
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

function getCategoryIcon(category: string, type: string) {
  const cats = type === 'gasto' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  return cats.find(c => c.label === category) || { icon: '💡', color: '#6B7280' };
}

export function TransactionList({ transactions, limit, onEdit }: Props) {
  const items = limit ? transactions.slice(0, limit) : transactions;

  if (items.length === 0) {
    return (
      <div className="glass-card p-8 rounded-2xl text-center">
        <p className="text-3xl mb-2">📭</p>
        <p className="text-white/40 text-sm">Sin transacciones aún</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((t, i) => {
        const cat = getCategoryIcon(t.category, t.type);
        return (
          <div key={t.id || i}
               onClick={() => onEdit && onEdit(t)}
               className={`glass-card flex items-center gap-3 p-3.5 rounded-2xl
                          hover:border-white/15 transition-all duration-200
                          ${onEdit ? 'cursor-pointer hover:bg-white/5' : ''}`}>
            {/* Icon */}
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
                 style={{ background: `${cat.color}15` }}>
              {cat.icon}
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {t.description || t.category}
              </p>
              <p className="text-xs text-white/35">{t.category} · {fmtDate(t.date as Timestamp)}</p>
            </div>
            {/* Amount */}
            <p className={`text-sm font-bold flex-shrink-0
                           ${t.type === 'gasto' ? 'text-red-400' : 'text-accent'}`}>
              {t.type === 'gasto' ? '-' : '+'}{fmt(t.amount)}
            </p>
          </div>
        );
      })}
    </div>
  );
}
