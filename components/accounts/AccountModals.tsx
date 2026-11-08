'use client';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2 } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { Account, AccountKind, addAccount, addTransfer, updateAccount } from '@/lib/firestore';
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
  const int = digits ? Number(digits).toLocaleString('es-CO') : (rest.length ? '0' : '');
  return rest.length ? `${int},${rest.join('').slice(0, 2)}` : int;
}
export function parseMoneyInput(value: string): number {
  const n = Number(value.replace(/\./g, '').replace(',', '.'));
  return isNaN(n) ? 0 : Math.round(n * 100) / 100;
}
import { formatCurrency } from '@/lib/format';
import { getLocalDateString } from '@/lib/dateUtils';

// ── Piezas comunes ───────────────────────────────────────────────────────
function useStyles() {
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

function Shell({ title, onClose, children, footer }: { title: string; onClose: () => void; children: React.ReactNode; footer: React.ReactNode }) {
  const { theme, isTech } = useStyles();
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 ${isTech ? 'font-mono' : ''}`}>
      <div className={`absolute inset-0 ${theme === 'light' ? 'bg-black/10' : 'bg-black/40'}`} onClick={onClose} aria-hidden="true" />
      <div className={`w-full max-w-md relative z-10 animate-fade-in-up max-h-[88dvh] flex flex-col overflow-hidden glass-dropdown ${isTech ? 'rounded-none border border-accent/50' : 'rounded-3xl'}`}
           onClick={(e) => e.stopPropagation()}>
        <div className={`shrink-0 flex items-center justify-between gap-3 px-5 sm:px-6 pt-5 pb-3 ${isTech ? 'border-b border-accent/20' : ''}`}>
          <h2 className={isTech ? 'font-bold text-xl text-accent tracking-wide uppercase' : 'font-syne font-bold text-xl text-text-primary'}>{title}</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className={`p-1 -mr-1 ${isTech ? 'text-accent' : 'text-text-secondary hover:text-text-primary'}`}>
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
  ? 'La base de datos todavía no permite guardar cuentas. Hay que publicar las reglas de "fl_accounts".'
  : 'No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.';

// ── Nueva / editar cuenta ────────────────────────────────────────────────
export function AccountFormModal({ account, accounts, onClose, onDelete, initial, onCreated }: {
  account?: Account | null; accounts: Account[]; onClose: () => void; onDelete?: (a: Account) => void;
  initial?: { name: string; kind: AccountKind; methods: string[] }; // crear desde el formulario de un gasto/ingreso
  onCreated?: (id: string) => void;
}) {
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
      if (account?.id) {
        await updateAccount(account.id, { name: name.trim(), kind, methods: finalMethods, isDefault, purpose: kind === 'credito' ? 'gastar' : purpose });
      } else {
        const amount = parseMoneyInput(balance);
        const id = await addAccount({
          userId: user.uid, name: name.trim(), kind, methods: finalMethods, isDefault,
          purpose: kind === 'credito' ? 'gastar' : purpose,
          baseBalance: kind === 'credito' ? -amount : amount,
          baseAt: new Date().toISOString(), adjustments: [], archived: false,
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
    <Shell title={account ? 'Editar cuenta' : 'Nueva cuenta'} onClose={onClose}
           footer={<button type="button" disabled={!canSave} onClick={save} className={s.primary}>{saving ? 'Guardando...' : account ? 'Guardar cambios' : 'Crear cuenta'}</button>}>
      <div>
        <span className={s.label}>Tipo</span>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(KIND_LABEL) as AccountKind[]).map(k => (
            <button key={k} type="button" onClick={() => setKind(k)} className={s.chip(kind === k)}>{KIND_EMOJI[k]} {KIND_LABEL[k]}</button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="acc-name" className={s.label}>Nombre</label>
        <input id="acc-name" type="text" value={name} maxLength={30} onChange={(e) => setName(e.target.value)}
               placeholder={kind === 'efectivo' ? 'Efectivo' : kind === 'credito' ? 'Ej: Visa Bancolombia' : kind === 'billetera' ? 'Ej: Nequi' : 'Ej: Bancolombia ahorros'}
               className={s.input} />
        <p className={s.hint}>No escribas números de cuenta: FLOWI no los necesita.</p>
      </div>

      {!account && (
        <div>
          <label htmlFor="acc-balance" className={s.label}>{kind === 'credito' ? '¿Cuánto debes hoy en la tarjeta?' : initial ? `¿Cuánto tenías en ${name || 'esta cuenta'} antes de este movimiento?` : '¿Cuánto tienes hoy en esta cuenta?'}</label>
          <input id="acc-balance" type="text" inputMode="decimal" placeholder="$ 0" value={balance}
                 onChange={(e) => setBalance(formatMoneyInput(e.target.value))} className={`${s.input} font-bold`} />
          <p className={s.hint}>Míralo en la app del banco. Desde hoy, tus gastos e ingresos de esta cuenta lo van moviendo.</p>
        </div>
      )}

      <div>
        <span className={s.label}>¿Qué movimientos caen aquí?</span>
        <div className="flex flex-wrap gap-1.5">
          {shownMethods.filter(m => !taken.has(m)).map(m => (
            <span key={m} className={`${s.chip(true)} inline-flex items-center gap-1.5`}>
              <BankLogo label={m} className="w-4 h-4 text-sm flex items-center justify-center" /> {m}
              <button type="button" onClick={() => toggleMethod(m)} aria-label={`Quitar ${m}`} className="ml-0.5 opacity-70 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
            </span>
          ))}
          <button type="button" onClick={() => setMethodsSheet(true)} className={`${s.chip(false)} inline-flex items-center gap-1`}>
            <Plus className="w-3.5 h-3.5" /> Agregar
          </button>
        </div>
        {methodsSheet && (
          <BankPickerSheet title="¿Qué movimientos caen aquí?" multiple
                           selected={shownMethods.filter(m => !taken.has(m))}
                           disabled={Object.fromEntries(Array.from(taken.entries()).map(([m, owner]) => [m, `Ya está en ${owner}`]))}
                           onChange={(v) => { setMethodsTouched(true); setMethods(v); }}
                           onClose={() => setMethodsSheet(false)} />
        )}
        <p className={s.hint}>Los gastos e ingresos que registres con estos medios de pago mueven esta cuenta.</p>
      </div>

      {kind !== 'credito' && (
        <div>
          <span className={s.label}>¿Para qué es esta plata?</span>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPurpose('gastar')} className={s.chip(purpose === 'gastar')}>Para gastar</button>
            <button type="button" onClick={() => setPurpose('ahorro')} className={s.chip(purpose === 'ahorro')}>Ahorro</button>
          </div>
          <p className={s.hint}>{purpose === 'gastar'
            ? 'Cuenta en "Hoy puedes gastar": es la plata del día a día.'
            : 'No cuenta en "Hoy puedes gastar" (por ejemplo, tu fondo de emergencia), pero sí en tu patrimonio.'}</p>
        </div>
      )}

      <label className="flex items-start gap-3 cursor-pointer">
        <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[var(--accent)]" />
        <span className="text-sm text-text-secondary">
          Cuenta principal
          <span className="block text-[11px] text-text-muted">Recibe los gastos e ingresos que no dicen con qué se pagaron (la mayoría de los que dictas por voz).</span>
        </span>
      </label>

      {error && <p className="text-xs text-[var(--red)] bg-red-500/10 border border-red-500/20 rounded-xl p-3">{error}</p>}

      {account && onDelete && (
        <button type="button" onClick={() => onDelete(account)}
                className={`w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold text-[var(--red)] border border-red-500/30 hover:bg-red-500/10 ${s.isTech ? 'rounded-none uppercase' : 'rounded-xl'}`}>
          <Trash2 className="w-4 h-4" /> Eliminar cuenta
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
    <Shell title={`Ajustar ${account.name}`} onClose={onClose}
           footer={<button type="button" disabled={saving} onClick={save} className={s.primary}>{saving ? 'Guardando...' : 'Guardar saldo'}</button>}>
      <div>
        <label htmlFor="adj" className={s.label}>{credit ? '¿Cuánto debes hoy según el banco?' : '¿Cuánto dice el banco que tienes hoy?'}</label>
        <input id="adj" type="text" inputMode="decimal" value={value} onChange={(e) => setValue(formatMoneyInput(e.target.value))} className={`${s.input} font-bold`} autoFocus />
        <p className={s.hint}>
          FLOWI calculaba {formatCurrency(Math.abs(current), currency)}.
          {diff !== 0 && <> La diferencia ({diff > 0 ? '+' : '−'}{formatCurrency(Math.abs(Math.round(diff)), currency)}) suele ser algo que no registraste, como un cobro del banco o unos intereses.</>}
        </p>
      </div>
      <p className="text-[11px] text-text-muted">El ajuste no crea gastos ni ingresos: solo deja la cuenta igual a la del banco desde hoy.</p>
      {error && <p className="text-xs text-[var(--red)]">{error}</p>}
    </Shell>
  );
}

// ── Transferir entre mis cuentas ─────────────────────────────────────────
export function TransferModal({ accounts, initialFrom, currency = 'COP', onClose }: {
  accounts: Account[]; initialFrom?: string; currency?: string; onClose: () => void;
}) {
  const s = useStyles();
  const { user } = useAuth();
  const active = accounts.filter(a => !a.archived && a.id);
  const [from, setFrom] = useState(initialFrom || active[0]?.id || '');
  const [to, setTo] = useState(active.find(a => a.id !== (initialFrom || active[0]?.id))?.id || '');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getLocalDateString());
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const value = parseMoneyInput(amount);
  const canSave = !!from && !!to && from !== to && value > 0 && !saving;
  const toAcc = active.find(a => a.id === to);

  async function save() {
    if (!user || !canSave) return;
    setSaving(true);
    try {
      const today = getLocalDateString();
      const [y, m, d] = date.split('-').map(Number);
      const when = date === today ? new Date() : new Date(y, m - 1, d, 12);
      await addTransfer({ userId: user.uid, fromId: from, toId: to, amount: value, date: when.toISOString(), note: note.trim() });
      onClose();
    } catch (err) {
      console.error('Error saving transfer:', err);
      setError(err && (err as any).code === 'permission-denied'
        ? 'La base de datos todavía no permite guardar transferencias. Hay que publicar las reglas de "fl_transfers".'
        : 'No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.');
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
        <span className={`text-xs font-semibold truncate max-w-full ${acc ? 'text-text-primary' : 'text-text-muted'}`}>{acc ? acc.name : 'Elegir'}</span>
      </button>
    );
  };

  return (
    <Shell title="Mover plata entre cuentas" onClose={onClose}
           footer={<button type="button" disabled={!canSave} onClick={save} className={s.primary}>{saving ? 'Guardando...' : 'Guardar'}</button>}>
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <div><span className={s.label}>Sale de</span>{accField(from, 'from')}</div>
        <button type="button" onClick={() => { setFrom(to); setTo(from); }} aria-label="Intercambiar"
                className="mb-5 p-2 rounded-full text-accent hover:bg-accent/10"><ArrowRightLeft className="w-5 h-5" /></button>
        <div><span className={s.label}>Llega a</span>{accField(to, 'to')}</div>
      </div>
      {choosing && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center">
          <div className={`absolute inset-0 ${s.theme === 'light' ? 'bg-black/20' : 'bg-black/60'}`} onClick={() => setChoosing(null)} aria-hidden="true" />
          <div className={`relative w-full max-w-md max-h-[70dvh] overflow-y-auto p-4 border animate-fade-in-up ${s.isTech ? 'bg-deep rounded-none border-accent/50 font-mono' : 'bg-card rounded-t-[28px] sm:rounded-3xl border-glass-border'}`}>
            <h3 className={`mb-3 px-1 ${s.isTech ? 'font-bold text-accent uppercase' : 'font-syne font-bold text-lg text-text-primary'}`}>{choosing === 'from' ? '¿De dónde sale?' : '¿A dónde llega?'}</h3>
            <div className="space-y-1.5">
              {active.filter(a => a.id !== (choosing === 'from' ? to : from)).map(a => {
                const on = (choosing === 'from' ? from : to) === a.id;
                return (
                  <button key={a.id} type="button"
                          onClick={() => { if (choosing === 'from') { setFrom(a.id!); if (a.id === to) setTo(''); } else setTo(a.id!); setChoosing(null); }}
                          className={`w-full flex items-center gap-3 p-3 border text-left ${s.isTech ? 'rounded-none' : 'rounded-2xl'} ${on ? 'border-accent bg-accent/10' : 'border-glass-border hover:bg-white/5'}`}>
                    <AccountIcon account={a} className="w-7 h-7 text-xl flex items-center justify-center" />
                    <span className="flex-1 text-sm text-text-primary">{a.name}</span>
                    <span className="text-[11px] text-text-muted">{KIND_LABEL[a.kind]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>,
        document.body,
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="tr-amount" className={s.label}>Monto</label>
          <input id="tr-amount" type="text" inputMode="decimal" placeholder="$ 0" value={amount} onChange={(e) => setAmount(formatMoneyInput(e.target.value))} className={`${s.input} font-bold`} />
        </div>
        <div>
          <label htmlFor="tr-date" className={s.label}>Fecha</label>
          <input id="tr-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={s.input} />
        </div>
      </div>
      <div>
        <label htmlFor="tr-note" className={s.label}>Nota (opcional)</label>
        <input id="tr-note" type="text" value={note} maxLength={50} onChange={(e) => setNote(e.target.value)}
               placeholder={toAcc?.kind === 'credito' ? 'Pago de la tarjeta' : toAcc?.kind === 'efectivo' ? 'Retiro en cajero' : 'Ej: paso a Nequi'} className={s.input} />
      </div>
      <p className="text-[11px] text-text-muted">No es un gasto ni un ingreso: la plata sigue siendo tuya, solo cambia de lugar{toAcc?.kind === 'credito' ? ' (pagar la tarjeta baja lo que debes en ella)' : ''}.</p>
      {active.length < 2 && <p className="text-xs text-amber-500">Necesitas al menos dos cuentas para mover plata entre ellas.</p>}
      {error && <p className="text-xs text-[var(--red)]">{error}</p>}
    </Shell>
  );
}
