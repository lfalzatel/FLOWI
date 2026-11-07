'use client';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2 } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { Investment, addExpense, addInvestment, updateInvestment } from '@/lib/firestore';
import { formatAmountInput, parseAmountInput } from '@/components/goals/GoalFormModal';
import { formatCurrency } from '@/lib/format';
import { DEFAULT_WITHHOLDING, addMonthsKey, days360, dayKey, estimateInterest, investmentStatus, parseDay } from '@/lib/investments';

const BANKS = ['Bancolombia', 'BBVA', 'Davivienda', 'Banco de Bogotá', 'Nu', 'Lulo Bank', 'Banco Popular', 'Itaú'];
const TERMS: { label: string; months?: number; days?: number }[] = [
  { label: '90 días', days: 90 }, { label: '3 meses', months: 3 }, { label: '6 meses', months: 6 }, { label: '12 meses', months: 12 },
];

// Tasas con coma o punto ("9,9" o "9.9")
const parseRate = (s: string) => Number(String(s).replace(',', '.')) || 0;
const rateText = (n?: number | null) => (n ? String(n).replace('.', ',') : '');

interface Props {
  investment?: Investment | null; // editar
  renewFrom?: Investment | null;  // renovar al vencer
  currency?: string;
  onClose: () => void;
  onDelete?: (inv: Investment) => void;
}

export function InvestmentFormModal({ investment, renewFrom, currency = 'COP', onClose, onDelete }: Props) {
  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';
  const { user } = useAuth();
  const base = investment || renewFrom || null;
  const renewing = !!renewFrom;
  const prev = renewFrom ? investmentStatus(renewFrom) : null;
  const prevTermMonths = renewFrom ? Math.round(days360(parseDay(renewFrom.startDate), parseDay(renewFrom.maturityDate)) / 30) : 0;

  const [bank, setBank] = useState(base?.bank || '');
  // Al renovar, por defecto los intereses se suman al capital (así lo hacen los bancos)
  const [interestMode, setInterestMode] = useState<'suma' | 'pagado'>('suma');
  const initialAmount = renewing && prev ? renewFrom!.amount + prev.netInterest : base?.amount || 0;
  const [amount, setAmount] = useState(initialAmount ? formatAmountInput(initialAmount) : '');
  const [rate, setRate] = useState(rateText(base?.rateEA));
  const [nominal, setNominal] = useState(renewing ? '' : rateText(base?.nominalRate));
  const startInit = renewing ? renewFrom!.maturityDate : base?.startDate || dayKey(new Date());
  const [start, setStart] = useState(startInit);
  const [maturity, setMaturity] = useState(
    renewing ? addMonthsKey(startInit, prevTermMonths || 3) : base?.maturityDate || '',
  );
  const [bankInterest, setBankInterest] = useState(!renewing && base?.bankInterest ? formatAmountInput(base.bankInterest) : '');
  const [withholding, setWithholding] = useState(rateText(base?.withholdingPct ?? DEFAULT_WITHHOLDING));
  const [autoRenew, setAutoRenew] = useState(base?.autoRenew ?? false);
  const [note, setNote] = useState(renewing ? '' : base?.note || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fmt = (n: number) => formatCurrency(n, currency);
  const amountN = parseAmountInput(amount);
  const rateN = parseRate(rate);
  const days = start && maturity ? days360(parseDay(start), parseDay(maturity)) : 0;
  const preview = estimateInterest(amountN, rateN, days);
  const canSave = bank.trim().length > 0 && amountN > 0 && rateN > 0 && days > 0 && !loading;

  const setAmountFromMode = (mode: 'suma' | 'pagado') => {
    setInterestMode(mode);
    if (renewFrom && prev) setAmount(formatAmountInput(mode === 'suma' ? renewFrom.amount + prev.netInterest : renewFrom.amount));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !canSave) return;
    setLoading(true);
    setError('');
    const data = {
      bank: bank.trim(), amount: amountN, rateEA: rateN,
      nominalRate: parseRate(nominal) || null,
      startDate: start, maturityDate: maturity,
      bankInterest: parseAmountInput(bankInterest) || null,
      withholdingPct: parseRate(withholding),
      autoRenew, note: note.trim(),
    };
    try {
      if (renewFrom?.id && prev) {
        await updateInvestment(renewFrom.id, {
          ...data, status: 'activo', closedAt: null,
          history: [...(renewFrom.history || []), {
            startDate: renewFrom.startDate, maturityDate: renewFrom.maturityDate, amount: renewFrom.amount,
            rateEA: renewFrom.rateEA, interest: prev.interest, outcome: 'renovado',
          }],
        });
        if (interestMode === 'pagado' && prev.netInterest > 0) {
          await addExpense({
            userId: user.uid, type: 'ingreso', amount: prev.netInterest, category: 'Rendimientos / intereses',
            description: `Intereses CDT ${renewFrom.bank}`, date: parseDay(renewFrom.maturityDate), isFixed: false,
          });
        }
      } else if (investment?.id) {
        await updateInvestment(investment.id, data);
      } else {
        await addInvestment({ userId: user.uid, kind: 'cdt', status: 'activo', closedAt: null, history: [], ...data });
      }
      onClose();
    } catch (err: any) {
      console.error('Error saving investment:', err);
      setError(err?.code === 'permission-denied'
        ? 'La base de datos todavía no permite guardar inversiones. Hay que publicar las reglas de "fl_investments".'
        : 'No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.');
      setLoading(false);
    }
  }

  if (typeof document === 'undefined') return null;

  const labelClass = `${isTechTheme ? 'text-accent/70' : 'text-text-muted'} text-xs font-medium mb-1.5 block`;
  const inputClass = `w-full bg-glass border px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none ${isTechTheme ? 'border-accent/30 rounded-none focus:border-accent font-mono' : 'border-glass-border rounded-xl focus:border-accent'}`;
  const chipClass = (active: boolean) => `px-3 py-2 text-xs font-semibold border transition-all active:scale-95 ${isTechTheme ? 'rounded-none' : 'rounded-xl'} ${
    active ? 'bg-accent/15 border-accent text-accent' : 'border-glass-border text-text-secondary hover:text-text-primary hover:bg-glass'
  }`;
  const hint = 'text-[11px] text-text-muted mt-1.5 leading-snug';

  return createPortal(
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 ${isTechTheme ? 'font-mono' : ''}`}>
      <div className={`absolute inset-0 ${theme === 'light' ? 'bg-black/10' : 'bg-black/40'}`} onClick={onClose} aria-hidden="true" />
      <div className={`w-full max-w-md relative z-10 animate-fade-in-up max-h-[88dvh] flex flex-col overflow-hidden glass-dropdown ${isTechTheme ? 'rounded-none border border-accent/50' : 'rounded-3xl'}`}
           onClick={(e) => e.stopPropagation()}>
        <div className={`shrink-0 flex items-center justify-between gap-3 px-5 sm:px-6 pt-5 pb-3 ${isTechTheme ? 'border-b border-accent/20' : ''}`}>
          <h2 className={`${isTechTheme ? 'font-bold text-xl text-accent tracking-wide uppercase' : 'font-syne font-bold text-xl text-text-primary'}`}>
            {renewing ? 'Renovar CDT' : investment ? 'Editar CDT' : 'Nuevo CDT'}
          </h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className={`p-1 -mr-1 ${isTechTheme ? 'text-accent' : 'text-text-secondary hover:text-text-primary'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 sm:px-6 pt-3 pb-5 space-y-5">
            {renewing && prev && (
              <div>
                <span className={labelClass}>Los intereses de este periodo ({fmt(prev.netInterest)} después de retención)</span>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setAmountFromMode('suma')} className={chipClass(interestMode === 'suma')}>Se suman al CDT</button>
                  <button type="button" onClick={() => setAmountFromMode('pagado')} className={chipClass(interestMode === 'pagado')}>Me los pagaron</button>
                </div>
                <p className={hint}>{interestMode === 'suma'
                  ? 'El nuevo capital incluye los intereses. Si el banco te da otra cifra exacta, cámbiala abajo.'
                  : 'Los registro como un ingreso en "Rendimientos / intereses" con fecha del vencimiento.'}</p>
              </div>
            )}

            <div>
              <label htmlFor="inv-bank" className={labelClass}>Banco</label>
              <input id="inv-bank" type="text" value={bank} maxLength={30} onChange={(e) => setBank(e.target.value)}
                     placeholder="Ej: Bancolombia" className={inputClass} required />
              {!renewing && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {BANKS.map(b => (
                    <button key={b} type="button" onClick={() => setBank(b)} className={chipClass(bank === b)}>{b}</button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="inv-amount" className={labelClass}>Monto invertido</label>
                <input id="inv-amount" type="text" inputMode="numeric" placeholder="$ 0" value={amount}
                       onChange={(e) => setAmount(formatAmountInput(e.target.value))} className={`${inputClass} font-bold`} required />
              </div>
              <div>
                <label htmlFor="inv-rate" className={labelClass}>Tasa E.A. (%)</label>
                <input id="inv-rate" type="text" inputMode="decimal" placeholder="9,9" value={rate}
                       onChange={(e) => setRate(e.target.value.replace(/[^\d.,]/g, ''))} className={`${inputClass} font-bold`} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="inv-start" className={labelClass}>{renewing ? 'Se renueva el' : 'Fecha de apertura'}</label>
                <input id="inv-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} className={inputClass} required />
              </div>
              <div>
                <label htmlFor="inv-end" className={labelClass}>Vence el</label>
                <input id="inv-end" type="date" value={maturity} min={start} onChange={(e) => setMaturity(e.target.value)} className={inputClass} required />
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 -mt-3">
              {TERMS.map(t => {
                const key = t.months ? addMonthsKey(start, t.months) : dayKey(new Date(parseDay(start).getTime() + (t.days || 0) * 86400000));
                return (
                  <button key={t.label} type="button" disabled={!start} onClick={() => setMaturity(key)} className={chipClass(maturity === key)}>{t.label}</button>
                );
              })}
            </div>

            {amountN > 0 && rateN > 0 && days > 0 && (
              <div className={`p-3 text-xs text-text-secondary bg-accent/5 border border-accent/20 ${isTechTheme ? 'rounded-none' : 'rounded-xl'}`}>
                {days} días a {rate}% E.A.: unos <b className="text-text-primary">{fmt(preview)}</b> de intereses antes de retención.
              </div>
            )}

            <div>
              <label htmlFor="inv-bank-interest" className={labelClass}>Intereses del periodo según el banco (opcional)</label>
              <input id="inv-bank-interest" type="text" inputMode="numeric" placeholder="$ 0" value={bankInterest}
                     onChange={(e) => setBankInterest(formatAmountInput(e.target.value))} className={inputClass} />
              <p className={hint}>Si el banco te muestra la cifra exacta, ponla aquí y uso esa en vez del cálculo.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="inv-nominal" className={labelClass}>Tasa nominal (opcional)</label>
                <input id="inv-nominal" type="text" inputMode="decimal" placeholder="9,61" value={nominal}
                       onChange={(e) => setNominal(e.target.value.replace(/[^\d.,]/g, ''))} className={inputClass} />
              </div>
              <div>
                <label htmlFor="inv-wh" className={labelClass}>Retención (%)</label>
                <input id="inv-wh" type="text" inputMode="decimal" value={withholding}
                       onChange={(e) => setWithholding(e.target.value.replace(/[^\d.,]/g, ''))} className={inputClass} />
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={autoRenew} onChange={(e) => setAutoRenew(e.target.checked)} className="w-4 h-4 accent-[var(--accent)]" />
              <span className="text-sm text-text-secondary">El banco lo renueva automáticamente</span>
            </label>

            <div>
              <label htmlFor="inv-note" className={labelClass}>Nota (opcional)</label>
              <input id="inv-note" type="text" value={note} maxLength={60} onChange={(e) => setNote(e.target.value)}
                     placeholder="Ej: para la prima del carro" className={inputClass} />
              <p className={hint}>No escribas números de CDT ni de cuenta: FLOWI no los necesita.</p>
            </div>

            {error && <p className="text-xs text-[var(--red)] bg-red-500/10 border border-red-500/20 rounded-xl p-3">{error}</p>}

            {investment && onDelete && (
              <button type="button" onClick={() => onDelete(investment)}
                      className={`w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold text-[var(--red)] border border-red-500/30 hover:bg-red-500/10 ${isTechTheme ? 'rounded-none uppercase' : 'rounded-xl'}`}>
                <Trash2 className="w-4 h-4" /> Eliminar CDT
              </button>
            )}
          </div>

          <div className={`shrink-0 px-5 sm:px-6 pt-3 pb-4 border-t ${isTechTheme ? 'bg-deep border-accent/20' : 'bg-card border-glass-border'}`}>
            <button type="submit" disabled={!canSave}
                    className={`w-full py-3.5 font-bold transition-all active:scale-[0.98] disabled:opacity-50 ${isTechTheme ? 'rounded-none bg-accent/20 border border-accent text-accent uppercase tracking-widest' : 'rounded-xl bg-accent text-white hover:bg-accent/90'}`}>
              {loading ? 'Guardando...' : renewing ? 'Renovar' : investment ? 'Guardar cambios' : 'Guardar CDT'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
