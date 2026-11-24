'use client';
import { X, Plus } from 'lucide-react';
import { SALE_COST_KINDS } from '@/lib/business';
import { tr } from '@/lib/i18n';

// Costos de una venta del negocio (producto, envío, comisión, empaque) y lo que te queda.
// Cada costo se guarda como un gasto del negocio unido a la venta.
export interface SaleCostDraft { id?: string; category: string; amount: string }

export const costLabel = (category: string) => SALE_COST_KINDS.find(k => k.category === category)?.label || category;

interface Props {
  costs: SaleCostDraft[];
  saleAmount: number;
  isTech: boolean;
  fmt: (n: number) => string;
  onChange: (c: SaleCostDraft[]) => void;
}

export function SaleCostsEditor({ costs, saleAmount, isTech, fmt, onChange }: Props) {
  const total = costs.reduce((s, c) => s + (Number(c.amount.replace(/\./g, '').replace(',', '.')) || 0), 0);
  const left = saleAmount - total;
  const box = isTech ? 'rounded-none' : 'rounded-xl';
  const chip = `px-2.5 py-1 text-[11px] font-semibold border border-dashed border-accent/40 text-accent inline-flex items-center gap-1 ${isTech ? 'rounded-none' : 'rounded-full'}`;
  const input = `bg-glass border py-2 px-3 text-sm text-text-primary placeholder-text-muted focus:outline-none ${isTech ? 'border-accent/30 rounded-none focus:border-accent font-mono' : 'border-glass-border rounded-lg focus:border-accent'}`;

  return (
    <div className={`border border-orange-400/30 bg-orange-400/5 p-3 space-y-2.5 normal-case ${box}`}>
      <p className="text-xs font-bold text-orange-300">{tr('Costos de esta venta (opcional)')}</p>
      {costs.map((c, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-24 shrink-0 text-xs text-text-secondary">{costLabel(c.category)}</span>
          <input value={c.amount} inputMode="numeric" placeholder="0" autoComplete="off" aria-label={`Costo de ${costLabel(c.category)}`}
                 onChange={e => onChange(costs.map((x, j) => (j === i ? { ...x, amount: e.target.value.replace(/[^0-9.,]/g, '') } : x)))}
                 className={`${input} flex-1 min-w-0 text-right`} />
          <button type="button" aria-label={tr('Quitar costo')} onClick={() => onChange(costs.filter((_, j) => j !== i))}
                  className="p-1 text-text-muted hover:text-red-400"><X className="w-4 h-4" /></button>
        </div>
      ))}
      <div className="flex flex-wrap gap-1.5">
        {SALE_COST_KINDS.map(k => (
          <button key={k.category} type="button" className={chip} onClick={() => onChange([...costs, { category: k.category, amount: '' }])}>
            <Plus className="w-3 h-3" /> {k.label}
          </button>
        ))}
      </div>
      {saleAmount > 0 && total > 0 && (
        <div className={`flex justify-between text-xs border-t pt-2 ${isTech ? 'border-accent/20' : 'border-glass-border'}`}>
          <span className="text-text-muted">Vendiste {fmt(saleAmount)} − costos {fmt(total)}</span>
          <b className={left >= 0 ? 'text-accent' : 'text-red-400'}>Te queda {left < 0 ? '−' : ''}{fmt(Math.abs(left))}</b>
        </div>
      )}
    </div>
  );
}
