'use client';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '@/components/ThemeProvider';
import { X, Landmark, HandCoins, Handshake, Camera } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { addDebt, updateDebt, deleteDebt, addExpense, calculateDebtInterest, estimateInstallment, nextDebtPaymentDate, Debt } from '@/lib/firestore';
import { ConfirmDialog } from '@/components/layout/ConfirmDialog';
import { triggerPowerAnimation } from '@/components/dashboard/PowerAnimation';
import { getLocalDateString } from '@/lib/dateUtils';
import { getAiKey, insuranceRateFromAccrued, readDebtWithAi } from '@/lib/aiAssist';
import { ReadingTips } from '@/components/forms/ReadingTips';
import { useDebts } from '@/hooks/useDebts';
import { DictateButton } from '@/components/forms/DictateButton';
import { parseDebtSpeech } from '@/lib/formDictation';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  debtToEdit?: Debt | null;
  initialAbono?: number | null; // al venir desde "Próximos compromisos": la cuota del mes
}

// Tres casos, cada uno con sus propios datos:
//  banco   → crédito de un banco: los mismos datos que muestra la app del banco
//  persona → me prestó una persona (yo debo)
//  preste  → yo presté (me deben)
type Kind = 'banco' | 'persona' | 'preste';

const KINDS: { id: Kind; label: string; sub: string; icon: any }[] = [
  { id: 'banco',   label: 'Crédito de banco', sub: 'Crediágil, libre inversión…', icon: Landmark },
  { id: 'persona', label: 'Me prestaron',     sub: 'Una persona',                 icon: HandCoins },
  { id: 'preste',  label: 'Presté plata',     sub: 'Me deben',                    icon: Handshake },
];

const toEA = (monthly: number) => (Math.pow(1 + monthly / 100, 12) - 1) * 100;
const toMonthly = (ea: number) => (Math.pow(1 + ea / 100, 1 / 12) - 1) * 100;
const round2 = (n: number) => Math.round(n * 100) / 100;
const fmt = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`;
const onlyNum = (v: string) => v.replace(/[^0-9]/g, '');
const decimal = (v: string) => { const x = v.replace(/[^0-9.,]/g, '').replace(',', '.'); return x.split('.').length > 2 ? null : x; };

function kindOf(d: Debt): Kind {
  if (d.direction === 'me_deben') return 'preste';
  if (d.debtKind) return d.debtKind;
  return d.monthlyInsurance || d.insuranceRate || d.installment || d.termMonths ? 'banco' : 'persona';
}

export function AddDebtModal({ onClose, onSuccess, debtToEdit, initialAbono }: Props) {
  const { user } = useAuth();
  const [kind, setKind] = useState<Kind>('banco');
  const [title, setTitle] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [capitalNow, setCapitalNow] = useState(''); // crédito nuevo: capital vigente (lo que falta)
  const [interestRate, setInterestRate] = useState('');
  // Entre personas se suele hablar de "% mensual"; los bancos dan la E.A.
  const [rateUnit, setRateUnit] = useState<'ea' | 'mensual'>('ea');
  const [description, setDescription] = useState('');
  const [abono, setAbono] = useState(initialAbono ? String(initialAbono) : '');
  const [insurance, setInsurance] = useState('');
  // Seguro: % mensual del saldo, valor fijo al mes, o "lo que va hoy" (FLOWI saca el % solo)
  const [insuranceMode, setInsuranceMode] = useState<'fijo' | 'pct' | 'va'>('va');
  // Entre personas el seguro va plegado (la mayoría no tiene); se abre si es la misma de un crédito
  const [showInsurance, setShowInsurance] = useState(false);
  const [showCopy, setShowCopy] = useState(false);
  const { debts } = useDebts();
  const myCredits = debts.filter(d => d.id !== debtToEdit?.id && d.status !== 'paid' && (d.direction || 'debo') === 'debo' && d.totalAmount > 0);
  const [installment, setInstallment] = useState('');
  const [termMonths, setTermMonths] = useState('');
  const [paymentDay, setPaymentDay] = useState('');
  const [showPlan, setShowPlan] = useState(false);
  const [abonoDate, setAbonoDate] = useState(getLocalDateString());
  const [debtDate, setDebtDate] = useState(getLocalDateString());
  const [loading, setLoading] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // Llenar con pantallazos del banco
  const shotsRef = useRef<HTMLInputElement>(null);
  const [aiState, setAiState] = useState<'idle' | 'loading' | 'done' | 'no-key' | 'error'>('idle');
  const [aiMsg, setAiMsg] = useState('');

  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';

  const isReadOnly = debtToEdit?.status === 'paid';
  // Deuda existente: lo de todos los días (resumen y abono) arriba; editar los datos, plegado
  const compact = !!debtToEdit && !isReadOnly;
  const [showEdit, setShowEdit] = useState(false);
  const editCls = compact ? `order-4 ${showEdit ? '' : 'hidden'}` : '';

  const isBank = kind === 'banco';
  const owedToMe = kind === 'preste';

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    if (!debtToEdit) return;
    const k = kindOf(debtToEdit);
    setKind(k);
    setTitle(debtToEdit.title);
    setTotalAmount(debtToEdit.totalAmount.toString());
    setPaidAmount(debtToEdit.paidAmount.toString());
    const ea = debtToEdit.interestRate || 0;
    if (k !== 'banco' && ea > 0) { setRateUnit('mensual'); setInterestRate(String(round2(toMonthly(ea)))); }
    else { setRateUnit('ea'); setInterestRate(ea ? String(ea) : ''); }
    setDescription(debtToEdit.description || '');
    if (!debtToEdit.monthlyInsurance && debtToEdit.insuranceRate) {
      setInsuranceMode('pct');
      setInsurance(String(debtToEdit.insuranceRate));
    } else if (debtToEdit.monthlyInsurance) {
      setInsuranceMode('fijo');
      setInsurance(String(debtToEdit.monthlyInsurance));
    } else {
      setInsuranceMode('va');
      setInsurance('');
    }
    setShowInsurance(!!(debtToEdit.monthlyInsurance || debtToEdit.insuranceRate));
    setInstallment(debtToEdit.installment ? String(debtToEdit.installment) : '');
    setTermMonths(debtToEdit.termMonths ? String(debtToEdit.termMonths) : '');
    setPaymentDay(debtToEdit.paymentDay ? String(debtToEdit.paymentDay) : '');
    setShowPlan(!!(debtToEdit.installment || debtToEdit.paymentDay || debtToEdit.termMonths));
    if (debtToEdit.createdAt) {
      const d = debtToEdit.createdAt instanceof Date ? debtToEdit.createdAt : new Date();
      setDebtDate(getLocalDateString(d));
    }
  }, [debtToEdit]);

  const copyFrom = (d: Debt) => {
    const created = d.createdAt instanceof Date ? d.createdAt : null;
    setTotalAmount(String(d.totalAmount));
    if (created) setDebtDate(getLocalDateString(created));
    setRateUnit('ea');
    setInterestRate(d.interestRate ? String(d.interestRate) : '');
    setTermMonths(d.termMonths ? String(d.termMonths) : '');
    setPaymentDay(d.paymentDay ? String(d.paymentDay) : '');
    setInstallment(d.installment ? String(d.installment) : '');
    if (d.insuranceRate) { setInsuranceMode('pct'); setInsurance(String(d.insuranceRate)); setShowInsurance(true); }
    else if (d.monthlyInsurance) { setInsuranceMode('fijo'); setInsurance(String(d.monthlyInsurance)); setShowInsurance(true); }
    if (d.installment || d.paymentDay || d.termMonths) setShowPlan(true);
    if (!description) setDescription(`Con la plata de mi crédito ${d.title}`);
    setShowCopy(false);
    setAiMsg('');
  };

  // Dictado: "Crediágil de 700 mil al 28,17 a 60 meses, pago los 15" o "le presté 500 mil a Claudia"
  const applySpeech = (text: string) => {
    const list = (xs: unknown[]) => { const f = xs.filter((x): x is string => typeof x === 'string' && !!x); return f.length ? `Llené: ${f.join(', ')}. Revisa antes de guardar.` : 'No entendí los datos. Prueba con el ejemplo o escríbelos.'; };
    const d = parseDebtSpeech(text);
    const k = d.kind || kind;
    if (d.kind) pickKind(d.kind);
    if (d.title) setTitle(d.title);
    if (d.amount) setTotalAmount(String(d.amount));
    if (d.date) setDebtDate(d.date);
    if (d.rate) { setInterestRate(String(d.rate)); setRateUnit(d.rateUnit || (k === 'banco' ? 'ea' : 'mensual')); }
    if (d.termMonths) setTermMonths(String(d.termMonths));
    if (d.paymentDay) setPaymentDay(String(d.paymentDay));
    if (d.installment) setInstallment(String(d.installment));
    if (d.insurance) { setInsuranceMode('va'); setInsurance(String(d.insurance)); setShowInsurance(true); }
    if (d.paid) {
      if (k === 'banco' && d.amount) setCapitalNow(String(Math.max(0, d.amount - d.paid)));
      else setPaidAmount(String(d.paid));
    }
    if (k !== 'banco' && (d.termMonths || d.paymentDay || d.installment)) setShowPlan(true);
    return list([
      d.kind && KINDS.find(x => x.id === d.kind)?.label.toLowerCase(), d.title && `"${d.title}"`, d.amount && 'monto',
      d.date && 'fecha', d.rate && 'tasa', d.termMonths && 'plazo', d.paymentDay && 'día de pago',
      d.installment && 'cuota', d.insurance && 'seguro', d.paid && 'lo pagado',
    ]);
  };

  const pickKind = (k: Kind) => {
    setKind(k);
    if (!debtToEdit && !interestRate) setRateUnit(k === 'banco' ? 'ea' : 'mensual');
  };

  // ── Pantallazos del banco → datos del crédito ──
  async function readShots(files: File[]) {
    if (!files.length) return;
    setAiState('loading');
    setAiMsg('');
    const r = await readDebtWithAi(files);
    if (!r.ok) {
      setAiState(r.reason === 'no-key' ? 'no-key' : 'error');
      setAiMsg(r.reason === 'unreadable' ? 'No pude leer los datos del crédito. Prueba con capturas donde se vean el valor desembolsado, la tasa y las fechas.'
        : r.reason === 'no-model' ? 'Ahora no hay un modelo gratuito que lea imágenes. Inténtalo más tarde.'
        : 'La IA no respondió a tiempo. Revisa tu conexión e inténtalo de nuevo.');
      return;
    }
    const d = r.data;
    setRateUnit('ea');
    if (d.title && kind === 'banco') setTitle(d.title);
    if (d.amount) setTotalAmount(String(d.amount));
    if (d.disbursementDate) setDebtDate(d.disbursementDate);
    if (d.rateEA) setInterestRate(String(d.rateEA));
    if (d.termMonths) setTermMonths(String(d.termMonths));
    if (d.paymentDay) setPaymentDay(String(d.paymentDay));
    if (d.installment) setInstallment(String(d.installment));
    const capital = d.capitalNow ?? d.amount;
    if (d.capitalNow && d.amount && d.capitalNow < d.amount) setCapitalNow(String(d.capitalNow));
    // Seguro: si el crédito no tiene pagos, se saca el % con lo que el banco ya cobró desde el desembolso
    let insMsg = '';
    const noPaymentsYet = !d.capitalNow || !d.amount || d.capitalNow >= d.amount;
    const pct = d.insuranceAccrued && capital && d.disbursementDate && noPaymentsYet
      ? insuranceRateFromAccrued(d.insuranceAccrued, capital, d.disbursementDate) : null;
    if (pct) {
      setInsuranceMode('pct');
      setInsurance(String(pct));
      setShowInsurance(true);
      insMsg = ` El seguro sale en ${pct.toLocaleString('es-CO')} % mensual del saldo.`;
    } else if (d.insuranceMonthly) {
      setInsuranceMode('fijo');
      setInsurance(String(d.insuranceMonthly));
      setShowInsurance(true);
    }
    if (kind !== 'banco' && (d.installment || d.paymentDay || d.termMonths)) setShowPlan(true);
    setAiState('done');
    setAiMsg(`Listo: llené ${r.found} datos.${insMsg} Revísalos antes de guardar.`);
  }

  // Capital sobre el que se cobra el seguro y % que sale de "lo que va hoy"
  const capitalBase = () => {
    const total = parseFloat(totalAmount) || 0;
    if (!debtToEdit && isBank) { const cap = parseFloat(capitalNow); return cap > 0 && cap < total ? cap : total; }
    return Math.max(0, total - (parseFloat(paidAmount) || 0));
  };
  function insuranceFromAccruedNow(): number | null {
    const accrued = parseFloat(insurance.replace(/\./g, '').replace(',', '.'));
    return accrued > 0 ? insuranceRateFromAccrued(accrued, capitalBase(), debtDate) : null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) { onClose(); return; }
    if (!user) return;

    setLoading(true);
    try {
      const total = parseFloat(totalAmount);
      let paid = parseFloat(paidAmount) || 0;
      // Crédito nuevo: lo pagado es la diferencia entre lo desembolsado y el capital vigente
      if (!debtToEdit && isBank) {
        const cap = parseFloat(capitalNow);
        paid = cap > 0 && cap < total ? total - cap : 0;
      }
      const typed = interestRate ? parseFloat(interestRate) : 0;
      const rate = typed > 0 ? round2(rateUnit === 'mensual' ? toEA(typed) : typed) : 0;
      const day = Math.min(31, Math.max(0, parseInt(paymentDay) || 0));
      const withIns = isBank || showInsurance;
      const insPct = insuranceMode === 'pct' ? (parseFloat(insurance.replace(',', '.')) || null)
        : insuranceMode === 'va' ? insuranceFromAccruedNow() : null;
      const plan = {
        direction: (owedToMe ? 'me_deben' : 'debo') as 'debo' | 'me_deben',
        debtKind: (isBank ? 'banco' : 'persona') as 'banco' | 'persona',
        monthlyInsurance: withIns && insuranceMode === 'fijo' ? (parseInt(insurance) || null) : null,
        insuranceRate: withIns ? insPct : null,
        installment: parseInt(installment) || null,
        termMonths: parseInt(termMonths) || null,
        paymentDay: day || null,
      };
      // Con intereses, la deuda queda saldada cuando lo abonado cubre capital + intereses causados
      const owedExtra = debtToEdit ? calculateDebtInterest(debtToEdit).accumulatedInterest : 0;

      const atTime = (ymd: string) => {
        const [year, month, d] = ymd.split('-').map(Number);
        if (ymd === new Date().toLocaleDateString('sv-SE')) {
          const now = new Date();
          return new Date(year, month - 1, d, now.getHours(), now.getMinutes(), now.getSeconds());
        }
        return new Date(year, month - 1, d, 12, 0, 0);
      };
      const finalDebtDate = atTime(debtDate);

      if (debtToEdit && abono) {
        const abonoAmount = parseFloat(abono);
        paid += abonoAmount;
        const finalDate = atTime(abonoDate);
        const newPayment = {
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
          amount: abonoAmount,
          date: finalDate,
          description: owedToMe ? `Abono de: ${title}` : `Abono a: ${title}`,
        };
        const status = paid >= total + owedExtra ? 'paid' : 'pending';

        triggerPowerAnimation(abonoAmount, 'abono');
        onClose();

        await addExpense({
          userId: user.uid,
          type: owedToMe ? 'ingreso' : 'gasto',
          category: owedToMe ? 'Préstamo devuelto' : 'Deudas',
          amount: abonoAmount,
          description: newPayment.description,
          date: finalDate,
        });
        await updateDebt(debtToEdit.id!, {
          title, totalAmount: total, paidAmount: paid, status, interestRate: rate, ...plan, description,
          createdAt: finalDebtDate,
          payments: [...(debtToEdit.payments || []), newPayment],
        });
      } else {
        const status = paid >= total + owedExtra ? 'paid' : 'pending';
        triggerPowerAnimation(total, debtToEdit?.id ? 'edicion' : 'gasto');
        onClose();
        if (debtToEdit && debtToEdit.id) {
          await updateDebt(debtToEdit.id, {
            title, totalAmount: total, paidAmount: paid, status, interestRate: rate, ...plan, description, createdAt: finalDebtDate,
          });
        } else {
          await addDebt({
            userId: user.uid, title, totalAmount: total, paidAmount: paid, status, interestRate: rate, ...plan, description,
            createdAt: finalDebtDate, payments: [],
          });
        }
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving debt:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!debtToEdit?.id) return;
    setLoading(true);
    try {
      triggerPowerAnimation(parseFloat(totalAmount) || 0, 'eliminacion');
      setShowConfirmDelete(false);
      onClose();
      await deleteDebt(debtToEdit.id);
      onSuccess();
    } catch (error) {
      console.error('Error deleting debt:', error);
    } finally {
      setLoading(false);
      setShowConfirmDelete(false);
    }
  };

  const formatPaymentDate = (date: any) => {
    const d = date instanceof Date ? date : new Date(date);
    const dateStr = d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
    const timeStr = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${dateStr} • ${timeStr}`;
  };

  if (typeof document === 'undefined') return null;

  // Estilos comunes
  const labelCls = `${isTechTheme ? 'text-accent/70' : 'text-text-muted'} text-[11px] font-medium mb-1 block truncate`;
  const inputCls = `w-full bg-glass border py-2 px-3 text-text-primary placeholder-text-muted focus:outline-none disabled:opacity-75 text-sm ${isTechTheme ? 'border-accent/30 rounded-none focus:border-accent font-mono' : 'border-glass-border rounded-xl focus:border-accent'}`;
  const dateCls = `${inputCls} ${theme === 'light' && !isTechTheme ? '[color-scheme:light]' : '[color-scheme:dark]'}`;
  const hint = 'text-[10px] text-text-muted leading-snug mt-1 normal-case';
  const chip = (on: boolean) => `px-2 py-0.5 text-[10px] font-semibold border ${isTechTheme ? 'rounded-none' : 'rounded-full'} ${on ? 'border-accent bg-accent/15 text-accent' : 'border-glass-border text-text-secondary'}`;

  // Sugerencia de cuota (sistema francés) con lo que falta de capital
  const saldo = Math.max(0, (parseFloat(totalAmount) || 0) - (!debtToEdit && isBank
    ? Math.max(0, (parseFloat(totalAmount) || 0) - (parseFloat(capitalNow) || parseFloat(totalAmount) || 0))
    : (parseFloat(paidAmount) || 0)));
  const typedRate = parseFloat(interestRate) || 0;
  const rateEA = rateUnit === 'mensual' ? toEA(typedRate) : typedRate;
  const vaPct = insuranceMode === 'va' ? insuranceFromAccruedNow() : null;
  const insMonth = !(isBank || showInsurance) ? 0 : insuranceMode === 'fijo'
    ? (parseInt(insurance) || 0)
    : Math.round((saldo * ((insuranceMode === 'pct' ? parseFloat(insurance.replace(',', '.')) : vaPct) || 0)) / 100);
  const suggested = estimateInstallment(saldo, rateEA, parseInt(termMonths) || 0);

  // Seguro de vida deudor: en un crédito de banco siempre; entre personas, si es la misma de un crédito
  const insuranceBlock = (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1">
        <label className={`${labelCls} !mb-0`} title="Seguro de vida deudor que cobra el banco">Seguro de vida deudor</label>
        {!isBank && (
          <button type="button" onClick={() => { setShowInsurance(false); setInsurance(''); }} className="text-[10px] text-text-muted underline">Quitar</button>
        )}
      </div>
      <div className="flex flex-wrap gap-1 mb-1.5">
        <button type="button" onClick={() => { setInsuranceMode('va'); setInsurance(''); }} className={chip(insuranceMode === 'va')}>Lo que va hoy $</button>
        <button type="button" onClick={() => { setInsuranceMode('pct'); setInsurance(''); }} className={chip(insuranceMode === 'pct')}>% del saldo</button>
        <button type="button" onClick={() => { setInsuranceMode('fijo'); setInsurance(''); }} className={chip(insuranceMode === 'fijo')}>Valor fijo al mes</button>
      </div>
      <input type="text" inputMode="decimal" value={insurance}
             onChange={(e) => setInsurance(insuranceMode === 'pct' ? e.target.value.replace(/[^0-9.,]/g, '').slice(0, 6) : onlyNum(e.target.value))}
             className={inputCls}
             placeholder={insuranceMode === 'va' ? 'Ej. 233 (lo que muestra el banco hoy)' : insuranceMode === 'pct' ? 'Ej. 0,143 (% mensual)' : 'Valor al mes, ej. 1000'} />
      <p className={hint}>
        {insuranceMode === 'va'
          ? (vaPct
              ? `Eso es un ${vaPct.toLocaleString('es-CO')} % mensual del saldo: unos ${fmt(insMonth)} al mes, y baja a medida que se paga.`
              : 'Escribe el seguro que el banco muestra hasta hoy; con la fecha de desembolso saco el % solo.')
          : insuranceMode === 'pct'
            ? `Un % mensual de lo que se debe; baja a medida que se paga.${insMonth ? ` Este mes: unos ${fmt(insMonth)}.` : ''}`
            : 'El valor en pesos que cobra el banco cada mes por el seguro.'}
      </p>
      {insuranceMode === 'va' && debtDate === getLocalDateString() && (
        <p className={`${hint} text-amber-400`}>Pon primero la fecha de desembolso: con la de hoy no se puede calcular.</p>
      )}
    </div>
  );

  const who = kind === 'banco' ? 'Nombre del crédito' : kind === 'persona' ? '¿Quién te prestó?' : '¿A quién le prestaste?';
  const whoPh = kind === 'banco' ? 'Ej. Crediágil, Libre inversión' : kind === 'persona' ? 'Ej. Mi hermana Laura' : 'Ej. Claudia';

  return createPortal(
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 ${isTechTheme ? 'font-mono uppercase text-sm' : ''}`}>
      <div className={`absolute inset-0 ${theme === 'light' ? 'bg-black/10' : 'bg-black/40'}`} onClick={onClose} aria-hidden="true" />
      <ConfirmDialog
        isOpen={showConfirmDelete}
        onCancel={() => setShowConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Eliminar deuda"
        message="¿Estás seguro de que quieres eliminar esta deuda? Esta acción no se puede deshacer."
      />
      <div
        className={`w-full max-w-md relative z-10 animate-fade-in-up max-h-[95vh] overflow-y-auto p-6 glass-dropdown ${isTechTheme ? 'rounded-none border border-accent/50' : 'rounded-3xl'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} aria-label="Cerrar" className={`absolute top-4 right-4 transition-colors ${isTechTheme ? 'text-accent hover:text-accent/70' : 'text-text-secondary hover:text-text-primary'}`}>
          <X className="w-5 h-5" />
        </button>

        <h2 className={`${isTechTheme ? 'font-bold text-xl text-accent mb-6 tracking-wide border-b border-accent/20 pb-2' : 'font-syne font-bold text-xl text-text-primary mb-4'}`}>
          {isReadOnly ? 'Detalles de Deuda' : debtToEdit ? title || 'Editar Deuda' : 'Nueva Deuda'}
        </h2>

        {isReadOnly && (
          <div className="mb-4 bg-[#00E5A0]/10 border border-[#00E5A0]/20 text-[#00E5A0] text-xs font-semibold py-2 px-3 flex items-center gap-1.5 justify-center tracking-wider">
            ✓ {owedToMe ? 'PRÉSTAMO TOTALMENTE PAGADO' : 'CRÉDITO TOTALMENTE LIQUIDADO'} (HISTORIAL)
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {compact && (
            <button type="button" onClick={() => setShowEdit(v => !v)}
                    className="order-3 w-full flex items-center justify-between text-xs font-semibold text-accent">
              <span>{showEdit ? 'Ocultar datos de la deuda' : 'Editar datos (tipo, monto, tasa, seguro, cuotas)'}</span>
              <span className={`transition-transform ${showEdit ? 'rotate-180' : ''}`}>▾</span>
            </button>
          )}

          {/* ¿Qué tipo de deuda? */}
          {!isReadOnly && (
            <div className={`grid grid-cols-3 gap-2 ${editCls}`} role="radiogroup" aria-label="Tipo de deuda">
              {KINDS.map(k => {
                const on = kind === k.id;
                return (
                  <button key={k.id} type="button" role="radio" aria-checked={on} onClick={() => pickKind(k.id)}
                          className={`flex flex-col items-center gap-1 p-2.5 text-center border transition-all active:scale-95 ${isTechTheme ? 'rounded-none' : 'rounded-2xl'} ${on
                            ? (k.id === 'preste' ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-400' : 'border-accent bg-accent/10 text-accent')
                            : 'border-glass-border text-text-secondary hover:bg-white/5'}`}>
                    <k.icon className="w-5 h-5" />
                    <span className="text-[11px] font-bold leading-tight">{k.label}</span>
                    <span className="text-[9px] opacity-70 leading-tight normal-case">{k.sub}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Dictar la deuda completa */}
          {!debtToEdit && !isReadOnly && (
            <DictateButton isTech={isTechTheme} onText={applySpeech} label="Dictar la deuda"
                           example={kind === 'banco' ? '"Crediágil de 700 mil al 28,17 a 60 meses, pago los 15, desembolso el 5 de noviembre"'
                             : kind === 'preste' ? '"Le presté 500 mil a Claudia al 2 % mensual"' : '"Mi hermana me prestó un millón ayer"'} />
          )}

          {/* Prestaste la plata de un crédito tuyo: copiar sus condiciones */}
          {owedToMe && !debtToEdit && myCredits.length > 0 && (
            <div>
              <button type="button" onClick={() => setShowCopy(v => !v)}
                      className={`w-full flex items-center justify-between gap-2 py-2.5 px-3 text-sm font-semibold border transition-all ${isTechTheme ? 'rounded-none border-emerald-500/40 text-emerald-400 uppercase text-xs' : 'rounded-xl border-emerald-500/40 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10'}`}>
                <span className="flex items-center gap-2"><Landmark className="w-4 h-4" /> Es la misma de uno de mis créditos</span>
                <span className={`transition-transform ${showCopy ? 'rotate-180' : ''}`}>▾</span>
              </button>
              {showCopy && (
                <div className="mt-2 space-y-1.5">
                  {myCredits.map(d => (
                    <button key={d.id} type="button" onClick={() => copyFrom(d)}
                            className={`w-full flex items-center justify-between gap-2 p-2.5 text-left border border-glass-border hover:bg-white/5 ${isTechTheme ? 'rounded-none' : 'rounded-xl'}`}>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-text-primary truncate normal-case">{d.title}</span>
                        <span className="block text-[10px] text-text-muted normal-case">
                          {d.interestRate ? `${d.interestRate}% E.A.` : 'Sin interés'}{d.insuranceRate || d.monthlyInsurance ? ' · con seguro' : ''}{d.termMonths ? ` · ${d.termMonths} meses` : ''}
                        </span>
                      </span>
                      <span className="text-sm font-bold text-text-primary shrink-0">{fmt(d.totalAmount)}</span>
                    </button>
                  ))}
                  <p className={hint}>Copio monto, fecha, tasa, plazo, día de pago y seguro. Así las dos deudas avanzan iguales.</p>
                </div>
              )}
            </div>
          )}

          {/* Deuda nueva: llenar con pantallazos de la app del banco (también si la plata salió de un crédito) */}
          {!debtToEdit && !isReadOnly && (
            <div>
              <input ref={shotsRef} type="file" accept="image/*" multiple className="hidden"
                     onChange={(e) => { const fs = Array.from(e.target.files || []); e.target.value = ''; readShots(fs); }} />
              {aiState === 'loading' ? (
                <ReadingTips isTech={isTechTheme} label="Leyendo las capturas del crédito…" />
              ) : (
                <button type="button"
                        onClick={() => (getAiKey() ? shotsRef.current?.click() : setAiState('no-key'))}
                        className={`w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold border transition-all active:scale-[0.98] ${isTechTheme ? 'rounded-none border-accent/40 text-accent uppercase text-xs' : 'rounded-xl border-accent/40 text-accent bg-accent/5 hover:bg-accent/10'}`}>
                  <Camera className="w-4 h-4" /> Llenar con pantallazos del banco
                </button>
              )}
              {aiState !== 'loading' && (
                <p className={hint}>
                  {aiState === 'no-key'
                    ? <>Para leer capturas necesitas la IA gratuita. <a href="/configuracion" className="text-accent font-semibold underline">Conéctala en Configuración</a>.</>
                    : aiMsg
                      ? <span className={aiState === 'error' ? 'text-red-400' : 'text-text-secondary'}>{aiMsg}</span>
                      : isBank ? 'Puedes elegir varias (detalle, tasa, desembolso). Los números del crédito no se necesitan.'
                        : 'Si la plata salió de un crédito, sube los pantallazos de ese crédito y queda igual, con el seguro.'}
                </p>
              )}
            </div>
          )}

          {/* Quién / nombre */}
          <div className={editCls}>
            <label className={labelCls}>{who}</label>
            <input type="text" required disabled={isReadOnly} value={title} onChange={(e) => setTitle(e.target.value)}
                   className={inputCls} placeholder={whoPh} />
          </div>

          {/* Valor y fecha (en un crédito existente la fecha queda siempre a la vista, más abajo) */}
          <div className={`grid grid-cols-2 gap-2 ${editCls}`}>
            <div className={compact ? 'col-span-2' : ''}>
              <label className={labelCls}>{isBank ? 'Valor desembolsado' : owedToMe ? '¿Cuánto le prestaste?' : '¿Cuánto te prestó?'}</label>
              <input type="text" inputMode="decimal" required disabled={isReadOnly} value={totalAmount}
                     onChange={(e) => { const v = decimal(e.target.value); if (v !== null) setTotalAmount(v); }}
                     className={inputCls} placeholder="0" />
            </div>
            {!compact && (
              <div>
                <label className={labelCls}>{isBank ? 'Fecha de desembolso' : 'Fecha del préstamo'}</label>
                <input type="date" required disabled={isReadOnly} value={debtDate} onChange={(e) => setDebtDate(e.target.value)} className={dateCls} />
              </div>
            )}
          </div>

          {/* Tasa y plazo / lo que ya se pagó */}
          <div className={`grid grid-cols-2 gap-2 ${editCls}`}>
            <div>
              <label className={labelCls} title={isBank ? 'Tasa Efectiva Anual' : ''}>
                {isBank ? 'Tasa Efectiva Anual (%)' : 'Interés (opcional)'}
              </label>
              <input type="text" inputMode="decimal" disabled={isReadOnly} value={interestRate}
                     onChange={(e) => { const v = decimal(e.target.value); if (v !== null) setInterestRate(v); }}
                     className={inputCls} placeholder={isBank ? 'Ej. 28,17' : rateUnit === 'mensual' ? 'Ej. 2' : 'Ej. 26,8'} />
              {!isBank && !isReadOnly && (
                <div className="flex gap-1 mt-1">
                  <button type="button" onClick={() => setRateUnit('mensual')} className={chip(rateUnit === 'mensual')}>% al mes</button>
                  <button type="button" onClick={() => setRateUnit('ea')} className={chip(rateUnit === 'ea')}>% E.A.</button>
                </div>
              )}
              {!isBank && rateUnit === 'mensual' && typedRate > 0 && (
                <p className={hint}>Equivale a {round2(toEA(typedRate)).toLocaleString('es-CO')} % E.A.</p>
              )}
            </div>
            {isBank ? (
              <div>
                <label className={labelCls}>Plazo (meses)</label>
                <input type="text" inputMode="numeric" disabled={isReadOnly} value={termMonths}
                       onChange={(e) => setTermMonths(onlyNum(e.target.value))} className={inputCls} placeholder="60" />
              </div>
            ) : (
              <div>
                <label className={labelCls}>{owedToMe ? 'Ya te pagó' : 'Ya le pagaste'}</label>
                <input type="text" inputMode="decimal" disabled={isReadOnly || !!debtToEdit} value={paidAmount}
                       onChange={(e) => { const v = decimal(e.target.value); if (v !== null) setPaidAmount(v); }}
                       className={inputCls} placeholder="0" />
                {!!debtToEdit && <p className={hint}>Los pagos se registran como abonos.</p>}
              </div>
            )}
          </div>

          {/* Crédito de banco: día de pago, capital vigente, seguro y cuota */}
          {isBank && !isReadOnly && (
            <div className={`space-y-3 ${editCls}`}>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>Día de pago</label>
                  <input type="text" inputMode="numeric" value={paymentDay}
                         onChange={(e) => setPaymentDay(onlyNum(e.target.value).slice(0, 2))} className={inputCls} placeholder="15" />
                  <p className={hint}>El día de la "Fecha próximo pago" del banco.</p>
                </div>
                {!debtToEdit ? (
                  <div>
                    <label className={labelCls}>Capital vigente</label>
                    <input type="text" inputMode="decimal" value={capitalNow}
                           onChange={(e) => { const v = decimal(e.target.value); if (v !== null) setCapitalNow(v); }}
                           className={inputCls} placeholder={totalAmount || 'Igual al desembolsado'} />
                    <p className={hint}>Solo si ya le has pagado capital.</p>
                  </div>
                ) : (
                  <div>
                    <label className={labelCls}>Cuota mensual</label>
                    <input type="text" inputMode="numeric" value={installment}
                           onChange={(e) => setInstallment(onlyNum(e.target.value))} className={inputCls} placeholder="Opcional" />
                  </div>
                )}
              </div>

              {insuranceBlock}

              {!debtToEdit && (
                <div>
                  <label className={labelCls}>Cuota mensual</label>
                  <input type="text" inputMode="numeric" value={installment}
                         onChange={(e) => setInstallment(onlyNum(e.target.value))} className={inputCls} placeholder="La que te informó el banco (opcional)" />
                </div>
              )}
              {suggested > 0 && String(suggested) !== installment && (
                <button type="button" onClick={() => setInstallment(String(suggested))} className="-mt-2 text-[11px] text-accent text-left normal-case">
                  Con esa tasa y plazo la cuota sería unos {fmt(suggested)}{insMonth ? ` + ${fmt(insMonth)} de seguro` : ''} · usar
                </button>
              )}
              <p className="text-[10px] text-text-muted leading-snug normal-case">
                Con el día de pago, la cuota aparece en Próximos compromisos y se descuenta de lo que puedes gastar hasta que registres el abono.
              </p>
            </div>
          )}

          {/* Entre personas: seguro (plegado) */}
          {!isBank && !isReadOnly && (
            <div className={editCls}>
              {showInsurance ? insuranceBlock : (
                <button type="button" onClick={() => setShowInsurance(true)} className="text-xs text-accent font-semibold">
                  + Tiene seguro (como un crédito de banco)
                </button>
              )}
            </div>
          )}

          {/* Entre personas: cuotas opcionales */}
          {!isBank && !isReadOnly && (
            <div className={editCls}>
              {!showPlan ? (
                <button type="button" onClick={() => setShowPlan(true)} className="text-xs text-accent font-semibold">
                  + {owedToMe ? 'Te paga por cuotas' : 'Le pagas por cuotas'} (opcional)
                </button>
              ) : (
                <div className={`p-3 border space-y-2 ${isTechTheme ? 'border-accent/20 rounded-none' : 'border-glass-border rounded-2xl'}`}>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className={labelCls}>Cuotas</label>
                      <input type="text" inputMode="numeric" value={termMonths} onChange={(e) => setTermMonths(onlyNum(e.target.value))} className={inputCls} placeholder="6" />
                    </div>
                    <div>
                      <label className={labelCls}>Día de pago</label>
                      <input type="text" inputMode="numeric" value={paymentDay} onChange={(e) => setPaymentDay(onlyNum(e.target.value).slice(0, 2))} className={inputCls} placeholder="30" />
                    </div>
                    <div>
                      <label className={labelCls}>Cuota</label>
                      <input type="text" inputMode="numeric" value={installment} onChange={(e) => setInstallment(onlyNum(e.target.value))} className={inputCls} placeholder={suggested ? String(suggested) : 'Valor'} />
                    </div>
                  </div>
                  <p className="text-[10px] text-text-muted leading-snug normal-case">
                    {owedToMe
                      ? 'Solo para que veas en cuántas cuotas te va a pagar. Cada abono que te haga entra como ingreso.'
                      : 'Con el día de pago, la cuota aparece en Próximos compromisos.'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Al editar, la fecha del desembolso queda siempre a la vista (de ella dependen intereses, seguro y la primera cuota) */}
          {compact && (
            <div className="order-2 flex items-center justify-between gap-3">
              <label htmlFor="debt-date" className={`${isTechTheme ? 'text-accent/70' : 'text-text-muted'} text-xs font-medium`}>
                {isBank ? 'Fecha de desembolso' : 'Fecha del préstamo'}
              </label>
              <input id="debt-date" type="date" required value={debtDate} onChange={(e) => setDebtDate(e.target.value)}
                     className={`${dateCls} !w-auto !py-1.5 text-xs`} />
            </div>
          )}

          {/* Resumen con las mismas palabras del banco */}
          {debtToEdit && (() => {
            const c = calculateDebtInterest(debtToEdit);
            const hasCharges = (debtToEdit.interestRate || 0) > 0 || (debtToEdit.monthlyInsurance || 0) > 0 || (debtToEdit.insuranceRate || 0) > 0;
            const next = !isReadOnly ? nextDebtPaymentDate(debtToEdit) : null;
            if (!hasCharges && !next) return null;
            const row = 'flex justify-between';
            return (
              <div className={`${compact ? 'order-1' : ''} p-4 border ${isTechTheme ? 'bg-deep border-accent/20 rounded-none font-mono text-[11px]' : 'bg-glass border-glass-border rounded-2xl text-xs space-y-1 text-text-secondary'}`}>
                {hasCharges && (
                  <>
                    <div className={row}><span>Capital vigente</span><span className="text-text-primary">{fmt(c.principalLeft)}</span></div>
                    {(debtToEdit.interestRate || 0) > 0 && (
                      <div className={row}><span>Intereses corrientes{debtToEdit.interestRate ? ` (${debtToEdit.interestRate}% E.A.)` : ''}</span><span className="text-red-400 font-semibold">+{fmt(c.pendingInterest)}</span></div>
                    )}
                    {((debtToEdit.monthlyInsurance || 0) > 0 || (debtToEdit.insuranceRate || 0) > 0) && (
                      <div className={row}><span>Seguro de vida deudor</span><span className="text-red-400 font-semibold">+{fmt(c.pendingInsurance)}</span></div>
                    )}
                    <hr className="border-glass-border my-1.5" />
                    <div className="flex justify-between text-sm font-bold">
                      <span className={isTechTheme ? 'text-accent' : 'text-text-primary font-syne'}>{isReadOnly ? 'Total pagado' : owedToMe ? 'Te debe a la fecha' : 'Deuda a la fecha'}</span>
                      <span className={isTechTheme ? 'text-accent font-mono' : 'text-[#00E5A0] font-mono'}>{fmt(c.currentTotal)}</span>
                    </div>
                  </>
                )}
                {next && (
                  <div className={`${row} pt-1`}>
                    <span>Próximo pago</span>
                    <span className="text-text-primary">
                      {next.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {debtToEdit.installment ? ` · ${fmt(debtToEdit.installment)}` : ''}
                    </span>
                  </div>
                )}
              </div>
            );
          })()}

          {debtToEdit && !isReadOnly && (
            <div className={`order-2 p-4 border grid grid-cols-2 gap-3 ${isTechTheme ? 'bg-deep border-accent/20 rounded-none' : 'bg-glass border-glass-border rounded-2xl'}`}>
              <div>
                <label className={`${isTechTheme ? 'text-accent/70' : 'text-text-muted'} text-xs font-medium mb-1.5 block`}>{owedToMe ? 'Abono recibido' : 'Registrar abono'}</label>
                <input type="text" inputMode="decimal" value={abono}
                       onChange={(e) => { const v = decimal(e.target.value); if (v !== null) setAbono(v); }}
                       className={inputCls} placeholder="0" />
              </div>
              <div>
                <label className={`${isTechTheme ? 'text-accent/70' : 'text-text-muted'} text-xs font-medium mb-1.5 block`}>Fecha</label>
                <input type="date" value={abonoDate} onChange={(e) => setAbonoDate(e.target.value)} className={dateCls} />
              </div>
            </div>
          )}

          <div className={editCls}>
            <label className={labelCls}>Nota (opcional)</label>
            <textarea disabled={isReadOnly} value={description} onChange={(e) => setDescription(e.target.value)}
                      className={`${inputCls} resize-none h-16`}
                      placeholder={isBank ? 'Ej. Para pagar la moto' : 'Ej. Se lo presté para el arriendo'} />
          </div>

          {debtToEdit && debtToEdit.payments && debtToEdit.payments.length > 0 && (
            <div className={`${compact ? 'order-5' : ''} p-4 border ${isTechTheme ? 'bg-deep border-accent/20 rounded-none' : 'bg-glass border-glass-border rounded-2xl'}`}>
              <h4 className={`text-xs font-semibold mb-2.5 tracking-wider ${isTechTheme ? 'text-accent' : 'text-text-secondary font-syne'}`}>
                Historial de abonos ({debtToEdit.payments.length})
              </h4>
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {debtToEdit.payments.map((p, idx) => (
                  <div key={p.id || idx} className="flex justify-between items-center text-xs py-1.5 border-b border-glass-border last:border-0">
                    <span className={isTechTheme ? 'text-white/80' : 'text-text-secondary'}>{formatPaymentDate(p.date)}</span>
                    <span className={`font-mono font-bold ${isTechTheme ? 'text-accent' : 'text-[#00E5A0]'}`}>+{fmt(p.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={`${compact ? 'order-6' : ''} pt-2 space-y-2`}>
            {isReadOnly ? (
              <button type="button" onClick={onClose}
                      className={`w-full font-bold py-3.5 hover:opacity-90 active:scale-[0.98] transition-all text-sm ${isTechTheme ? 'rounded-none bg-accent/20 border border-accent text-accent uppercase tracking-widest' : `rounded-xl bg-gradient-to-r from-accent to-accent-dim ${theme === 'light' ? 'text-white' : 'text-black'}`}`}>
                Volver / Aceptar
              </button>
            ) : (
              <button type="submit" disabled={loading || aiState === 'loading'}
                      className={`w-full font-bold py-3.5 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 text-sm ${isTechTheme ? 'rounded-none bg-accent/20 border border-accent text-accent uppercase tracking-widest' : `rounded-xl bg-gradient-to-r from-accent to-accent-dim ${theme === 'light' ? 'text-white' : 'text-black'}`}`}>
                {loading ? 'Guardando...' : debtToEdit ? 'Guardar cambios' : isBank ? 'Guardar crédito' : owedToMe ? 'Guardar préstamo' : 'Guardar deuda'}
              </button>
            )}
            {debtToEdit && (
              <button type="button" onClick={() => setShowConfirmDelete(true)} disabled={loading}
                      className={`w-full font-bold py-3.5 transition-all active:scale-[0.98] disabled:opacity-50 text-sm ${isTechTheme ? 'rounded-none bg-red-500/10 border border-red-500/50 text-red-400 hover:bg-red-500/20 uppercase tracking-wider' : 'rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20'}`}>
                Eliminar deuda
              </button>
            )}
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
