'use client';
import { useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Shell, useStyles } from '@/components/accounts/AccountModals';
import { AmountKeypad } from '@/components/forms/AmountKeypad';
import { useAccounts } from '@/hooks/useAccounts';
import { useAuth } from '@/hooks/useAuth';
import { updateExpense, type Transaction } from '@/lib/firestore';
import { formatCurrency, hasCents } from '@/lib/format';
import { displayExpr, evalAmount } from '@/lib/amountExpr';
import { getLocalDateString } from '@/lib/dateUtils';
import { paidOf, remainingOf, withAbsorbed, withPayment, withoutPayment } from '@/lib/shared';

// Abono de un gasto compartido: lo que una persona te devuelve (o lo que tú le pagas) por partes,
// con la cuenta donde entró la plata. Si alguien nunca paga, "Lo asumo yo" lo pasa a tus gastos.
interface Props {
  tx: Transaction;
  index: number;              // persona en tx.shared.people
  initialAmount?: number;     // p. ej. leído de un comprobante de Nequi
  initialWhen?: Date;
  onClose: () => void;
}

export function SharedPaymentModal({ tx, index, initialAmount, initialWhen, onClose }: Props) {
  const s = useStyles();
  const { profile } = useAuth();
  const { accounts } = useAccounts();
  const currency = profile?.currency || 'COP';
  const cents = hasCents(currency);
  const fmt = (n: number) => formatCurrency(n, currency);
  const shared = tx.shared!;
  const person = shared.people[index];
  const toMe = shared.paidByMe;
  const first = person?.name.split(/\s+/)[0] || '';
  const pending = person ? remainingOf(person) : 0;
  const paid = person ? paidOf(person) : 0;
  const active = useMemo(() => accounts.filter(a => !a.archived && a.id), [accounts]);
  // La plata que te devuelven entra a una cuenta de verdad (no a la tarjeta de crédito): por defecto la principal
  const defaultAcc = active.find(a => a.isDefault && a.kind !== 'credito') || active.find(a => a.kind !== 'credito') || active[0];

  const when0 = initialWhen || new Date();
  const [amount, setAmount] = useState(initialAmount ? String(Math.min(initialAmount, pending || initialAmount)) : '');
  const [date, setDate] = useState(getLocalDateString(when0));
  const [time, setTime] = useState(`${String(when0.getHours()).padStart(2, '0')}:${String(when0.getMinutes()).padStart(2, '0')}`);
  const [accountId, setAccountId] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmAbsorb, setConfirmAbsorb] = useState(false);
  const acc = accountId || defaultAcc?.id || '';

  const r = (n: number) => (cents ? Math.round(n * 100) / 100 : Math.round(n));
  const value = r(Math.max(0, evalAmount(amount) ?? 0));
  const over = value > pending + 0.001;

  const write = async (next: typeof shared, extra: Partial<Transaction> = {}) => {
    setBusy(true); setError('');
    try {
      await updateExpense(tx.id!, { shared: next, ...extra });
      onClose();
    } catch (e) {
      console.error('No se pudo guardar el abono', e);
      setError('No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.');
      setBusy(false);
    }
  };

  const save = () => {
    if (!value || over || busy) return;
    const [y, m, d] = date.split('-').map(Number);
    const [hh, mm] = (time || '12:00').split(':').map(Number);
    write(withPayment(shared, index, value, new Date(y, m - 1, d, hh, mm), acc || null));
  };

  const absorb = () => {
    const { shared: next, added } = withAbsorbed(shared, index);
    write(next, { amount: r(tx.amount + added) });
  };

  if (!person) return null;
  const what = tx.description?.trim() || tx.category;

  return (
    <Shell title={toMe ? `Abono de ${first}` : `Abono a ${first}`} onClose={onClose}
           footer={pending > 0 ? (
             <button type="button" onClick={save} disabled={!value || over || busy} className={s.primary}>
               {busy ? 'Guardando…' : value ? `Guardar abono de ${fmt(value)}` : 'Escribe el monto'}
             </button>
           ) : (
             <button type="button" onClick={onClose} className={s.primary}>Listo</button>
           )}>
      <div className={`p-3 border text-sm ${s.isTech ? 'rounded-none border-accent/30' : 'rounded-xl border-glass-border'}`}>
        <p className="text-text-primary font-semibold truncate">{what}</p>
        <p className="text-xs text-text-muted mt-0.5">
          {toMe ? `Le tocaba a ${first}` : `Le debías a ${first}`}: <b className="text-text-secondary">{fmt(person.amount)}</b>
          {paid > 0 && <> · abonado <b className="text-accent">{fmt(paid)}</b></>}
        </p>
        <p className="text-xs mt-0.5">
          {pending > 0
            ? <>Falta <b className={toMe ? 'text-accent' : 'text-[var(--red)]'}>{fmt(pending)}</b></>
            : person.absorbed ? <span className="text-amber-400">Asumiste {fmt(person.absorbed)} como gasto tuyo</span>
            : <span className="text-accent">✓ Saldado</span>}
        </p>
      </div>

      {pending > 0 && (
        <>
          <div>
            <span className={s.label}>¿Cuánto {toMe ? 'te abonó' : 'le abonaste'}?</span>
            <div className={`${s.input} text-2xl font-bold tabular-nums ${over ? '!border-red-500' : ''}`}>
              {amount ? displayExpr(amount) : <span className="text-text-muted">0</span>}
              {amount && /[+\-×÷]/.test(amount.replace(/^-/, '')) && <span className="ml-2 text-sm text-text-muted">= {fmt(value)}</span>}
            </div>
            {over && <p className="text-[11px] text-red-400 mt-1">Es más de lo que falta ({fmt(pending)}).</p>}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[['Todo', pending], ['Mitad', r(pending / 2)]].map(([label, v]) => (
                <button key={label as string} type="button" onClick={() => setAmount(String(v))} className={s.chip(value === v)}>
                  {label}: {fmt(v as number)}
                </button>
              ))}
            </div>
            <div className="mt-2 -mx-3">
              <AmountKeypad value={amount} isTech={s.isTech} decimals={cents} nextLabel="Listo"
                            onChange={setAmount} onNext={() => {}} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="ab-date" className={s.label}>Fecha</label>
              <input id="ab-date" autoComplete="off" type="date" value={date} max={getLocalDateString()} onChange={e => e.target.value && setDate(e.target.value)} className={s.input} />
            </div>
            <div>
              <label htmlFor="ab-time" className={s.label}>Hora</label>
              <input id="ab-time" autoComplete="off" type="time" value={time} onChange={e => setTime(e.target.value)} className={s.input} />
            </div>
          </div>

          {active.length > 0 && (
            <div>
              <span className={s.label}>{toMe ? '¿A qué cuenta te llegó?' : '¿De qué cuenta salió?'}</span>
              <div className="flex flex-wrap gap-1.5">
                {active.map(a => (
                  <button key={a.id} type="button" onClick={() => setAccountId(a.id!)} className={s.chip(acc === a.id)}>{a.name}</button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!!person.payments?.length && (
        <div>
          <span className={s.label}>Abonos ({person.payments.length})</span>
          <ul className="space-y-1.5">
            {person.payments.map((x, j) => (
              <li key={j} className="flex items-center gap-2 text-xs">
                <span className="text-text-muted flex-1 min-w-0 truncate">
                  {new Date(x.at).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                  {x.accountId ? ` · ${active.find(a => a.id === x.accountId)?.name || 'cuenta'}` : ''}
                </span>
                <span className="font-semibold text-accent tabular-nums">{fmt(x.amount)}</span>
                <button type="button" disabled={busy} onClick={() => write(withoutPayment(shared, index, j))} aria-label="Borrar abono"
                        className="p-1 text-text-muted hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {toMe && pending > 0 && (confirmAbsorb ? (
        <div className={`p-3 border border-amber-400/50 bg-amber-400/10 space-y-2 ${s.isTech ? 'rounded-none' : 'rounded-xl'}`}>
          <p className="text-xs text-amber-300">
            Los {fmt(pending)} que no te pagó {first} pasan a ser gasto tuyo en {tx.category}, y {first} queda a paz y salvo.
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setConfirmAbsorb(false)} className={`flex-1 ${s.chip(false)}`}>Cancelar</button>
            <button type="button" disabled={busy} onClick={absorb} className={`flex-1 ${s.chip(true)}`}>Sí, lo asumo</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirmAbsorb(true)} className="w-full text-[11px] text-text-muted underline underline-offset-2">
          ¿{first} no te va a pagar? Pasar lo que falta a mis gastos
        </button>
      ))}

      {error && <p className="text-xs text-red-400">{error}</p>}
    </Shell>
  );
}
