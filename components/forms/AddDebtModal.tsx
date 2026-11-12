'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '@/components/ThemeProvider';
import { X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { addDebt, updateDebt, deleteDebt, addExpense, calculateDebtInterest, estimateInstallment, nextDebtPaymentDate, Debt } from '@/lib/firestore';
import { ConfirmDialog } from '@/components/layout/ConfirmDialog';
import { triggerPowerAnimation } from '@/components/dashboard/PowerAnimation';
import { getLocalDateString } from '@/lib/dateUtils';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  debtToEdit?: Debt | null;
  initialAbono?: number | null; // al venir desde "Próximos compromisos": la cuota del mes
}

export function AddDebtModal({ onClose, onSuccess, debtToEdit, initialAbono }: Props) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [description, setDescription] = useState('');
  const [abono, setAbono] = useState(initialAbono ? String(initialAbono) : '');
  const [insurance, setInsurance] = useState('');
  const [installment, setInstallment] = useState('');
  const [termMonths, setTermMonths] = useState('');
  const [paymentDay, setPaymentDay] = useState('');
  const [showPlan, setShowPlan] = useState(false);
  // Yo debo (le debo a alguien o al banco) / Me deben (yo presté la plata)
  const [direction, setDirection] = useState<'debo' | 'me_deben'>('debo');
  // Seguro: valor fijo en pesos al mes, o % mensual del saldo
  const [insuranceMode, setInsuranceMode] = useState<'fijo' | 'pct'>('fijo');
  const [abonoDate, setAbonoDate] = useState(getLocalDateString());
  const [debtDate, setDebtDate] = useState(getLocalDateString());
  const [loading, setLoading] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';

  const isReadOnly = debtToEdit?.status === 'paid';
  // Deuda existente: lo de todos los días (resumen y abono) arriba; editar los datos, plegado
  const compact = !!debtToEdit && !isReadOnly;
  const [showEdit, setShowEdit] = useState(false);
  const editCls = compact ? `order-4 ${showEdit ? '' : 'hidden'}` : '';

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    if (debtToEdit) {
      setTitle(debtToEdit.title);
      setTotalAmount(debtToEdit.totalAmount.toString());
      setPaidAmount(debtToEdit.paidAmount.toString());
      setInterestRate(debtToEdit.interestRate ? debtToEdit.interestRate.toString() : '');
      setDescription(debtToEdit.description || '');
      setDirection(debtToEdit.direction || 'debo');
      if (!debtToEdit.monthlyInsurance && debtToEdit.insuranceRate) {
        setInsuranceMode('pct');
        setInsurance(String(debtToEdit.insuranceRate));
      } else {
        setInsuranceMode('fijo');
        setInsurance(debtToEdit.monthlyInsurance ? String(debtToEdit.monthlyInsurance) : '');
      }
      setInstallment(debtToEdit.installment ? String(debtToEdit.installment) : '');
      setTermMonths(debtToEdit.termMonths ? String(debtToEdit.termMonths) : '');
      setPaymentDay(debtToEdit.paymentDay ? String(debtToEdit.paymentDay) : '');
      setShowPlan(!!(debtToEdit.monthlyInsurance || debtToEdit.insuranceRate || debtToEdit.installment || debtToEdit.paymentDay));
      if (debtToEdit.createdAt) {
        const d = debtToEdit.createdAt instanceof Date ? debtToEdit.createdAt : new Date();
        setDebtDate(getLocalDateString(d));
      }
    }
  }, [debtToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      onClose();
      return;
    }
    if (!user) return;

    setLoading(true);
    try {
      const total = parseFloat(totalAmount);
      let paid = parseFloat(paidAmount) || 0;
      const rate = interestRate ? parseFloat(interestRate) : 0;
      const day = Math.min(31, Math.max(0, parseInt(paymentDay) || 0));
      const owedToMe = direction === 'me_deben';
      const plan = {
        direction,
        // Entre personas no hay seguro de banco
        monthlyInsurance: !owedToMe && insuranceMode === 'fijo' ? (parseInt(insurance) || null) : null,
        insuranceRate: !owedToMe && insuranceMode === 'pct' ? (parseFloat(insurance.replace(',', '.')) || null) : null,
        installment: parseInt(installment) || null,
        termMonths: parseInt(termMonths) || null,
        paymentDay: day || null,
      };
      // Con intereses, la deuda queda saldada cuando lo abonado cubre capital + intereses causados
      const owedExtra = debtToEdit ? calculateDebtInterest(debtToEdit).accumulatedInterest : 0;

      let finalDebtDate: Date;
      const todayStr = new Date().toLocaleDateString('sv-SE');
      if (debtDate === todayStr) {
        const now = new Date();
        const [year, month, day] = debtDate.split('-').map(Number);
        finalDebtDate = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds());
      } else {
        const [year, month, day] = debtDate.split('-').map(Number);
        finalDebtDate = new Date(year, month - 1, day, 12, 0, 0);
      }

      if (debtToEdit && abono) {
        const abonoAmount = parseFloat(abono);
        paid += abonoAmount;
        
        // Obtener fecha y hora exacta localmente para evitar desfases UTC
        const todayStr = new Date().toLocaleDateString('sv-SE'); // Formato YYYY-MM-DD
        let finalDate: Date;
        if (abonoDate === todayStr) {
          const now = new Date();
          const [year, month, day] = abonoDate.split('-').map(Number);
          finalDate = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds());
        } else {
          const [year, month, day] = abonoDate.split('-').map(Number);
          finalDate = new Date(year, month - 1, day, 12, 0, 0);
        }

        const newPayment = {
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
          amount: abonoAmount,
          date: finalDate,
          description: owedToMe ? `Abono de: ${title}` : `Abono a: ${title}`,
        };

        const status = paid >= total + owedExtra ? 'paid' : 'pending';

        // ⚡ Respuesta optimista inmediata a 0ms: Disparar animación de Abono y cerrar modal al instante
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
          title,
          totalAmount: total,
          paidAmount: paid,
          status,
          interestRate: rate,
          ...plan,
          description,
          createdAt: finalDebtDate,
          payments: [...(debtToEdit.payments || []), newPayment],
        });
      } else {
        const status = paid >= total + owedExtra ? 'paid' : 'pending';
        
        // ⚡ Respuesta optimista inmediata a 0ms
        triggerPowerAnimation(total, debtToEdit?.id ? 'edicion' : 'gasto');
        onClose();

        if (debtToEdit && debtToEdit.id) {
          await updateDebt(debtToEdit.id, {
            title,
            totalAmount: total,
            paidAmount: paid,
            status,
            interestRate: rate,
            ...plan,
            description,
            createdAt: finalDebtDate,
          });
        } else {
          await addDebt({
            userId: user.uid,
            title,
            totalAmount: total,
            paidAmount: paid,
            status,
            interestRate: rate,
            ...plan,
            description,
            createdAt: finalDebtDate,
            payments: [],
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
      const deletedAmount = parseFloat(totalAmount) || 0;

      // ⚡ Respuesta optimista inmediata a 0ms
      triggerPowerAnimation(deletedAmount, 'eliminacion');
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
        <button onClick={onClose} className={`absolute top-4 right-4 transition-colors ${isTechTheme ? 'text-accent hover:text-accent/70' : 'text-text-secondary hover:text-text-primary'}`}>
          <X className="w-5 h-5" />
        </button>

        <h2 className={`${isTechTheme ? 'font-bold text-xl text-accent mb-6 tracking-wide border-b border-accent/20 pb-2' : 'font-syne font-bold text-xl text-text-primary mb-4'}`}>
          {isReadOnly ? 'Detalles de Deuda' : debtToEdit ? 'Editar Deuda' : 'Nueva Deuda'}
        </h2>

        {isReadOnly && (
          <div className="mb-4 bg-[#00E5A0]/10 border border-[#00E5A0]/20 text-[#00E5A0] text-xs font-semibold py-2 px-3 flex items-center gap-1.5 justify-center tracking-wider">
            ✓ CRÉDITO TOTALMENTE LIQUIDADO (HISTORIAL)
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {compact && (
            <button type="button" onClick={() => setShowEdit(v => !v)}
                    className="order-3 w-full flex items-center justify-between text-xs font-semibold text-accent">
              <span>{showEdit ? 'Ocultar datos de la deuda' : 'Editar datos de la deuda (monto, tasa, cuotas, nota)'}</span>
              <span className={`transition-transform ${showEdit ? 'rotate-180' : ''}`}>▾</span>
            </button>
          )}
          {!isReadOnly && (
            <div className={`grid grid-cols-2 gap-1 p-1 border ${isTechTheme ? 'border-accent/30 rounded-none' : 'border-glass-border rounded-xl'} ${editCls}`} role="radiogroup" aria-label="Tipo de deuda">
              {([['debo', 'Yo debo'], ['me_deben', 'Me deben']] as const).map(([v, l]) => (
                <button key={v} type="button" role="radio" aria-checked={direction === v} onClick={() => setDirection(v)}
                        className={`py-2 text-xs font-bold transition-colors ${isTechTheme ? 'rounded-none' : 'rounded-lg'} ${direction === v
                          ? (v === 'me_deben' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-accent/15 text-accent')
                          : 'text-text-secondary hover:bg-white/5'}`}>
                  {l}
                </button>
              ))}
            </div>
          )}
          {!isReadOnly && !debtToEdit && (
            <p className="-mt-2 text-[10px] text-text-muted leading-snug">
              {direction === 'me_deben' ? 'Prestaste plata: lo que te paguen entra como ingreso.' : 'Un crédito del banco o plata que te prestaron: los abonos salen como gasto.'}
            </p>
          )}

          <div className={`grid grid-cols-3 gap-3 ${editCls}`}>
            <div className={compact ? 'col-span-3' : 'col-span-2'}>
              <label className={`${isTechTheme ? 'text-accent/70' : 'text-text-muted'} text-xs font-medium mb-1.5 block`}>{direction === 'me_deben' ? '¿A quién le prestaste?' : 'Título de la Deuda'}</label>
              <input
                type="text"
                required
                disabled={isReadOnly}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={`w-full bg-glass border py-2.5 px-4 text-text-primary placeholder-text-muted focus:outline-none disabled:opacity-75 ${isTechTheme ? 'border-accent/30 rounded-none focus:border-accent font-mono' : 'border-glass-border rounded-xl focus:border-accent text-sm'}`}
                placeholder={direction === 'me_deben' ? 'Ej. Préstamo a Claudia' : 'Ej. Crediágil, préstamo de Juan...'}
              />
            </div>
            {!compact && (
              <div className="col-span-1">
                <label className={`${isTechTheme ? 'text-accent/70' : 'text-text-muted'} text-xs font-medium mb-1.5 block truncate`} title="Día en que se entregó la plata">Desembolso</label>
                <input
                  type="date"
                  required
                  disabled={isReadOnly}
                  value={debtDate}
                  onChange={(e) => setDebtDate(e.target.value)}
                  className={`w-full bg-glass border py-2.5 px-3 text-text-primary placeholder-text-muted focus:outline-none disabled:opacity-75 ${isTechTheme ? 'border-accent/30 rounded-none focus:border-accent font-mono text-xs [color-scheme:dark]' : `border-glass-border rounded-xl focus:border-accent text-xs ${theme === 'light' ? '[color-scheme:light]' : '[color-scheme:dark]'}`}`}
                />
              </div>
            )}
          </div>

          {/* Al editar, la fecha del desembolso queda siempre a la vista (de ella dependen intereses, seguro y la primera cuota) */}
          {compact && (
            <div className="order-2 flex items-center justify-between gap-3">
              <label htmlFor="debt-date" className={`${isTechTheme ? 'text-accent/70' : 'text-text-muted'} text-xs font-medium`}>
                Fecha del desembolso
              </label>
              <input
                id="debt-date"
                type="date"
                required
                value={debtDate}
                onChange={(e) => setDebtDate(e.target.value)}
                className={`bg-glass border py-1.5 px-3 text-text-primary focus:outline-none text-xs ${theme === 'light' && !isTechTheme ? '[color-scheme:light]' : '[color-scheme:dark]'} ${isTechTheme ? 'border-accent/30 rounded-none focus:border-accent font-mono' : 'border-glass-border rounded-xl focus:border-accent'}`}
              />
            </div>
          )}

          <div className={`grid grid-cols-3 gap-2 ${editCls}`}>
            <div className="col-span-1">
              <label className={`${isTechTheme ? 'text-accent/70' : 'text-text-muted'} text-[10px] font-medium mb-1 block truncate`}>Monto Total</label>
              <input
                type="text"
                required
                disabled={isReadOnly}
                value={totalAmount}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                  if (val.split('.').length > 2) return;
                  setTotalAmount(val);
                }}
                className={`w-full bg-glass border py-2 px-3 text-text-primary placeholder-text-muted focus:outline-none disabled:opacity-75 ${isTechTheme ? 'border-accent/30 rounded-none focus:border-accent font-mono text-xs' : 'border-glass-border rounded-xl focus:border-accent text-xs'}`}
                placeholder="0.00"
              />
            </div>

            <div className="col-span-1">
              <label className={`${isTechTheme ? 'text-accent/70' : 'text-text-muted'} text-[10px] font-medium mb-1 block truncate`}>{direction === 'me_deben' ? 'Ya te pagó' : 'Monto Pagado'}</label>
              <input
                type="text"
                disabled={isReadOnly || !!debtToEdit}
                value={paidAmount}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                  if (val.split('.').length > 2) return;
                  setPaidAmount(val);
                }}
                className={`w-full bg-glass border py-2 px-3 text-text-primary placeholder-text-muted focus:outline-none disabled:opacity-75 ${isTechTheme ? 'border-accent/30 rounded-none focus:border-accent font-mono text-xs' : 'border-glass-border rounded-xl focus:border-accent text-xs'}`}
                placeholder="0.00"
              />
            </div>

            <div className="col-span-1">
              <label className={`${isTechTheme ? 'text-accent/70' : 'text-text-muted'} text-[10px] font-medium mb-1 block truncate`} title="Tasa Efectiva Anual">Tasa E.A. (%)</label>
              <input
                type="text"
                disabled={isReadOnly}
                value={interestRate}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                  if (val.split('.').length > 2) return;
                  setInterestRate(val);
                }}
                className={`w-full bg-glass border py-2 px-3 text-text-primary placeholder-text-muted focus:outline-none disabled:opacity-75 ${isTechTheme ? 'border-accent/30 rounded-none focus:border-accent font-mono text-xs' : 'border-glass-border rounded-xl focus:border-accent text-xs'}`}
                placeholder="Opcional %"
              />
            </div>
          </div>

          {!isReadOnly && <div className={editCls}>{(() => {
            const inputCls = `w-full bg-glass border py-2 px-3 text-text-primary placeholder-text-muted focus:outline-none ${isTechTheme ? 'border-accent/30 rounded-none focus:border-accent font-mono text-xs' : 'border-glass-border rounded-xl focus:border-accent text-xs'}`;
            const labelCls = `${isTechTheme ? 'text-accent/70' : 'text-text-muted'} text-[10px] font-medium mb-1 block truncate`;
            const suggested = estimateInstallment(
              Math.max(0, (parseFloat(totalAmount) || 0) - (parseFloat(paidAmount) || 0)),
              parseFloat(interestRate) || 0, parseInt(termMonths) || 0,
            );
            const owedToMe = direction === 'me_deben';
            const saldo = Math.max(0, (parseFloat(totalAmount) || 0) - (parseFloat(paidAmount) || 0));
            const ins = owedToMe ? 0 : insuranceMode === 'pct'
              ? Math.round((saldo * (parseFloat(insurance.replace(',', '.')) || 0)) / 100)
              : (parseInt(insurance) || 0);
            if (!showPlan) {
              return (
                <button type="button" onClick={() => setShowPlan(true)} className="text-xs text-accent font-semibold">
                  {owedToMe ? '+ Cuotas y día de pago (si te paga por cuotas)' : '+ Cuotas, seguro y día de pago (créditos de banco)'}
                </button>
              );
            }
            return (
              <div className={`p-3 border space-y-3 ${isTechTheme ? 'border-accent/20 rounded-none' : 'border-glass-border rounded-2xl'}`}>
                <p className={`text-[11px] font-semibold ${isTechTheme ? 'text-accent' : 'text-text-secondary'}`}>Crédito con cuotas (opcional)</p>
                <div className={`grid gap-2 ${owedToMe ? 'grid-cols-2' : 'grid-cols-3'}`}>
                  <div>
                    <label className={labelCls}>Plazo (meses)</label>
                    <input type="text" inputMode="numeric" value={termMonths} onChange={(e) => setTermMonths(e.target.value.replace(/[^0-9]/g, ''))} className={inputCls} placeholder="60" />
                  </div>
                  <div>
                    <label className={labelCls}>Día de pago</label>
                    <input type="text" inputMode="numeric" value={paymentDay} onChange={(e) => setPaymentDay(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))} className={inputCls} placeholder="15" />
                  </div>
                  {!owedToMe && (
                    <div>
                      <label className={labelCls} title="Seguro de vida deudor que cobra el banco cada mes">Seguro / mes</label>
                      <input type="text" inputMode="decimal" value={insurance}
                             onChange={(e) => setInsurance(insuranceMode === 'pct'
                               ? e.target.value.replace(/[^0-9.,]/g, '').slice(0, 5)
                               : e.target.value.replace(/[^0-9]/g, ''))}
                             className={inputCls} placeholder={insuranceMode === 'pct' ? '0,1' : 'Opcional'} />
                    </div>
                  )}
                </div>
                {!owedToMe && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-text-muted">El seguro es:</span>
                      {([['fijo', 'Valor fijo $'], ['pct', '% del saldo']] as const).map(([v, l]) => (
                        <button key={v} type="button" onClick={() => { setInsuranceMode(v); setInsurance(''); }}
                                className={`px-2 py-0.5 text-[10px] font-semibold border ${isTechTheme ? 'rounded-none' : 'rounded-full'} ${insuranceMode === v ? 'border-accent bg-accent/15 text-accent' : 'border-glass-border text-text-secondary'}`}>
                          {l}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-text-muted leading-snug">
                      {insuranceMode === 'pct'
                        ? `El seguro de vida deudor suele ser un % mensual de lo que debes (mira tu extracto). Baja a medida que pagas.${ins ? ` Este mes: unos $${ins.toLocaleString('es-CO')}.` : ''}`
                        : 'El valor en pesos que te cobra el banco cada mes por el seguro (sale en el extracto).'}
                    </p>
                  </div>
                )}
                <div>
                  <label className={labelCls}>Cuota mensual</label>
                  <input type="text" inputMode="numeric" value={installment} onChange={(e) => setInstallment(e.target.value.replace(/[^0-9]/g, ''))} className={inputCls} placeholder="La que te informó el banco" />
                  {suggested > 0 && String(suggested) !== installment && (
                    <button type="button" onClick={() => setInstallment(String(suggested))} className="mt-1 text-[11px] text-accent text-left">
                      Con esa tasa y plazo sería unos ${suggested.toLocaleString('es-CO')}{ins ? ` (más $${ins.toLocaleString('es-CO')} de seguro si el banco lo cobra aparte)` : ''} · usar
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-text-muted leading-snug">
                  {owedToMe
                    ? 'Solo para que veas en cuántas cuotas te va a pagar. Cada abono que te haga entra como ingreso.'
                    : 'Con el día de pago, la cuota aparece en Próximos compromisos y se descuenta de lo que puedes gastar hasta que registres el abono.'}
                </p>
              </div>
            );
          })()}</div>}

          {debtToEdit && ((debtToEdit.interestRate || 0) > 0 || (debtToEdit.monthlyInsurance || 0) > 0 || (debtToEdit.insuranceRate || 0) > 0) && (() => {
            const interestData = calculateDebtInterest(debtToEdit);
            const pendingAmount = Math.max(0, debtToEdit.totalAmount - debtToEdit.paidAmount);
            const totalWithInterest = pendingAmount + interestData.accumulatedInterest;
            return (
              <div className={`${compact ? 'order-1' : ''} p-4 border ${isTechTheme ? 'bg-deep border-accent/20 rounded-none font-mono text-[11px]' : 'bg-glass border-glass-border rounded-2xl text-xs space-y-1 text-text-secondary'}`}>
                <div className="flex justify-between items-center text-text-muted mb-2">
                  <span>RESUMEN FINANCIERO{debtToEdit.interestRate ? ` (E.A. ${debtToEdit.interestRate}%)` : ''}</span>
                  {debtToEdit.status !== 'paid' && (
                    <span className="text-[10px] text-accent font-bold uppercase tracking-wider animate-pulse">Capitalización Diaria</span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span>Saldo base {isReadOnly ? 'liquidado' : 'pendiente'}:</span>
                  <span className="text-text-primary">${pendingAmount.toLocaleString('es-CO')}</span>
                </div>
                {interestData.interest > 0 && (
                  <div className="flex justify-between">
                    <span className="text-red-400 font-semibold">Intereses causados:</span>
                    <span className="text-red-400 font-bold font-mono">+${interestData.interest.toLocaleString('es-CO')}</span>
                  </div>
                )}
                {interestData.insurance > 0 && (
                  <div className="flex justify-between">
                    <span className="text-red-400 font-semibold">Seguro causado:</span>
                    <span className="text-red-400 font-bold font-mono">+${interestData.insurance.toLocaleString('es-CO')}</span>
                  </div>
                )}
                <hr className="border-glass-border my-1.5" />
                <div className="flex justify-between text-sm font-bold">
                  <span className={isTechTheme ? 'text-accent' : 'text-text-primary font-syne'}>{isReadOnly ? 'Total pagado:' : 'Total a pagar hoy:'}</span>
                  <span className={isTechTheme ? 'text-accent font-mono' : 'text-[#00E5A0] font-mono'}>
                    ${totalWithInterest.toLocaleString('es-CO')}
                  </span>
                </div>
                {!isReadOnly && debtToEdit.installment && nextDebtPaymentDate(debtToEdit) && (
                  <div className="flex justify-between pt-1">
                    <span>Próxima cuota:</span>
                    <span className="text-text-primary">
                      ${debtToEdit.installment.toLocaleString('es-CO')} el {nextDebtPaymentDate(debtToEdit)!.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                )}
              </div>
            );
          })()}

          {debtToEdit && !isReadOnly && (
            <div className={`order-2 p-4 border grid grid-cols-2 gap-3 ${isTechTheme ? 'bg-deep border-accent/20 rounded-none' : 'bg-glass border-glass-border rounded-2xl'}`}>
              <div>
                <label className={`${isTechTheme ? 'text-accent/70' : 'text-text-muted'} text-xs font-medium mb-1.5 block`}>{direction === 'me_deben' ? 'Abono recibido' : 'Registrar Abono'}</label>
                <input
                  type="text"
                  value={abono}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                    if (val.split('.').length > 2) return;
                    setAbono(val);
                  }}
                  className={`w-full bg-glass border py-2 px-4 text-text-primary placeholder-text-muted focus:outline-none ${isTechTheme ? 'border-accent/30 rounded-none focus:border-accent font-mono' : 'border-glass-border rounded-xl focus:border-accent text-sm'}`}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className={`${isTechTheme ? 'text-accent/70' : 'text-text-muted'} text-xs font-medium mb-1.5 block`}>Fecha</label>
                <input
                  type="date"
                  value={abonoDate}
                  onChange={(e) => setAbonoDate(e.target.value)}
                  className={`w-full bg-glass border py-2 px-4 text-text-primary focus:outline-none ${theme === 'dark' || isTechTheme ? '[color-scheme:dark]' : '[color-scheme:light]'} ${isTechTheme ? 'border-accent/30 rounded-none focus:border-accent font-mono' : 'border-glass-border rounded-xl focus:border-accent text-sm'}`}
                />
              </div>
            </div>
          )}

          <div className={editCls}>
            <label className={`${isTechTheme ? 'text-accent/70' : 'text-text-muted'} text-xs font-medium mb-1.5 block`}>Descripción (Opcional)</label>
            <textarea
              disabled={isReadOnly}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`w-full bg-glass border py-2.5 px-4 text-text-primary placeholder-text-muted focus:outline-none resize-none h-20 disabled:opacity-75 ${isTechTheme ? 'border-accent/30 rounded-none focus:border-accent font-mono text-xs' : 'border-glass-border rounded-xl focus:border-accent text-sm'}`}
              placeholder="Ej. Dinero prestado para la compra de materiales..."
            />
          </div>

          {debtToEdit && debtToEdit.payments && debtToEdit.payments.length > 0 && (
            <div className={`${compact ? 'order-5' : ''} p-4 border ${isTechTheme ? 'bg-deep border-accent/20 rounded-none' : 'bg-glass border-glass-border rounded-2xl'}`}>
              <h4 className={`text-xs font-semibold mb-2.5 tracking-wider ${isTechTheme ? 'text-accent' : 'text-text-secondary font-syne'}`}>
                Historial de Abonos ({debtToEdit.payments.length})
              </h4>
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {debtToEdit.payments.map((p, idx) => (
                  <div key={p.id || idx} className="flex justify-between items-center text-xs py-1.5 border-b border-glass-border last:border-0">
                    <span className={`${isTechTheme ? 'text-white/80' : 'text-text-secondary'}`}>
                      {formatPaymentDate(p.date)}
                    </span>
                    <span className={`font-mono font-bold ${isTechTheme ? 'text-accent' : 'text-[#00E5A0]'}`}>
                      +${p.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={`${compact ? 'order-6' : ''} pt-2 space-y-2`}>
            {isReadOnly ? (
              <button
                type="button"
                onClick={onClose}
                className={`w-full font-bold py-3.5 hover:opacity-90 active:scale-[0.98] transition-all text-sm ${isTechTheme ? 'rounded-none bg-accent/20 border border-accent text-accent uppercase tracking-widest' : `rounded-xl bg-gradient-to-r from-accent to-accent-dim ${theme === 'light' ? 'text-white' : 'text-black'}`}`}
              >
                Volver / Aceptar
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className={`w-full font-bold py-3.5 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 text-sm ${isTechTheme ? 'rounded-none bg-accent/20 border border-accent text-accent uppercase tracking-widest' : `rounded-xl bg-gradient-to-r from-accent to-accent-dim ${theme === 'light' ? 'text-white' : 'text-black'}`}`}
              >
                {loading ? 'Guardando...' : debtToEdit ? 'Guardar Cambios' : 'Crear Deuda'}
              </button>
            )}

            {debtToEdit && (
               <button
                 type="button"
                 onClick={() => setShowConfirmDelete(true)}
                 disabled={loading}
                 className={`w-full font-bold py-3.5 transition-all active:scale-[0.98] disabled:opacity-50 text-sm ${isTechTheme ? 'rounded-none bg-red-500/10 border border-red-500/50 text-red-400 hover:bg-red-500/20 uppercase tracking-wider' : 'rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20'}`}
               >
                 Eliminar Deuda
               </button>
            )}
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
