'use client';
import { useEffect } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { Account } from '@/lib/firestore';
import { AccountIcon } from '@/components/accounts/AccountIcon';
import { tr } from '@/lib/i18n';

// Elegir una de mis cuentas (o ninguna). Mientras no se haya elegido nada, viene marcada la cuenta principal
// (como en los gastos), para que la plata se descuente de algún lado sin tener que pensarlo.
// Si no hay cuentas registradas muestra `emptyHint` (o nada).
export function AccountPicker({ accounts, value, onChange, label, noneLabel, hint, emptyHint, autoMain = true }: {
  accounts: Account[]; value: string | null | undefined; onChange: (id: string | null) => void;
  label: string; noneLabel?: string; hint?: string; emptyHint?: string; autoMain?: boolean;
}) {
  const { theme } = useTheme();
  const isTech = theme === 'cyberpunk' || theme === 'kiloCode';
  const active = accounts.filter(a => !a.archived && a.id);
  const main = active.find(a => a.isDefault) || (active.length === 1 ? active[0] : undefined);
  useEffect(() => {
    if (autoMain && value === undefined && main?.id) onChange(main.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoMain, value, main?.id]);
  const lbl = `${isTech ? 'text-accent/70' : 'text-text-muted'} text-xs font-medium mb-1.5 block`;
  if (!active.length) {
    return emptyHint ? (
      <div>
        <span className={lbl}>{label}</span>
        <p className="text-[11px] text-amber-300/90 leading-snug">{emptyHint}</p>
      </div>
    ) : null;
  }
  const chip = (on: boolean) => `px-3 py-2 text-xs font-semibold border transition-all active:scale-95 ${isTech ? 'rounded-none' : 'rounded-xl'} ${
    on ? 'bg-accent/15 border-accent text-accent' : 'border-glass-border text-text-secondary hover:text-text-primary hover:bg-glass'}`;
  return (
    <div>
      <span className={lbl}>{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {active.map(a => (
          <button key={a.id} type="button" onClick={() => onChange(a.id!)} aria-pressed={value === a.id}
                  className={`${chip(value === a.id)} inline-flex items-center gap-1.5`}>
            <AccountIcon account={a} className="w-4 h-4 text-sm flex items-center justify-center" /> {a.name}
            {a.id === main?.id && <span className="text-[9px] opacity-60 font-normal">{tr('principal')}</span>}
          </button>
        ))}
        {noneLabel && <button type="button" onClick={() => onChange(null)} aria-pressed={value === null} className={chip(value === null)}>{noneLabel}</button>}
      </div>
      {hint && <p className="text-[11px] text-text-muted mt-1.5 leading-snug">{hint}</p>}
    </div>
  );
}
