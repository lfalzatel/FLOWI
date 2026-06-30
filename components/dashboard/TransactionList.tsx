'use client';
import { Transaction } from '@/lib/firestore';
import { Timestamp } from 'firebase/firestore';
import { useTheme } from '@/components/ThemeProvider';
import { AnimatedNumber } from './AnimatedNumber';
import { CategoryIcon } from '@/components/CategoryIcon';
import { useCategories } from '@/hooks/useCategories';

interface Props { 
  transactions: Transaction[]; 
  limit?: number; 
  onEdit?: (transaction: Transaction) => void;
  animationKey?: string;
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
}

function fmtDate(date: Timestamp | Date) {
  const d = date instanceof Timestamp ? date.toDate() : date;
  const dateStr = d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  const timeStr = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${dateStr} • ${timeStr}`;
}

export function TransactionList({ transactions, limit, onEdit, animationKey }: Props) {
  const { theme } = useTheme();
  const { allCategories } = useCategories();
  const isCyberpunk = theme === 'cyberpunk' || theme === 'kiloCode';
  const items = limit ? transactions.slice(0, limit) : transactions;

  const getCategoryIcon = (category: string) => {
    return allCategories.find(c => c.label.toLowerCase() === category.toLowerCase()) 
      || { label: 'Otro', icon: '💡', color: '#6B7280' };
  };

  if (items.length === 0) {
    return (
      <div key={animationKey} className={`glass-card p-8 text-center ${isCyberpunk ? 'rounded-none' : 'rounded-2xl'}`}>
        <p className="text-3xl mb-2">💸</p>
        <p className={`text-sm ${isCyberpunk ? 'font-mono text-accent/70 uppercase tracking-widest' : 'text-text-muted'}`}>Sin transacciones aún</p>
      </div>
    );
  }

  return (
    <div key={animationKey} className="space-y-2">
      {items.map((t, i) => {
        const cat = getCategoryIcon(t.category);
        const displayName = t.description || t.category;
        const displayLabel = isCyberpunk 
          ? `>_ ${displayName.toUpperCase().replace(/\s+/g, '_')}` 
          : displayName;

        if (isCyberpunk) {
          return (
            <div key={t.id || i}
                 onClick={() => onEdit && onEdit(t)}
                 className={`glass-card flex items-center justify-between p-4 rounded-none border-y border-r border-glass-border
                            hover:bg-glass-hover transition-all duration-200 animate-card-mix
                            ${onEdit ? 'cursor-pointer' : ''}`}
                 style={{ borderLeft: `3px solid ${cat.color}`, animationDelay: `${i * 0.1}s` }}>
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="opacity-80 flex items-center justify-center flex-shrink-0">
                  <CategoryIcon icon={cat.icon} label={cat.label || t.category} className="text-lg w-5 h-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-text-primary font-mono truncate uppercase tracking-widest">
                    {displayLabel}
                  </p>
                  <p className="text-[9px] text-accent/60 font-mono mt-0.5 uppercase tracking-wider truncate">
                    {t.category.replace(/\s+/g, '_')} // {fmtDate(t.date as Timestamp)}
                  </p>
                </div>
              </div>
              <p className={`text-[13px] font-bold flex-shrink-0 font-mono tracking-widest ml-4
                             ${t.type === 'gasto' ? 'text-[var(--red)]' : 'text-accent'}`}>
                <AnimatedNumber value={t.amount} prefix={t.type === 'gasto' ? '-' : '+'} delay={i * 0.1} />
              </p>
            </div>
          );
        }

        return (
          <div key={t.id || i}
               onClick={() => onEdit && onEdit(t)}
               className={`glass-card flex items-center gap-3 p-3.5 rounded-2xl
                          hover:border-glass-strong transition-all duration-200 animate-card-mix
                          ${onEdit ? 'cursor-pointer hover:bg-glass-hover' : ''}`}
               style={{ animationDelay: `${i * 0.1}s` }}>
            {/* Icon */}
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                 style={{ background: `${cat.color}15` }}>
              <CategoryIcon icon={cat.icon} label={cat.label || t.category} className="text-lg w-5 h-5" />
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-text-primary truncate">
                {displayLabel}
              </p>
              <p className="text-[11px] text-text-secondary mt-0.5">{t.category} • {fmtDate(t.date as Timestamp)}</p>
            </div>
            {/* Amount */}
            <p className={`text-[13px] font-bold flex-shrink-0
                           ${t.type === 'gasto' ? 'text-[var(--red)]' : 'text-accent'}`}>
              <AnimatedNumber value={t.amount} prefix={t.type === 'gasto' ? '-' : '+'} delay={i * 0.1} />
            </p>
          </div>
        );
      })}
    </div>
  );
}
