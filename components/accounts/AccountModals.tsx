'use client';
import { currentLocale, tr } from '@/lib/i18n';
import { usePlanGate } from '@/lib/plans';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2 } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { Account, AccountKind, Transfer, addAccount, addTransfer, updateAccount, updateTransfer, deleteTransfer } from '@/lib/firestore';
import { KIND_EMOJI, KIND_LABEL, suggestMethods } from '@/lib/accounts';
import { AccountIcon } from '@/components/accounts/AccountIcon';
import { BankLogo, BankPickerSheet } from '@/components/accounts/BankPickerSheet';
import { Plus, ArrowRightLeft } from 'lucide-react';
// Montos con miles y hasta dos decimales con coma, como en la app del banco ("1.234.567,89")
export function formatMoneyInput(value: string | number): string {
  let raw = typeof value === 'number' ? value.toFixed(2).replace('.', ',').replace(/,00$/, '') : value;
  // Teclados que solo tienen punto: un punto recién escrito al final es la coma decimal
  // (los puntos de miles los pone el formato, nunca quedan al final)
  if (typeof value === 'string' && !raw.includes(',') && raw.endsWith('.')) raw = `${raw.slice(0, -1)},`;
  const [intPart, ...rest] = raw.replace(/[^\d,]/g, '').split(',');
  const digits = intPart.replace(/^0+(?=\d)/, '');
  const int = digits ? Number(digits).toLocaleString(currentLocale()) : (rest.length ? '0' : '');
  return rest.length ? `${int},${rest.join('').slice(0, 2)}` : int;
}
export function parseMoneyInput(value: string): number {
  const n = Number(value.replace(/\./g, '').replace(',', '.'));
  return isNaN(n) ? 0 : Math.round(n * 100) / 100;
}
import { formatCurrency } from '@/lib/format';
import { AmountKeypad } from '@/components/forms/AmountKeypad';
import { CalcAmountInput } from '@/components/forms/CalcAmountInput';
import { displayExpr, evalAmount, hasOperator } from '@/lib/amountExpr';
import { getLocalDateString } from '@/lib/dateUtils';

// ── Piezas comunes ───────────────────────────────────────────────────────
export function useStyles() {
  const { theme } = useTheme();
  const isTech = theme === 'cyberpunk' || theme === 'kiloCode';
  return {
    theme, isTech,
    label: `${isTech ? 'text-accent/70' : 'text-text-muted'} text-xs font-medium mb-1.5 block`,
    input: `w-full bg-glass border px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none ${isTech ? 'border-accent/30 rounded-none focus:border-accent font-mono' : 'border-glass-border rounded-xl focus:border-accent'}`,
    chip: (active: boolean) => `px-3 py-2 text-xs font-semibold border transition-all active:scale-95 ${isTech ? 'rounded-none' : 'rounded-xl'} ${
      active ? 'bg-accent/15 border-accent text-accent' : 'border-glass-border text-text-secondary hover:text-text-primary hover:bg-glass'}`,
    primary: `w-full py-3.5 font-bold transition-all active:scale-[0.98] disabled:opacity-50 ${isTech ? 'rounded-none bg-accent/20 border border-accent text-accent uppercase tracking-widest' : 'rounded-xl bg-accent text-white hover:bg-accent/90'}`,
    hint: 'text-[11px] text-text-muted mt-1.5 leading-snug',
  };
}

export function Shell({ title, onClose, children, footer }: { title: string; onClose: () => void; children: React.ReactNode; footer: React.ReactNode }) {
  const { theme, isTech } = useStyles();
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 ${isTech ? 'font-mono' : ''}`}>
      <div className={`absolute inset-0 ${(theme === 'light' || theme === 'nova') ? 'bg-black/10' : 'bg-black/40'}`} onClick={onClose} aria-hidden="true" />
      <div className={`w-full max-w-md relative z-10 animate-fade-in-up max-h-[88dvh] flex flex-col overflow-hidden glass-dropdown ${isTech ? 'rounded-none border border-accent/50' : 'rounded-3xl'}`}
           onClick={(e) => e.stopPropagation()}>
        <div className={`shrink-0 flex items-center justify-between gap-3 px-5 sm:px-6 pt-5 pb-3 ${isTech ? 'border-b border-accent/20' : ''}`}>
          <h2 className={isTech ? 'font-bold text-xl text-accent tracking-wide uppercase' : 'font-syne font-bold text-xl text-text-primary'}>{title}</h2>
          <button type="button" onClick={onClose} aria-label={tr('Cerrar')} className={`p-1 -mr-1 ${isTech ? 'text-accent' : 'text-text-secondary hover:text-text-primary'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 sm:px-6 pt-3 pb-5 space-y-5">{children}</div>
        <div className={`shrink-0 px-5 sm:px-6 pt-3 pb-4 border-t ${isTech ? 'bg-deep border-accent/20' : 'bg-card border-glass-border'}`}>{footer}</div>
      </div>
    </div>,
    document.body,
  );
}

const permissionMsg = (err: any) => err?.code === 'permission-denied'
  ? tr('La base de datos todavía no permite guardar cuentas. Hay que publicar las reglas de "fl_accounts".')
  : tr('No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.');

// ── Nueva / editar cuenta ────────────────────────────────────────────────
type AccountFormProps = {
  account?: Account | null; accounts: Account[]; onClose: () => void; onDelete?: (a: Account) => void;
  initial?: { name: string; kind: AccountKind; methods: string[] }; // crear desde el formulario de un gasto/ingreso
  onCreated?: (id: string) => void;
};

// Plan gratis: hasta 2 cuentas activas; al pasar el límite se muestran los planes
export function AccountFormModal(props: AccountFormProps) {
  const ok = usePlanGate('accounts', props.accounts.filter(a => !a.archived).length, false, !!props.account, props.onClose);
  return ok ? <AccountFormModalInner {...props} /> : null;
}

function AccountFormModalInner({ account, accounts, onClose, onDelete, initial, onCreated }: AccountFormProps) {
  const s = useStyles();
  const { user } = useAuth();
  const isFirst = !accounts.some(a => !a.archived);
  const [name, setName] = useState(account?.name || initial?.name || '');
  const [kind, setKind] = useState<AccountKind>(account?.kind || initial?.kind || 'banco');
  const [methods, setMethods] = useState<string[]>(account?.methods || initial?.methods || []);
  const [methodsTouched, setMethodsTouched] = useState(!!account || !!initial);
  const [purpose, setPurpose] = useState<'gastar' | 'ahorro'>(account?.purpose || 'gastar');
  const [methodsSheet, setMethodsSheet] = useState(false);
  const [balance, setBalance] = useState('');
  const [limit, setLimit] = useState(account?.creditLimit ? formatMoneyInput(account.creditLimit) : '');
  const [payMode, setPayMode] = useState<'total' | 'fijo'>(account?.payMode || 'total');
  const [payAmount, setPayAmount] = useState(account?.payAmount ? formatMoneyInput(account.payAmount) : '');
  const [payDay, setPayDay] = useState(account?.payDay ? String(account.payDay) : '');
  const [isDefault, setIsDefault] = useState(account ? !!account.isDefault : isFirst);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Mientras no los toque a mano, los medios de pago se sugieren por el nombre
  const shownMethods = methodsTouched ? methods : suggestMethods(name, kind);
  // Medios que ya usa otra cuenta (un medio solo puede caer en una cuenta)
  const taken = new Map<string, string>();
  for (const a of accounts) if (a.id !== account?.id && !a.archived) for (const m of a.methods) taken.set(m, a.name);

  const toggleMethod = (m: string) => {
    setMethodsTouched(true);
    setMethods(prev => (methodsTouched ? prev : shownMethods).includes(m)
      ? (methodsTouched ? prev : shownMethods).filter(x => x !== m)
      : [...(methodsTouched ? prev : shownMethods), m]);
  };

  const canSave = name.trim().length > 0 && !saving;

  async function save() {
    if (!user || !canSave) return;
    setSaving(true);
    setError('');
    try {
      const finalMethods = shownMethods.filter(m => !taken.has(m));
      if (isDefault) {
        // Solo una cuenta principal
        await Promise.all(accounts.filter(a => a.isDefault && a.id && a.id !== account?.id).map(a => updateAccount(a.id!, { isDefault: false })));
      }
      // Cómo se paga la tarjeta (para reservar en "Hoy puedes gastar" solo lo de este mes)
      const day = Math.min(31, Math.max(0, parseInt(payDay) || 0));
      const cardPay = kind === 'credito'
        ? { payMode, payAmount: payMode === 'fijo' ? parseMoneyInput(payAmount) : 0, payDay: day || 0 }
        : {};
      if (account?.id) {
        await updateAccount(account.id, { name: name.trim(), kind, methods: finalMethods, isDefault, purpose: kind === 'credito' ? 'gastar' : purpose,
          creditLimit: kind === 'credito' ? parseMoneyInput(limit) : 0, ...cardPay });
      } else {
        const amount = parseMoneyInput(balance);
        const id = await addAccount({
          userId: user.uid, name: name.trim(), kind, methods: finalMethods, isDefault,
          purpose: kind === 'credito' ? 'gastar' : purpose,
          baseBalance: kind === 'credito' ? -amount : amount,
          baseAt: new Date().toISOString(), adjustments: [], archived: false,
          ...(kind === 'credito' && parseMoneyInput(limit) > 0 ? { creditLimit: parseMoneyInput(limit) } : {}),
          ...cardPay,
        });
        onCreated?.(id);
      }
      onClose();
    } catch (err) {
      console.error('Error saving account:', err);
      setError(permissionMsg(err));
      setSaving(false);
    }
  }

  return (
    <Shell title={account ? tr('Editar cuenta') : tr('Nueva cuenta')} onClose={onClose}
           footer={<button type="button" data-tour="acc-save" disabled={!canSave} onClick={save} className={s.primary}>{saving ? tr('Guardando...') : account ? tr('Guardar cambios') : tr('Crear cuenta')}</button>}>
      <div data-tour="acc-kind">
        <span className={s.label}>{tr('Tipo')}</span>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(KIND_LABEL) as AccountKind[]).map(k => (
            <button key={k} type="button" onClick={() => setKind(k)} className={s.chip(kind === k)}>{KIND_EMOJI[k]} {tr(KIND_LABEL[k])}</button>
          ))}
        </div>
      </div>

      <div data-tour="acc-name">
        <label htmlFor="acc-name" className={s.label}>{tr('Nombre')}</label>
        <input id="acc-name" type="text" autoComplete="off" value={name} maxLength={30} onChange={(e) => setName(e.target.value)}
               placeholder={kind === 'efectivo' ? 'Efectivo' : kind === 'credito' ? tr('Ej: Visa Bancolombia') : kind === 'billetera' ? tr('Ej: Nequi') : tr('Ej: Bancolombia ahorros')}
               className={s.input} />
        <p className={s.hint}>{tr('No escribas números de cuenta: FLOWI no los necesita.')}</p>
      </div>

      {!account && (
        <div data-tour="acc-balance">
          <label htmlFor="acc-balance" className={s.label}>{kind === 'credito' ? tr('¿Cuánto debes hoy en la tarjeta?') : initial ? `¿Cuánto tenías en ${name || 'esta cuenta'} antes de este movimiento?` : tr('¿Cuánto tienes hoy en esta cuenta?')}</label>
          <input id="acc-balance" type="text" autoComplete="off" inputMode="decimal" placeholder="$ 0" value={balance}
                 onChange={(e) => setBalance(formatMoneyInput(e.target.value))} className={`${s.input} font-bold`} />
          <p className={s.hint}>{tr('Míralo en la app del banco. Desde hoy, tus gastos e ingresos de esta cuenta lo van moviendo.')}</p>
        </div>
      )}

      {kind === 'credito' && (
        <div>
          <label htmlFor="acc-limit" className={s.label}>{tr('Cupo de la tarjeta (opcional)')}</label>
          <input id="acc-limit" type="text" autoComplete="off" inputMode="decimal" placeholder="$ 0" value={limit}
                 onChange={(e) => setLimit(formatMoneyInput(e.target.value))} className={`${s.input} font-bold`} />
          <p className={s.hint}>{tr('Con el cupo, FLOWI te muestra cuánto te queda disponible para usar.')}</p>
        </div>
      )}

      {kind === 'credito' && (
        <div className="space-y-2">
          <span className={s.label}>{tr('¿Cómo la pagas?')}</span>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setPayMode('total')} className={s.chip(payMode === 'total')}>{tr('Todo cada mes')}</button>
            <button type="button" onClick={() => setPayMode('fijo')} className={s.chip(payMode === 'fijo')}>{tr('Un pago fijo al mes')}</button>
          </div>
          {payMode === 'fijo' && (
            <input type="text" autoComplete="off" inputMode="decimal" placeholder={tr('¿Cuánto pagas al mes? $ 0')} value={payAmount} aria-label={tr('Pago al mes')}
                   onChange={(e) => setPayAmount(formatMoneyInput(e.target.value))} className={`${s.input} font-bold`} />
          )}
          <div className="flex items-center gap-2">
            <label htmlFor="acc-payday" className="text-xs text-text-muted shrink-0">{tr('Día de pago')}</label>
            <input id="acc-payday" type="text" autoComplete="off" inputMode="numeric" placeholder={tr('Ej: 15')} value={payDay} maxLength={2}
                   onChange={(e) => setPayDay(e.target.value.replace(/[^0-9]/g, ''))} className={`${s.input} !w-24 !py-2`} />
          </div>
          <p className={s.hint}>
            {payMode === 'fijo'
              ? tr('En "Hoy puedes gastar" solo se aparta este pago del mes (menos lo que ya le abonaste), no todo lo que debes.')
              : tr('En "Hoy puedes gastar" se aparta todo lo que debes en la tarjeta, porque lo pagas completo.')}
          </p>
        </div>
      )}

      <div data-tour="acc-methods">
        <span className={s.label}>{tr('¿Qué movimientos caen aquí?')}</span>
        <div className="flex flex-wrap gap-1.5">
          {shownMethods.filter(m => !taken.has(m)).map(m => (
            <span key={m} className={`${s.chip(true)} inline-flex items-center gap-1.5`}>
              <BankLogo label={m} className="w-4 h-4 text-sm flex items-center justify-center" /> {m}
              <button type="button" onClick={() => toggleMethod(m)} aria-label={`Quitar ${m}`} className="ml-0.5 opacity-70 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
            </span>
          ))}
          <button type="button" onClick={() => setMethodsSheet(true)} className={`${s.chip(false)} inline-flex items-center gap-1`}>
            <Plus className="w-3.5 h-3.5" /> {tr('Agregar')}
          </button>
        </div>
        {methodsSheet && (
          <BankPickerSheet title={tr('¿Qué movimientos caen aquí?')} multiple
                           selected={shownMethods.filter(m => !taken.has(m))}
                           disabled={Object.fromEntries(Array.from(taken.entries()).map(([m, owner]) => [m, tr('Ya está en {a}', { a: owner })]))}
                           onChange={(v) => { setMethodsTouched(true); setMethods(v); }}
                           onClose={() => setMethodsSheet(false)} />
        )}
        <p className={s.hint}>{tr('Los gastos e ingresos que registres con estos medios de pago mueven esta cuenta.')}</p>
      </div>

      {kind !== 'credito' && (
        <div data-tour="acc-purpose">
          <span className={s.label}>{tr('¿Para qué es esta plata?')}</span>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPurpose('gastar')} className={s.chip(purpose === 'gastar')}>{tr('Para gastar')}</button>
            <button type="button" onClick={() => setPurpose('ahorro')} className={s.chip(purpose === 'ahorro')}>{tr('Ahorro')}</button>
          </div>
          <p className={s.hint}>{purpose === 'gastar'
            ? tr('Cuenta en "Hoy puedes gastar": es la plata del día a día.')
            : tr('No cuenta en "Hoy puedes gastar" (por ejemplo, tu fondo de emergencia), pero sí en tu patrimonio.')}</p>
        </div>
      )}

      <label className="flex items-start gap-3 cursor-pointer">
        <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[var(--accent)]" />
        <span className="text-sm text-text-secondary">
          {tr('Cuenta principal')}
          <span className="block text-[11px] text-text-muted">{tr('Recibe los gastos e ingresos que no dicen con qué se pagaron (la mayoría de los que dictas por voz).')}</span>
        </span>
      </label>

      {error && <p className="text-xs text-[var(--red)] bg-red-500/10 border border-red-500/20 rounded-xl p-3">{error}</p>}

      {account && onDelete && (
        <button type="button" onClick={() => onDelete(account)}
                className={`w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold text-[var(--red)] border border-red-500/30 hover:bg-red-500/10 ${s.isTech ? 'rounded-none uppercase' : 'rounded-xl'}`}>
          <Trash2 className="w-4 h-4" /> {tr('Eliminar cuenta')}
        </button>
      )}
    </Shell>
  );
}

// ── Ajustar saldo ────────────────────────────────────────────────────────
export function AdjustBalanceModal({ account, current, currency = 'COP', onClose }: {
  account: Account; current: number; currency?: string; onClose: () => void;
}) {
  const s = useStyles();
  const credit = account.kind === 'credito';
  const [value, setValue] = useState(formatMoneyInput(Math.abs(Math.round(current * 100) / 100)));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const amount = parseMoneyInput(value);
  const target = credit ? -amount : amount;
  const diff = target - current;

  async function save() {
    if (!account.id || saving) return;
    setSaving(true);
    try {
      const at = new Date().toISOString();
      await updateAccount(account.id, {
        baseBalance: target, baseAt: at,
        adjustments: [...(account.adjustments || []), { at, from: Math.round(current * 100) / 100, to: target }].slice(-20),
      });
      onClose();
    } catch (err) {
      console.error('Error adjusting balance:', err);
      setError(permissionMsg(err));
      setSaving(false);
    }
  }

  return (
    <Shell title={tr('Ajustar {a}', { a: account.name })} onClose={onClose}
           footer={<button type="button" disabled={saving} onClick={save} className={s.primary}>{saving ? tr('Guardando...') : tr('Guardar saldo')}</button>}>
      <div>
        <label htmlFor="adj" className={s.label}>{credit ? tr('¿Cuánto debes hoy según el banco?') : tr('¿Cuánto dice el banco que tienes hoy?')}</label>
        <CalcAmountInput id="adj" value={value} isTech={s.isTech} className={`${s.input} font-bold`} label={tr('Saldo según el banco')}
                         onType={(raw) => setValue(formatMoneyInput(raw))} onValue={(n) => setValue(n ? formatMoneyInput(n) : '')} toNum={parseMoneyInput} />
        <p className={s.hint}>
          FLOWI calculaba {formatCurrency(Math.abs(current), currency)}.
          {diff !== 0 && <> La diferencia ({diff > 0 ? '+' : '−'}{formatCurrency(Math.abs(Math.round(diff)), currency)}) suele ser algo que no registraste, como un cobro del banco o unos intereses.</>}
        </p>
      </div>
      <p className="text-[11px] text-text-muted">{tr('El ajuste no crea gastos ni ingresos: solo deja la cuenta igual a la del banco desde hoy.')}</p>
      {error && <p className="text-xs text-[var(--red)]">{error}</p>}
    </Shell>
  );
}

// ── Transferir entre mis cuentas ─────────────────────────────────────────
// Con payCard (id de una tarjeta de crédito) funciona como "Abonar a la tarjeta": la tarjeta queda fija como destino,
// sale de la cuenta principal y la fecha es la de hoy con la hora del momento.
export function TransferModal({ accounts, initialFrom, payCard, owed = 0, editing, currency = 'COP', onClose }: {
  accounts: Account[]; initialFrom?: string; payCard?: string; owed?: number; editing?: Transfer; currency?: string; onClose: () => void;
}) {
  const s = useStyles();
  const { user } = useAuth();
  const active = accounts.filter(a => !a.archived && a.id);
  const payFrom = payCard ? (active.find(a => a.isDefault && a.id !== payCard && a.kind !== 'credito') || active.find(a => a.id !== payCard && a.kind !== 'credito') || active.find(a => a.id !== payCard)) : undefined;
  const [from, setFrom] = useState(editing ? editing.fromId : payCard ? payFrom?.id || '' : initialFrom || active[0]?.id || '');
  const [to, setTo] = useState(editing ? editing.toId : payCard || active.find(a => a.id !== (initialFrom || active[0]?.id))?.id || '');
  // Monto con la calculadora (como en gastos): se guarda la cuenta escrita ("350000+20000") y se resuelve al guardar
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '');
  const [showKeys, setShowKeys] = useState(!editing);
  const editDate = editing ? new Date(editing.date) : new Date();
  const [date, setDate] = useState(getLocalDateString(editDate));
  const [time, setTime] = useState(`${String(editDate.getHours()).padStart(2, '0')}:${String(editDate.getMinutes()).padStart(2, '0')}`);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Igual que en los gastos: lo anterior al saldo inicial (o al último ajuste) ya está incluido en ese saldo
  const [countBefore, setCountBefore] = useState(editing ? !!editing.countBefore : false);
  const [note, setNote] = useState(editing?.note || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const value = Math.max(0, Math.round((evalAmount(amount) ?? 0) * 100) / 100);
  const canSave = !!from && !!to && from !== to && value > 0 && !saving;
  const toAcc = active.find(a => a.id === to);

  async function save() {
    if (!user || !canSave) return;
    setSaving(true);
    try {
      const [y, m, d] = date.split('-').map(Number);
      const [hh, mm] = (time || '12:00').split(':').map(Number);
      const when = new Date(y, m - 1, d, hh, mm);
      const early = [from, to].some(id => { const a = active.find(x => x.id === id); return a && when.getTime() < new Date(a.baseAt).getTime(); });
      const data = { fromId: from, toId: to, amount: value, date: when.toISOString(), note: note.trim() || (payCard ? 'Abono a la tarjeta' : ''), countBefore: early && countBefore };
      if (editing?.id) await updateTransfer(editing.id, data);
      else await addTransfer({ userId: user.uid, ...data });
      onClose();
    } catch (err) {
      console.error('Error saving transfer:', err);
      setError(err && (err as any).code === 'permission-denied'
        ? tr('La base de datos todavía no permite guardar transferencias. Hay que publicar las reglas de "fl_transfers".')
        : tr('No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.'));
      setSaving(false);
    }
  }

  // Selector de cuenta compacto: un campo que abre la lista de cuentas
  const [choosing, setChoosing] = useState<'from' | 'to' | null>(null);
  const accField = (value: string, which: 'from' | 'to') => {
    const acc = active.find(a => a.id === value);
    return (
      <button type="button" onClick={() => setChoosing(which)}
              className={`w-full flex flex-col items-center gap-1.5 px-2 py-3 bg-glass border transition-colors ${s.isTech ? 'rounded-none border-accent/30 hover:border-accent' : 'rounded-2xl border-glass-border hover:border-accent/60'}`}>
        {acc ? <AccountIcon account={acc} className="w-8 h-8 text-2xl flex items-center justify-center" /> : <span className="w-8 h-8 rounded-full border border-dashed border-glass-border" />}
        <span className={`text-xs font-semibold truncate max-w-full ${acc ? 'text-text-primary' : 'text-text-muted'}`}>{acc ? acc.name : tr('Elegir')}</span>
      </button>
    );
  };

  return (
    <Shell title={editing ? (toAcc?.kind === 'credito' ? tr('Editar abono') : tr('Editar transferencia')) : payCard ? `Abonar a ${toAcc?.name || 'la tarjeta'}` : tr('Mover plata entre cuentas')} onClose={onClose}
           footer={<button type="button" disabled={!canSave} onClick={save} className={s.primary}>{saving ? tr('Guardando...') : tr('Guardar')}</button>}>
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <div><span className={s.label}>{tr('Sale de')}</span>{accField(from, 'from')}</div>
        {payCard
          ? <span className="mb-5 p-2 text-accent" aria-hidden="true"><ArrowRightLeft className="w-5 h-5" /></span>
          : <button type="button" onClick={() => { setFrom(to); setTo(from); }} aria-label={tr('Intercambiar')}
                className="mb-5 p-2 rounded-full text-accent hover:bg-accent/10"><ArrowRightLeft className="w-5 h-5" /></button>}
        <div><span className={s.label}>{payCard ? tr('Abono a') : tr('Llega a')}</span>{payCard
          ? <div className={`w-full flex flex-col items-center gap-1.5 px-2 py-3 bg-glass border ${s.isTech ? 'rounded-none border-accent/30' : 'rounded-2xl border-glass-border'}`}>
              {toAcc && <AccountIcon account={toAcc} className="w-8 h-8 text-2xl flex items-center justify-center" />}
              <span className="text-xs font-semibold truncate max-w-full text-text-primary">{toAcc?.name}</span>
            </div>
          : accField(to, 'to')}</div>
      </div>
      {choosing && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center">
          <div className={`absolute inset-0 ${(s.theme === 'light' || s.theme === 'nova') ? 'bg-black/20' : 'bg-black/60'}`} onClick={() => setChoosing(null)} aria-hidden="true" />
          <div className={`relative w-full max-w-md max-h-[70dvh] overflow-y-auto p-4 border animate-fade-in-up ${s.isTech ? 'bg-deep rounded-none border-accent/50 font-mono' : 'bg-card rounded-t-[28px] sm:rounded-3xl border-glass-border'}`}>
            <h3 className={`mb-3 px-1 ${s.isTech ? 'font-bold text-accent uppercase' : 'font-syne font-bold text-lg text-text-primary'}`}>{choosing === 'from' ? tr('¿De dónde sale?') : tr('¿A dónde llega?')}</h3>
            <div className="space-y-1.5">
              {active.filter(a => a.id !== (choosing === 'from' ? to : from)).map(a => {
                const on = (choosing === 'from' ? from : to) === a.id;
                return (
                  <button key={a.id} type="button"
                          onClick={() => { if (choosing === 'from') { setFrom(a.id!); if (a.id === to) setTo(''); } else setTo(a.id!); setChoosing(null); }}
                          className={`w-full flex items-center gap-3 p-3 border text-left ${s.isTech ? 'rounded-none' : 'rounded-2xl'} ${on ? 'border-accent bg-accent/10' : 'border-glass-border hover:bg-white/5'}`}>
                    <AccountIcon account={a} className="w-7 h-7 text-xl flex items-center justify-center" />
                    <span className="flex-1 text-sm text-text-primary">{a.name}</span>
                    <span className="text-[11px] text-text-muted">{tr(KIND_LABEL[a.kind])}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>,
        document.body,
      )}
      <div className="space-y-3">
        <div data-tour="transfer-amount">
          <span className={s.label}>{tr('Monto')}</span>
          <button type="button" onClick={() => setShowKeys(v => !v)} aria-label={tr('Monto')}
                  className={`${s.input} text-left text-xl font-bold tabular-nums ${showKeys ? '!border-accent' : ''}`}>
            {amount ? `$ ${displayExpr(amount)}` : <span className="text-text-muted">$ 0</span>}
            {hasOperator(amount) && <span className="ml-2 text-sm font-normal text-text-muted">= {formatCurrency(value, currency)}</span>}
          </button>
          {payCard && owed > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {[['Todo', Math.round(owed * 100) / 100], ['Mitad', Math.round(owed / 2)]].map(([label, v]) => (
                <button key={label as string} type="button" onClick={() => setAmount(String(v))} className={s.chip(value === v)}>
                  {label}: {formatCurrency(v as number, currency)}
                </button>
              ))}
            </div>
          )}
          {showKeys && (
            <div className="mt-2 -mx-3">
              <AmountKeypad value={amount} isTech={s.isTech} nextLabel="Listo"
                            onChange={setAmount} onNext={() => setShowKeys(false)} />
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="tr-date" className={s.label}>{tr('Fecha')}</label>
          <input id="tr-date" type="date" autoComplete="off" value={date} onChange={(e) => setDate(e.target.value)} className={s.input} />
        </div>
        <div>
          <label htmlFor="tr-time" className={s.label}>{tr('Hora')}</label>
          <input id="tr-time" type="time" autoComplete="off" value={time} onChange={(e) => setTime(e.target.value)} className={s.input} />
        </div>
        </div>
      </div>
      {(() => {
        const [y, m, d] = date.split('-').map(Number);
        const [hh, mm] = (time || '12:00').split(':').map(Number);
        const when = new Date(y, m - 1, d, hh, mm).getTime();
        const early = [from, to].map(id => active.find(x => x.id === id)).find(a => a && when < new Date(a.baseAt).getTime());
        return early ? (
          <label className="flex items-start gap-2 cursor-pointer text-[11px] text-text-secondary">
            <input type="checkbox" checked={countBefore} onChange={(e) => setCountBefore(e.target.checked)} className="mt-0.5 w-4 h-4 shrink-0 accent-[var(--accent)]" />
            <span>Es de antes de que creaste o ajustaste {early.name}: el saldo que escribiste ya lo incluye, así que no se vuelve a contar. Márcalo solo si ese saldo no lo incluía.</span>
          </label>
        ) : null;
      })()}
      <div>
        <label htmlFor="tr-note" className={s.label}>{tr('Nota (opcional)')}</label>
        <input id="tr-note" type="text" autoComplete="off" value={note} maxLength={50} onChange={(e) => setNote(e.target.value)}
               placeholder={toAcc?.kind === 'credito' ? tr('Pago de la tarjeta') : toAcc?.kind === 'efectivo' ? tr('Retiro en cajero') : tr('Ej: paso a Nequi')} className={s.input} />
      </div>
      <p className="text-[11px] text-text-muted">{payCard
        ? tr('El abono baja lo que debes en la tarjeta y descuenta la plata de la cuenta de donde sale. No es un gasto: las compras ya las registraste como gastos.')
        : <>{tr('No es un gasto ni un ingreso: la plata sigue siendo tuya, solo cambia de lugar')}{toAcc?.kind === 'credito' ? tr(' (pagar la tarjeta baja lo que debes en ella)') : ''}.</>}</p>
      {editing?.id && (confirmDelete
        ? <div className="flex gap-2">
            <button type="button" onClick={() => setConfirmDelete(false)} className={`flex-1 py-2.5 text-xs font-semibold border border-glass-border text-text-secondary ${s.isTech ? 'rounded-none' : 'rounded-xl'}`}>{tr('No borrar')}</button>
            <button type="button" onClick={async () => { await deleteTransfer(editing.id!); onClose(); }} className={`flex-1 py-2.5 text-xs font-semibold text-[var(--red)] border border-red-500/40 bg-red-500/10 ${s.isTech ? 'rounded-none' : 'rounded-xl'}`}>{tr('Sí, borrar')}</button>
          </div>
        : <button type="button" onClick={() => setConfirmDelete(true)} className={`w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold text-[var(--red)] border border-red-500/30 hover:bg-red-500/10 ${s.isTech ? 'rounded-none uppercase' : 'rounded-xl'}`}>
            <Trash2 className="w-4 h-4" /> {toAcc?.kind === 'credito' ? tr('Borrar abono') : tr('Borrar transferencia')}
          </button>)}
      {active.length < 2 && <p className="text-xs text-amber-500">{tr('Necesitas al menos dos cuentas para mover plata entre ellas.')}</p>}
      {error && <p className="text-xs text-[var(--red)]">{error}</p>}
    </Shell>
  );
}
