'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '@/components/ThemeProvider';
import { X, LayoutGrid, Plus, BellPlus, Mic, Camera } from 'lucide-react';
import { getAiKey } from '@/lib/aiAssist';
import { receiptsUsed, showLimit, usePlan } from '@/lib/plans';
import { useAuth } from '@/hooks/useAuth';
import { useCategories, CategoryOption } from '@/hooks/useCategories';
import { useData } from '@/components/DataProvider';
import { getLocalDateString } from '@/lib/dateUtils';
import { addExpense, updateExpense, deleteExpense, addDebt, Transaction, isFixedExpenseCategory } from '@/lib/firestore';
import { isBusinessCategory } from '@/lib/business';
import { suggestTxCategory } from '@/lib/txSuggest';
import {
  DEFAULT_FREQUENT, PAYMENT_METHODS, normalizeText, detectMerchantInText, findCatalogEntry, getFrequent, softHyphenate,
  getMerchantsForCategory, getRecent, recordUsage,
} from '@/lib/categories';
import { ManageCategoriesModal } from '@/components/forms/ManageCategoriesModal';
import { CategoryPickerSheet } from '@/components/forms/CategoryPickerSheet';
import { CategoryIcon } from '@/components/CategoryIcon';
import { useAccounts } from '@/hooks/useAccounts';
import { AccountFormModal } from '@/components/accounts/AccountModals';
import { BankPickerSheet } from '@/components/accounts/BankPickerSheet';
import { AccountKind } from '@/lib/firestore';
import { ConfirmDialog } from '@/components/layout/ConfirmDialog';
import { ReminderFormModal } from '@/components/forms/ReminderFormModal';
import { dateKey } from '@/lib/reminderDue';
import { triggerPowerAnimation } from '@/components/dashboard/PowerAnimation';

import { ParsedVoiceResult } from '@/lib/voiceParser';
import { ReceiptItemsList } from '@/components/forms/ReceiptItemsList';
import { ReceiptItem, itemsSum, itemsCheck, groupByCategory, splitTotal, partDescription, cleanItems } from '@/lib/receiptItems';
import { ItemsByCategory } from '@/components/forms/ReceiptItemsList';
import { suggestItemCategory } from '@/lib/txSuggest';
import { findRepeatedPayment, repeatedPaymentText } from '@/lib/repeatedPayment';
import { ReceiptText, Users } from 'lucide-react';
import { SharedExpenseEditor, SharedDraft, emptySharedDraft, draftAmounts } from '@/components/forms/SharedExpenseEditor';
import { SharedInfo, equalShares, knownPeople, personKey } from '@/lib/shared';
import { formatCurrency, hasCents, roundMoney } from '@/lib/format';
import { AmountKeypad } from '@/components/forms/AmountKeypad';
import { cleanExpr, displayExpr, evalAmount, hasOperator } from '@/lib/amountExpr';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { useT, currentLocale, tr } from '@/lib/i18n';
import { SaleCostsEditor, SaleCostDraft, costLabel } from '@/components/forms/SaleCostsEditor';

interface AddExpenseModalProps {
  onClose: () => void;
  onSuccess?: () => void;
  transactionToEdit?: Transaction;
  initialType?: 'gasto' | 'ingreso';
  initialVoiceParsed?: ParsedVoiceResult;
  initialBusiness?: boolean; // abrir ya marcado como del negocio (desde Mi negocio)
  initialShared?: boolean;   // abrir ya con "Gasto compartido" (desde Cuentas compartidas)
  initialValues?: { amount?: number; description?: string; category?: string; date?: string }; // p. ej. desde un enlace compartido
}

const QUICK_SLOTS = 7;

function toTimeString(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
const VISIBLE_MERCHANTS = 8;
const VISIBLE_PAYMENTS = 4;

export function AddExpenseModal({ onClose, onSuccess, transactionToEdit: editTarget, initialType = 'gasto', initialVoiceParsed, initialBusiness = false, initialShared = false, initialValues }: AddExpenseModalProps) {
  // Desde un informe puede llegar una parte de un recibo (expandByItems): se edita el gasto completo
  const { transactions: allTx } = useData();
  const transactionToEdit = editTarget?._partOf ? allTx.find(t => t.id === editTarget._partOf) || editTarget : editTarget;
  const { user, profile } = useAuth();
  const { canAdd } = usePlan();
  const shotRef = useRef<HTMLInputElement>(null);
  const { expenseCategories, incomeCategories } = useCategories();
  const { transactions } = useData();

  const [type, setType] = useState<'gasto' | 'ingreso'>(initialVoiceParsed?.type === 'ingreso' ? 'ingreso' : initialType);
  const [amount, setAmount] = useState(initialVoiceParsed?.amount ? initialVoiceParsed.amount.toString() : initialValues?.amount ? String(initialValues.amount) : '');
  const [description, setDescription] = useState(initialVoiceParsed?.description || initialValues?.description || '');
  const [category, setCategory] = useState(initialVoiceParsed?.category || initialValues?.category || '');
  // Mi negocio: costos de esta venta (producto, envío…); se guardan como gastos del negocio unidos a la venta
  const [saleCosts, setSaleCosts] = useState<SaleCostDraft[]>([]);
  // Gasto compartido (null = no se compartió)
  const [shared, setShared] = useState<SharedDraft | null>(initialShared ? emptySharedDraft() : null);
  const [merchant, setMerchant] = useState('');
  const [items, setItems] = useState<ReceiptItem[] | undefined>(undefined); // productos de la compra (undefined = sin lista)
  const [autoSum, setAutoSum] = useState(false); // el monto sigue a la suma de los productos
  const [split, setSplit] = useState(false);     // un recibo es una sola compra: no se reparte en varios gastos
  const [paymentMethod, setPaymentMethod] = useState('');
  const [isFixed, setIsFixed] = useState(initialVoiceParsed?.isFixed || false);
  // Modo negocio: se marca solo con categorías de negocio (Venta, Inventario…) y se puede cambiar
  const [isBusiness, setIsBusiness] = useState(() => initialBusiness ||
    (initialVoiceParsed?.category ? isBusinessCategory(initialVoiceParsed.category, initialVoiceParsed.type === 'ingreso' ? 'ingreso' : initialType) : false));
  const [date, setDate] = useState(initialValues?.date || getLocalDateString());
  const [showDate, setShowDate] = useState(false);
  // Registro rápido en el celular: monto (teclado propio) → en qué fue (opcional) → categoría → con qué pagaste.
  // Cada paso lleva la pantalla a lo que toca. "Añadir" aparece al llegar a la forma de pago (ya con categoría),
  // para que no se guarden gastos sin categoría por tocarlo antes de tiempo.
  const [isTouch] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches);
  const prefilled = !!(editTarget || initialVoiceParsed?.amount || initialValues?.amount);
  type Step = 'amount' | 'description' | 'category' | 'payment' | null;
  const [step, setStep] = useState<Step>(() => (isTouch && !prefilled ? 'amount' : null));
  const amountRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);
  const paymentRef = useRef<HTMLDivElement>(null);
  const descRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const againRef = useRef(false);
  const paymentTouched = useRef(!!editTarget);
  // Alto visible real: con el teclado del celular abierto, el formulario se acorta para que "Añadir" no quede debajo
  // Alto del teclado del celular (0 si está cerrado): el formulario se sube esa cantidad
  const [kb, setKb] = useState(0);
  useEffect(() => {
    const v = window.visualViewport;
    if (!v) return;
    // Solo cuenta cuando la parte visible es MÁS PEQUEÑA que la pantalla (teclado abierto); otras diferencias se ignoran
    const on = () => { const k = window.innerHeight - v.height - v.offsetTop; setKb(k > 80 ? Math.round(k) : 0); };
    v.addEventListener('resize', on);
    v.addEventListener('scroll', on);
    return () => { v.removeEventListener('resize', on); v.removeEventListener('scroll', on); };
  }, []);
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
  // Pago fijo que ya se registró este mes (agua, luz, arriendo…): se pregunta antes de guardarlo otra vez
  const [repeatWarn, setRepeatWarn] = useState<string | null>(null);
  const repeatOk = useRef(false);
  const [showConfirmConvert, setShowConfirmConvert] = useState(false);
  const [showReminder, setShowReminder] = useState(false);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [categoriesInitialView, setCategoriesInitialView] = useState<'list' | 'form'>('list');

  const { theme } = useTheme();
  const { t, locale } = useT();
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

  // Cuentas: los medios de pago que tienen cuenta salen primero, y al elegir uno que no tiene
  // cuenta se ofrece crearla (para que el movimiento sume o reste en Cuentas y patrimonio)
  const { accounts } = useAccounts();
  const activeAccounts = accounts.filter(a => !a.archived && a.id);
  const accountMethods = activeAccounts.flatMap(a => a.methods);
  const norm = (x: string) => normalizeText(x);
  const accountOfMethod = paymentMethod ? activeAccounts.find(a => a.methods.some(m => norm(m) === norm(paymentMethod))) : undefined;
  const mainAccount = activeAccounts.find(a => a.isDefault);
  // Un gasto anterior a cuando se creó (o ajustó) la cuenta no mueve su saldo, salvo que la persona lo pida
  const targetAccount = accountOfMethod || mainAccount;
  const [countBeforeChoice, setCountBeforeChoice] = useState<boolean | null>(null);
  const txWhen = (() => { const [y, mo, d] = date.split('-').map(Number); const [h, mi] = (time || '12:00').split(':').map(Number); return new Date(y, mo - 1, d, h, mi); })();
  const beforeBase = !!targetAccount && txWhen.getTime() < new Date(targetAccount.baseAt).getTime();
  const countBefore = countBeforeChoice ?? (transactionToEdit?.countBefore ? transactionToEdit.countBefore === targetAccount?.id : true);
  const [creatingAccount, setCreatingAccount] = useState(false);
  useEffect(() => {
    if (paymentTouched.current || paymentMethod || initialVoiceParsed?.paymentMethod) return;
    const m = mainAccount?.methods?.[0];
    if (m) setPaymentMethod(m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainAccount?.id]);
  const choosePayment = (label: string) => {
    paymentTouched.current = true;
    setPaymentMethod(label);
  };
  const guessKind = (m: string): AccountKind => {
    const k = norm(m);
    if (k === 'efectivo') return 'efectivo';
    if (/tarjeta credito|addi|sistecredito/.test(k)) return 'credito';
    if (/nequi|daviplata|rappipay/.test(k)) return 'billetera';
    return 'banco';
  };

  const paymentOptions = useMemo(() => {
    const labels = Array.from(new Set([...accountMethods, ...getFrequent('payment'), ...PAYMENT_METHODS.map(p => p.label)]));
    if (paymentMethod && !labels.slice(0, VISIBLE_PAYMENTS).includes(paymentMethod)) {
      return [paymentMethod, ...labels.filter(l => l !== paymentMethod)];
    }
    return labels;
  }, [paymentMethod, usageVersion, accountMethods.join('|')]);

  // Productos: si el monto se suma solo, sigue a la suma
  const changeItems = (next: ReceiptItem[]) => {
    setItems(next);
    if (autoSum) { const t = itemsSum(next); setAmount(t ? String(t) : ''); }
  };
  const mixed = type === 'gasto' && !!items && groupByCategory(cleanItems(items), category || 'Otros').length > 1;
  const hideCategory = mixed && split;

  const selectCategory = (label: string, merchantLabel?: string) => {
    if (label !== category) {
      setMerchant(merchantLabel || '');
      setShowAllMerchants(false);
    } else if (merchantLabel) {
      setMerchant(merchantLabel);
    }
    setCategory(label);
    // Los productos que seguían la categoría del gasto se van con ella; los que se cambiaron a mano, no
    if (items?.length) setItems(items.map(it => (!it.category || it.category === category ? { ...it, category: label } : it)));
    if (type === 'gasto') setIsFixed(isFixedExpenseCategory(label));
    setIsBusiness(initialBusiness || isBusinessCategory(label, type));
  };

  const switchType = (next: 'gasto' | 'ingreso') => {
    if (transactionToEdit || next === type) return;
    setType(next);
    setCategory('');
    setMerchant('');
  };

  // Categoría sugerida por lo que se escribe en la descripción ("compré mercancía" → Inventario).
  // Si no se ha elegido categoría (o la eligió la sugerencia) se aplica sola; si la persona ya eligió
  // otra, se ofrece como botón para no cambiarle nada sin querer.
  const autoCategory = useRef('');
  const [suggestedCat, setSuggestedCat] = useState<string | null>(null);
  const suggestFromText = (value: string) => {
    if (transactionToEdit) return;
    const s = suggestTxCategory(value, type, transactions, typedCategories);
    if (!s || s === category) { setSuggestedCat(null); return; }
    if (!category || category === autoCategory.current) {
      autoCategory.current = s;
      selectCategory(s);
      setSuggestedCat(null);
    } else {
      setSuggestedCat(s);
    }
  };

  const handleDescriptionChange = (value: string) => {
    setDescription(value);
    if (type !== 'gasto' || merchant) { suggestFromText(value); return; }
    // "Mercado en jumbo" → Mercado · Jumbo
    const detected = detectMerchantInText(value);
    if (!detected) { suggestFromText(value); return; }
    if (!category || category === autoCategory.current) {
      const byText = suggestTxCategory(value, type, transactions, typedCategories);
      const suggested = (byText && detected.categories.includes(byText) ? byText : null)
        ?? detected.categories.find(c => expenseCategories.some(e => e.label === c));
      if (suggested) autoCategory.current = suggested;
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
      setItems(transactionToEdit.items);
      const sid = transactionToEdit.type === 'ingreso' ? transactionToEdit.saleId : undefined;
      setSaleCosts(sid ? allTx.filter(x => x.type === 'gasto' && x.saleId === sid && x.id)
        .map(x => ({ id: x.id, category: x.category, amount: String(x.amount) })) : []);
      const sh = transactionToEdit.type === 'gasto' ? transactionToEdit.shared : null;
      if (sh) {
        // Si pagaste tú, en Monto va el total; tu parte se calcula
        setAmount(String(sh.paidByMe ? sh.total : transactionToEdit.amount));
        const eq = equalShares(sh.total, sh.people.length);
        const equal = sh.paidByMe && sh.people.every((p, i) => p.amount === eq[i]);
        setShared({ paidByMe: sh.paidByMe, equal, people: sh.people.map(p => ({ name: p.name, amount: String(p.amount), settledAt: p.settledAt ?? null, payments: p.payments, absorbed: p.absorbed })) });
      } else {
        setShared(null);
      }
      setAutoSum(!!transactionToEdit.items?.length && itemsCheck(transactionToEdit.items, transactionToEdit.amount).ok);
      setPaymentMethod(transactionToEdit.paymentMethod || '');
      if (transactionToEdit.isFixed !== undefined) {
        setIsFixed(transactionToEdit.isFixed);
      } else {
        setIsFixed(isFixedExpenseCategory(transactionToEdit.category));
      }
      setIsBusiness(transactionToEdit.business ?? isBusinessCategory(transactionToEdit.category, transactionToEdit.type));

      if (transactionToEdit.date) {
        const d = transactionToEdit.date instanceof Date ? transactionToEdit.date : transactionToEdit.date.toDate();
        setDate(getLocalDateString(d));
        setTime(toTimeString(d));
      }
    }
  }, [transactionToEdit]);

  const fmt = (n: number) => formatCurrency(n, profile?.currency || 'COP');
  const currency = profile?.currency || 'COP';
  const cents = hasCents(currency);
  const amountNum = roundMoney(evalAmount(amount) ?? 0, currency);
  const amountHasOp = hasOperator(amount);
  // El número se achica cuando la cuenta es larga, para que quepa completa
  const amountLen = displayExpr(amount).length;
  const amountSize = amountLen > 26 ? 'text-base' : amountLen > 20 ? 'text-lg' : amountLen > 14 ? 'text-xl' : amountLen > 10 ? 'text-2xl' : 'text-3xl';
  // Si aun así no cabe, se muestra el final (lo último que se escribió)
  useEffect(() => {
    const el = document.getElementById('tx-amount') as HTMLInputElement | null;
    if (el && el.scrollWidth > el.clientWidth) el.scrollLeft = el.scrollWidth;
  }, [amount]);
  // Lleva a la vista la parte del formulario que toca (debajo queda el teclado o la lista)
  const reveal = (el: HTMLElement | null, block: ScrollLogicalPosition = 'start') => {
    // Dos veces: al tocar y cuando ya abrió el teclado del celular (que achica la pantalla)
    setTimeout(() => el?.scrollIntoView({ block }), 60);
    setTimeout(() => el?.scrollIntoView({ block }), 400);
  };
  const goStep = (next: Step) => {
    setStep(next);
    if (next === 'amount') reveal(amountRef.current, 'nearest');
    if (next === 'category') reveal(categoryRef.current);
    if (next === 'payment') { (document.activeElement as HTMLElement | null)?.blur?.(); reveal(paymentRef.current, 'end'); }
  };
  // Después del monto: "¿En qué fue?" arriba con el teclado abierto (el foco va dentro del mismo toque).
  // Debajo quedan las categorías: escribir es opcional, se puede tocar una categoría de una vez.
  const afterAmount = () => {
    setStep('description');
    descRef.current?.focus({ preventScroll: true });
    reveal(descRef.current?.parentElement || null, 'start');
  };
  // Elegir categoría dentro del registro rápido: se cierra el teclado y pasa a la forma de pago
  const afterCategory = () => { if (step && step !== 'payment') goStep('payment'); };
  const inFlow = step !== null;
  // Pasado el monto, el pie siempre está: con categoría (elegida o sugerida al escribir) se guarda de una vez;
  // sin categoría, "Añadir" espera y se ofrece "Guardar sin categoría" (queda en Otros) para quien no quiere categorizar
  const showFooter = !inFlow || step !== 'amount';
  const needsCategory = !transactionToEdit && !hideCategory && !category.trim();
  const noCategoryOk = useRef(false);
  const peopleNames = useMemo(() => knownPeople(transactions), [transactions]);
  // Lo que se guarda del compartido (solo personas con nombre) y tu parte
  const { sharedInfo, sharedMine } = useMemo((): { sharedInfo: SharedInfo | null; sharedMine: number } => {
    const total = amountNum;
    if (type !== 'gasto' || !shared || !total) return { sharedInfo: null, sharedMine: total };
    const amounts = draftAmounts(shared, total, cents);
    const people = shared.people
      .map((p, i) => ({ name: p.name.trim(), amount: amounts[i] || 0, settledAt: p.settledAt ?? null, ...(p.payments?.length ? { payments: p.payments } : {}), ...(p.absorbed ? { absorbed: p.absorbed } : {}) }))
      .filter(p => p.name && personKey(p.name));
    if (!people.length) return { sharedInfo: null, sharedMine: total };
    if (!shared.paidByMe) {
      return { sharedInfo: { total, paidByMe: false, people: [{ ...people[0], amount: total }] }, sharedMine: total };
    }
    // Lo que alguien nunca pagó y asumiste sigue siendo parte de tu gasto
    const others = people.reduce((s, p) => s + p.amount - (p.absorbed || 0), 0);
    return { sharedInfo: { total, paidByMe: true, people }, sharedMine: roundMoney(total - others, currency) };
  }, [type, shared, amountNum, cents, currency]);

  const resetForNext = () => {
    setAmount(''); setDescription(''); setCategory(''); setMerchant(''); setItems(undefined); setAutoSum(false);
    setShared(null); setSuggestedCat(null); setIsFixed(false); setIsBusiness(initialBusiness);
    autoCategory.current = '';
    noCategoryOk.current = false;
    setSaleCosts([]);
    if (date === getLocalDateString()) setTime(toTimeString(new Date()));
    setStep(isTouch ? 'amount' : null);
    scrollRef.current?.scrollTo({ top: 0 });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !(amountNum > 0)) return;
    if (needsCategory && !noCategoryOk.current) return;
    // "Guardar y otro" se recuerda si antes sale el aviso de pago repetido
    if (!transactionToEdit && !repeatOk.current) {
      const prev = findRepeatedPayment({ type, category: category.trim() || 'Otros', merchant, date: new Date(`${date}T12:00:00`), isFixed }, transactions);
      if (prev) { setRepeatWarn(repeatedPaymentText(prev)); return; }
    }
    repeatOk.current = false;
    const again = againRef.current;
    againRef.current = false;
    if (sharedInfo && sharedMine < 0) return;

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
        amount: sharedInfo ? sharedMine : amountNum,
        description,
        category: finalCategory,
        date: finalDate,
        ...extras,
        ...(type === 'gasto' ? { isFixed } : {}),
        business: isBusiness,
        ...(beforeBase && countBefore && targetAccount?.id ? { countBefore: targetAccount.id } : transactionToEdit?.countBefore ? { countBefore: null } : {}),
        // Al editar se envía null para quitar un compartido anterior
        ...(sharedInfo ? { shared: sharedInfo } : transactionToEdit?.shared ? { shared: null } : {}),
      };

      recordUsage(usageBucket, finalCategory);
      if (finalMerchant) recordUsage(`merchant-${finalCategory}`, finalMerchant);
      if (paymentMethod) recordUsage('payment', paymentMethod);

      const numericAmount = data.amount;

      // ⚡ Respuesta optimista inmediata a 0ms
      triggerPowerAnimation(numericAmount, transactionToEdit?.id ? 'edicion' : type);
      if (again) resetForNext(); else onClose();

      const saved = type === 'gasto' && items ? cleanItems(items) : [];
      const groups = saved.length ? groupByCategory(saved, finalCategory) : [];
      if (groups.length > 1 && split && !sharedInfo) {
        // Compra repartida: un gasto por categoría, con sus productos, que juntos suman lo pagado
        const amounts = splitTotal(groups, numericAmount);
        const receiptId = transactionToEdit?.receiptId || `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
        const parts = groups.map((g, i) => ({
          ...data,
          amount: amounts[i],
          category: g.category,
          description: partDescription(description.trim() || finalMerchant || 'Compra', g),
          date: new Date(finalDate.getTime() + i * 1000),
          isFixed: isFixedExpenseCategory(g.category),
          business: isBusinessCategory(g.category, 'gasto'),
          items: g.items,
          receiptId,
        }));
        if (transactionToEdit?.id) {
          await updateExpense(transactionToEdit.id, parts[0]);
          for (const p of parts.slice(1)) await addExpense(p);
        } else {
          for (const p of parts) await addExpense(p);
        }
      } else {
        // Venta del negocio con costos: todos llevan el mismo saleId
        const parseCost = (v: string) => Number(v.replace(/\./g, '').replace(',', '.')) || 0;
        const costRows = type === 'ingreso' && isBusiness ? saleCosts.filter(c => parseCost(c.amount) > 0) : [];
        const prevCostIds = type === 'ingreso' && transactionToEdit?.saleId
          ? transactions.filter(x => x.type === 'gasto' && x.saleId === transactionToEdit.saleId && x.id).map(x => x.id!) : [];
        const saleId = costRows.length || prevCostIds.length
          ? transactionToEdit?.saleId || `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}` : undefined;
        const withSale = saleId ? { saleId } : {};
        if (transactionToEdit?.id) {
          await updateExpense(transactionToEdit.id, { ...data, ...withSale, ...(items ? { items: saved } : {}) });
        } else {
          await addExpense({ ...data, ...withSale, ...(saved.length ? { items: saved } : {}) });
        }
        if (saleId) {
          const what = description.trim() || finalCategory;
          for (const c of costRows) {
            const cost = {
              userId: user.uid, type: 'gasto' as const, amount: parseCost(c.amount), category: c.category,
              description: `${costLabel(c.category)} · ${what}`, date: finalDate, business: true, isFixed: false, saleId,
              ...(paymentMethod ? { paymentMethod } : {}),
            };
            if (c.id) await updateExpense(c.id, cost); else await addExpense(cost);
          }
          // Costos que se quitaron de la venta
          for (const id of prevCostIds) if (!costRows.some(c => c.id === id)) await deleteExpense(id);
        }
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
      const deletedAmount = amountNum;

      // ⚡ Respuesta optimista inmediata a 0ms para eliminación
      triggerPowerAnimation(deletedAmount, 'eliminacion');
      setShowConfirmDelete(false);
      onClose();

      await deleteExpense(transactionToEdit.id);
      if (transactionToEdit.type === 'ingreso' && transactionToEdit.saleId) {
        for (const x of transactions) if (x.type === 'gasto' && x.saleId === transactionToEdit.saleId && x.id) await deleteExpense(x.id);
      }
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
        totalAmount: amountNum,
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
  const visiblePayments = paymentOptions.slice(0, VISIBLE_PAYMENTS);

  return (
    <>
      {createPortal(
        <div className={`fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 ${isTechTheme ? 'font-mono uppercase text-sm' : ''}`}
             style={kb ? { bottom: kb } : undefined}>
          <div className={`absolute inset-0 ${theme === 'light' ? 'bg-black/10' : 'bg-black/40'}`} onClick={onClose} aria-hidden="true" />
          <div
            // dvh = alto visible real en el celular (sin la barra del navegador), para que no se desborde
            className={`w-full max-w-md relative z-10 animate-fade-in-up max-h-[min(92dvh,100%)] sm:max-h-[90vh] flex flex-col overflow-hidden glass-dropdown ${isTechTheme ? 'rounded-none border border-accent/50' : 'rounded-t-3xl sm:rounded-3xl'}`}
            onClick={(e) => e.stopPropagation()}
          >
        <div className={`shrink-0 flex items-center justify-between gap-3 px-5 sm:px-6 pt-5 pb-3 ${isTechTheme ? 'border-b border-accent/20' : ''}`}>
          <h2 className={`${isTechTheme ? 'font-bold text-xl text-accent tracking-wide' : 'font-syne font-bold text-xl text-text-primary'}`}>
            {transactionToEdit ? t('Editar Transacción') : t('Nueva Transacción')}
          </h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className={`p-1 -mr-1 transition-colors ${isTechTheme ? 'text-accent hover:text-accent/70' : 'text-text-secondary hover:text-text-primary'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} autoComplete="off" className="flex-1 min-h-0 flex flex-col">
          {/* Campos con scroll; el botón de guardar queda fijo abajo */}
          {/* En el registro guiado sobra espacio abajo, para que el paso que toca pueda quedar arriba de todo */}
          <div ref={scrollRef} className={`flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 sm:px-6 pt-3 space-y-4 pb-5`}>
          {/* Una sola fila: Gasto/Ingreso y, al lado, los atajos de voz y foto (recibo, comprobante de Nequi o del banco) */}
          <div className="flex gap-2 items-stretch">
            <div className={`flex-1 flex p-1 ${isTechTheme ? 'bg-glass backdrop-blur-3xl border border-glass-border shadow-2xl shadow-black/10 rounded-none' : 'bg-glass border border-glass-border rounded-xl'}`}>
              {(['gasto', 'ingreso'] as const).map(option => (
                <button
                  key={option}
                  type="button"
                  onClick={() => switchType(option)}
                  className={`flex-1 py-1.5 text-sm font-bold tracking-wide transition-all ${isTechTheme ? 'rounded-none border border-transparent uppercase' : 'rounded-lg'} ${type === option ? `bg-accent ${isTechTheme ? 'text-deep' : 'text-white'} shadow-md ${isTechTheme ? 'border border-accent' : ''}` : (isTechTheme ? 'text-accent hover:opacity-80' : 'text-text-secondary')} ${transactionToEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={!!transactionToEdit}
                >
                  {option === 'gasto' ? t('Gasto') : t('Ingreso')}
                </button>
              ))}
            </div>
            {!transactionToEdit && !initialVoiceParsed && (
              <>
                <button type="button" aria-label={t('Dictar')} title={t('Dictar')}
                        onClick={() => { onClose(); window.dispatchEvent(new CustomEvent('flowi-open-voice')); }}
                        className={`w-12 shrink-0 flex flex-col items-center justify-center gap-0.5 border transition-colors ${isTechTheme ? 'rounded-none border-accent/40 text-accent' : 'rounded-xl border-accent/30 text-accent bg-accent/5 hover:bg-accent/10'}`}>
                  <Mic className="w-4 h-4" /><span className="text-[9px] font-semibold normal-case leading-none">{t('Voz')}</span>
                </button>
                <button type="button" aria-label={t('Foto o pantallazo')} title={t('Foto o pantallazo')}
                        onClick={() => {
                          if (!canAdd('receipts', receiptsUsed(profile))) { onClose(); showLimit('receipts'); return; }
                          // El selector se abre dentro del mismo toque, para que el celular lo permita
                          if (getAiKey()) shotRef.current?.click();
                          else { onClose(); window.dispatchEvent(new CustomEvent('flowi-open-voice', { detail: { file: 'no-key' } })); }
                        }}
                        className={`w-12 shrink-0 flex flex-col items-center justify-center gap-0.5 border transition-colors ${isTechTheme ? 'rounded-none border-accent/40 text-accent' : 'rounded-xl border-accent/30 text-accent bg-accent/5 hover:bg-accent/10'}`}>
                  <Camera className="w-4 h-4" /><span className="text-[9px] font-semibold normal-case leading-none">{t('Foto')}</span>
                </button>
                <input ref={shotRef} type="file" accept="image/*" className="hidden"
                       onChange={async (e) => {
                         const f = e.target.files?.[0];
                         if (!f) return;
                         let copy: File = f;
                         try { copy = new File([await f.arrayBuffer()], f.name || 'recibo.jpg', { type: f.type || 'image/jpeg' }); } catch { /* se usa la original */ }
                         e.target.value = '';
                         onClose();
                         window.dispatchEvent(new CustomEvent('flowi-open-voice', { detail: { file: copy } }));
                       }} />
              </>
            )}
          </div>

          {/* Fecha y hora: una línea arriba; se resalta si no es hoy para que no se guarde en otro día sin querer */}
          {(() => {
            const isToday = date === getLocalDateString();
            const yesterday = getLocalDateString(new Date(Date.now() - 86_400_000));
            const [yy, mm, dd] = date.split('-').map(Number);
            const [hh, mi] = (time || '12:00').split(':').map(Number);
            const when = new Date(yy, mm - 1, dd, hh, mi);
            const full = when.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).replace(',', '');
            const dayText = isToday ? `${t('Hoy')}, ${full}` : date === yesterday ? `${t('Ayer')}, ${full}` : full;
            const timeText = when.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', hour12: true });
            const odd = !isToday && !transactionToEdit;
            return (
              <div className="space-y-2 -mt-2">
                <button type="button" onClick={() => setShowDate(v => !v)} aria-expanded={showDate}
                        className={`max-w-full flex items-center gap-2 whitespace-nowrap text-xs font-semibold normal-case px-3 py-1.5 border ${isTechTheme ? 'rounded-none' : 'rounded-full'} ${odd ? 'border-amber-400/60 bg-amber-400/10 text-amber-300' : 'border-glass-border text-text-secondary'}`}>
                  <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{dayText} · {timeText}</span>
                  <ChevronDown className={`w-3.5 h-3.5 shrink-0 opacity-60 transition-transform ${showDate ? 'rotate-180' : ''}`} />
                </button>
                {showDate && (
                  <div className="space-y-2">
                    <div className="flex gap-1.5">
                      {[{ l: t('Hoy'), d: getLocalDateString() }, { l: t('Ayer'), d: yesterday }].map(o => (
                        <button key={o.l} type="button" onClick={() => { setDate(o.d); setShowDate(false); }} className={`${chipClass(date === o.d)} normal-case`}>{o.l}</button>
                      ))}
                    </div>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                      <input autoComplete="off" id="tx-date" type="date" aria-label="Fecha" value={date} onChange={(e) => { setDate(e.target.value); if (e.target.value) setShowDate(false); }} required
                             className={`w-full bg-glass border py-2.5 px-3 text-text-primary focus:outline-none ${theme === 'dark' || isTechTheme ? '[color-scheme:dark]' : '[color-scheme:light]'} ${isTechTheme ? 'border-accent/30 rounded-none focus:border-accent font-mono text-accent' : 'border-glass-border rounded-xl focus:border-accent'}`} />
                      <input autoComplete="off" id="tx-time" type="time" aria-label="Hora" value={time} onChange={(e) => setTime(e.target.value)} onBlur={() => setShowDate(false)} required
                             className={`w-[8.5rem] bg-glass border py-2.5 px-2.5 text-text-primary focus:outline-none ${theme === 'dark' || isTechTheme ? '[color-scheme:dark]' : '[color-scheme:light]'} ${isTechTheme ? 'border-accent/30 rounded-none focus:border-accent font-mono text-accent' : 'border-glass-border rounded-xl focus:border-accent'}`} />
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Amount */}
          <div ref={amountRef}>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <label htmlFor="tx-amount" className={labelClass}>{shared ? (shared.paidByMe ? t('Total que pagaste') : t('Tu parte')) : t('Monto')}</label>
              {amountHasOp && (
                <span className="text-base font-bold text-accent normal-case tabular-nums">= {evalAmount(amount) !== null ? fmt(evalAmount(amount)!) : '…'}</span>
              )}
            </div>
            <div className="relative">
              <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold ${isTechTheme ? 'text-accent/70' : 'text-text-secondary'}`}>$</span>
              <input
                id="tx-amount"
                type="text"
                // En el celular se usa el teclado de FLOWI (con + − × ÷); en el computador se escribe normal
                inputMode={isTouch ? 'none' : 'decimal'}
                readOnly={isTouch}
                autoComplete="off"
                placeholder="0"
                value={isTouch ? displayExpr(amount) : amount}
                onFocus={() => { if (isTouch) setStep('amount'); }}
                onClick={() => { if (isTouch) goStep('amount'); }}
                onChange={(e) => {
                  if (isTouch) return;
                  setAmount(cleanExpr(e.target.value));
                  if (items?.length) setAutoSum(false); // escrito a mano: ya no se suma solo
                }}
                onBlur={() => { if (!isTouch && amountHasOp && evalAmount(amount) !== null) setAmount(String(evalAmount(amount))); }}
                className={`w-full bg-glass border py-2.5 pl-10 pr-4 font-bold ${amountSize} text-text-primary placeholder-text-muted focus:outline-none ${step === 'amount' ? 'border-accent' : ''} ${isTechTheme ? 'border-accent/30 rounded-none focus:border-accent font-mono' : 'border-glass-border rounded-xl focus:border-accent'}`}
              />
            </div>

          </div>

          {/* Descripción: va debajo del monto para sugerir la categoría mientras se escribe */}
          <div>
            <label htmlFor="tx-description" className={`${labelClass} mb-1.5 block`}>{t('¿En qué fue? (opcional)')}</label>
            <input
              id="tx-description"
              ref={descRef}
              autoComplete="off"
              enterKeyHint="done"
              onFocus={() => { if (step === 'amount' || step === 'category') setStep('description'); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (inFlow) { descRef.current?.blur(); goStep(category ? 'payment' : 'category'); } } }}
              type="text"
              placeholder={type === 'gasto' ? t('Ej. Mercado en Jumbo, compré mercancía…') : t('Ej. Quincena, venta de 2 blusas…')}
              value={description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              className={`w-full bg-glass border py-3 px-4 text-text-primary placeholder-text-muted focus:outline-none ${isTechTheme ? 'border-accent/30 rounded-none focus:border-accent font-mono' : 'border-glass-border rounded-xl focus:border-accent'}`}
            />
            {suggestedCat && (
              <button type="button" onClick={() => { autoCategory.current = suggestedCat; selectCategory(suggestedCat); setSuggestedCat(null); }}
                      className={`mt-2 text-[11px] font-semibold px-2.5 py-1 border border-accent/40 bg-accent/10 text-accent transition-all active:scale-95 ${isTechTheme ? 'rounded-none font-mono' : 'rounded-full'}`}>
                💡 {t('¿Es «{cat}»? Toca para usarla', { cat: tr(suggestedCat) })}
              </button>
            )}
            {type === 'gasto' && (items ? (
              <div className="mt-2 space-y-2">
                <ReceiptItemsList items={items} total={amountNum} isTech={isTechTheme} defaultOpen={!items.length}
                                  autoSum={autoSum}
                                  categories={typedCategories} recent={recentCategories} fallbackCategory={category || 'Otros'}
                                  suggest={(n) => suggestItemCategory(n, transactions, typedCategories)}
                                  onChange={changeItems}
                                  onUseSum={(s) => { setAmount(String(s)); setAutoSum(true); }}
                                  onAddToTotal={(v) => setAmount(String(amountNum + v))} />
                {mixed && (
                  <ItemsByCategory items={cleanItems(items)} total={amountNum} fallbackCategory={category || 'Otros'} isTech={isTechTheme}
                                   categories={typedCategories} split={split} onSplit={setSplit}
                                   amounts={splitTotal(groupByCategory(cleanItems(items), category || 'Otros'), amountNum)} />
                )}
              </div>
            ) : (
              <button type="button" onClick={() => { setItems([]); setAutoSum(!amountNum); }}
                      className={`mt-2 flex items-center gap-1.5 text-xs font-semibold text-accent ${isTechTheme ? 'font-mono' : ''}`}>
                <ReceiptText className="w-4 h-4" /> {t('Agregar productos (opcional)')}
              </button>
            ))}
            {type === 'gasto' && (shared ? (
              <div className="mt-2">
                <SharedExpenseEditor draft={shared} total={amountNum} knownNames={peopleNames} isTech={isTechTheme}
                                     fmt={fmt} cents={cents} onChange={setShared} onRemove={() => setShared(null)} />
              </div>
            ) : (
              <button type="button" onClick={() => setShared(emptySharedDraft())}
                      className={`mt-2 flex items-center gap-1.5 text-xs font-semibold text-accent ${isTechTheme ? 'font-mono' : ''}`}>
                <Users className="w-4 h-4" /> {t('Compartir este gasto (opcional)')}
              </button>
            ))}
            {type === 'ingreso' && isBusiness && (
              <div className="mt-2">
                <SaleCostsEditor costs={saleCosts} saleAmount={amountNum} isTech={isTechTheme} fmt={fmt} onChange={setSaleCosts} />
              </div>
            )}
          </div>

          {/* Category: con productos de varias categorías la reemplaza el resumen "De esta compra" */}
          {!hideCategory && <div ref={categoryRef} className={`scroll-mt-2 ${step === 'category' ? 'outline outline-1 outline-accent/60 outline-offset-4' : ''}`}>
            <div className="flex items-center justify-between mb-2 gap-2">
              <span className={labelClass}>{t('Categoría')}{(step === 'category' || step === 'description') && <span className="ml-1 text-accent normal-case">· {t('elige una')}</span>}</span>

              <div className="flex items-center gap-1.5 flex-wrap justify-end">
              <button
                type="button"
                onClick={() => setIsBusiness(!isBusiness)}
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 transition-all active:scale-95 cursor-pointer ${
                  isBusiness
                    ? (isTechTheme ? 'bg-orange-500/20 border border-orange-400 text-orange-300 font-mono' : 'bg-orange-500/20 border border-orange-500/40 text-orange-400')
                    : (isTechTheme ? 'bg-white/5 border border-white/10 text-accent/50 font-mono' : 'bg-white/5 border border-white/10 text-text-muted')
                }`}
                title="Separar este movimiento como de tu negocio (Mi negocio en Servicios)"
              >
                <span>🏪 {t('Negocio')}:</span>
                <span className={isBusiness ? 'font-black underline' : ''}>{isBusiness ? t('Sí') : t('No')}</span>
              </button>

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
                  <span>📌 {t('Gasto Fijo')}:</span>
                  <span className={isFixed ? 'font-black underline' : ''}>{isFixed ? t('Sí') : t('No')}</span>
                </button>
              )}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {quickCategories.map(cat => {
                const active = cat.label === category;
                return (
                  <button
                    key={cat.label}
                    type="button"
                    onClick={() => { selectCategory(cat.label); afterCategory(); }}
                    aria-pressed={active}
                    className={`flex flex-col items-center gap-1 px-1 py-2 border transition-all active:scale-95 ${isTechTheme ? 'rounded-none' : 'rounded-2xl'} ${
                      active ? 'border-accent bg-accent/10' : 'border-glass-border hover:bg-glass'
                    }`}
                  >
                    <span className={`w-9 h-9 flex items-center justify-center text-lg ${isTechTheme ? 'rounded-none' : 'rounded-xl'}`} style={{ backgroundColor: `${cat.color}22` }}>
                      <CategoryIcon icon={cat.icon} label={cat.label} className="w-5 h-5 flex items-center justify-center" />
                    </span>
                    <span className={`text-[10.5px] leading-tight text-center line-clamp-2 w-full break-words normal-case ${active ? 'text-accent font-semibold' : 'text-text-primary'}`}>
                      {softHyphenate(tr(cat.label))}
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
                <span className="text-[10.5px] leading-tight text-accent font-semibold normal-case">{t('Ver todas')}</span>
              </button>
            </div>
          </div>}

          {/* Merchant */}
          {type === 'gasto' && category && !hideCategory && (
            <div>
              <span className={`${labelClass} mb-2 block`}>{t('¿Dónde?')} <span className="opacity-70">{t('(opcional)')}</span></span>
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
                    {showAllMerchants ? t('Menos') : t('+{n} más', { n: merchantSuggestions.length - VISIBLE_MERCHANTS })}
                  </button>
                )}
                {isTypingMerchant ? (
                  <input autoComplete="off"
                    autoFocus
                    value={merchantDraft}
                    onChange={(e) => setMerchantDraft(e.target.value)}
                    onBlur={commitMerchantDraft}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitMerchantDraft(); } }}
                    placeholder={t('Nombre del lugar')}
                    className={`px-3 py-1.5 text-xs bg-glass border border-accent text-text-primary focus:outline-none w-36 ${isTechTheme ? 'rounded-none' : 'rounded-full'}`}
                  />
                ) : (
                  <button type="button" onClick={() => setIsTypingMerchant(true)} className={`${chipClass(false)} normal-case border-dashed`}>
                    <Plus className="w-3.5 h-3.5" /> {t('Otro')}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Payment method */}
          <div ref={paymentRef} className={`scroll-mt-2 ${step === 'payment' ? 'outline outline-1 outline-accent/60 outline-offset-4' : ''}`}>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className={labelClass}>
                {type === 'gasto' ? t('Pagaste con') : t('Lo recibiste en')} <span className="opacity-70">{t('(opcional)')}</span>
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {visiblePayments.map(label => {
                const meta = findCatalogEntry(label);
                return (
                  <button key={label} type="button" onClick={() => choosePayment(paymentMethod === label ? '' : label)} className={`${chipClass(paymentMethod === label)} normal-case`}>
                    {meta && <CategoryIcon icon={meta.icon} label={label} className="w-4 h-4 text-sm flex items-center justify-center" />}
                    {label}
                  </button>
                );
              })}
              <button type="button" onClick={() => setShowAllPayments(true)} className={`${chipClass(false)} normal-case`}>
                {t('Más…')}
              </button>
              {showAllPayments && (
                <BankPickerSheet title={type === 'gasto' ? t('¿Con qué pagaste?') : t('¿Dónde lo recibiste?')}
                                 selected={paymentMethod ? [paymentMethod] : []} favorites={accountMethods}
                                 onChange={(v) => choosePayment(v[0] || '')} onClose={() => setShowAllPayments(false)} />
              )}
            </div>
            {activeAccounts.length > 0 && (
              paymentMethod && !accountOfMethod ? (
                <div className="mt-2 flex items-center gap-2 text-[11px] text-text-secondary normal-case">
                  <span className="flex-1">{t('Aún no tienes una cuenta para {m}', { m: paymentMethod })}{mainAccount ? t('; iría a {a}', { a: mainAccount.name }) : ''}.</span>
                  <button type="button" onClick={() => setCreatingAccount(true)} className="shrink-0 font-semibold text-accent">{t('Crear cuenta')}</button>
                </div>
              ) : (accountOfMethod || mainAccount) ? (
                <p className="mt-2 text-[11px] text-text-muted normal-case">
                  {type === 'gasto' ? t('Se descuenta de') : t('Se suma a')} <b className="text-text-secondary">{(accountOfMethod || mainAccount)!.name}</b>
                  {!paymentMethod ? ` ${t('(tu cuenta principal)')}` : ''}.
                  {beforeBase && (
                    <label className="mt-1.5 flex items-start gap-2 cursor-pointer text-text-secondary">
                      <input type="checkbox" checked={countBefore} onChange={(e) => setCountBeforeChoice(e.target.checked)} className="mt-0.5 w-4 h-4 shrink-0 accent-[var(--accent)]" />
                      <span>{t('Es de antes de que creaste o ajustaste {a}. Contarlo en su saldo (desmárcalo si el saldo que escribiste ya lo incluía).', { a: targetAccount!.name })}</span>
                    </label>
                  )}
                </p>
              ) : null
            )}
            {creatingAccount && paymentMethod && (
              <AccountFormModal
                accounts={accounts}
                initial={{ name: paymentMethod, kind: guessKind(paymentMethod), methods: [paymentMethod] }}
                onClose={() => setCreatingAccount(false)}
              />
            )}
          </div>

          {transactionToEdit && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmDelete(true)}
                disabled={loading}
                className={`flex-1 py-3 font-bold transition-all active:scale-[0.98] disabled:opacity-50 ${isTechTheme ? 'rounded-none bg-red-500/10 border border-red-500/50 text-red-400 hover:bg-red-500/20 uppercase tracking-wider text-xs' : 'rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs'}`}
              >
                {t('Eliminar')}
              </button>

              {type === 'gasto' && (
                <button
                  type="button"
                  onClick={() => setShowConfirmConvert(true)}
                  disabled={loading}
                  className={`flex-1 py-3 font-bold transition-all active:scale-[0.98] disabled:opacity-50 ${isTechTheme ? 'rounded-none bg-blue-500/10 border border-blue-500/50 text-blue-400 hover:bg-blue-500/20 uppercase tracking-wider text-xs' : 'rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-xs'}`}
                >
                  {t('Pasar a Deuda')}
                </button>
              )}
            </div>
          )}

          {transactionToEdit && type === 'gasto' && (
            <button
              type="button"
              onClick={() => setShowReminder(true)}
              disabled={loading}
              className={`w-full flex items-center justify-center gap-2 py-3 font-bold transition-all active:scale-[0.98] disabled:opacity-50 ${isTechTheme ? 'rounded-none bg-accent/10 border border-accent/50 text-accent hover:bg-accent/20 uppercase tracking-wider text-xs' : 'rounded-xl bg-accent/10 text-accent hover:bg-accent/20 text-xs'}`}
            >
              <BellPlus className="w-4 h-4" /> {t('Recordarme este pago')}
            </button>
          )}
          {/* Espacio para que el paso que toca pueda subir hasta arriba (dentro del scroll: no estira el formulario) */}
          {inFlow && step !== 'payment' && <div aria-hidden="true" className="h-[60vh] !mt-0" />}
          </div>

          {/* Submit siempre visible, con fondo sólido para que no se transparente la barra inferior de la app */}
          {showFooter && <div className={`shrink-0 px-5 sm:px-6 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] border-t ${isTechTheme ? 'bg-deep border-accent/20' : 'bg-card border-glass-border'}`}>
            {needsCategory && (
              <div className="mb-2 flex items-center justify-between gap-2 text-[11px] normal-case">
                <span className="text-amber-300">{t('Elige una categoría arriba o escribe en qué fue.')}</span>
                <button type="submit" disabled={loading || !(amountNum > 0)}
                        onClick={() => { noCategoryOk.current = true; }}
                        className="shrink-0 font-semibold text-text-secondary underline disabled:opacity-50">
                  {t('Guardar sin categoría')}
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading || !(amountNum > 0) || needsCategory || (!!sharedInfo && sharedMine < 0)}
                className={`flex-1 py-3.5 font-bold transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 ${isTechTheme ? 'rounded-none bg-accent/20 border border-accent text-accent hover:bg-accent/30 uppercase tracking-widest' : `rounded-xl bg-accent text-white hover:bg-accent/90`}`}
              >
                {loading ? t('Guardando...') : transactionToEdit ? t('Guardar Cambios') : (type === 'gasto' ? t('Añadir gasto') : t('Añadir ingreso'))}
              </button>
              {!transactionToEdit && (
                // Guarda y deja el formulario listo para el siguiente (mismo tipo, fecha y forma de pago)
                <button type="submit" onClick={() => { againRef.current = true; }}
                        disabled={loading || !(amountNum > 0) || needsCategory || (!!sharedInfo && sharedMine < 0)}
                        className={`shrink-0 px-3 py-3.5 text-xs font-bold border transition-all active:scale-[0.98] disabled:opacity-50 ${isTechTheme ? 'rounded-none border-accent/50 text-accent uppercase' : 'rounded-xl border-accent/40 text-accent'}`}>
                  {t('Guardar y otro')}
                </button>
              )}
            </div>
          </div>}
          {step === 'amount' && (
            <AmountKeypad value={amount} isTech={isTechTheme} decimals={cents} nextLabel={t('Siguiente')}
                          onChange={(v) => { setAmount(v); if (items?.length) setAutoSum(false); }}
                          onNext={afterAmount} />
          )}
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
            afterCategory();
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

      <ConfirmDialog
        isOpen={!!repeatWarn}
        onCancel={() => { againRef.current = false; setRepeatWarn(null); }}
        onConfirm={() => { repeatOk.current = true; setRepeatWarn(null); handleSubmit({ preventDefault() {} } as React.FormEvent); }}
        title="¿Ya lo pagaste?"
        message={`${repeatWarn || ''} ¿Es otro pago distinto y quieres registrarlo de nuevo?`}
        confirmText="Sí, es otro pago"
        cancelText="No, ya estaba"
      />

      {/* Recordatorio a partir del gasto: mismo nombre y categoría, el mismo día de cada mes */}
      {showReminder && transactionToEdit && (
        <ReminderFormModal
          prefill={{
            title: (description || category).trim(),
            category,
            type: 'monthly',
            dayOfMonth: (transactionToEdit.date instanceof Date ? transactionToEdit.date : transactionToEdit.date.toDate()).getDate(),
            // Este gasto ya es el pago de ese mes: el recordatorio no debe salir como pendiente
            paidDates: [dateKey(transactionToEdit.date instanceof Date ? transactionToEdit.date : transactionToEdit.date.toDate())],
            time: '08:00',
            description: `Último pago: $${Number(amount || 0).toLocaleString(currentLocale())}`,
          }}
          onClose={() => setShowReminder(false)}
          onSuccess={() => setShowReminder(false)}
        />
      )}

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
