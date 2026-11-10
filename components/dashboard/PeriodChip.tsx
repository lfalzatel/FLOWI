'use client';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import type { Transaction } from '@/lib/firestore';
import { formatFilterText } from '@/lib/dateUtils';
import { DateFilter, FilterType } from './DateFilter';

// En el celular el filtro de fechas ocupa mucho: aquí es un botón pequeño ("Noviembre 2026 ▾")
// que abre el mismo filtro en una hoja desde abajo.
export function PeriodChip({ filterType, filterValue, onChangeType, onChangeValue, transactions = [] }: {
  filterType: FilterType; filterValue: string;
  onChangeType: (t: FilterType) => void; onChangeValue: (v: string) => void;
  transactions?: Transaction[];
}) {
  const { theme } = useTheme();
  const isTech = theme === 'cyberpunk' || theme === 'kiloCode';
  const [open, setOpen] = useState(false);
  const label = filterType === 'all' ? 'Todo' : formatFilterText(filterType, filterValue);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={`Periodo: ${label}. Toca para cambiarlo`}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border max-w-[11rem] ${isTech ? 'rounded-none border-accent/40 text-accent font-mono uppercase' : 'rounded-full border-glass-border bg-glass text-text-primary'}`}>
        <CalendarDays className="w-3.5 h-3.5 text-accent shrink-0" />
        <span className="truncate">{label}</span>
        <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-70" />
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          <div className={`absolute inset-0 ${theme === 'light' ? 'bg-black/20' : 'bg-black/60'}`} onClick={() => setOpen(false)} aria-hidden="true" />
          <div className={`relative w-full max-w-md p-4 pb-6 space-y-3 border animate-fade-in-up ${isTech ? 'bg-deep rounded-none border-accent/50' : 'bg-card rounded-t-[28px] border-glass-border'}`}
               style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
            <h2 className={`text-base font-bold ${isTech ? 'text-accent uppercase font-mono' : 'font-syne text-text-primary'}`}>¿Qué periodo quieres ver?</h2>
            <DateFilter inline transactions={transactions} filterType={filterType} filterValue={filterValue}
                        onChangeType={onChangeType}
                        onChangeValue={(v) => { onChangeValue(v); if (filterType === 'day') setOpen(false); }} />
            <button type="button" onClick={() => setOpen(false)}
                    className={`w-full py-3 font-bold ${isTech ? 'rounded-none bg-accent/20 border border-accent text-accent uppercase' : 'rounded-2xl bg-accent text-black'}`}>
              Listo
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
