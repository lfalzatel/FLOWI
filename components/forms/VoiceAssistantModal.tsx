'use client';

import { useAccounts } from '@/hooks/useAccounts';
import { ReadingTips } from '@/components/forms/ReadingTips';
import { updateUserProfile } from '@/lib/firestore';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { dayKeyNow, isPremium, receiptsDailyLimit, receiptsUsed, showLimit, usePlan } from '@/lib/plans';
import { applyVoiceCorrection } from '@/lib/voiceCorrection';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/components/ThemeProvider';
import { Mic, MicOff, X, Sparkles, Check, RefreshCw, Keyboard, AlertCircle, Trash2, Layers, Compass, StickyNote, Bell, ArrowRight, Search, ChevronDown, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useAuth } from '@/hooks/useAuth';
import { useCategories } from '@/hooks/useCategories';
import { detectUserLocaleAndCurrency } from '@/lib/geoUtils';
import { parseMultiVoiceTransaction, ParsedVoiceResult, ParsedVoiceItem, ParsedVoiceCommand, speakText, cleanReminderTitle } from '@/lib/voiceParser';
import { addExpense, addDebt, addNote, addReminder } from '@/lib/firestore';
import { correctWithAi, getAiKey, improveWithAi, needsAiHelp, readReceiptWithAi } from '@/lib/aiAssist';
import { formatCurrency } from '@/lib/format';
import { CategoryIcon } from '@/components/CategoryIcon';
import { triggerPowerAnimation, triggerConfettiWithSynth } from '@/components/dashboard/PowerAnimation';

interface VoiceAssistantModalProps {
  onClose: () => void;
  onSelectParsed: (result: ParsedVoiceResult) => void;
  onOpenManual: () => void;
  onSuccessBulk?: () => void;
  // Desde el menú del botón flotante: abrir directo con la foto de un recibo (sin saludo ni micrófono)
  receipt?: File | 'no-key' | null;
}

export function VoiceAssistantModal({ onClose, onSelectParsed, onOpenManual, onSuccessBulk, receipt = null }: VoiceAssistantModalProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const { user, profile } = useAuth();
  // Opciones de "¿Con qué pagaste?": las cuentas de la persona; si no tiene, las más comunes
  const { accounts } = useAccounts();
  const activeAccounts = accounts.filter(a => !a.archived);
  const payOptions = activeAccounts.length
    ? Array.from(new Set(activeAccounts.map(a => a.methods?.[0] || a.name))).slice(0, 8)
    : ['Efectivo', 'Nequi', 'Bancolombia', 'Daviplata', 'Tarjeta de crédito'];
  // La cuenta principal queda marcada por defecto; la persona la cambia si pagó con otra
  const mainAcc = activeAccounts.find(a => a.isDefault);
  const mainPay = mainAcc ? (mainAcc.methods?.[0] || mainAcc.name) : undefined;
  const { canAdd } = usePlan();
  const { allCategories } = useCategories();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [parsedResults, setParsedResults] = useState<ParsedVoiceItem[]>([]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savingBulk, setSavingBulk] = useState(false);
  const [showSuccessAnim, setShowSuccessAnim] = useState(false);
  const [showCategoryPickerIdx, setShowCategoryPickerIdx] = useState<number | null>(null);
  const [categorySearch, setCategorySearch] = useState('');

  const [pendingAction, setPendingAction] = useState<'create_reminder' | 'create_note' | 'create_income' | 'create_expense' | null>(null);

  const recognitionRef = useRef<any>(null);
  // Respaldo con IA gratuita (solo si el usuario la conectó y el analizador local no quedó seguro)
  const [aiStatus, setAiStatus] = useState<'idle' | 'loading' | 'done' | 'failed'>('idle');
  const aiRequestRef = useRef(0);
  // Último dictado ya procesado: evita volver a analizarlo (y a consultar la IA) en cada redibujado
  const processedTranscriptRef = useRef<string | null>(null);
  // Gasto por foto del recibo (usa la misma IA gratuita, con un modelo que lee imágenes)
  const receiptInputRef = useRef<HTMLInputElement>(null);
  const [receiptStatus, setReceiptStatus] = useState<'idle' | 'loading' | 'done' | 'no-key' | 'error'>('idle');
  const [receiptError, setReceiptError] = useState('');
  // Recibos que le quedan hoy (plan gratis); null = no mostrar
  const [receiptsLeft, setReceiptsLeft] = useState<number | null>(null);
  // "Otra foto" sobre un recibo ya leído no gasta otro recibo (hasta 3 veces por apertura)
  const retakeNextRef = useRef(false);
  const freeRetakesRef = useRef(0);
  // Corregir por voz la transacción en pantalla
  const correctingRef = useRef(false);
  const [correcting, setCorrecting] = useState<'idle' | 'listening' | 'ai'>('idle');
  const [flashKeys, setFlashKeys] = useState<string[]>([]);
  const parsedRef = useRef<ParsedVoiceItem[]>([]);

  // Perfil al día (al abrir con una foto, el de useAuth puede no haber cargado todavía)
  const freshProfile = async () => {
    if (profile) return { uid: user?.uid || auth.currentUser?.uid, p: profile };
    const uid = auth.currentUser?.uid;
    if (!uid) return { uid: undefined, p: null };
    const snap = await getDoc(doc(db, 'users', uid)).catch(() => null);
    return { uid, p: (snap?.data() as any) || null };
  };

  const handleReceiptFile = async (file: File | undefined, retake = false) => {
    if (!file) return;
    const me = await freshProfile();
    const free = retake && freeRetakesRef.current < 3;
    const used = receiptsUsed(me.p);
    const limit = receiptsDailyLimit(me.p);
    if (!free && used >= limit) { showLimit('receipts'); return; }
    stopListening();
    correctingRef.current = false;
    setCorrecting('idle');
    setErrorMsg(null);
    setTranscript('');
    setParsedResults([]);
    setReceiptStatus('loading');
    aiRequestRef.current++; // descarta respuestas de IA de un dictado anterior
    setAiStatus('idle');
    const read = await readReceiptWithAi(file, allCategories);
    if (read.ok) {
      setParsedResults([read.result]);
      setReceiptStatus('done');
      if (free) freeRetakesRef.current++;
      else if (me.uid) updateUserProfile(me.uid, { receiptUsage: { day: dayKeyNow(), count: used + 1 } }).catch(() => {});
      const nowUsed = free ? used : used + 1;
      setReceiptsLeft(isPremium(me.p) ? null : Math.max(0, limit - nowUsed));
      return;
    }
    setReceiptStatus(read.reason === 'no-key' ? 'no-key' : 'error');
    setReceiptError(
      read.reason === 'unreadable' ? 'No pude leer el total en la foto. Prueba con más luz, el recibo derecho y completo en la imagen.'
      : read.reason === 'no-model' ? 'Ahora no hay un modelo gratuito que lea imágenes. Inténtalo más tarde.'
      : 'La IA no respondió a tiempo. Revisa tu conexión e inténtalo de nuevo.'
    );
  };

  // Iniciar reconocimiento de voz de forma dinámica
  const startListening = () => {
    // Interrupción INMEDIATA de cualquier voz parlante de FLOWI al encender el micrófono
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }

    setTranscript('');
    processedTranscriptRef.current = null;
    if (!correctingRef.current) {
      setReceiptStatus('idle');
      if (!pendingAction) setParsedResults([]);
    }
    setEditingIdx(null);
    setErrorMsg(null);

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMsg('El micrófono nativo no está disponible en este navegador. Puedes usar el modo teclado.');
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch (e) {}
    }

    const locale = detectUserLocaleAndCurrency(profile?.currency);
    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = locale.language || 'es-CO';

    rec.onstart = () => {
      setIsListening(true);
      setErrorMsg(null);
    };

    rec.onresult = (event: any) => {
      let currentTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript;
      }
      setTranscript(currentTranscript);
    };

    rec.onerror = (event: any) => {
      console.warn('Error en voz:', event.error);
      setIsListening(false);
      if (event.error === 'no-speech') {
        setErrorMsg('No se escuchó nada. Toca el micrófono y vuelve a hablar.');
      } else if (event.error === 'not-allowed') {
        setErrorMsg('Permiso de micrófono denegado en tu dispositivo.');
      } else if (event.error !== 'aborted') {
        setErrorMsg('Toca el botón de micrófono para comenzar a dictar.');
      }
    };

    rec.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = rec;

    try {
      rec.start();
    } catch (err) {
      console.error('Error al iniciar micrófono:', err);
      setErrorMsg('Toca el micrófono para iniciar el dictado.');
    }
  };

  const isTx = (r: ParsedVoiceItem | undefined) => !!r && (!('kind' in r) || r.kind === 'transaction');
  const flash = (keys: string[]) => {
    setFlashKeys(keys);
    setTimeout(() => setFlashKeys([]), 2500);
  };
  const startCorrection = () => {
    correctingRef.current = true;
    setCorrecting('listening');
    startListening();
  };
  const applyCorrection = (text: string) => {
    const idx = parsedRef.current.findIndex(isTx);
    if (idx < 0) { setCorrecting('idle'); return; }
    const cur = parsedRef.current[idx] as ParsedVoiceResult;
    const replace = (item: ParsedVoiceResult, keys: string[]) => {
      setParsedResults(prev => prev.map((r, i) => (i === idx ? ({ ...item, _payDefaulted: true } as any) : r)));
      flash(keys);
    };
    const { item, changed } = applyVoiceCorrection(cur, text, allCategories, payOptions);
    if (changed.length) { replace(item, changed); setCorrecting('idle'); return; }
    if (!getAiKey()) {
      setErrorMsg('No entendí qué cambiar. Prueba: "eran 25 mil", "ponlo en Nequi" o "fue ayer".');
      setCorrecting('idle');
      return;
    }
    setCorrecting('ai');
    correctWithAi(cur, text, allCategories, payOptions)
      .then(out => {
        const keys = out ? (['amount', 'category', 'description', 'date', 'paymentMethod', 'type'] as const).filter(k => (out as any)[k] !== (cur as any)[k]) : [];
        if (out && keys.length) replace(out, [...keys]);
        else setErrorMsg('No entendí qué cambiar. Prueba: "eran 25 mil", "ponlo en Nequi" o "fue ayer".');
      })
      .catch(() => setErrorMsg('La IA no respondió. Corrige el dato tocándolo.'))
      .finally(() => setCorrecting('idle'));
  };

  const stopListening = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsListening(false);
  };

  useEffect(() => {
    const locale = detectUserLocaleAndCurrency(profile?.currency);
    const greetingText = "¡Hola! ¿Qué deseas registrar hoy? Un gasto, un ingreso, una deuda, una nota o un recordatorio.";
    
    if (receipt === 'no-key') setReceiptStatus('no-key');
    else if (receipt) handleReceiptFile(receipt);
    else {
      // Encender el micrófono ÚNICAMENTE cuando la voz parlante termine de hablar (0 solapamiento)
      speakText(greetingText, locale.language, () => {
        startListening();
      });
    }

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try { window.speechSynthesis.cancel(); } catch (e) {}
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, []);

  // Al finalizar la transcripción de un dictado, parsear automáticamente
  useEffect(() => {
    if (transcript.trim() && !isListening) {
      const text = transcript.trim();
      if (processedTranscriptRef.current === text) return;
      processedTranscriptRef.current = text;

      if (correctingRef.current) {
        correctingRef.current = false;
        applyCorrection(text);
        return;
      }

      // Si había un estado conversacional pendiente (creación de recordatorio, nota, ingreso o gasto):
      if (pendingAction) {
        if (pendingAction === 'create_income') {
          const results = parseMultiVoiceTransaction(text, allCategories);
          results.forEach(r => {
            if (!('kind' in r) || r.kind === 'transaction') {
              const tx = r as ParsedVoiceResult;
              tx.type = 'ingreso';
              tx.isFixed = false;
              if (tx.category === 'Arriendo') {
                tx.category = 'Arriendo recibido';
              }
            }
          });
          setParsedResults(results);
          setPendingAction(null);
          setTranscript('');
          return;
        }

        if (pendingAction === 'create_expense') {
          const results = parseMultiVoiceTransaction(text, allCategories);
          results.forEach(r => {
            if (!('kind' in r) || r.kind === 'transaction') {
              const tx = r as ParsedVoiceResult;
              tx.type = 'gasto';
            }
          });
          setParsedResults(results);
          setPendingAction(null);
          setTranscript('');
          return;
        }

        if (pendingAction === 'create_reminder') {
          let dueDate = new Date().toISOString().split('T')[0];
          if (/\bmañana\b/i.test(text)) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            dueDate = tomorrow.toISOString().split('T')[0];
          }

          // Detección de Frecuencia por Voz
          let frequency: 'once' | 'daily' | 'weekly' | 'monthly' = 'once';
          if (/\b(diario|diaria|cada d[íi]a|todos los d[íi]as)\b/i.test(text)) {
            frequency = 'daily';
          } else if (/\b(semanal|cada semana|todas las semanas)\b/i.test(text)) {
            frequency = 'weekly';
          } else if (/\b(mensual|cada mes|todos los meses)\b/i.test(text)) {
            frequency = 'monthly';
          }

          // Detección de Hora por Voz
          let time = '08:00';
          const timeMatch = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|de la mañana|de la tarde|de la noche)?\b/i);
          if (timeMatch) {
            let hour = parseInt(timeMatch[1], 10);
            const min = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
            const period = timeMatch[3]?.toLowerCase();
            if (period && (period.includes('pm') || period.includes('tarde') || period.includes('noche')) && hour < 12) {
              hour += 12;
            } else if (period && (period.includes('am') || period.includes('mañana')) && hour === 12) {
              hour = 0;
            }
            if (hour >= 0 && hour <= 23 && min >= 0 && min <= 59) {
              time = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
            }
          }

          const cleanTitle = cleanReminderTitle(text);

          const reminderCmd: ParsedVoiceCommand = {
            kind: 'command',
            action: 'create_reminder',
            targetUrl: '/servicios/recordatorios',
            title: 'Nuevo Recordatorio 🔔',
            content: cleanTitle,
            dueDate,
            time,
            frequency,
            label: 'Guardar Recordatorio',
            rawText: text
          };
          setParsedResults([reminderCmd]);
          setPendingAction(null);
          setTranscript('');
          return;
        }

        if (pendingAction === 'create_note') {
          let title = '';
          let content = text;

          const titleMatch = text.match(/\b(?:t[íi]tulo|asunto)\s*[:\-]?\s*(.+?)(?:\s+(?:contenido|nota|texto|cuerpo)\s*[:\-]?\s*(.+)|$)/i);
          if (titleMatch) {
            title = titleMatch[1].trim();
            if (titleMatch[2]) content = titleMatch[2].trim();
          } else {
            const parts = text.split(/[:\-–—]/);
            if (parts.length > 1 && parts[0].trim().length < 30) {
              title = parts[0].trim();
              content = parts.slice(1).join('-').trim();
            } else {
              const words = text.split(/\s+/);
              title = words.length <= 4 ? text : words.slice(0, 3).join(' ');
            }
          }

          title = title.charAt(0).toUpperCase() + title.slice(1);
          content = content.charAt(0).toUpperCase() + content.slice(1);

          const noteCmd: ParsedVoiceCommand = {
            kind: 'command',
            action: 'create_note',
            targetUrl: '/servicios/notas',
            title,
            content,
            label: 'Guardar Nota',
            rawText: text
          };
          setParsedResults([noteCmd]);
          setPendingAction(null);
          setTranscript('');
          return;
        }
      }

      const results = parseMultiVoiceTransaction(text, allCategories);
      setParsedResults(results);

      const requestId = ++aiRequestRef.current;
      setAiStatus('idle');
      if (getAiKey() && needsAiHelp(results)) {
        setAiStatus('loading');
        improveWithAi(text, allCategories)
          .then(aiResults => {
            if (requestId !== aiRequestRef.current) return;
            if (aiResults) {
              setParsedResults(aiResults);
              setAiStatus('done');
            } else {
              setAiStatus('failed');
            }
          })
          .catch(() => { if (requestId === aiRequestRef.current) setAiStatus('failed'); });
      }

      // Si es una pregunta de seguimiento (ask_followup), APAGAR micrófono y LIMPIAR transcript para romper bucles
      if (results.length === 1 && 'kind' in results[0] && results[0].kind === 'command') {
        const cmd = results[0] as ParsedVoiceCommand;
        if (cmd.action === 'ask_followup' && cmd.prompt) {
          stopListening();
          setTranscript(''); // Limpiar la palabra clave para que no persista

          if (cmd.pendingAction) {
            setPendingAction(cmd.pendingAction);
          } else {
            const promptLower = cmd.prompt.toLowerCase();
            if (promptLower.includes('recordar')) setPendingAction('create_reminder');
            else if (promptLower.includes('anotar') || promptLower.includes('nota') || promptLower.includes('título')) setPendingAction('create_note');
            else if (promptLower.includes('ingreso')) setPendingAction('create_income');
            else if (promptLower.includes('gasto')) setPendingAction('create_expense');
          }

          const locale = detectUserLocaleAndCurrency(profile?.currency);
          speakText(cmd.prompt, locale.language, () => {
            startListening();
          });
        }
      }
    }
  }, [isListening, transcript, allCategories, profile, pendingAction]);

  parsedRef.current = parsedResults;

  useEffect(() => {
    if (!isListening && correctingRef.current && !transcript.trim()) {
      correctingRef.current = false;
      setCorrecting('idle');
    }
  }, [isListening]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!mainPay) return;
    const needs = (r: ParsedVoiceItem) => isTx(r) && ['gasto', 'ingreso'].includes((r as any).type) && !(r as any)._payDefaulted;
    if (!parsedResults.some(needs)) return;
    setParsedResults(prev => prev.map(r => (needs(r) ? ({ ...r, paymentMethod: (r as any).paymentMethod || mainPay, _payDefaulted: true } as any) : r)));
  }, [parsedResults, mainPay]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRemoveResult = (index: number) => {
    setParsedResults(prev => prev.filter((_, i) => i !== index));
    if (editingIdx === index) setEditingIdx(null);
  };

  const handleUpdateItem = (index: number, key: string, val: any) => {
    setParsedResults(prev => {
      const copy = [...prev];
      const item = { ...copy[index] } as any;
      item[key] = val;
      if (key === 'type' && val === 'ingreso') {
        item.isFixed = false;
        if (item.category === 'Arriendo') {
          item.category = 'Arriendo recibido';
        }
      }
      copy[index] = item as ParsedVoiceItem;
      return copy;
    });
  };

  const handleConfirmSingle = () => {
    if (parsedResults.length === 1 && (!('kind' in parsedResults[0]) || parsedResults[0].kind === 'transaction')) {
      onSelectParsed(parsedResults[0] as ParsedVoiceResult);
    } else {
      onOpenManual();
    }
  };

  const handleSaveAllBulk = async () => {
    if (!user || parsedResults.length === 0) return;
    setSavingBulk(true);
    try {
      for (const res of parsedResults) {
        // Manejo de Comandos por Voz (Navegación / Notas / Recordatorios)
        if ('kind' in res && res.kind === 'command') {
          const cmd = res as ParsedVoiceCommand;
          const locale = detectUserLocaleAndCurrency(profile?.currency);

          if (cmd.action === 'navigate' && cmd.targetUrl) {
            speakText(`Navegando a ${cmd.label || cmd.title}`, locale.language);
            router.push(cmd.targetUrl);
          } else if (cmd.action === 'create_note') {
            await addNote({
              userId: user.uid,
              title: cmd.title || 'Nota por voz',
              content: cmd.content || cmd.rawText,
              color: '#3B82F6',
            });
          } else if (cmd.action === 'create_reminder') {
            await addReminder({
              userId: user.uid,
              title: cmd.content || cmd.title || 'Recordatorio por voz',
              description: cmd.rawText,
              type: cmd.frequency || 'once',
              date: cmd.dueDate || undefined,
              time: cmd.time || '08:00',
              sound: true,
              pushEnabled: true,
              inAppEnabled: true,
              active: true,
            });
          }
          continue;
        }

        // Manejo de Transacciones Estándar (Gastos / Ingresos / Deudas)
        const tx = res as ParsedVoiceResult;
        if (!tx.amount || tx.amount <= 0) continue;

        if (tx.type === 'deuda') {
          await addDebt({
            userId: user.uid,
            title: tx.description || `Deuda con ${tx.debtPerson || 'persona'}`,
            totalAmount: tx.amount,
            interestRate: tx.interestRate || 0,
            direction: tx.debtDirection || 'debo',
            paidAmount: 0,
            status: 'pending',
          });
        } else {
          await addExpense({
            userId: user.uid,
            amount: tx.amount,
            type: tx.type,
            category: tx.category,
            description: tx.description,
            date: tx.time
              ? new Date(`${tx.date || new Date().toLocaleDateString('en-CA')}T${tx.time}:00`)
              : !tx.date || tx.date === new Date().toLocaleDateString('en-CA') ? new Date() : new Date(`${tx.date}T12:00:00`),
            isFixed: tx.isFixed,
            ...(tx.merchant ? { merchant: tx.merchant } : {}),
            ...(tx.paymentMethod ? { paymentMethod: tx.paymentMethod } : {}),
          });
        }
      }

      // Determinar animación de confeti + tarjeta 3D holográfica
      const isReminder = parsedResults.some(r => 'kind' in r && r.kind === 'command' && r.action === 'create_reminder');
      const isNote = parsedResults.some(r => 'kind' in r && r.kind === 'command' && r.action === 'create_note');
      const isMultipleTx = parsedResults.length > 1;

      if (isReminder) {
        triggerPowerAnimation(0, 'edicion', 'RECORDATORIO AGENDADO', '¡AGENDADO!');
        triggerConfettiWithSynth(3.0);
      } else if (isNote) {
        triggerPowerAnimation(0, 'edicion', 'NOTA GUARDADA', '¡GUARDADA!');
        triggerConfettiWithSynth(3.0);
      } else if (isMultipleTx) {
        triggerConfettiWithSynth(3.0);
      } else if (parsedResults.length === 1 && (!('kind' in parsedResults[0]) || parsedResults[0].kind === 'transaction')) {
        const tx = parsedResults[0] as ParsedVoiceResult;
        if (tx.amount && tx.amount > 0) {
          triggerPowerAnimation(tx.amount, tx.type === 'ingreso' ? 'ingreso' : 'gasto');
        }
      }

      let spokenMsg = 'Transacciones guardadas con éxito';
      if (isReminder) spokenMsg = 'Recordatorio agendado con éxito';
      else if (isNote) spokenMsg = 'Nota guardada con éxito';

      const locale = detectUserLocaleAndCurrency(profile?.currency);
      
      // Cerrar y refrescar SOLAMENTE al terminar la voz hablada (cero interrupciones)
      speakText(spokenMsg, locale.language, () => {
        setTimeout(() => {
          if (onSuccessBulk) onSuccessBulk();
          onClose();
        }, 500);
      });
    } catch (err) {
      console.error('Error guardando por voz:', err);
      setErrorMsg('Error al guardar. Intenta nuevamente.');
    } finally {
      setSavingBulk(false);
    }
  };

  if (typeof document === 'undefined') return null;

  const reviewing = parsedResults.length > 0 || receiptStatus === 'loading';
  const canCorrect = parsedResults.length === 1 && isTx(parsedResults[0]) && !pendingAction;
  const hl = (k: string) => (flashKeys.includes(k) ? 'ring-2 ring-accent shadow-[0_0_12px_var(--accent)]' : '');

  return createPortal(
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 ${isTechTheme ? 'font-mono text-sm' : ''}`}>
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 ${theme === 'light' ? 'bg-black/40 backdrop-blur-xs' : 'bg-black/75 backdrop-blur-md'}`} 
        onClick={onClose} 
      />

      <div 
        className={`w-full max-w-md relative z-10 animate-fade-in-up p-6 glass-dropdown flex flex-col items-center text-center overflow-hidden ${
          isTechTheme ? 'rounded-none border border-accent bg-deep uppercase' : 'rounded-3xl shadow-2xl'
        }`}
      >
        {/* Overlay Animado de Éxito 🎉 */}
        <AnimatePresence>
          {showSuccessAnim && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md p-6 text-center"
            >
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1.25, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 14 }}
                className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 mb-4 shadow-[0_0_35px_rgba(16,185,129,0.5)]"
              >
                <Check className="w-10 h-10 stroke-[3]" />
              </motion.div>
              <h3 className="text-2xl font-bold text-white mb-1">¡Registrado con Éxito! 🎉</h3>
              <p className="text-emerald-400 text-sm font-medium">Tus datos financieros fueron guardados</p>
            </motion.div>
          )}
        </AnimatePresence>
        <div onClick={(e) => e.stopPropagation()} className="w-full">
        {/* Botón cerrar */}
        <button 
          type="button"
          onClick={onClose} 
          className={`absolute top-4 right-4 p-2 rounded-xl transition-colors ${
            isTechTheme ? 'text-accent hover:bg-accent/10' : 'text-text-muted hover:text-text-primary hover:bg-white/10'
          }`}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-accent animate-pulse" />
          <h2 className={`font-bold text-lg ${isTechTheme ? 'text-accent font-mono' : 'text-text-primary font-syne'}`}>
            Asistente de Voz IA
          </h2>
        </div>

        {/* Selector de foto (sirve para la primera foto y para "Otra foto") */}
        <input ref={receiptInputRef} type="file" accept="image/*" className="hidden"
               onChange={(e) => { const retake = retakeNextRef.current; retakeNextRef.current = false; handleReceiptFile(e.target.files?.[0], retake); e.target.value = ''; }} />

        {!reviewing && (<>
        <p className={`text-xs max-w-xs mb-4 ${isTechTheme ? 'text-accent/70' : 'text-text-muted'}`}>
          Dicta transacciones, comandos como "abrir estadísticas" o crea notas y recordatorios. También puedes registrar un gasto con la foto del recibo.
        </p>

        {/* Animación del Micrófono */}
        <div className="relative my-4 flex items-center justify-center">
          {isListening && (
            <>
              <div className="absolute w-24 h-24 rounded-full bg-accent/20 animate-ping" />
              <div className="absolute w-20 h-20 rounded-full bg-accent/40 animate-pulse" />
            </>
          )}
          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl ${
              isListening
                ? 'bg-red-500 text-white scale-110 shadow-red-500/30'
                : 'bg-gradient-to-tr from-accent to-accent-dim text-black hover:scale-105 shadow-accent/30'
            }`}
          >
            {isListening ? (
              <MicOff className="w-9 h-9 animate-pulse" />
            ) : (
              <Mic className="w-9 h-9" />
            )}
          </button>
        </div>

        {/* Estado en Texto */}
        <div className="my-2 min-h-[2.5rem] flex flex-col items-center justify-center">
          {isListening ? (
            <span className={`text-xs font-bold animate-pulse ${isTechTheme ? 'text-accent' : 'text-accent'}`}>
              🎙️ Escuchando... Di "Estadísticas" o "Gasté 9000 en cerveza"
            </span>
          ) : transcript ? (
            <span className={`text-xs font-medium italic max-w-xs ${isTechTheme ? 'text-accent/90' : 'text-text-primary'}`}>
              "{transcript}"
            </span>
          ) : (
            <span className={`text-xs font-semibold ${isTechTheme ? 'text-accent/70' : 'text-text-muted'}`}>
              Toca el micrófono para hablar
            </span>
          )}
        </div>

        {/* Gasto por foto del recibo */}
        <button
          type="button"
          onClick={() => getAiKey() ? receiptInputRef.current?.click() : setReceiptStatus('no-key')}
          className={`mb-1 px-4 py-2 text-xs font-semibold flex items-center gap-2 border transition-colors ${
            isTechTheme ? 'rounded-none border-accent/40 text-accent hover:bg-accent/10 font-mono uppercase' : 'rounded-xl border-glass-border text-text-primary hover:bg-white/10'
          }`}
        >
          <Camera className="w-4 h-4 text-accent" />
          Registrar con foto del recibo
        </button>
        </>)}

        {/* Revisando un resultado: lo importante son los datos; corregir con la voz u otra foto sin salir */}
        {reviewing && receiptStatus !== 'loading' && (
          <div className="w-full mb-1 mt-1 space-y-1.5">
            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={correcting === 'ai'}
                      onClick={isListening ? stopListening : (canCorrect ? startCorrection : startListening)}
                      className={`py-2.5 px-2 text-xs font-semibold flex items-center justify-center gap-1.5 border transition-colors disabled:opacity-60 ${isListening ? 'border-red-500/60 bg-red-500/15 text-red-400' : isTechTheme ? 'border-accent/40 text-accent hover:bg-accent/10' : 'border-glass-border text-text-primary hover:bg-white/10'} ${isTechTheme ? 'rounded-none font-mono uppercase' : 'rounded-xl'}`}>
                {isListening ? <MicOff className="w-4 h-4 animate-pulse" /> : correcting === 'ai' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4 text-accent" />}
                {isListening ? 'Escuchando…' : correcting === 'ai' ? 'Corrigiendo…' : canCorrect ? 'Corregir con la voz' : 'Dictar de nuevo'}
              </button>
              <button type="button"
                      onClick={() => { if (!getAiKey()) { setReceiptStatus('no-key'); return; } retakeNextRef.current = receiptStatus === 'done'; receiptInputRef.current?.click(); }}
                      className={`py-2.5 px-2 text-xs font-semibold flex items-center justify-center gap-1.5 border transition-colors ${isTechTheme ? 'rounded-none border-accent/40 text-accent hover:bg-accent/10 font-mono uppercase' : 'rounded-xl border-glass-border text-text-primary hover:bg-white/10'}`}>
                <Camera className="w-4 h-4 text-accent" />
                {receiptStatus === 'done' ? 'Otra foto' : 'Usar foto'}
              </button>
            </div>
            {isListening && correctingRef.current && (
              <p className="text-[10px] text-accent normal-case text-center">Di qué cambiar: "eran 25 mil", "ponlo en Nequi", "fue ayer"…</p>
            )}
            {!isListening && transcript && correcting !== 'listening' && (
              <p className="text-[10px] text-text-muted normal-case italic text-center truncate">"{transcript}"</p>
            )}
          </div>
        )}
        {receiptStatus === 'loading' && <ReadingTips isTech={isTechTheme} />}
        {receiptStatus === 'no-key' && (
          <p className="text-[11px] text-text-muted max-w-xs mb-1 normal-case">
            Para leer recibos necesitas la IA gratuita.{' '}
            <a href="/configuracion" className="text-accent font-semibold underline">Conéctala en Configuración</a> (es gratis y tu clave queda solo en este celular).
          </p>
        )}
        {receiptStatus === 'error' && (
          <p className="text-[11px] text-red-400 max-w-xs mb-1 normal-case">{receiptError}</p>
        )}

        {/* Mensaje de Error */}
        {errorMsg && (
          <div className="my-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2 w-full">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Vista previa de los Datos Parseados */}
        {parsedResults.length > 0 && (
          <div className={`w-full my-3 space-y-2 overflow-y-auto scrollbar-hide pr-1 ${reviewing ? 'max-h-[58vh]' : 'max-h-56'}`}>
            {aiStatus !== 'idle' && (
              <p className={`text-[10px] px-1 flex items-center gap-1.5 normal-case ${aiStatus === 'failed' ? 'text-text-muted' : 'text-accent'}`}>
                <Sparkles className={`w-3 h-3 ${aiStatus === 'loading' ? 'animate-pulse' : ''}`} />
                {aiStatus === 'loading' && 'Consultando la IA para entender mejor…'}
                {aiStatus === 'done' && 'Ajustado con IA. Revisa antes de guardar.'}
                {aiStatus === 'failed' && 'La IA no respondió; se usa el resultado local.'}
              </p>
            )}
            {receiptStatus === 'done' && aiStatus === 'idle' && (
              <p className="text-[10px] px-1 flex items-center gap-1.5 normal-case text-accent">
                <Camera className="w-3 h-3 shrink-0" />
                <span>
                  Leído del recibo con IA. Revisa el valor antes de guardar; la foto no se guarda.
                  {receiptsLeft !== null && (receiptsLeft === 0
                    ? ' Este era tu último recibo de hoy; mañana se renuevan.'
                    : ` Te ${receiptsLeft === 1 ? 'queda 1 recibo' : `quedan ${receiptsLeft} recibos`} hoy.`)}
                </span>
              </p>
            )}
            {parsedResults.length > 1 && (
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-accent flex items-center gap-1.5">
                  <Layers className="w-4 h-4" />
                  <span>{parsedResults.length} Elementos Detectados</span>
                </span>
                <span className="text-[10px] text-text-muted">Toca ✏️ para editar</span>
              </div>
            )}

            {parsedResults.map((item, idx) => {
              const isCommand = 'kind' in item && item.kind === 'command';
              const cmd = isCommand ? (item as ParsedVoiceCommand) : null;
              const res = isCommand ? null : (item as ParsedVoiceResult);

              return (
                <div 
                  key={idx} 
                  className={`w-full p-3 text-left transition-all relative ${
                    isTechTheme ? 'bg-accent/10 border border-accent/40 font-mono' : 'bg-white/5 border border-white/10 rounded-2xl'
                  }`}
                >
                  {/* Botón eliminar en la esquina */}
                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleRemoveResult(idx)}
                      title="Eliminar este elemento"
                      className="p-1 text-red-400/60 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Renderizado de Comandos por Voz (Navegación / Nota / Recordatorio) */}
                  {isCommand && cmd ? (
                    <div>
                      {cmd.action === 'create_reminder' ? (
                        <div className="space-y-2.5 mt-1">
                          <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-amber-400">
                            <Bell className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                            <span>RECORDATORIO DETECTADO</span>
                          </div>

                          {/* Frecuencia Selectors */}
                          <div>
                            <label className="text-[9px] font-bold text-text-muted uppercase block mb-1">Frecuencia</label>
                            <div className="grid grid-cols-4 gap-1">
                              {[
                                { key: 'once', label: 'Una vez' },
                                { key: 'daily', label: 'Diario' },
                                { key: 'weekly', label: 'Semanal' },
                                { key: 'monthly', label: 'Mensual' },
                              ].map((f) => (
                                <button
                                  key={f.key}
                                  type="button"
                                  onClick={() => handleUpdateItem(idx, 'frequency', f.key)}
                                  className={`py-1 px-1 rounded-lg text-[9px] font-bold transition-all ${
                                    (cmd.frequency || 'once') === f.key
                                      ? 'bg-amber-500/25 border border-amber-500 text-amber-400'
                                      : 'bg-white/5 border border-white/10 text-text-muted hover:bg-white/10'
                                  }`}
                                >
                                  {f.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Hora y Fecha */}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[9px] font-bold text-text-muted uppercase block mb-0.5">Hora</label>
                              <input
                                type="time"
                                value={cmd.time || '08:00'}
                                onFocus={() => stopListening()}
                                onChange={(e) => handleUpdateItem(idx, 'time', e.target.value)}
                                className={`w-full px-2 py-1.5 rounded-xl text-xs font-bold focus:outline-none focus:border-amber-400 ${
                                  isTechTheme ? 'bg-black/60 border border-amber-500/40 text-amber-400 font-mono' : 'bg-black/40 border border-white/20 text-white'
                                }`}
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-text-muted uppercase block mb-0.5">Fecha</label>
                              <input
                                type="date"
                                value={cmd.dueDate || ''}
                                onFocus={() => stopListening()}
                                onChange={(e) => handleUpdateItem(idx, 'dueDate', e.target.value)}
                                className={`w-full px-2 py-1.5 rounded-xl text-xs font-bold focus:outline-none focus:border-amber-400 ${
                                  isTechTheme ? 'bg-black/60 border border-amber-500/40 text-amber-400 font-mono' : 'bg-black/40 border border-white/20 text-white'
                                }`}
                              />
                            </div>
                          </div>

                          {/* Detalle */}
                          <div>
                            <label className="text-[9px] font-bold text-text-muted uppercase block mb-0.5">Título / Recordar</label>
                            <input
                              type="text"
                              value={cmd.content || ''}
                              onFocus={() => stopListening()}
                              onChange={(e) => handleUpdateItem(idx, 'content', e.target.value)}
                              placeholder="Escribe el detalle..."
                              className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-medium focus:outline-none focus:border-amber-400 ${
                                isTechTheme ? 'bg-black/60 border border-amber-500/40 text-amber-400 font-mono' : 'bg-black/40 border border-white/20 text-text-primary'
                              }`}
                            />
                          </div>
                        </div>
                      ) : cmd.action === 'create_note' ? (
                        <div className="space-y-2.5 mt-1">
                          <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-purple-400">
                            <StickyNote className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                            <span>NOTA IMPORTANTE DETECTADA</span>
                          </div>

                          {/* Título de la Nota */}
                          <div>
                            <label className="text-[9px] font-bold text-text-muted uppercase block mb-0.5">Título de la Nota</label>
                            <input
                              type="text"
                              value={cmd.title || ''}
                              onFocus={() => stopListening()}
                              onChange={(e) => handleUpdateItem(idx, 'title', e.target.value)}
                              placeholder="Ej: Citas médicas, Lista de compras..."
                              className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-bold focus:outline-none focus:border-purple-400 ${
                                isTechTheme ? 'bg-black/60 border border-purple-500/40 text-purple-300 font-mono' : 'bg-black/40 border border-white/20 text-white'
                              }`}
                            />
                          </div>

                          {/* Contenido / Nota */}
                          <div>
                            <label className="text-[9px] font-bold text-text-muted uppercase block mb-0.5">Contenido / Nota</label>
                            <textarea
                              rows={3}
                              value={cmd.content || ''}
                              onFocus={() => stopListening()}
                              onChange={(e) => handleUpdateItem(idx, 'content', e.target.value)}
                              placeholder="Escribe o corrige el contenido..."
                              className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-medium focus:outline-none focus:border-purple-400 leading-relaxed resize-none ${
                                isTechTheme ? 'bg-black/60 border border-purple-500/40 text-white font-mono' : 'bg-black/40 border border-white/20 text-text-primary'
                              }`}
                            />
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center gap-1.5 mb-1 text-[9px] font-bold uppercase tracking-wider text-amber-400">
                            {cmd.action === 'navigate' ? <Compass className="w-3 h-3 text-blue-400" /> : <Bell className="w-3 h-3 text-amber-400 animate-pulse" />}
                            <span>
                              {cmd.action === 'ask_followup' 
                                ? (cmd.prompt?.includes('anotar') ? '📝 NUEVA NOTA (ESCUCHANDO DETALLES)' : '🔔 NUEVO RECORDATORIO (ESCUCHANDO DETALLES)')
                                : 'COMANDO DE VOZ IA'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                              {cmd.action === 'navigate' ? <Compass className="w-5 h-5 text-blue-400" /> : <Bell className="w-5 h-5 text-amber-400" />}
                            </div>
                            <div className="flex-1 truncate">
                              <p className={`text-xs font-bold truncate ${isTechTheme ? 'text-accent' : 'text-text-primary'}`}>
                                {cmd.title}
                              </p>
                              <p className="text-[11px] text-amber-300 font-medium truncate">
                                {cmd.action === 'ask_followup' ? cmd.prompt : (cmd.content || cmd.rawText)}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : res ? (
                    /* Renderizado de Transacciones Estándar */
                    <div>
                      <div className="flex flex-col items-start gap-1 mb-2 pr-8">
                        <span className="text-[9px] text-amber-300 font-medium leading-tight">
                          💡 Toca para convertir a {res.type === 'gasto' ? 'Ingreso 🟢' : 'Gasto 🔴'}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const nextType = res.type === 'gasto' ? 'ingreso' : res.type === 'ingreso' ? 'deuda' : 'gasto';
                              handleUpdateItem(idx, 'type', nextType);
                            }}
                            title="Toca para cambiar entre Gasto, Ingreso o Deuda"
                            className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border transition-all active:scale-95 flex items-center gap-1 cursor-pointer ${
                              res.type === 'ingreso' 
                                ? 'text-emerald-400 bg-emerald-500/15 border-emerald-500/40 hover:bg-emerald-500/25' 
                                : res.type === 'deuda' 
                                ? 'text-yellow-400 bg-yellow-500/15 border-yellow-500/40 hover:bg-yellow-500/25' 
                                : 'text-red-400 bg-red-500/15 border-red-500/40 hover:bg-red-500/25'
                            }`}
                          >
                            <span>{res.type === 'deuda' && res.debtDirection === 'me_deben' ? 'ME DEBEN' : res.type.toUpperCase()} DETECTADO</span>
                            <RefreshCw className="w-2.5 h-2.5 opacity-70" />
                          </button>
                          {res.isFixed && res.type === 'gasto' && (
                            <span className="text-[8px] px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-400 font-bold uppercase">
                              Gasto Fijo
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Campos directamente editables en la tarjeta */}
                      <div className="space-y-2 pt-1 border-t border-white/10">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] font-bold text-text-muted uppercase block mb-0.5">Monto</label>
                            <div className="relative flex items-center">
                              <span className="absolute left-2 text-xs font-bold text-accent">$</span>
                              <input 
                                type="number"
                                value={res.amount || ''}
                                onFocus={() => stopListening()}
                                onChange={(e) => handleUpdateItem(idx, 'amount', parseFloat(e.target.value) || 0)}
                                className={`w-full pl-6 pr-2 py-1.5 text-xs font-extrabold focus:outline-none focus:border-accent transition-shadow ${hl('amount')} ${
                                  isTechTheme ? 'rounded-none bg-black/60 border border-accent/40 text-accent font-mono' : 'rounded-xl bg-black/40 border border-white/20 text-accent'
                                }`}
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[9px] font-bold text-text-muted uppercase block mb-0.5">Categoría</label>
                            <button
                              type="button"
                              onClick={() => {
                                stopListening();
                                setShowCategoryPickerIdx(idx);
                              }}
                              className={`w-full flex items-center justify-between p-1.5 text-xs border truncate active:scale-95 transition-all ${hl('category')} ${
                                isTechTheme ? 'rounded-none bg-black/60 border-accent/40 text-accent font-mono' : 'rounded-xl bg-black/40 border border-white/20 text-text-primary'
                              }`}
                            >
                              <span className="flex items-center gap-1.5 truncate">
                                <CategoryIcon icon={res.category} label={res.category} className="w-3.5 h-3.5 text-accent shrink-0" />
                                <span className="truncate font-semibold">{res.category || 'Seleccionar'}</span>
                              </span>
                              <ChevronDown className="w-3.5 h-3.5 opacity-60 shrink-0" />
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="text-[9px] font-bold text-text-muted uppercase block mb-0.5">Descripción / Concepto</label>
                          <input 
                            type="text"
                            value={res.description}
                            onFocus={() => stopListening()}
                            onChange={(e) => handleUpdateItem(idx, 'description', e.target.value)}
                            placeholder="Escribe la descripción..."
                            className={`w-full px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:border-accent transition-shadow ${hl('description')} ${
                              isTechTheme ? 'rounded-none bg-black/60 border border-accent/40 text-accent font-mono' : 'rounded-xl bg-black/40 border border-white/20 text-text-primary'
                            }`}
                          />
                        </div>
                        {res.date && (
                          <p className={`text-[10px] text-text-muted normal-case px-1 -mx-1 ${hl('date')}`}>
                            {receiptStatus === 'done' ? 'Fecha del recibo' : 'Fecha'}: {new Date(`${res.date}T12:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </p>
                        )}
                        {(res.type === 'gasto' || res.type === 'ingreso') && (
                          <div className="space-y-1">
                            <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                              {res.type === 'gasto' ? '¿Con qué pagaste?' : '¿Dónde lo recibiste?'}
                            </span>
                            <div className={`flex flex-wrap gap-1.5 p-0.5 -m-0.5 ${hl('paymentMethod')}`}>
                              {payOptions.map(m => {
                                const on = (res as any).paymentMethod === m;
                                return (
                                  <button key={m} type="button" onClick={() => handleUpdateItem(idx, 'paymentMethod', on ? undefined : m)}
                                          className={`px-2.5 py-1 text-[11px] font-semibold border transition-colors normal-case ${isTechTheme ? 'rounded-none' : 'rounded-full'} ${on ? 'border-accent bg-accent/15 text-accent' : 'border-white/15 text-text-secondary hover:bg-white/5'}`}>
                                    {m}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        {/* Acciones principales */}
        <div className="w-full space-y-2.5 mt-2">
          {parsedResults.length > 0 ? (
            <button
              type="button"
              onClick={handleSaveAllBulk}
              disabled={savingBulk}
              className={`w-full py-3.5 px-4 font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                isTechTheme
                  ? 'bg-accent/20 border border-accent text-accent hover:bg-accent/30 font-mono uppercase tracking-wider'
                  : 'bg-gradient-to-r from-accent to-accent-dim text-black rounded-xl shadow-lg shadow-accent/25 hover:opacity-90 font-syne'
              }`}
            >
              {savingBulk ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  <span>
                    {parsedResults.some(r => 'kind' in r && r.kind === 'command')
                      ? 'Ejecutar Comando'
                      : `Guardar ${parsedResults.length === 1 ? 'Transacción' : `Todas (${parsedResults.length})`}`}
                  </span>
                </>
              )}
            </button>
          ) : null}

          <button
            type="button"
            onClick={onOpenManual}
            className={`w-full py-2.5 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
              isTechTheme ? 'text-accent/60 hover:text-accent font-mono' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <Keyboard className="w-4 h-4" />
            <span>Cambiar a entrada manual con teclado</span>
          </button>
        </div>
      </div>
    </div>

    {/* Modal Selector de Categorías (Centrado y Adaptativo al Tema) */}
    {showCategoryPickerIdx !== null && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
        <div 
          className={`w-full max-w-md h-[80vh] max-h-[85vh] p-5 flex flex-col shadow-2xl border ${
            isTechTheme 
              ? 'bg-slate-950 border-accent font-mono text-accent rounded-none' 
              : 'bg-gray-900 border-white/20 text-white rounded-3xl'
          }`}
        >
          {/* Header Modal */}
          <div className={`flex items-center justify-between pb-3 mb-3 border-b ${isTechTheme ? 'border-accent/30' : 'border-white/10'}`}>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-accent" />
              <h3 className="text-sm font-bold uppercase tracking-wider">Seleccionar Categoría</h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowCategoryPickerIdx(null);
                setCategorySearch('');
              }}
              className={`p-1.5 transition-colors ${
                isTechTheme 
                  ? 'rounded-none border border-accent/40 bg-accent/10 text-accent hover:bg-accent/20' 
                  : 'rounded-xl bg-white/10 text-text-muted hover:bg-white/20 hover:text-white'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Buscador de Categorías */}
          <div className="relative mb-4">
            <Search className={`w-4 h-4 absolute left-3 top-3 ${isTechTheme ? 'text-accent/60' : 'text-text-muted'}`} />
            <input
              type="text"
              placeholder="Buscar categoría..."
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              onFocus={() => stopListening()}
              className={`w-full pl-9 pr-3 py-2.5 text-xs focus:outline-none focus:border-accent ${
                isTechTheme
                  ? 'rounded-none bg-black border border-accent text-accent font-mono placeholder:text-accent/40'
                  : 'rounded-xl bg-white/10 border border-white/15 text-white'
              }`}
            />
          </div>

          {/* Grid de 2 Columnas de Categorías (content-start evita que se estiren al buscar) */}
          <div className="flex-1 overflow-y-auto grid grid-cols-2 content-start auto-rows-max gap-2.5 pr-1 scrollbar-hide">
            {allCategories
              .filter(c => c.label.toLowerCase().includes(categorySearch.toLowerCase()))
              .map((cat) => {
                const currentCategory = parsedResults[showCategoryPickerIdx] && !('kind' in parsedResults[showCategoryPickerIdx]) 
                  ? (parsedResults[showCategoryPickerIdx] as ParsedVoiceResult).category 
                  : '';
                const isSelected = currentCategory === cat.label;

                return (
                  <button
                    key={cat.label}
                    type="button"
                    onClick={() => {
                      handleUpdateItem(showCategoryPickerIdx, 'category', cat.label);
                      setShowCategoryPickerIdx(null);
                      setCategorySearch('');
                    }}
                    className={`flex items-center gap-2.5 p-3 text-left text-xs transition-all ${
                      isTechTheme ? 'rounded-none font-mono' : 'rounded-xl font-semibold'
                    } ${
                      isSelected
                        ? isTechTheme
                          ? 'bg-accent/20 border-2 border-accent text-accent font-bold shadow-lg'
                          : 'bg-accent/25 border-2 border-accent text-accent font-bold shadow-lg'
                        : isTechTheme
                          ? 'bg-black/60 border border-accent/30 hover:bg-accent/10 text-accent/80'
                          : 'bg-white/5 border border-white/10 hover:bg-white/15 text-text-primary'
                    }`}
                  >
                    <div className={`w-8 h-8 flex items-center justify-center shrink-0 ${
                      isTechTheme ? 'rounded-none bg-accent/10 border border-accent/30' : 'rounded-lg bg-accent/15'
                    }`}>
                      <CategoryIcon icon={cat.icon || cat.label} label={cat.label} className="w-4 h-4 text-accent" />
                    </div>
                    <span className="truncate font-semibold">{cat.label}</span>
                  </button>
                );
              })}
          </div>
        </div>
      </div>
    )}
  </div>,
    document.body
  );
}
