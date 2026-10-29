'use client';
import { useEffect, useState } from 'react';
import { Sparkles, Check, Unplug } from 'lucide-react';
import { AI_CALLBACK_PATH, completeOpenRouterConnect, disconnectAi, getAiKey, startOpenRouterConnect } from '@/lib/aiAssist';

// Tarjeta de Configuración para conectar la IA gratuita (cuenta OpenRouter del propio usuario)
export function AiAssistantSettings({ isTechTheme }: { isTechTheme: boolean }) {
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'error' | 'success'>('idle');

  useEffect(() => {
    setConnected(!!getAiKey());
    // Regreso desde OpenRouter con ?code=...
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (!code) return;
    window.history.replaceState(null, '', AI_CALLBACK_PATH);
    setStatus('connecting');
    completeOpenRouterConnect(code)
      .then(ok => {
        setConnected(ok);
        setStatus(ok ? 'success' : 'error');
      })
      .catch(() => setStatus('error'));
  }, []);

  const handleDisconnect = () => {
    disconnectAi();
    setConnected(false);
    setStatus('idle');
  };

  const mono = isTechTheme ? 'font-mono' : '';

  return (
    <section className="space-y-3">
      <h2 className={`${isTechTheme ? 'font-mono font-bold text-sm text-accent uppercase tracking-wide border-b border-accent/20 pb-1' : 'font-syne font-semibold text-sm text-text-secondary ml-2'}`}>
        Asistente de voz con IA
      </h2>
      <div className={`p-4 space-y-3 ${isTechTheme ? 'border border-accent/20 rounded-none bg-deep' : 'glass-card rounded-2xl'}`}>
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 shrink-0 flex items-center justify-center ${isTechTheme ? 'border border-accent/20 rounded-none bg-accent/5' : 'rounded-xl bg-accent/10'}`}>
            <Sparkles className="w-4 h-4 text-accent" />
          </div>
          <div className={`text-left ${mono}`}>
            <p className="text-sm font-medium text-text-primary normal-case">
              {connected ? 'IA conectada' : 'Mejora el dictado con IA gratis (opcional)'}
            </p>
            <p className="text-[11px] text-text-muted normal-case leading-relaxed mt-0.5">
              {connected
                ? 'Cuando el asistente no entienda una frase, la consultará con modelos gratuitos usando tu cuenta de OpenRouter. Siempre podrás revisar antes de guardar.'
                : 'Conecta tu cuenta gratuita de OpenRouter (puedes crearla con Google en un minuto). No pagas nada: solo se usan modelos gratuitos y la conexión queda guardada solo en este dispositivo.'}
            </p>
          </div>
        </div>

        {status === 'connecting' && <p className={`text-[11px] text-text-secondary ${mono}`}>Conectando…</p>}
        {status === 'success' && <p className={`text-[11px] text-emerald-400 ${mono}`}>Listo: tu IA quedó conectada.</p>}
        {status === 'error' && <p className={`text-[11px] text-red-400 ${mono}`}>No se pudo conectar. Inténtalo de nuevo.</p>}

        {connected ? (
          <div className="flex items-center justify-between gap-2">
            <span className={`flex items-center gap-1.5 text-[11px] text-emerald-400 ${mono}`}>
              <Check className="w-3.5 h-3.5" /> Activa en este dispositivo
            </span>
            <button
              type="button"
              onClick={handleDisconnect}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold border border-glass-border text-text-secondary hover:text-text-primary ${isTechTheme ? 'rounded-none font-mono' : 'rounded-lg'}`}
            >
              <Unplug className="w-3.5 h-3.5" /> Desconectar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => startOpenRouterConnect()}
            className={`w-full py-2.5 text-sm font-bold bg-accent/15 border border-accent text-accent hover:bg-accent/25 transition-colors ${isTechTheme ? 'rounded-none font-mono uppercase tracking-wider' : 'rounded-xl'}`}
          >
            Conectar IA gratis
          </button>
        )}

        <p className={`text-[10px] text-text-muted normal-case leading-relaxed ${mono}`}>
          Privacidad: al usar la IA, la frase dictada se envía al modelo gratuito elegido por OpenRouter, que podría usarla para mejorar sus servicios. Si no la conectas, todo se procesa en tu dispositivo.
        </p>
      </div>
    </section>
  );
}
