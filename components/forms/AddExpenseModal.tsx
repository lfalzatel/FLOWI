'use client';
import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '@/components/ThemeProvider';
import { X, LayoutGrid, Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCategories, CategoryOption } from '@/hooks/useCategories';
import { useData } from '@/components/DataProvider';
import { getLocalDateString } from '@/lib/dateUtils';
import { addExpense, updateExpense, deleteExpense, addDebt, Transaction, isFixedExpenseCategory } from '@/lib/firestore';
import {
  DEFAULT_FREQUENT, PAYMENT_METHODS, detectMerchantInText, findCatalogEntry, getFrequent, softHyphenate,
  getMerchantsForCategory, getRecent, recordUsage,
} from '@/lib/categories';
import { ManageCategoriesModal } from '@/components/forms/ManageCategoriesModal';
import { CategoryPickerSheet } from '@/components/forms/CategoryPickerSheet';
import { CategoryIcon } from '@/components/CategoryIcon';
import { ConfirmDialog } from '@/components/layout/ConfirmDialog';
import { triggerPowerAnimation } from '@/components/dashboard/PowerAnimation';

import { ParsedVoiceResult } from '@/lib/voiceParser';

interface AddExpenseModalProps {
  onClose: () => void;
  onSuccess?: () => void;
  transactionToEdit?: Transaction;
  initialType?: 'gasto' | 'ingreso';
  initialVoiceParsed?: ParsedVoiceResult;
}

const QUICK_SLOTS = 7;

function toTimeString(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
const VISIBLE_MERCHANTS = 8;
const VISIBLE_PAYMENTS = 4;

export function AddExpenseModal({ onClose, onSuccess, transactionToEdit, initialType = 'gasto', initialVoiceParsed }: AddExpenseModalProps) {
  const { user } = useAuth();
  const { expenseCategories, incomeCategories } = useCategories();
  const { transactions } = useData();

  const [type, setType] = useState<'gasto' | 'ingreso'>(initialVoiceParsed?.type === 'ingreso' ? 'ingreso' : initialType);
  const [amount, setAmount] = useState(initialVoiceParsed?.amount ? initialVoiceParsed.amount.toString() : '');
  const [description, setDescription] = useState(initialVoiceParsed?.description || '');
  const [category, setCategory] = useState(initialVoiceParsed?.category || '');
  const [merchant, setMerchant] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [isFixed, setIsFixed] = useState(initialVoiceParsed?.isFixed || false);
  const [date, setDate] = useState(getLocalDateString());
  // Hora local "HH:MM"; por defecto la actual y editable para gastos pasados o futuros
  const [time, setTime] = useState(() => toTimeString(new Date()));
  const [loading, setLoading] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [showAllMerchants, setShowAllMerchants] = useState(false);
  const [showAllPayments, setShowAllPayments] = useState(false);
  const [isTypingMerchant, setIsTypingMerchant] = useState(false);
  const [merchantDraft, setMerchantDraft] = useState('');
  // Fuerza a recalcular las listas tras crear o gestionar categorías
  const [usageVersion, setUsageVersion] = useState(0);

  // ConfirmDialog states
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showConfirmConvert, setShowConfirmConvert] = useState(false);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [categoriesInitialView, setCategoriesInitialView] = useState<'list' | 'form'>('list');

  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const typedCategories = type === 'gasto' ? expenseCategories : incomeCategories;
  const usageBucket = `cat-${type}`;

  const getCategoryMeta = (label: string): CategoryOption => {
    return typedCategories.find(c => c.label === label)
      || findCatalogEntry(label)
      || { label, icon: '📝', color: '#6B7280' };
  };

  // Lo que registras en tu historial (últimos 90 días): más usadas y más recientes de este tipo
  const history = useMemo(() => {
    const since = Date.now() - 90 * 86_400_000;
    const counts: Record<string, number> = {};
    const recent: string[] = [];
    transactions.forEach(t => {
      if (t.type !== type || !t.category) return;
      const d = t.date instanceof Date ? t.date : t.date?.toDate?.();
      if (!d || d.getTime() < since) return;
      counts[t.category] = (counts[t.category] || 0) + 1;
      if (!recent.includes(t.category)) recent.push(t.category);
    });
    const frequent = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([label]) => label);
    return { frequent, recent };
  }, [transactions, type]);

  // Las 7 más usadas (historial, luego este dispositivo, luego sugeridas) + la elegida si no está
  const quickCategories = useMemo(() => {
    const available = new Set(typedCategories.map(c => c.label));
    const labels: string[] = [];
    [...history.frequent, ...getFrequent(usageBucket), ...DEFAULT_FREQUENT[type]].forEach(label => {
      if (available.has(label) && !labels.includes(label)) labels.push(label);
    });
    let quick = labels.slice(0, QUICK_SLOTS);
    if (category && !quick.includes(category)) quick = [category, ...quick.slice(0, QUICK_SLOTS - 1)];
    return quick.map(getCategoryMeta);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typedCategories, type, category, history, usageVersion]);

  const recentCategories = useMemo(
    () => Array.from(new Set([...getRecent(usageBucket), ...history.recent])),
    [usageBucket, history, usageVersion]
  );

  const merchantSuggestions = useMemo(() => {
    if (type !== 'gasto' || !category) return [];
    const catalog = getMerchantsForCategory(category).map(m => m.label);
    const used = getFrequent(`merchant-${category}`);
    const labels = Array.from(new Set([...used, ...catalog]));
    if (merchant && !labels.includes(merchant)) labels.unshift(merchant);
    return labels;
  }, [type, category, merchant, usageVersion]);

  const paymentOptions = useMemo(() => {
    const labels = Array.from(new Set([...getFrequent('payment'), ...PAYMENT_METHODS.map(p => p.label)]));
    if (paymentMethod && !labels.slice(0, VISIBLE_PAYMENTS).includes(paymentMethod)) {
      return [paymentMethod, ...labels.filter(l => l !== paymentMethod)];
    }
    return labels;
  }, [paymentMethod, usageVersion]);

  const selectCategory = (label: string, merchantLabel?: string) => {
    if (label !== category) {
      setMerchant(merchantLabel || '');
      setShowAllMerchants(false);
    } else if (merchantLabel) {
      setMerchant(merchantLabel);
    }
    setCategory(label);
    if (type === 'gasto') setIsFixed(isFixedExpenseCategory(label));
  };

  const switchType = (next: 'gasto' | 'ingreso') => {
    if (transactionToEdit || next === type) return;
    setType(next);
    setCategory('');
    setMerchant('');
  };

  const handleDescriptionChange = (value: string) => {
    setDescription(value);
    if (type !== 'gasto' || merchant) return;
    // "Mercado en jumbo" → Mercado · Jumbo
    const detected = detectMerchantInText(value);
    if (!detected) return;
    if (!category) {
      const suggested = detected.categories.find(c => expenseCategories.some(e => e.label === c));
      if (suggested) {
        selectCategory(suggested, detected.label);
      }
    } else if (detected.categories.includes(category)) {
      setMerchant(detected.label);
    }
  };

  const commitMerchantDraft = () => {
    const value = merchantDraft.trim();
    if (value) setMerchant(value);
    setMerchantDraft('');
    setIsTypingMerchant(false);
  };

  useEffect(() => {
    if (transactionToEdit) {
      setType(transactionToEdit.type);
      setAmount(transactionToEdit.amount.toString());
      setDescription(transactionToEdit.description || '');
      setCategory(transactionToEdit.category);
      setMerchant(transactionToEdit.merchant || '');
      setPaymentMethod(transactionToEdit.paymentMethod || '');
      if (transactionToEdit.isFixed !== undefined) {
        setIsFixed(transactionToEdit.isFixed);
      } else {
        setIsFixed(isFixedExpenseCategory(transactionToEdit.category));
      }

      if (transactionToEdit.date) {
        const d = transactionToEdit.date instanceof Date ? transactionToEdit.date : transactionToEdit.date.toDate();
        setDate(getLocalDateString(d));
        setTime(toTimeString(d));
      }
    }
  }, [transactionToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !amount) return;

    setLoading(true);
    try {
      const finalCategory = category.trim() || 'Otros';
      const finalMerchant = type === 'gasto' ? merchant.trim() : '';

      // Fecha y hora elegidas; los segundos se conservan para mantener el orden dentro del mismo minuto
      const [year, month, day] = date.split('-').map(Number);
      const [hours, minutes] = (time || '12:00').split(':').map(Number);
      const originalDate = transactionToEdit?.date instanceof Date ? transactionToEdit.date : transactionToEdit?.date?.toDate();
      const seconds = originalDate ? originalDate.getSeconds() : new Date().getSeconds();
      const finalDate = new Date(year, month - 1, day, hours, minutes, seconds);

      // Al editar se envía null para poder borrar un comercio o medio de pago anterior
      const extras = transactionToEdit
        ? { merchant: finalMerchant || null, paymentMethod: paymentMethod || null }
        : { ...(finalMerchant ? { merchant: finalMerchant } : {}), ...(paymentMethod ? { paymentMethod } : {}) };

      const data = {
        userId: user.uid,
        type,
        amount: parseFloat(amount),
        description,
        category: finalCategory,
        date: finalDate,
        ...extras,
        ...(type === 'gasto' ? { isFixed } : {}),
      };

      recordUsage(usageBucket, finalCategory);
      if (finalMerchant) recordUsage(`merchant-${finalCategory}`, finalMerchant);
      if (paymentMethod) recordUsage('payment', paymentMethod);

      const numericAmount = parseFloat(amount);

      // ⚡ Respuesta optimista inmediata a 0ms
      triggerPowerAnimation(numericAmount, transactionToEdit?.id ? 'edicion' : type);
      onClose();

      if (transactionToEdit?.id) {
        await updateExpense(transactionToEdit.id, data);
      } else {
        await addExpense(data);
      }

      onSuccess?.();
    } catch (error) {
      console.error('Error saving transaction:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!transactionToEdit?.id) return;
    setLoading(true);
    try {
      const deletedAmount = parseFloat(amount) || 0;

      // ⚡ Respuesta optimista inmediata a 0ms para eliminación
      triggerPowerAnimation(deletedAmount, 'eliminacion');
      setShowConfirmDelete(false);
      onClose();

      await deleteExpense(transactionToEdit.id);
      onSuccess?.();
    } catch (error) {
      console.error('Error deleting transaction:', error);
    } finally {
      setLoading(false);
      setShowConfirmDelete(false);
    }
  };

  const handleConvertToDebt = async () => {
    if (!transactionToEdit?.id || !user) return;
    setLoading(true);
    try {
      await addDebt({
        userId: user.uid,
        title: `${category} - ${description || 'Deuda'}`,
        totalAmount: parseFloat(amount),
        paidAmount: 0,
        status: 'pending',
      });
      await deleteExpense(transactionToEdit.id);
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error converting to debt:', error);
    } finally {
      setLoading(false);
      setShowConfirmConvert(false);
    }
  };

  if (typeof document === 'undefined') return null;

  const labelClass = `${isTechTheme ? 'text-accent/70' : 'text-text-muted'} text-xs font-medium`;
  const chipClass = (active: boolean) => `shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border transition-all active:scale-95 ${
    isTechTheme ? 'rounded-none' : 'rounded-full'
  } ${
    active
      ? 'bg-accent/15 border-accent text-accent'
      : 'border-glass-border text-text-secondary hover:text-text-primary hover:bg-glass'
  }`;

  const visibleMerchants = showAllMerchants ? merchantSuggestions : merchantSuggestions.slice(0, VISIBLE_MERCHANTS);
  const visiblePayments = showAllPayments ? paymentOptions : paymentOptions.slice(0, VISIBLE_PAYMENTS);

  return (
    <>
      {createPortal(
        <div className={`fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 ${isTechTheme ? 'font-mono uppercase text-sm' : ''}`}>
          <div className={`absolute inset-0 ${theme === 'light' ? 'bg-black/10' : 'bg-black/40'}`} onClick={onClose} aria-hidden="true" />
          <div
            // dvh = alto visible real en el celular (sin la barra del navegador), para que no se desborde
            className={`w-full max-w-md relative z-10 animate-fade-in-up max-h-[92dvh] sm:max-h-[90vh] flex flex-col overflow-hidden glass-dropdown ${isTechTheme ? 'rounded-none border border-accent/50' : 'rounded-t-3xl sm:rounded-3xl'}`}
            onClick={(e) => e.stopPropagation()}
          >
        <div className={`shrink-0 flex items-center justify-between gap-3 px-5 sm:px-6 pt-5 pb-3 ${isTechTheme ? 'border-b border-accent/20' : ''}`}>
          <h2 className={`${isTechTheme ? 'font-bold text-xl text-accent tracking-wide' : 'font-syne font-bold text-xl text-text-primary'}`}>
            {transactionToEdit ? 'Editar Transacción' : 'Nueva Transacción'}
          </h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className={`p-1 -mr-1 transition-colors ${isTechTheme ? 'text-accent hover:text-accent/70' : 'text-text-secondary hover:text-text-primary'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
          {/* Campos con scroll; el botón de guardar queda fijo abajo */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 sm:px-6 pt-3 pb-5 space-y-5">
          {/* Type Toggle */}
          <div className={`flex p-1 ${isTechTheme ? 'bg-glass backdrop-blur-3xl border border-glass-border shadow-2xl shadow-black/10 rounded-none' : 'bg-glass border border-glass-border rounded-xl'}`}>
            {(['gasto', 'ingreso'] as const).map(option => (
              <button
                key={option}
                type="button"
                onClick={() => switchType(option)}
                className={`flex-1 py-2 text-sm font-bold tracking-wide transition-all ${isTechTheme ? 'rounded-none border border-transparent uppercase' : 'rounded-lg'} ${type === option ? `bg-accent ${isTechTheme ? 'text-deep' : 'text-white'} shadow-md ${isTechTheme ? 'border border-accent' : ''}` : (isTechTheme ? 'text-accent hover:opacity-80' : 'text-text-secondary')} ${transactionToEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={!!transactionToEdit}
              >
                {option === 'gasto' ? 'Gasto' : 'Ingreso'}
              </button>
            ))}
          </div>

          {/* Amount */}
          <div>
            <label htmlFor="tx-amount" className={`${labelClass} mb-1.5 block`}>Monto</label>
            <div className="relative">
              <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold ${isTechTheme ? 'text-accent/70' : 'text-text-secondary'}`}>$</span>
              <input
                id="tx-amount"
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={amount}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                  if (val.split('.').length > 2) return;
                  setAmount(val);
                }}
                className={`w-full bg-glass border py-3 pl-10 pr-4 text-3xl font-bold text-text-primary placeholder-text-muted focus:outline-none ${isTechTheme ? 'border-accent/30 rounded-none focus:border-accent font-mono' : 'border-glass-border rounded-xl focus:border-accent'}`}
                required
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className={labelClass}>Categoría</span>

              {type === 'gasto' && (
                <button
                  type="button"
                  onClick={() => setIsFixed(!isFixed)}
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 transition-all active:scale-95 cursor-pointer ${
                    isFixed
                      ? (isTechTheme ? 'bg-accent/20 border border-accent text-accent font-mono' : 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400')
                      : (isTechTheme ? 'bg-white/5 border border-white/10 text-accent/50 font-mono' : 'bg-white/5 border border-white/10 text-text-muted')
                  }`}
                  title="Cambiar entre Gasto Fijo o Variable"
                >
                  <span>📌 Gasto Fijo:</span>
                  <span className={isFixed ? 'font-black underline' : ''}>{isFixed ? 'Sí' : 'No'}</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {quickCategories.map(cat => {
                const active = cat.label === category;
                return (
                  <button
                    key={cat.label}
                    type="button"
                    onClick={() => selectCategory(cat.label)}
                    aria-pressed={active}
                    className={`flex flex-col items-center gap-1 px-1 py-2 border transition-all active:scale-95 ${isTechTheme ? 'rounded-none' : 'rounded-2xl'} ${
                      active ? 'border-accent bg-accent/10' : 'border-glass-border hover:bg-glass'
                    }`}
                  >
                    <span className={`w-9 h-9 flex items-center justify-center text-lg ${isTechTheme ? 'rounded-none' : 'rounded-xl'}`} style={{ backgroundColor: `${cat.color}22` }}>
                      <CategoryIcon icon={cat.icon} label={cat.label} className="w-5 h-5 flex items-center justify-center" />
                    </span>
                    <span className={`text-[10.5px] leading-tight text-center line-clamp-2 w-full break-words normal-case ${active ? 'text-accent font-semibold' : 'text-text-primary'}`}>
                      {softHyphenate(cat.label)}
                    </span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setIsPickerOpen(true)}
                className={`flex flex-col items-center justify-center gap-1 px-1 py-2 border border-dashed border-glass-border hover:bg-glass transition-all active:scale-95 ${isTechTheme ? 'rounded-none' : 'rounded-2xl'}`}
              >
                <span className="w-9 h-9 flex items-center justify-center text-accent">
                  <LayoutGrid className="w-5 h-5" />
                </span>
                <span className="text-[10.5px] leading-tight text-accent font-semibold normal-case">Ver todas</span>
              </button>
            </div>
          </div>

          {/* Merchant */}
          {type === 'gasto' && category && (
            <div>
              <span className={`${labelClass} mb-2 block`}>¿Dónde? <span className="opacity-70">(opcional)</span></span>
              <div className="flex flex-wrap gap-1.5">
                {visibleMerchants.map(label => {
                  const meta = findCatalogEntry(label);
                  return (
                    <button key={label} type="button" onClick={() => setMerchant(merchant === label ? '' : label)} className={`${chipClass(merchant === label)} normal-case`}>
                      {meta && <CategoryIcon icon={meta.icon} label={label} className="w-4 h-4 text-sm flex items-center justify-center" />}
                      {label}
                    </button>
                  );
                })}
                {merchantSuggestions.length > VISIBLE_MERCHANTS && (
                  <button type="button" onClick={() => setShowAllMerchants(!showAllMerchants)} className={`${chipClass(false)} normal-case`}>
                    {showAllMerchants ? 'Menos' : `+${merchantSuggestions.length - VISIBLE_MERCHANTS} más`}
                  </button>
                )}
                {isTypingMerchant ? (
                  <input
                    autoFocus
                    value={merchantDraft}
                    onChange={(e) => setMerchantDraft(e.target.value)}
                    onBlur={commitMerchantDraft}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitMerchantDraft(); } }}
                    placeholder="Nombre del lugar"
                    className={`px-3 py-1.5 text-xs bg-glass border border-accent text-text-primary focus:outline-none w-36 ${isTechTheme ? 'rounded-none' : 'rounded-full'}`}
                  />
                ) : (
                  <button type="button" onClick={() => setIsTypingMerchant(true)} className={`${chipClass(false)} normal-case border-dashed`}>
                    <Plus className="w-3.5 h-3.5" /> Otro
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Payment method */}
          <div>
            <span className={`${labelClass} mb-2 block`}>
              {type === 'gasto' ? 'Pagaste con' : 'Lo recibiste en'} <span className="opacity-70">(opcional)</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {visiblePayments.map(label => {
                const meta = findCatalogEntry(label);
                return (
                  <button key={label} type="button" onClick={() => setPaymentMethod(paymentMethod === label ? '' : label)} className={`${chipClass(paymentMethod === label)} normal-case`}>
                    {meta && <CategoryIcon icon={meta.icon} label={label} className="w-4 h-4 text-sm flex items-center justify-center" />}
                    {label}
                  </button>
                );
              })}
              <button type="button" onClick={() => setShowAllPayments(!showAllPayments)} className={`${chipClass(false)} normal-case`}>
                {showAllPayments ? 'Menos' : 'Más…'}
              </button>
            </div>
          </div>

          {/* Date + time */}
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <div className="min-w-0">
              <label htmlFor="tx-date" className={`${labelClass} mb-1.5 block`}>Fecha</label>
              <input
                id="tx-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`w-full bg-glass border py-3 px-4 text-text-primary focus:outline-none ${theme === 'dark' || isTechTheme ? '[color-scheme:dark]' : '[color-scheme:light]'} ${isTechTheme ? 'border-accent/30 rounded-none focus:border-accent font-mono text-accent' : 'border-glass-border rounded-xl focus:border-accent'}`}
                required
              />
            </div>
            <div>
              <label htmlFor="tx-time" className={`${labelClass} mb-1.5 block`}>Hora</label>
              <input
                id="tx-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className={`w-[9.75rem] bg-glass border py-3 px-2.5 text-text-primary focus:outline-none ${theme === 'dark' || isTechTheme ? '[color-scheme:dark]' : '[color-scheme:light]'} ${isTechTheme ? 'border-accent/30 rounded-none focus:border-accent font-mono text-accent' : 'border-glass-border rounded-xl focus:border-accent'}`}
                required
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="tx-description" className={`${labelClass} mb-1.5 block`}>Descripción (Opcional)</label>
            <input
              id="tx-description"
              type="text"
              placeholder={type === 'gasto' ? 'Ej. Mercado de la semana en Jumbo' : 'Ej. Quincena de octubre'}
              value={description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              className={`w-full bg-glass border py-3 px-4 text-text-primary placeholder-text-muted focus:outline-none ${isTechTheme ? 'border-accent/30 rounded-none focus:border-accent font-mono' : 'border-glass-border rounded-xl focus:border-accent'}`}
            />
          </div>

          {transactionToEdit && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmDelete(true)}
                disabled={loading}
                className={`flex-1 py-3 font-bold transition-all active:scale-[0.98] disabled:opacity-50 ${isTechTheme ? 'rounded-none bg-red-500/10 border border-red-500/50 text-red-400 hover:bg-red-500/20 uppercase tracking-wider text-xs' : 'rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs'}`}
              >
                Eliminar
              </button>

              {type === 'gasto' && (
                <button
                  type="button"
                  onClick={() => setShowConfirmConvert(true)}
                  disabled={loading}
                  className={`flex-1 py-3 font-bold transition-all active:scale-[0.98] disabled:opacity-50 ${isTechTheme ? 'rounded-none bg-blue-500/10 border border-blue-500/50 text-blue-400 hover:bg-blue-500/20 uppercase tracking-wider text-xs' : 'rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-xs'}`}
                >
                  Pasar a Deuda
                </button>
              )}
            </div>
          )}
          </div>

          {/* Submit siempre visible, con fondo sólido para que no se transparente la barra inferior de la app */}
          <div className={`shrink-0 px-5 sm:px-6 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] border-t ${isTechTheme ? 'bg-deep border-accent/20' : 'bg-card border-glass-border'}`}>
            <button
              type="submit"
              disabled={loading || !amount}
              className={`w-full py-3.5 font-bold transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 ${isTechTheme ? 'rounded-none bg-accent/20 border border-accent text-accent hover:bg-accent/30 uppercase tracking-widest' : `rounded-xl bg-accent text-white hover:bg-accent/90`}`}
            >
              {loading ? 'Guardando...' : transactionToEdit ? 'Guardar Cambios' : (type === 'gasto' ? 'Añadir gasto' : 'Añadir ingreso')}
            </button>
          </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {isPickerOpen && (
        <CategoryPickerSheet
          type={type}
          categories={typedCategories}
          selected={category}
          recent={recentCategories}
          onSelect={(label, merchantLabel) => {
            selectCategory(label, merchantLabel);
            setIsPickerOpen(false);
          }}
          onClose={() => setIsPickerOpen(false)}
          onCreate={() => {
            setIsPickerOpen(false);
            setCategoriesInitialView('form');
            setIsManageCategoriesOpen(true);
          }}
          onManage={() => {
            setIsPickerOpen(false);
            setCategoriesInitialView('list');
            setIsManageCategoriesOpen(true);
          }}
        />
      )}

      {/* Dialogs de confirmación style consola */}
      <ConfirmDialog
        isOpen={showConfirmDelete}
        onCancel={() => setShowConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Eliminar Transacción"
        message="¿Estás seguro de que deseas eliminar esta transacción? Esta acción no se puede deshacer y afectará tu balance."
        confirmText="Eliminar"
      />

      <ConfirmDialog
        isOpen={showConfirmConvert}
        onCancel={() => setShowConfirmConvert(false)}
        onConfirm={handleConvertToDebt}
        title="Pasar a Deuda"
        message="¿Estás seguro de que quieres convertir este gasto en una deuda activa? Se creará una deuda pendiente y se eliminará este gasto."
        confirmText="Convertir"
      />

      {isManageCategoriesOpen && (
        <ManageCategoriesModal
          onClose={() => {
            setIsManageCategoriesOpen(false);
            setUsageVersion(v => v + 1);
          }}
          onCreated={(newLabel) => selectCategory(newLabel)}
          initialView={categoriesInitialView}
        />
      )}
    </>
  );
}
