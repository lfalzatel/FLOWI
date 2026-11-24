'use client';
import { tr } from '@/lib/i18n';
import { useState } from 'react';
import { Users, X, Plus } from 'lucide-react';
import { SharedPayment, equalShares, personKey } from '@/lib/shared';
import { AmountKeypad } from '@/components/forms/AmountKeypad';
import { displayExpr, evalAmount } from '@/lib/amountExpr';

// Borrador del formulario: los montos van como texto mientras se escriben
export interface SharedDraft {
  paidByMe: boolean;
  equal: boolean;                                 // partes iguales (se recalculan con el total)
  // Abonos y lo asumido se conservan al editar (se manejan en Compartidos)
  people: { name: string; amount: string; settledAt?: string | null; payments?: SharedPayment[]; absorbed?: number; friendUid?: string | null }[];
}

export const emptySharedDraft = (): SharedDraft => ({ paidByMe: true, equal: true, people: [{ name: '', amount: '' }] });

/** Montos de cada persona según el borrador y el total escrito. */
export function draftAmounts(d: SharedDraft, total: number, cents = false): number[] {
  const r = (n: number) => (cents ? Math.round(n * 100) / 100 : Math.round(n));
  if (!d.paidByMe) return [r(total)];
  if (d.equal) return equalShares(r(total), d.people.length, cents);
  // Cada monto puede ser una cuenta hecha con la calculadora ("382939÷2", "100000+25000")
  return d.people.map(p => r(Math.max(0, evalAmount(String(p.amount).replace(',', '.')) ?? 0)));
}

interface Props {
  draft: SharedDraft;
  total: number;             // lo escrito en "Monto"
  knownNames: string[];
  friends?: { uid: string; name: string }[]; // amigos de FLOWI: si eliges uno, el gasto le llega a su app
  linkStatus?: (friendUid: string) => string | undefined; // al editar: pendiente / aceptado / rechazado
  isTech: boolean;
  fmt: (n: number) => string;
  cents?: boolean;           // la moneda usa centavos (euro, dólar…)
  onChange: (d: SharedDraft) => void;
  onRemove: () => void;
}

export function SharedExpenseEditor({ draft, total, knownNames, friends = [], linkStatus, isTech, fmt, cents = false, onChange, onRemove }: Props) {
  // El amigo de FLOWI que corresponde a un nombre (nombre completo igual)
  const friendFor = (name: string) => friends.find(f => personKey(f.name) === personKey(name))?.uid || null;
  const [focusIdx, setFocusIdx] = useState<number | null>(null);
  const [calcIdx, setCalcIdx] = useState<number | null>(null); // persona con la calculadora abierta
  const r = (n: number) => (cents ? Math.round(n * 100) / 100 : Math.round(n));
  const amounts = draftAmounts(draft, total, cents);
  const others = r(amounts.reduce((s, a) => s + a, 0) - draft.people.reduce((s, p) => s + (p.absorbed || 0), 0));
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
          <Users className="w-4 h-4" /> {tr('Gasto compartido')}
        </span>
        {total > 0 && <span className="ml-auto text-xs text-text-muted">{tr('Total')} <b className="text-text-primary">{fmt(r(total))}</b></span>}
        <button type="button" onClick={onRemove} aria-label={tr('Quitar gasto compartido')} className="p-1 text-text-muted hover:text-text-primary">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {([true, false] as const).map(v => (
          <button key={String(v)} type="button" onClick={() => setMode(v)}
                  className={`py-2 text-xs font-semibold border transition-colors ${box} ${draft.paidByMe === v ? 'border-accent bg-accent/15 text-accent' : 'border-glass-border text-text-secondary'}`}>
            {v ? tr('Yo pagué') : tr('Pagó otra persona')}
          </button>
        ))}
      </div>

      {draft.paidByMe && draft.people.length > 0 && (
        <div className="flex gap-1.5">
          {([true, false] as const).map(v => (
            <button key={String(v)} type="button" onClick={() => switchEqual(v)}
                    className={`px-2.5 py-1 text-[11px] font-semibold border ${chip} ${draft.equal === v ? 'border-accent/60 bg-accent/10 text-accent' : 'border-glass-border text-text-muted'}`}>
              {v ? tr('Partes iguales') : tr('Montos distintos')}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <p className="text-[11px] text-text-muted">
          {draft.paidByMe ? tr('¿Con quién lo compartiste? Cada persona te debe su parte.') : tr('¿Quién pagó? Le debes lo que escribiste en Monto.')}
        </p>
        {draft.people.map((p, i) => (
          <div key={i} className="space-y-1">
            <div className="flex items-center gap-2">
              <input autoComplete="off" value={p.name} placeholder={draft.paidByMe ? tr('Persona {a}', { a: i + 1 }) : tr('Nombre de quien pagó')}
                     onFocus={() => setFocusIdx(i)} onBlur={() => setTimeout(() => setFocusIdx(f => (f === i ? null : f)), 150)}
                     onChange={e => setPerson(i, { name: e.target.value, friendUid: friendFor(e.target.value) })}
                     className={`${input} flex-1 min-w-0`} aria-label={`Nombre de la persona ${i + 1}`} />
              {draft.paidByMe && (draft.equal ? (
                <button type="button" onClick={() => { switchEqual(false); setCalcIdx(i); }} title={tr('Cambiar el monto')}
                        className="w-28 text-right text-sm font-semibold text-text-secondary shrink-0 underline decoration-dotted underline-offset-4">{fmt(amounts[i] || 0)}</button>
              ) : (
                <button type="button" onClick={() => setCalcIdx(c => (c === i ? null : i))}
                        className={`${input} w-28 text-right shrink-0 truncate ${calcIdx === i ? '!border-accent' : ''}`}
                        aria-label={`Monto de ${p.name || tr('la persona {a}', { a: i + 1 })}`}>
                  {p.amount ? displayExpr(p.amount) : <span className="text-text-muted">0</span>}
                </button>
              ))}
              {draft.paidByMe && draft.people.length > 1 && (
                <button type="button" aria-label={tr('Quitar persona')} onClick={() => onChange({ ...draft, people: draft.people.filter((_, j) => j !== i) })}
                        className="p-1 text-text-muted hover:text-red-400 shrink-0"><X className="w-4 h-4" /></button>
              )}
            </div>
            {focusIdx === i && suggestions(i).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {suggestions(i).map(n => (
                  <button key={n} type="button" onMouseDown={e => e.preventDefault()} onClick={() => { setPerson(i, { name: n, friendUid: friendFor(n) }); setFocusIdx(null); }}
                          className={`px-2.5 py-1 text-[11px] border border-glass-border text-text-secondary hover:border-accent/50 ${chip}`}>{friendFor(n) ? '🔗 ' : ''}{n}</button>
                ))}
              </div>
            )}
            {calcIdx === i && !draft.equal && draft.paidByMe && (() => {
              // Atajos para repartir; lo demás se hace con la calculadora
              const rest = r(total - amounts.reduce((s2, a, j) => (j === i ? s2 : s2 + a), 0));
              const quick: [string, number][] = [['Todo', r(total)], ['Mitad', r(total / 2)], ...(draft.people.length > 1 && rest > 0 ? [['Lo que falta', rest] as [string, number]] : [])];
              const val = evalAmount(p.amount);
              return (
                <div className={`mt-1 border ${isTech ? 'border-accent/30' : 'border-glass-border rounded-xl overflow-hidden'}`}>
                  <div className="flex flex-wrap items-center gap-1.5 px-3 pt-2">
                    {total > 0 && quick.map(([label, v]) => (
                      <button key={label} type="button" onClick={() => setPerson(i, { amount: String(v) })}
                              className={`px-2.5 py-1 text-[11px] font-semibold border border-accent/40 text-accent ${chip}`}>{label}: {fmt(v)}</button>
                    ))}
                    {p.amount && /[+\-×÷]/.test(p.amount.replace(/^-/, '')) && val !== null && (
                      <span className="ml-auto text-xs text-text-muted">= <b className="text-text-primary">{fmt(r(val))}</b></span>
                    )}
                  </div>
                  <AmountKeypad value={p.amount} isTech={isTech} decimals={cents} nextLabel="Listo"
                                onChange={v => setPerson(i, { amount: v })}
                                onNext={() => { const v = evalAmount(draft.people[i]?.amount || ''); if (v !== null) setPerson(i, { amount: String(r(Math.max(0, v))) }); setCalcIdx(null); }} />
                </div>
              );
            })()}
            {draft.paidByMe && p.friendUid && (
              <p className="text-[10px] text-accent">
                🔗 {(() => {
                  const st = linkStatus?.(p.friendUid!);
                  const first = p.name.split(/\s+/)[0];
                  return st === 'accepted' ? `${first} lo tiene en su FLOWI` : st === 'rejected' ? `${first} no lo aceptó` : st === 'pending' ? `Esperando que ${first} lo acepte` : `Le llega a ${first} en su FLOWI para aceptarlo`;
                })()}
              </p>
            )}
            {(() => {
              const paid = (p.payments || []).reduce((s2, x) => s2 + x.amount, 0);
              if (p.absorbed) return <p className="text-[10px] text-amber-400">Lo asumiste como gasto tuyo ({fmt(p.absorbed)})</p>;
              if (p.settledAt) return <p className="text-[10px] text-accent">✓ Ya {draft.paidByMe ? 'te pagó' : 'le pagaste'}</p>;
              if (paid > 0) return <p className="text-[10px] text-accent">Abonado {fmt(paid)}</p>;
              return null;
            })()}
          </div>
        ))}
        {draft.paidByMe && (
          <button type="button" onClick={() => onChange({ ...draft, people: [...draft.people, { name: '', amount: '' }] })}
                  className={`flex items-center gap-1 text-xs font-semibold text-accent ${isTech ? 'font-mono' : ''}`}>
            <Plus className="w-3.5 h-3.5" /> {tr('Agregar persona')}
          </button>
        )}
      </div>

      {total > 0 && (
        <div className={`text-xs border-t pt-2 space-y-0.5 ${isTech ? 'border-accent/20' : 'border-glass-border'}`}>
          {draft.paidByMe ? (
            <>
              <p className="flex justify-between"><span className="text-text-muted">{tr('Te deben')}</span><b className="text-accent">{fmt(others)}</b></p>
              <p className="flex justify-between"><span className="text-text-muted">{tr('Tu parte (va a tus gastos)')}</span>
                <b className={mine < 0 ? 'text-red-400' : 'text-text-primary'}>{fmt(mine)}</b></p>
              {mine < 0 && <p className="text-red-400">{tr('Lo de las demás personas suma más que el total.')}</p>}
            </>
          ) : (
            <p className="flex justify-between"><span className="text-text-muted">{tr('Le debes (y va a tus gastos)')}</span><b className="text-text-primary">{fmt(mine)}</b></p>
          )}
        </div>
      )}
    </div>
  );
}
