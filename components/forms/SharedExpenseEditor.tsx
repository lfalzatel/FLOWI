'use client';
import { useState } from 'react';
import { Users, X, Plus } from 'lucide-react';
import { equalShares, personKey } from '@/lib/shared';

// Borrador del formulario: los montos van como texto mientras se escriben
export interface SharedDraft {
  paidByMe: boolean;
  equal: boolean;                                 // partes iguales (se recalculan con el total)
  people: { name: string; amount: string; settledAt?: string | null }[];
}

export const emptySharedDraft = (): SharedDraft => ({ paidByMe: true, equal: true, people: [{ name: '', amount: '' }] });

/** Montos de cada persona según el borrador y el total escrito. */
export function draftAmounts(d: SharedDraft, total: number, cents = false): number[] {
  const r = (n: number) => (cents ? Math.round(n * 100) / 100 : Math.round(n));
  if (!d.paidByMe) return [r(total)];
  if (d.equal) return equalShares(r(total), d.people.length, cents);
  return d.people.map(p => r(Number(String(p.amount).replace(',', '.')) || 0));
}

interface Props {
  draft: SharedDraft;
  total: number;             // lo escrito en "Monto"
  knownNames: string[];
  isTech: boolean;
  fmt: (n: number) => string;
  cents?: boolean;           // la moneda usa centavos (euro, dólar…)
  onChange: (d: SharedDraft) => void;
  onRemove: () => void;
}

export function SharedExpenseEditor({ draft, total, knownNames, isTech, fmt, cents = false, onChange, onRemove }: Props) {
  const [focusIdx, setFocusIdx] = useState<number | null>(null);
  const r = (n: number) => (cents ? Math.round(n * 100) / 100 : Math.round(n));
  const amounts = draftAmounts(draft, total, cents);
  const others = r(amounts.reduce((s, a) => s + a, 0));
  const mine = r(draft.paidByMe ? total - others : total);
  const box = isTech ? 'rounded-none' : 'rounded-xl';
  const chip = isTech ? 'rounded-none font-mono' : 'rounded-full';
  const input = `bg-glass border py-2 px-3 text-sm text-text-primary placeholder-text-muted focus:outline-none ${isTech ? 'border-accent/30 rounded-none focus:border-accent font-mono' : 'border-glass-border rounded-lg focus:border-accent'}`;

  const setPerson = (i: number, patch: Partial<SharedDraft['people'][number]>) =>
    onChange({ ...draft, people: draft.people.map((p, j) => (j === i ? { ...p, ...patch } : p)) });

  const used = new Set(draft.people.map(p => personKey(p.name)));
  const suggestions = (i: number) => {
    const q = personKey(draft.people[i]?.name || '');
    return knownNames.filter(n => !used.has(personKey(n)) && (!q || personKey(n).startsWith(q))).slice(0, 5);
  };

  const setMode = (paidByMe: boolean) => {
    if (paidByMe === draft.paidByMe) return;
    // Si pagó otra persona solo importa quién pagó: se deja la primera
    onChange(paidByMe ? { ...draft, paidByMe, people: draft.people.length ? draft.people : [{ name: '', amount: '' }] }
                      : { ...draft, paidByMe, people: [draft.people[0] || { name: '', amount: '' }] });
  };

  const switchEqual = (equal: boolean) => {
    if (equal === draft.equal) return;
    // Al pasar a montos distintos, se parte de lo que daban las partes iguales
    onChange({ ...draft, equal, people: draft.people.map((p, i) => ({ ...p, amount: equal ? p.amount : String(amounts[i] || '') })) });
  };

  return (
    <div className={`border p-3 space-y-3 ${box} ${isTech ? 'border-accent/30 bg-accent/5' : 'border-accent/30 bg-accent/5'}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`flex items-center gap-1.5 text-xs font-bold text-accent ${isTech ? 'font-mono uppercase tracking-wider' : ''}`}>
          <Users className="w-4 h-4" /> Gasto compartido
        </span>
        <button type="button" onClick={onRemove} aria-label="Quitar gasto compartido" className="p-1 text-text-muted hover:text-text-primary">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {([true, false] as const).map(v => (
          <button key={String(v)} type="button" onClick={() => setMode(v)}
                  className={`py-2 text-xs font-semibold border transition-colors ${box} ${draft.paidByMe === v ? 'border-accent bg-accent/15 text-accent' : 'border-glass-border text-text-secondary'}`}>
            {v ? 'Yo pagué' : 'Pagó otra persona'}
          </button>
        ))}
      </div>

      {draft.paidByMe && draft.people.length > 0 && (
        <div className="flex gap-1.5">
          {([true, false] as const).map(v => (
            <button key={String(v)} type="button" onClick={() => switchEqual(v)}
                    className={`px-2.5 py-1 text-[11px] font-semibold border ${chip} ${draft.equal === v ? 'border-accent/60 bg-accent/10 text-accent' : 'border-glass-border text-text-muted'}`}>
              {v ? 'Partes iguales' : 'Montos distintos'}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <p className="text-[11px] text-text-muted">
          {draft.paidByMe ? '¿Con quién lo compartiste? Cada persona te debe su parte.' : '¿Quién pagó? Le debes lo que escribiste en Monto.'}
        </p>
        {draft.people.map((p, i) => (
          <div key={i} className="space-y-1">
            <div className="flex items-center gap-2">
              <input value={p.name} placeholder={draft.paidByMe ? `Persona ${i + 1}` : 'Nombre de quien pagó'}
                     onFocus={() => setFocusIdx(i)} onBlur={() => setTimeout(() => setFocusIdx(f => (f === i ? null : f)), 150)}
                     onChange={e => setPerson(i, { name: e.target.value })}
                     className={`${input} flex-1 min-w-0`} aria-label={`Nombre de la persona ${i + 1}`} />
              {draft.paidByMe && (draft.equal ? (
                <span className="w-24 text-right text-sm font-semibold text-text-secondary shrink-0">{fmt(amounts[i] || 0)}</span>
              ) : (
                <input value={p.amount} inputMode="decimal" placeholder="0"
                       onChange={e => setPerson(i, { amount: e.target.value.replace(cents ? /[^0-9.,]/g : /[^0-9]/g, '') })}
                       className={`${input} w-24 text-right shrink-0`} aria-label={`Monto de ${p.name || `la persona ${i + 1}`}`} />
              ))}
              {draft.paidByMe && draft.people.length > 1 && (
                <button type="button" aria-label="Quitar persona" onClick={() => onChange({ ...draft, people: draft.people.filter((_, j) => j !== i) })}
                        className="p-1 text-text-muted hover:text-red-400 shrink-0"><X className="w-4 h-4" /></button>
              )}
            </div>
            {focusIdx === i && suggestions(i).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {suggestions(i).map(n => (
                  <button key={n} type="button" onMouseDown={e => e.preventDefault()} onClick={() => { setPerson(i, { name: n }); setFocusIdx(null); }}
                          className={`px-2.5 py-1 text-[11px] border border-glass-border text-text-secondary hover:border-accent/50 ${chip}`}>{n}</button>
                ))}
              </div>
            )}
            {p.settledAt && <p className="text-[10px] text-accent">✓ Ya {draft.paidByMe ? 'te pagó' : 'le pagaste'}</p>}
          </div>
        ))}
        {draft.paidByMe && (
          <button type="button" onClick={() => onChange({ ...draft, people: [...draft.people, { name: '', amount: '' }] })}
                  className={`flex items-center gap-1 text-xs font-semibold text-accent ${isTech ? 'font-mono' : ''}`}>
            <Plus className="w-3.5 h-3.5" /> Agregar persona
          </button>
        )}
      </div>

      {total > 0 && (
        <div className={`text-xs border-t pt-2 space-y-0.5 ${isTech ? 'border-accent/20' : 'border-glass-border'}`}>
          {draft.paidByMe ? (
            <>
              <p className="flex justify-between"><span className="text-text-muted">Te deben</span><b className="text-accent">{fmt(others)}</b></p>
              <p className="flex justify-between"><span className="text-text-muted">Tu parte (va a tus gastos)</span>
                <b className={mine < 0 ? 'text-red-400' : 'text-text-primary'}>{fmt(mine)}</b></p>
              {mine < 0 && <p className="text-red-400">Lo de las demás personas suma más que el total.</p>}
            </>
          ) : (
            <p className="flex justify-between"><span className="text-text-muted">Le debes (y va a tus gastos)</span><b className="text-text-primary">{fmt(mine)}</b></p>
          )}
        </div>
      )}
    </div>
  );
}
