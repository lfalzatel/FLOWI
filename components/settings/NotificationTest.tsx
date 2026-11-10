'use client';
import { useState } from 'react';
import { BellRing, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { testPush, PushTestResult } from '@/lib/push';
import { askForNotifications } from '@/lib/notifPrompt';

// Botón "Enviarme una notificación de prueba": dice en qué paso falla (permiso, celular o servidor)
export function NotificationTest({ isTechTheme }: { isTechTheme: boolean }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PushTestResult | { step: 'error' } | null>(null);

  const run = async () => {
    if (!user) return;
    setBusy(true);
    setResult(null);
    try { setResult(await testPush(user.uid)); }
    catch (e) { console.error(e); setResult({ step: 'error' }); }
    finally { setBusy(false); }
  };

  let text: { ok: boolean; msg: string; tips?: string[] } | null = null;
  if (result?.step === 'permission') {
    text = result.state === 'denied'
      ? { ok: false, msg: 'Este celular tiene bloqueadas las notificaciones de FLOWI.', tips: ['Abre los ajustes del sitio o de la app FLOWI y permite las notificaciones.'] }
      : result.state === 'unsupported'
        ? { ok: false, msg: 'Este navegador no muestra notificaciones. En iPhone, instala FLOWI en la pantalla de inicio.' }
        : { ok: false, msg: 'Aún no has dado permiso de notificaciones. Actívalas arriba y vuelve a probar.' };
  } else if (result?.step === 'no-token') {
    text = { ok: false, msg: 'No se pudo registrar este celular para recibir avisos con la app cerrada.', tips: ['Revisa que "Notificación Push" esté encendida.', 'Abre FLOWI con internet y vuelve a probar.'] };
  } else if (result?.step === 'server') {
    const renewed = result.keyBefore === 'mismatch'
      ? ['Tu celular tenía una suscripción de avisos hecha con otra clave (por eso no te llegaban). Ya la renové.'] : [];
    if (!result.ok) {
      text = { ok: false, msg: `El servidor no pudo enviar el aviso (${result.reason}).`, tips: ['Cierra y abre FLOWI y vuelve a probar.'] };
    } else if (result.received) {
      text = {
        ok: true,
        msg: '¡Funciona! El aviso del servidor llegó a este celular. Deberías ver "Prueba de FLOWI ✓". Los recordatorios te llegarán aun con la app cerrada.',
        tips: [...renewed, 'Si no lo ves en la barra, revisa en los ajustes de Android que las notificaciones de FLOWI no estén silenciadas.'],
      };
    } else {
      text = {
        ok: false,
        msg: 'Google aceptó el aviso, pero no llegó a este celular en 12 segundos.',
        tips: [
          ...renewed,
          'Espera un minuto: a veces llega tarde. Si aparece "Prueba de FLOWI ✓", ya funciona.',
          'Quita a FLOWI y a Chrome del ahorro de batería (Ajustes → Aplicaciones → Chrome → Batería → Sin restricciones) y desactiva el ahorro de datos.',
          'Vuelve a tocar el botón: cada prueba renueva la suscripción de este celular.',
        ],
      };
    }
  } else if (result?.step === 'error') {
    text = { ok: false, msg: 'No se pudo hacer la prueba. Revisa tu conexión e intenta de nuevo.' };
  }

  return (
    <div className={`p-4 border-b space-y-3 ${isTechTheme ? 'border-accent/15' : 'border-glass-border'}`}>
      <button type="button" onClick={run} disabled={busy}
              className={`w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold border transition-colors disabled:opacity-60 ${isTechTheme ? 'rounded-none font-mono uppercase text-xs border-accent text-accent hover:bg-accent/10' : 'rounded-xl border-[var(--yellow)]/40 text-text-primary hover:bg-[var(--yellow)]/10'}`}>
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellRing className="w-4 h-4 text-[var(--yellow)]" />}
        Enviarme una notificación de prueba
      </button>
      {text && (
        <div className={`rounded-xl p-3 text-xs space-y-1.5 ${text.ok ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
          <p className={text.ok ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>{text.msg}</p>
          {text.tips?.map(t => <p key={t} className="text-text-secondary">• {t}</p>)}
          {result?.step === 'permission' && result.state !== 'unsupported' && (
            <button type="button" onClick={() => askForNotifications({ force: true })} className="text-accent underline">Cómo activarlas</button>
          )}
        </div>
      )}
    </div>
  );
}
