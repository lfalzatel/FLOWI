'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '@/components/ThemeProvider';
import { Mic, MicOff, X, Sparkles, Check, RefreshCw, Keyboard, ArrowRight, Wallet, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCategories } from '@/hooks/useCategories';
import { detectUserLocaleAndCurrency } from '@/lib/geoUtils';
import { parseVoiceTransaction, ParsedVoiceResult } from '@/lib/voiceParser';
import { formatCurrency } from '@/lib/format';
import { CategoryIcon } from '@/components/CategoryIcon';

interface VoiceAssistantModalProps {
  onClose: () => void;
  onSelectParsed: (result: ParsedVoiceResult) => void;
  onOpenManual: () => void;
}

export function VoiceAssistantModal({ onClose, onSelectParsed, onOpenManual }: VoiceAssistantModalProps) {
  const { theme } = useTheme();
  const { profile } = useAuth();
  const { allCategories } = useCategories();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [parsedResult, setParsedResult] = useState<ParsedVoiceResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef<any>(null);

  // Configuración de idioma e inicio de micrófono
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      setErrorMsg('El micrófono nativo no está disponible en este navegador. Puedes usar el modo teclado.');
      return;
    }

    const locale = detectUserLocaleAndCurrency(profile?.currency);
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = locale.language || 'es-CO';

    recognition.onstart = () => {
      setIsListening(true);
      setErrorMsg(null);
    };

    recognition.onresult = (event: any) => {
      let currentTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript;
      }
      setTranscript(currentTranscript);
    };

    recognition.onerror = (event: any) => {
      console.warn('Error en reconocimiento de voz:', event.error);
      setIsListening(false);
      if (event.error === 'no-speech') {
        setErrorMsg('No escuchamos ningún audio. Intenta hablar nuevamente cerca al micrófono.');
      } else if (event.error === 'not-allowed') {
        setErrorMsg('Permiso de micrófono denegado en tu navegador.');
      } else {
        setErrorMsg('No pudimos procesar el audio. Puedes dictar de nuevo o ingresar por teclado.');
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    startListening();

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, [profile?.currency]);

  // Al finalizar la transcripción, procesar con el parser inteligente
  useEffect(() => {
    if (transcript.trim() && !isListening) {
      const parsed = parseVoiceTransaction(transcript, allCategories);
      setParsedResult(parsed);
    }
  }, [isListening, transcript, allCategories]);

  const startListening = () => {
    setTranscript('');
    setParsedResult(null);
    setErrorMsg(null);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        // En caso de que ya estuviera activo
        try {
          recognitionRef.current.stop();
          recognitionRef.current.start();
        } catch (err) {}
      }
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

  const handleConfirm = () => {
    if (parsedResult) {
      onSelectParsed(parsedResult);
    } else {
      onOpenManual();
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
        className={`w-full max-w-md relative z-10 animate-fade-in-up p-6 glass-dropdown flex flex-col items-center text-center ${
          isTechTheme ? 'rounded-none border border-accent bg-deep uppercase' : 'rounded-3xl shadow-2xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón cerrar */}
        <button 
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
        <p className={`text-xs mb-6 max-w-xs ${isTechTheme ? 'text-accent/70 font-mono' : 'text-text-secondary'}`}>
          Dicta tu gasto, ingreso o deuda de forma natural.
        </p>

        {/* Círculo Principal de Micrófono & Ondas */}
        <div className="relative my-4 flex items-center justify-center">
          {/* Anillos de pulso cuando está escuchando */}
          {isListening && (
            <>
              <div className="absolute w-36 h-36 rounded-full bg-accent/20 animate-ping opacity-75" />
              <div className="absolute w-28 h-28 rounded-full bg-accent/30 animate-pulse" />
            </>
          )}

          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl ${
              isListening 
                ? (isTechTheme ? 'bg-accent text-black scale-110 shadow-[0_0_40px_rgba(0,229,160,0.8)]' : 'bg-red-500 text-white scale-110 shadow-[0_0_35px_rgba(239,68,68,0.7)]')
                : (isTechTheme ? 'bg-accent/20 border-2 border-accent text-accent hover:bg-accent/30' : 'bg-gradient-to-tr from-accent to-accent-dim text-black hover:scale-105 shadow-accent/40')
            }`}
          >
            {isListening ? (
              <Mic className="w-10 h-10 animate-bounce" />
            ) : (
              <MicOff className="w-9 h-9" />
            )}
          </button>
        </div>

        {/* Estado en Texto */}
        <div className="my-3 min-h-[3rem] flex flex-col items-center justify-center">
          {isListening ? (
            <span className={`text-xs font-bold animate-pulse ${isTechTheme ? 'text-accent' : 'text-accent'}`}>
              🎙️ Escuchando... Di ej. "Gasté 45 mil en Frisby"
            </span>
          ) : transcript ? (
            <span className={`text-xs font-medium italic max-w-xs ${isTechTheme ? 'text-accent/90' : 'text-text-primary'}`}>
              "{transcript}"
            </span>
          ) : (
            <span className={`text-xs ${isTechTheme ? 'text-accent/60' : 'text-text-muted'}`}>
              Toca el micrófono para comenzar a dictar
            </span>
          )}
        </div>

        {/* Mensaje de Error / No soportado */}
        {errorMsg && (
          <div className="my-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Vista previa de los Datos Parseados por la IA */}
        {parsedResult && (
          <div className={`w-full my-4 p-4 text-left transition-all animate-fade-in-up ${
            isTechTheme ? 'bg-accent/10 border border-accent/40 font-mono' : 'bg-white/5 border border-white/10 rounded-2xl'
          }`}>
            <div className="flex justify-between items-start mb-2">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${
                parsedResult.type === 'ingreso' ? 'text-emerald-400' : parsedResult.type === 'deuda' ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {parsedResult.type.toUpperCase()} DETECTADO
              </span>
              {parsedResult.isFixed && (
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-bold uppercase">
                  Gasto Fijo
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <CategoryIcon icon={parsedResult.category} label={parsedResult.category} className="w-8 h-8 text-xl flex items-center justify-center flex-shrink-0" />
              <div className="flex-1 truncate">
                <p className={`text-sm font-bold truncate ${isTechTheme ? 'text-accent' : 'text-text-primary'}`}>
                  {parsedResult.category}
                </p>
                <p className={`text-xs truncate ${isTechTheme ? 'text-accent/70' : 'text-text-muted'}`}>
                  {parsedResult.description}
                </p>
              </div>
              <p className={`text-base font-bold ${
                parsedResult.type === 'ingreso' ? 'text-emerald-400' : 'text-accent'
              }`}>
                {parsedResult.amount ? formatCurrency(parsedResult.amount, profile?.currency) : 'Monto no detectado'}
              </p>
            </div>
          </div>
        )}

        {/* Botones de Acción */}
        <div className="w-full space-y-2 mt-4">
          {parsedResult ? (
            <button
              type="button"
              onClick={handleConfirm}
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
              disabled={isListening}
              className={`w-full py-3 px-4 text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 ${
                isTechTheme 
                  ? 'bg-accent/10 border border-accent/30 text-accent hover:bg-accent/20 font-mono' 
                  : 'bg-white/10 text-text-primary hover:bg-white/20 rounded-xl'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${isListening ? 'animate-spin' : ''}`} />
              <span>{isListening ? 'Escuchando...' : 'Volver a Dictar'}</span>
            </button>
          )}

          {/* Opción alternar a Teclado Manual */}
          <button
            type="button"
            onClick={onOpenManual}
            className={`w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
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
