'use client';
import { useTheme } from '@/components/ThemeProvider';
import { Account } from '@/lib/firestore';
import { AccountIcon } from '@/components/accounts/AccountIcon';

// Elegir una de mis cuentas (o ninguna). Si no hay cuentas registradas no muestra nada.
export function AccountPicker({ accounts, value, onChange, label, noneLabel, hint }: {
  accounts: Account[]; value: string | null | undefined; onChange: (id: string | null) => void;
  label: string; noneLabel?: string; hint?: string;
}) {
  const { theme } = useTheme();
  const isTech = theme === 'cyberpunk' || theme === 'kiloCode';
  const active = accounts.filter(a => !a.archived && a.id);
  if (!active.length) return null;
  const chip = (on: boolean) => `px-3 py-2 text-xs font-semibold border transition-all active:scale-95 ${isTech ? 'rounded-none' : 'rounded-xl'} ${
    on ? 'bg-accent/15 border-accent text-accent' : 'border-glass-border text-text-secondary hover:text-text-primary hover:bg-glass'}`;
  return (
    <div>
      <span className={`${isTech ? 'text-accent/70' : 'text-text-muted'} text-xs font-medium mb-1.5 block`}>{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {active.map(a => (
          <button key={a.id} type="button" onClick={() => onChange(a.id!)} className={`${chip(value === a.id)} inline-flex items-center gap-1.5`}><AccountIcon account={a} className="w-4 h-4 text-sm flex items-center justify-center" /> {a.name}</button>
        ))}
        {noneLabel && <button type="button" onClick={() => onChange(null)} className={chip(value === null)}>{noneLabel}</button>}
      </div>
      {hint && <p className="text-[11px] text-text-muted mt-1.5 leading-snug">{hint}</p>}
    </div>
  );
}
