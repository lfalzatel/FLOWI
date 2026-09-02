'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '@/components/ThemeProvider';
import { Mic, MicOff, X, Sparkles, Check, RefreshCw, Keyboard, AlertCircle, Trash2, Layers } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCategories } from '@/hooks/useCategories';
import { detectUserLocaleAndCurrency } from '@/lib/geoUtils';
import { parseMultiVoiceTransaction, ParsedVoiceResult } from '@/lib/voiceParser';
import { addExpense, addDebt } from '@/lib/firestore';
import { formatCurrency } from '@/lib/format';
import { CategoryIcon } from '@/components/CategoryIcon';

interface VoiceAssistantModalProps {
  onClose: () => void;
  onSelectParsed: (result: ParsedVoiceResult) => void;
  onOpenManual: () => void;
  onSuccessBulk?: () => void;
}

export function VoiceAssistantModal({ onClose, onSelectParsed, onOpenManual, onSuccessBulk }: VoiceAssistantModalProps) {
  const { theme } = useTheme();
  const { user, profile } = useAuth();
  const { allCategories } = useCategories();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [parsedResults, setParsedResults] = useState<ParsedVoiceResult[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savingBulk, setSavingBulk] = useState(false);

  const recognitionRef = useRef<any>(null);

  // Iniciar reconocimiento de voz de forma dinámica
  const startListening = () => {
    setTranscript('');
    setParsedResults([]);
    setErrorMsg(null);

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMsg('El micrófono nativo no está disponible en este navegador. Puedes usar el modo teclado.');
      return;
    }

    // Cancelar cualquier instancia previa
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
    startListening();
    return () => {
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
    }
  }, [isListening, transcript, allCategories]);

  const handleRemoveResult = (index: number) => {
    setParsedResults(prev => prev.filter((_, i) => i !== index));
  };

  const handleConfirmSingle = () => {
    if (parsedResults.length === 1) {
      onSelectParsed(parsedResults[0]);
    } else {
      onOpenManual();
    }
  };

  const handleSaveAllBulk = async () => {
    if (!user || parsedResults.length === 0) return;
    setSavingBulk(true);
    try {
      for (const res of parsedResults) {
        if (!res.amount || res.amount <= 0) continue;

        if (res.type === 'deuda') {
          await addDebt({
            userId: user.uid,
            title: res.description || `Deuda con ${res.debtPerson || 'persona'}`,
            totalAmount: res.amount,
            paidAmount: 0,
            status: 'pending',
          });
        } else {
          await addExpense({
            userId: user.uid,
            amount: res.amount,
            type: res.type,
            category: res.category,
            description: res.description,
            date: new Date(),
            isFixed: res.isFixed,
          });
        }
      }
      if (onSuccessBulk) onSuccessBulk();
      onClose();
    } catch (err) {
      console.error('Error al guardar masivo por voz:', err);
      setErrorMsg('Ocurrió un error guardando las transacciones.');
    } finally {
      setSavingBulk(false);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 ${isTechTheme ? 'font-mono text-sm' : ''}`}>
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 ${theme === 'light' ? 'bg-black/30 backdrop-blur-xs' : 'bg-black/70 backdrop-blur-md'}`} 
        onClick={onClose} 
      />

      <div 
        className={`w-full max-w-md relative z-10 animate-fade-in-up p-6 glass-dropdown flex flex-col items-center text-center max-h-[90vh] overflow-y-auto ${
          isTechTheme ? 'rounded-none border border-accent bg-deep uppercase' : 'rounded-3xl shadow-2xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
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

        {/* Título */}
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-accent animate-pulse" />
          <h2 className={`font-bold text-lg ${isTechTheme ? 'text-accent tracking-wider font-mono' : 'text-text-primary font-syne'}`}>
            Asistente de Voz IA
          </h2>
        </div>
        <p className={`text-xs mb-4 max-w-xs ${isTechTheme ? 'text-accent/70 font-mono' : 'text-text-secondary'}`}>
          Dicta uno o múltiples gastos, ingresos y deudas de forma natural.
        </p>

        {/* Círculo Principal de Micrófono & Ondas */}
        <div className="relative my-2 flex items-center justify-center">
          {isListening && (
            <>
              <div className="absolute w-32 h-32 rounded-full bg-accent/20 animate-ping opacity-75" />
              <div className="absolute w-24 h-24 rounded-full bg-accent/30 animate-pulse" />
            </>
          )}

          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl cursor-pointer ${
              isListening 
                ? (isTechTheme ? 'bg-accent text-black scale-110 shadow-[0_0_40px_rgba(0,229,160,0.8)]' : 'bg-red-500 text-white scale-110 shadow-[0_0_35px_rgba(239,68,68,0.7)]')
                : (isTechTheme ? 'bg-accent/20 border-2 border-accent text-accent hover:bg-accent/30' : 'bg-gradient-to-tr from-accent to-accent-dim text-black hover:scale-105 shadow-accent/40')
            }`}
          >
            {isListening ? (
              <Mic className="w-9 h-9 animate-bounce text-black" />
            ) : (
              <MicOff className="w-8 h-8" />
            )}
          </button>
        </div>

        {/* Estado en Texto */}
        <div className="my-2 min-h-[2.5rem] flex flex-col items-center justify-center">
          {isListening ? (
            <span className={`text-xs font-bold animate-pulse ${isTechTheme ? 'text-accent' : 'text-accent'}`}>
              🎙️ Escuchando... Di ej. "Recibí 1.5M pero gasté 45 mil en mercado"
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

        {/* Mensaje de Error / Estado */}
        {errorMsg && (
          <div className="my-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2 w-full">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Vista previa de los Datos Parseados (Individual o Múltiple) */}
        {parsedResults.length > 0 && (
          <div className="w-full my-3 space-y-2">
            {parsedResults.length > 1 && (
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-accent flex items-center gap-1.5">
                  <Layers className="w-4 h-4" />
                  <span>{parsedResults.length} Transacciones Detectadas</span>
                </span>
                <span className="text-[10px] text-text-muted">Desglose IA</span>
              </div>
            )}

            {parsedResults.map((res, idx) => (
              <div 
                key={idx} 
                className={`w-full p-3 text-left transition-all relative group ${
                  isTechTheme ? 'bg-accent/10 border border-accent/40 font-mono' : 'bg-white/5 border border-white/10 rounded-2xl'
                }`}
              >
                {parsedResults.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveResult(idx)}
                    title="Eliminar esta transacción"
                    className="absolute top-2 right-2 p-1 text-red-400/60 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

                <div className="flex justify-between items-start mb-1 pr-6">
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
                    res.type === 'ingreso' ? 'text-emerald-400' : 'text-accent'
                  }`}>
                    {res.amount ? formatCurrency(res.amount, profile?.currency) : 'Monto no detectado'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Botones de Acción */}
        <div className="w-full space-y-2 mt-2">
          {parsedResults.length > 1 ? (
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
              <Check className="w-5 h-5" />
              <span>{savingBulk ? 'Guardando masivo...' : `Guardar Todas (${parsedResults.length})`}</span>
            </button>
          ) : parsedResults.length === 1 ? (
            <button
              type="button"
              onClick={handleConfirmSingle}
              className={`w-full py-3.5 px-4 font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                isTechTheme 
                  ? 'bg-accent/20 border border-accent text-accent hover:bg-accent/30 font-mono uppercase tracking-wider' 
                  : 'bg-gradient-to-r from-accent to-accent-dim text-black rounded-xl shadow-lg shadow-accent/25 hover:opacity-90 font-syne'
              }`}
            >
              <Check className="w-5 h-5" />
              <span>Confirmar y Guardar</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={startListening}
              className={`w-full py-3 px-4 text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                isTechTheme 
                  ? 'bg-accent/10 border border-accent/30 text-accent hover:bg-accent/20 font-mono' 
                  : 'bg-white/10 text-text-primary hover:bg-white/20 rounded-xl'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${isListening ? 'animate-spin' : ''}`} />
              <span>{isListening ? 'Escuchando...' : 'Volver a Dictar / Hablar'}</span>
            </button>
          )}

          {/* Opción alternar a Teclado Manual */}
          <button
            type="button"
            onClick={onOpenManual}
            className={`w-full py-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              isTechTheme ? 'text-accent/60 hover:text-accent font-mono' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>Ingresar manualmente por teclado (+)</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
