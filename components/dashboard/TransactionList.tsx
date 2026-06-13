'use client';
import { Transaction, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/lib/firestore';
import { Timestamp } from 'firebase/firestore';
import { useTheme } from '@/components/ThemeProvider';
import { AnimatedNumber } from './AnimatedNumber';
import { SiNetflix, SiYoutube, SiYoutubemusic } from 'react-icons/si';
import { FcGoogle } from 'react-icons/fc';

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
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

function getCategoryIcon(category: string, type: string) {
  const cats = type === 'gasto' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  return cats.find(c => c.label === category) || { label: 'Otro', icon: '💡', color: '#6B7280' };
}

function RenderIcon({ icon, label, className }: { icon: string, label: string, className?: string }) {
  if (label === 'Netflix') return <SiNetflix color="#E50914" className={className || "w-5 h-5"} />;
  if (label === 'Google') return <FcGoogle className={className || "w-5 h-5"} />;
  if (label === 'YouTube') return <SiYoutube color="#FF0000" className={className || "w-5 h-5"} />;
  if (label === 'YT Music') return <SiYoutubemusic color="#FF0000" className={className || "w-5 h-5"} />;
  return <span className={className}>{icon}</span>;
}

export function TransactionList({ transactions, limit, onEdit, animationKey }: Props) {
  const { theme } = useTheme();
  const isCyberpunk = theme === 'cyberpunk' || theme === 'kiloCode';
  const items = limit ? transactions.slice(0, limit) : transactions;

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
        const cat = getCategoryIcon(t.category, t.type);
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
              <div className="flex items-center gap-3 min-w-0">
                <span className="opacity-80 flex items-center justify-center">
                  <RenderIcon icon={cat.icon} label={cat.label || t.category} className="text-lg w-5 h-5" />
                </span>
                <p className="text-[13px] font-bold text-text-primary font-mono truncate uppercase tracking-widest">
                  {displayLabel}
                </p>
              </div>
              <p className={`text-[13px] font-bold flex-shrink-0 font-mono tracking-widest
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
              <RenderIcon icon={cat.icon} label={cat.label || t.category} className="text-lg w-5 h-5" />
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
