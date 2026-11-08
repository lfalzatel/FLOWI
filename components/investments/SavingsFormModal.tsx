'use client';
import { usePlanGate } from '@/lib/plans';
import { useInvestments } from '@/hooks/useInvestments';
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, Camera } from 'lucide-react';
import { getAiKey, readSavingsWithAi } from '@/lib/aiAssist';
import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { useAccounts } from '@/hooks/useAccounts';
import { AccountPicker } from '@/components/accounts/AccountPicker';
import { BankField, BankPickerSheet } from '@/components/accounts/BankPickerSheet';
import { formatMoneyInput, parseMoneyInput } from '@/components/accounts/AccountModals';
import { Investment, InvestmentKind, addInvestment, updateInvestment } from '@/lib/firestore';
import { KIND_INFO, dayKey } from '@/lib/investments';

// Ahorro que paga intereses (Nu, Lulo…), acciones y fondos (Trii, tyba…) y pensión voluntaria.
// Los CDT tienen su propio formulario (InvestmentFormModal).

const PLACES: Record<Exclude<InvestmentKind, 'cdt'>, string[]> = {
  ahorro: ['Nu', 'Lulo Bank', 'Pibank', 'Ualá', 'RappiPay', 'Nequi', 'Bancolombia', 'Davivienda', 'BBVA'],
  fondo: ['Trii', 'tyba', 'Bancolombia', 'Davivienda', 'BBVA', 'Fiduciaria Bogotá', 'Credicorp Capital', 'Acciones y Valores'],
  pension: ['Porvenir', 'Protección', 'Colfondos', 'Skandia'],
};

const parseRate = (s: string) => Number(String(s).replace(',', '.')) || 0;

type SavingsFormProps = {
  kind: Exclude<InvestmentKind, 'cdt'>; investment?: Investment | null; onClose: () => void; onDelete?: (inv: Investment) => void;
};

// Plan gratis: hasta 2 inversiones o ahorros activos
export function SavingsFormModal(props: SavingsFormProps) {
  const { investments, loading } = useInvestments();
  const ok = usePlanGate('investments', investments.filter(i => i.status === 'activo').length, loading, !!props.investment, props.onClose);
  return ok ? <SavingsFormModalInner {...props} /> : null;
}

function SavingsFormModalInner({ kind, investment, onClose, onDelete }: SavingsFormProps) {
  const { theme } = useTheme();
  const isTech = theme === 'cyberpunk' || theme === 'kiloCode';
  const { user } = useAuth();
  const { accounts } = useAccounts();
  const hasAccounts = accounts.some(a => !a.archived);
  const isSavings = kind === 'ahorro';

  const [bank, setBank] = useState(investment?.bank || '');
  const [bankSheet, setBankSheet] = useState(false);
  const [note, setNote] = useState(investment?.note || '');
  const [amount, setAmount] = useState(investment ? formatMoneyInput(investment.amount) : '');
  const [current, setCurrent] = useState(investment?.currentValue ? formatMoneyInput(investment.currentValue) : '');
  const [rate, setRate] = useState(investment?.rateEA ? String(investment.rateEA).replace('.', ',') : '');
  const [from, setFrom] = useState<string | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const amountN = parseMoneyInput(amount);
  const needsFrom = !investment && hasAccounts;
  const canSave = bank.trim().length > 0 && amountN > 0 && (!isSavings || parseRate(rate) > 0) && (!needsFrom || from !== undefined) && !saving;

  // Llenar desde capturas de la app (IA gratuita, la misma de los recibos y los CDT)
  const shotsRef = useRef<HTMLInputElement>(null);
  const [aiState, setAiState] = useState<'idle' | 'loading' | 'done' | 'no-key' | 'error'>('idle');
  const [aiMsg, setAiMsg] = useState('');
  async function readShots(files: File[]) {
    if (!files.length) return;
    setAiState('loading');
    setAiMsg('');
    const r = await readSavingsWithAi(files, kind);
    if (!r.ok) {
      setAiState(r.reason === 'no-key' ? 'no-key' : 'error');
      setAiMsg(r.reason === 'unreadable' ? 'No pude leer los datos. Prueba con una captura donde se vea el saldo y, si la hay, la tasa.'
        : r.reason === 'no-model' ? 'Ahora no hay un modelo gratuito que lea imágenes. Inténtalo más tarde.'
        : 'La IA no respondió a tiempo. Revisa tu conexión e inténtalo de nuevo.');
      return;
    }
    const d = r.data;
    if (d.bank) setBank(d.bank);
    if (isSavings) {
      if (d.balance) setAmount(formatMoneyInput(String(d.balance)));
      if (d.rateEA) setRate(String(d.rateEA).replace('.', ','));
    } else {
      // Fondos y pensión: lo invertido y el valor actual (si solo hay uno, se usa como ambos)
      if (d.invested || d.balance) setAmount(formatMoneyInput(String(d.invested || d.balance)));
      if (d.balance) setCurrent(formatMoneyInput(String(d.balance)));
    }
    const missing = isSavings
      ? [!d.balance && 'saldo', !d.rateEA && 'tasa E.A.'].filter(Boolean)
      : [!d.balance && 'valor actual', !d.invested && 'lo invertido'].filter(Boolean);
    setAiState('done');
    setAiMsg(missing.length ? `Listo. Revisa y completa: ${missing.join(', ')}.` : 'Listo. Revisa los datos antes de guardar.');
  }

  async function save() {
    if (!user || !canSave) return;
    setSaving(true);
    setError('');
    const now = new Date();
    const currentN = parseMoneyInput(current);
    const base = {
      bank: bank.trim().slice(0, 30), note: note.trim(), amount: amountN,
      rateEA: isSavings ? parseRate(rate) : 0,
      currentValue: isSavings ? null : (currentN > 0 ? currentN : amountN),
      valueAt: isSavings ? null : now.toISOString(),
    };
    try {
      if (investment?.id) {
        await updateInvestment(investment.id, base);
      } else {
        await addInvestment({
          userId: user.uid, kind, status: 'activo', closedAt: null, history: [], payouts: [],
          ...base, startDate: dayKey(now), maturityDate: '', bankInterest: null, withholdingPct: 0, autoRenew: false,
          fundings: [{ at: now.toISOString(), amount: amountN, accountId: from ?? null, kind: 'apertura' }],
        });
      }
      onClose();
    } catch (err: any) {
      console.error('Error saving investment:', err);
      setError('No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.');
      setSaving(false);
    }
  }

  if (typeof document === 'undefined') return null;
  const lbl = `${isTech ? 'text-accent/70' : 'text-text-muted'} text-xs font-medium mb-1.5 block`;
  const input = `w-full bg-glass border px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none ${isTech ? 'border-accent/30 rounded-none focus:border-accent font-mono' : 'border-glass-border rounded-xl focus:border-accent'}`;
  const hint = 'text-[11px] text-text-muted mt-1.5 leading-snug';
  const info = KIND_INFO[kind];

  return createPortal(
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 ${isTech ? 'font-mono' : ''}`}>
      <div className={`absolute inset-0 ${theme === 'light' ? 'bg-black/10' : 'bg-black/40'}`} onClick={onClose} aria-hidden="true" />
      <div className={`w-full max-w-md relative z-10 animate-fade-in-up max-h-[88dvh] flex flex-col overflow-hidden glass-dropdown ${isTech ? 'rounded-none border border-accent/50' : 'rounded-3xl'}`}>
        <div className={`shrink-0 flex items-center justify-between gap-3 px-5 pt-5 pb-3 ${isTech ? 'border-b border-accent/20' : ''}`}>
          <div>
            <h2 className={isTech ? 'font-bold text-xl text-accent uppercase' : 'font-syne font-bold text-xl text-text-primary'}>{investment ? 'Editar' : 'Nuevo'}: {info.short}</h2>
            <p className="text-[11px] text-text-muted">{info.examples}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className={isTech ? 'text-accent' : 'text-text-secondary hover:text-text-primary'}><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 pt-3 pb-5 space-y-5">
          {!investment && (
            <div>
              <input ref={shotsRef} type="file" accept="image/*" multiple className="hidden"
                     onChange={(e) => { const fs = Array.from(e.target.files || []); e.target.value = ''; readShots(fs); }} />
              <button type="button" disabled={aiState === 'loading'}
                      onClick={() => (getAiKey() ? shotsRef.current?.click() : setAiState('no-key'))}
                      className={`w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold border transition-all active:scale-[0.98] disabled:opacity-60 ${isTech ? 'rounded-none border-accent/40 text-accent uppercase text-xs' : 'rounded-xl border-accent/40 text-accent bg-accent/5 hover:bg-accent/10'}`}>
                <Camera className={`w-4 h-4 ${aiState === 'loading' ? 'animate-pulse' : ''}`} />
                {aiState === 'loading' ? 'Leyendo las capturas…' : 'Llenar desde captura de la app'}
              </button>
              <p className={hint}>
                {aiState === 'no-key'
                  ? <>Para leer capturas necesitas la IA gratuita (gratis siempre). <a href="/configuracion" className="text-accent font-semibold underline">Conéctala en Configuración</a>.</>
                  : aiMsg
                    ? <span className={aiState === 'error' ? 'text-red-400' : 'text-text-secondary'}>{aiMsg}</span>
                    : 'Sube la captura donde se vea el saldo (y la tasa si aparece). No se guardan números de cuenta.'}
              </p>
            </div>
          )}
          <div>
            <span className={lbl}>{kind === 'fondo' ? 'Plataforma o entidad' : 'Entidad'}</span>
            <BankField value={bank} placeholder="Elegir" onClick={() => setBankSheet(true)} />
            {bankSheet && (
              <BankPickerSheet title={kind === 'fondo' ? '¿Dónde inviertes?' : '¿Dónde está esta plata?'} selected={bank ? [bank] : []}
                               onlyBanks={kind !== 'ahorro'} allowCustom extra={PLACES[kind]} favorites={PLACES[kind]}
                               onChange={(v) => setBank(v[0] || '')} onClose={() => setBankSheet(false)} />
            )}
          </div>

          <div>
            <label htmlFor="sv-note" className={lbl}>Nombre (opcional)</label>
            <input id="sv-note" value={note} maxLength={40} onChange={(e) => setNote(e.target.value)} className={input}
                   placeholder={isSavings ? 'Ej: Cajita viaje, fondo de emergencia' : kind === 'fondo' ? 'Ej: Acciones Ecopetrol, ETF' : 'Ej: Pensión voluntaria'} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="sv-amount" className={lbl}>{isSavings ? (investment ? 'Saldo inicial' : 'Saldo de hoy') : 'Lo que has invertido'}</label>
              <input id="sv-amount" type="text" inputMode="decimal" placeholder="$ 0" value={amount}
                     onChange={(e) => setAmount(formatMoneyInput(e.target.value))} className={`${input} font-bold`} />
            </div>
            {isSavings ? (
              <div>
                <label htmlFor="sv-rate" className={lbl}>Tasa E.A. (%)</label>
                <input id="sv-rate" type="text" inputMode="decimal" placeholder="9,25" value={rate}
                       onChange={(e) => setRate(e.target.value.replace(/[^\d.,]/g, ''))} className={`${input} font-bold`} />
              </div>
            ) : (
              <div>
                <label htmlFor="sv-current" className={lbl}>Valor actual</label>
                <input id="sv-current" type="text" inputMode="decimal" placeholder="Igual al invertido" value={current}
                       onChange={(e) => setCurrent(formatMoneyInput(e.target.value))} className={input} />
              </div>
            )}
          </div>
          <p className={`${hint} -mt-3`}>
            {isSavings
              ? 'Calculo los intereses día a día con la tasa. Si el saldo de la app no cuadra, usa "Ajustar saldo".'
              : 'El valor sube y baja: actualízalo cuando quieras con lo que dice la app y te muestro cuánto ganas o pierdes.'}
          </p>

          {needsFrom && (
            <AccountPicker accounts={accounts} value={from} onChange={setFrom} label="¿De dónde sale la plata?" noneLabel="Ya la tenía ahí"
                           hint="Si sale de una cuenta, la descuento de su saldo y de lo que puedes gastar este mes (es ahorro, no gasto)." />
          )}

          {error && <p className="text-xs text-[var(--red)]">{error}</p>}
          {investment && onDelete && (
            <button type="button" onClick={() => onDelete(investment)}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold text-[var(--red)] border border-red-500/30 hover:bg-red-500/10 ${isTech ? 'rounded-none uppercase' : 'rounded-xl'}`}>
              <Trash2 className="w-4 h-4" /> Eliminar
            </button>
          )}
        </div>

        <div className={`shrink-0 px-5 pt-3 pb-4 border-t ${isTech ? 'bg-deep border-accent/20' : 'bg-card border-glass-border'}`}>
          <button type="button" disabled={!canSave} onClick={save}
                  className={`w-full py-3.5 font-bold transition-all active:scale-[0.98] disabled:opacity-50 ${isTech ? 'rounded-none bg-accent/20 border border-accent text-accent uppercase tracking-widest' : 'rounded-xl bg-accent text-white'}`}>
            {saving ? 'Guardando...' : investment ? 'Guardar cambios' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
