'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/components/ThemeProvider';
import { Mic, MicOff, X, Sparkles, Check, RefreshCw, Keyboard, AlertCircle, Trash2, Layers, Edit2, Compass, StickyNote, Bell, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useAuth } from '@/hooks/useAuth';
import { useCategories } from '@/hooks/useCategories';
import { detectUserLocaleAndCurrency } from '@/lib/geoUtils';
import { parseMultiVoiceTransaction, ParsedVoiceResult, ParsedVoiceItem, ParsedVoiceCommand, speakText } from '@/lib/voiceParser';
import { addExpense, addDebt, addNote, addReminder } from '@/lib/firestore';
import { formatCurrency } from '@/lib/format';
import { CategoryIcon } from '@/components/CategoryIcon';

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

  const recognitionRef = useRef<any>(null);

  // Iniciar reconocimiento de voz de forma dinámica
  const startListening = () => {
    setTranscript('');
    setParsedResults([]);
    setEditingIdx(null);
    setErrorMsg(null);

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMsg('El micrófono nativo no está disponible en este navegador. Puedes usar el modo teclado.');
      return;
    }

    if (recognitionRef.current) {
      try {
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
      const results = parseMultiVoiceTransaction(transcript, allCategories);
      setParsedResults(results);

      // Si es una pregunta de seguimiento (ask_followup), APAGAR micrófono y LIMPIAR transcript para romper bucles
      if (results.length === 1 && 'kind' in results[0] && results[0].kind === 'command') {
        const cmd = results[0] as ParsedVoiceCommand;
        if (cmd.action === 'ask_followup' && cmd.prompt) {
          stopListening();
          setTranscript(''); // Limpiar la palabra clave para que no persista
          const locale = detectUserLocaleAndCurrency(profile?.currency);
          speakText(cmd.prompt, locale.language, () => {
            startListening();
          });
        }
      }
    }
  }, [isListening, transcript, allCategories, profile]);

  const handleRemoveResult = (index: number) => {
    setParsedResults(prev => prev.filter((_, i) => i !== index));
    if (editingIdx === index) setEditingIdx(null);
  };

  const handleUpdateItem = (index: number, key: string, val: any) => {
    setParsedResults(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [key]: val } as ParsedVoiceItem;
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

      // Lluvia de confeti y animación visual de éxito 🎉
      try {
        confetti({
          particleCount: 90,
          spread: 80,
          origin: { y: 0.5 },
          colors: ['#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6']
        });
      } catch (e) {}

      const locale = detectUserLocaleAndCurrency(profile?.currency);
      speakText('Transacciones guardadas con éxito', locale.language);
      setShowSuccessAnim(true);

      setTimeout(() => {
        if (onSuccessBulk) onSuccessBulk();
        onClose();
      }, 1400);
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
                        onClick={() => setEditingIdx(editingIdx === idx ? null : idx)}
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
                      <div className="flex items-center gap-1.5 mb-1 text-[9px] font-bold text-blue-400 uppercase tracking-wider">
                        <Compass className="w-3 h-3" />
                        <span>COMANDO DE VOZ IA</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                          {cmd.action === 'navigate' ? <Compass className="w-4 h-4" /> : cmd.action === 'create_note' ? <StickyNote className="w-4 h-4 text-purple-400" /> : <Bell className="w-4 h-4 text-amber-400" />}
                        </div>
                        <div className="flex-1 truncate">
                          <p className={`text-xs font-bold truncate ${isTechTheme ? 'text-accent' : 'text-text-primary'}`}>
                            {cmd.title}
                          </p>
                          <p className="text-[11px] text-text-muted truncate">
                            {cmd.content || cmd.rawText}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : res ? (
                    /* Renderizado de Transacciones Estándar */
                    <div>
                      <div className="flex justify-between items-start mb-1 pr-14">
                        <span className={`text-[9px] font-bold uppercase tracking-wider ${
                          res.type === 'ingreso' ? 'text-emerald-400' : res.type === 'deuda' ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {res.type.toUpperCase()} DETECTADO
                        </span>
                        {res.isFixed && (
                          <span className="text-[8px] px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-400 font-bold uppercase">
                            Gasto Fijo
                          </span>
                        )}
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
                                onChange={(e) => handleUpdateItem(idx, 'amount', parseFloat(e.target.value) || 0)}
                                className="w-full bg-black/40 border border-white/20 p-1.5 rounded text-xs font-bold text-accent"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-text-muted block mb-0.5">Categoría</label>
                              <select
                                value={res.category}
                                onChange={(e) => handleUpdateItem(idx, 'category', e.target.value)}
                                className="w-full bg-black/40 border border-white/20 p-1.5 rounded text-xs text-text-primary"
                              >
                                {allCategories.map((cat) => (
                                  <option key={cat.label} value={cat.label} className="bg-gray-900 text-white">
                                    {cat.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] text-text-muted block mb-0.5">Descripción</label>
                            <input 
                              type="text"
                              value={res.description}
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
          ) : (
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              className={`w-full py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                isTechTheme
                  ? 'border border-accent/40 text-accent hover:bg-accent/10 font-mono uppercase'
                  : 'bg-white/10 text-text-primary hover:bg-white/20 font-syne'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${isListening ? 'animate-spin' : ''}`} />
              <span>{isListening ? 'Detener Micrófono' : 'Dictar por Voz'}</span>
            </button>
          )}

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
