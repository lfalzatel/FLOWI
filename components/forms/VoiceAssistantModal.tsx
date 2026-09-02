'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/components/ThemeProvider';
import { Mic, MicOff, X, Sparkles, Check, RefreshCw, Keyboard, AlertCircle, Trash2, Layers, Edit2, Compass, StickyNote, Bell, ArrowRight, Search, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useAuth } from '@/hooks/useAuth';
import { useCategories } from '@/hooks/useCategories';
import { detectUserLocaleAndCurrency } from '@/lib/geoUtils';
import { parseMultiVoiceTransaction, ParsedVoiceResult, ParsedVoiceItem, ParsedVoiceCommand, speakText } from '@/lib/voiceParser';
import { addExpense, addDebt, addNote, addReminder } from '@/lib/firestore';
import { formatCurrency } from '@/lib/format';
import { CategoryIcon } from '@/components/CategoryIcon';
import { triggerPowerAnimation } from '@/components/dashboard/PowerAnimation';

interface VoiceAssistantModalProps {
  onClose: () => void;
  onSelectParsed: (result: ParsedVoiceResult) => void;
  onOpenManual: () => void;
  onSuccessBulk?: () => void;
}

export function VoiceAssistantModal({ onClose, onSelectParsed, onOpenManual, onSuccessBulk }: VoiceAssistantModalProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const { user, profile } = useAuth();
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

  // Iniciar reconocimiento de voz de forma dinámica
  const startListening = () => {
    // Interrupción INMEDIATA de cualquier voz parlante de FLOWI al encender el micrófono
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }

    setTranscript('');
    if (!pendingAction) {
      setParsedResults([]);
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
    
    // Encender el micrófono ÚNICAMENTE cuando la voz parlante termine de hablar (0 solapamiento)
    speakText(greetingText, locale.language, () => {
      startListening();
    });

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
          let dueDate = '';
          if (/\bmañana\b/i.test(text)) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            dueDate = tomorrow.toISOString().split('T')[0];
          } else if (/\bhoy\b/i.test(text)) {
            dueDate = new Date().toISOString().split('T')[0];
          }

          const reminderCmd: ParsedVoiceCommand = {
            kind: 'command',
            action: 'create_reminder',
            targetUrl: '/servicios/recordatorios',
            title: 'Nuevo Recordatorio 🔔',
            content: text.charAt(0).toUpperCase() + text.slice(1),
            dueDate,
            time: '20:00',
            label: 'Guardar Recordatorio',
            rawText: text
          };
          setParsedResults([reminderCmd]);
          setPendingAction(null);
          setTranscript('');
          return;
        }

        if (pendingAction === 'create_note') {
          const noteCmd: ParsedVoiceCommand = {
            kind: 'command',
            action: 'create_note',
            targetUrl: '/servicios/notas',
            title: 'Nueva Nota 📝',
            content: text.charAt(0).toUpperCase() + text.slice(1),
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

      // Si es una pregunta de seguimiento (ask_followup), APAGAR micrófono y LIMPIAR transcript para romper bucles
      if (results.length === 1 && 'kind' in results[0] && results[0].kind === 'command') {
        const cmd = results[0] as ParsedVoiceCommand;
        if (cmd.action === 'ask_followup' && cmd.prompt) {
          stopListening();
          setTranscript(''); // Limpiar la palabra clave para que no persista

          const promptLower = cmd.prompt.toLowerCase();
          if (promptLower.includes('recordar')) setPendingAction('create_reminder');
          else if (promptLower.includes('anotar')) setPendingAction('create_note');
          else if (promptLower.includes('ingreso')) setPendingAction('create_income');
          else if (promptLower.includes('gasto')) setPendingAction('create_expense');

          const locale = detectUserLocaleAndCurrency(profile?.currency);
          speakText(cmd.prompt, locale.language, () => {
            startListening();
          });
        }
      }
    }
  }, [isListening, transcript, allCategories, profile, pendingAction]);

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
            speakText('Nota guardada con éxito', locale.language);
            if (cmd.targetUrl) router.push(cmd.targetUrl);
          } else if (cmd.action === 'create_reminder') {
            await addReminder({
              userId: user.uid,
              title: cmd.content || cmd.title || 'Recordatorio por voz',
              description: cmd.rawText,
              type: cmd.frequency || 'once',
              date: cmd.dueDate || undefined,
              time: cmd.time || '20:00',
              sound: true,
              pushEnabled: true,
              inAppEnabled: true,
              active: true,
            });
            speakText('Recordatorio agendado con éxito', locale.language);
            if (cmd.targetUrl) router.push(cmd.targetUrl);
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
            date: new Date(),
            isFixed: tx.isFixed,
          });
        }
      }

      // Determinar si aplica disparo de confeti (múltiples transacciones, notas o recordatorios)
      const isConfettiEnabled = typeof window !== 'undefined' ? localStorage.getItem('anim_confetti_enabled') !== 'false' : true;
      const isMultipleTx = parsedResults.length > 1;
      const isReminder = parsedResults.some(r => 'kind' in r && r.kind === 'command' && r.action === 'create_reminder');
      const isNote = parsedResults.some(r => 'kind' in r && r.kind === 'command' && r.action === 'create_note');
      const shouldFireConfetti = isConfettiEnabled && (isMultipleTx || isReminder || isNote);

      if (shouldFireConfetti) {
        try {
          confetti({
            particleCount: 90,
            spread: 80,
            origin: { y: 0.5 },
            colors: ['#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6']
          });
        } catch (e) {}
        setShowSuccessAnim(true);
      } else if (parsedResults.length === 1 && (!('kind' in parsedResults[0]) || parsedResults[0].kind === 'transaction')) {
        // Disparar la animación Power Card 3D holográfica + trayectoria de partículas estándar
        const tx = parsedResults[0] as ParsedVoiceResult;
        if (tx.amount && tx.amount > 0) {
          const animType = tx.type === 'ingreso' ? 'ingreso' : 'gasto';
          triggerPowerAnimation(tx.amount, animType);
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
        }, 400);
      });
    } catch (err) {
      console.error('Error guardando por voz:', err);
      setErrorMsg('Error al guardar. Intenta nuevamente.');
    } finally {
      setSavingBulk(false);
    }
  };

  if (typeof document === 'undefined') return null;

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

        <p className={`text-xs max-w-xs mb-4 ${isTechTheme ? 'text-accent/70' : 'text-text-muted'}`}>
          Dicta transacciones, comandos como "abrir estadísticas" o crea notas y recordatorios.
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
              Toca el botón de micrófono amarillo para hablar
            </span>
          )}
        </div>

        {/* Mensaje de Error */}
        {errorMsg && (
          <div className="my-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2 w-full">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Vista previa de los Datos Parseados */}
        {parsedResults.length > 0 && (
          <div className="w-full my-3 space-y-2 max-h-56 overflow-y-auto scrollbar-hide pr-1">
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
                  {/* Botones editar / eliminar en la esquina */}
                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    {!isCommand && (
                      <button
                        type="button"
                        onClick={() => {
                          stopListening();
                          setEditingIdx(editingIdx === idx ? null : idx);
                        }}
                        title="Editar detalles"
                        className="p-1 text-accent/70 hover:text-accent transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
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
                      <div className="flex items-center gap-1.5 mb-1 text-[9px] font-bold uppercase tracking-wider text-amber-400">
                        {cmd.action === 'navigate' ? <Compass className="w-3 h-3 text-blue-400" /> : cmd.action === 'create_note' ? <StickyNote className="w-3 h-3 text-purple-400 animate-pulse" /> : <Bell className="w-3 h-3 text-amber-400 animate-pulse" />}
                        <span>
                          {cmd.action === 'ask_followup' 
                            ? (cmd.prompt?.includes('anotar') ? '📝 NUEVA NOTA (ESCUCHANDO DETALLES)' : '🔔 NUEVO RECORDATORIO (ESCUCHANDO DETALLES)')
                            : cmd.action === 'create_reminder' ? '🔔 RECORDATORIO DETECTADO'
                            : cmd.action === 'create_note' ? '📝 NOTA IMPORTANTE DETECTADA'
                            : 'COMANDO DE VOZ IA'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                          {cmd.action === 'navigate' ? <Compass className="w-5 h-5 text-blue-400" /> : cmd.action === 'create_note' ? <StickyNote className="w-5 h-5 text-purple-400" /> : <Bell className="w-5 h-5 text-amber-400" />}
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
                  ) : res ? (
                    /* Renderizado de Transacciones Estándar */
                    <div>
                      <div className="flex flex-col items-start gap-1 mb-1 pr-14">
                        <span className="text-[8px] text-amber-300 font-medium">
                          💡 Toca la etiqueta para convertir a {res.type === 'gasto' ? 'Ingreso 🟢' : 'Gasto 🔴'}
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
                            <span>{res.type.toUpperCase()} DETECTADO</span>
                            <RefreshCw className="w-2.5 h-2.5 opacity-70" />
                          </button>
                          {res.isFixed && res.type === 'gasto' && (
                            <span className="text-[8px] px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-400 font-bold uppercase">
                              Gasto Fijo
                            </span>
                          )}
                        </div>
                      </div>

                      {editingIdx === idx ? (
                        /* Modo Edición Rápida Inline */
                        <div className="space-y-2 mt-2 pt-2 border-t border-white/10">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-text-muted block mb-0.5">Monto</label>
                              <input 
                                type="number"
                                value={res.amount || ''}
                                onFocus={() => stopListening()}
                                onChange={(e) => handleUpdateItem(idx, 'amount', parseFloat(e.target.value) || 0)}
                                className="w-full bg-black/40 border border-white/20 p-1.5 rounded text-xs font-bold text-accent"
                              />
                            </div>
                            <div className="relative">
                              <label className="text-[10px] text-text-muted block mb-0.5">Categoría</label>
                              <button
                                type="button"
                                onClick={() => {
                                  stopListening();
                                  setShowCategoryPickerIdx(showCategoryPickerIdx === idx ? null : idx);
                                }}
                                className={`w-full flex items-center justify-between p-1.5 rounded text-xs border truncate ${
                                  isTechTheme ? 'bg-black/60 border-accent/40 text-accent font-mono' : 'bg-black/40 border-white/20 text-text-primary'
                                }`}
                              >
                                <span className="flex items-center gap-1.5 truncate">
                                  <CategoryIcon icon={res.category} label={res.category} className="w-3.5 h-3.5 text-accent shrink-0" />
                                  <span className="truncate">{res.category || 'Seleccionar'}</span>
                                </span>
                                <ChevronDown className="w-3.5 h-3.5 opacity-60 shrink-0" />
                              </button>

                              {showCategoryPickerIdx === idx && (
                                <div className={`absolute top-full right-0 left-[-80%] sm:left-0 z-50 mt-1 p-2.5 shadow-2xl border backdrop-blur-xl rounded-2xl animate-fade-in-up w-[220px] ${
                                  isTechTheme ? 'bg-black border-accent font-mono' : 'bg-gray-900/95 border-white/25 text-white'
                                }`}>
                                  {/* Buscador de Categorías */}
                                  <div className="relative mb-2">
                                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-text-muted" />
                                    <input
                                      type="text"
                                      placeholder="Buscar categoría..."
                                      value={categorySearch}
                                      onChange={(e) => setCategorySearch(e.target.value)}
                                      onFocus={() => stopListening()}
                                      className="w-full pl-8 pr-2 py-1 text-[11px] rounded-lg bg-white/10 border border-white/15 text-white focus:outline-none focus:border-accent"
                                    />
                                  </div>

                                  {/* Grid de 2 Columnas con Íconos */}
                                  <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto scrollbar-hide">
                                    {allCategories
                                      .filter(c => c.label.toLowerCase().includes(categorySearch.toLowerCase()))
                                      .map((cat) => (
                                        <button
                                          key={cat.label}
                                          type="button"
                                          onClick={() => {
                                            handleUpdateItem(idx, 'category', cat.label);
                                            setShowCategoryPickerIdx(null);
                                            setCategorySearch('');
                                          }}
                                          className={`flex items-center gap-1.5 p-1.5 rounded-lg text-left text-[10px] transition-all truncate ${
                                            res.category === cat.label
                                              ? 'bg-accent/25 border border-accent text-accent font-bold'
                                              : 'bg-white/5 hover:bg-white/15 text-text-primary'
                                          }`}
                                        >
                                          <CategoryIcon icon={cat.icon || cat.label} label={cat.label} className="w-3.5 h-3.5 text-accent shrink-0" />
                                          <span className="truncate">{cat.label}</span>
                                        </button>
                                      ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] text-text-muted block mb-0.5">Descripción</label>
                            <input 
                              type="text"
                              value={res.description}
                              onFocus={() => stopListening()}
                              onChange={(e) => handleUpdateItem(idx, 'description', e.target.value)}
                              className="w-full bg-black/40 border border-white/20 p-1.5 rounded text-xs text-text-primary"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => setEditingIdx(null)}
                            className="w-full py-1 text-[11px] font-bold bg-accent/20 border border-accent text-accent rounded flex items-center justify-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Listo</span>
                          </button>
                        </div>
                      ) : (
                        /* Modo Visualización Estándar */
                        <div className="flex items-center gap-2.5">
                          <CategoryIcon icon={res.category} label={res.category} className="w-7 h-7 text-lg flex items-center justify-center flex-shrink-0" />
                          <div className="flex-1 truncate">
                            <p className={`text-xs font-bold truncate ${isTechTheme ? 'text-accent' : 'text-text-primary'}`}>
                              {res.category}
                            </p>
                            <p className={`text-[11px] truncate ${isTechTheme ? 'text-accent/70' : 'text-text-muted'}`}>
                              {res.description}
                            </p>
                          </div>
                          <p className={`text-sm font-bold ${
                            res.type === 'ingreso' ? 'text-emerald-400' : res.type === 'deuda' ? 'text-yellow-400' : 'text-red-400'
                          }`}>
                            {res.amount ? formatCurrency(res.amount, profile?.currency) : 'Sin $'}
                          </p>
                        </div>
                      )}
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
  </div>,
    document.body
  );
}
