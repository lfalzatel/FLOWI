'use client';
import { useEffect, useState } from 'react';
import { signInWithCustomToken } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { CheckCircle2, Loader2, Share, MoreVertical, AlertTriangle } from 'lucide-react';
import { app, auth } from '@/lib/firebase';
import { tr } from '@/lib/i18n';
import { applyPrefs } from '@/lib/move';

// Llegada a la nueva dirección (lib/move.ts): canjea el código de un solo uso por la sesión de la
// misma cuenta, guarda los ajustes que trajo y explica cómo instalar FLOWI aquí.
export default function MudanzaPage() {
  const [state, setState] = useState<'working' | 'done' | 'error'>('working');
  const [err, setErr] = useState('');
  const [ios, setIos] = useState(false);

  useEffect(() => {
    setIos(/iPhone|iPad|iPod/i.test(navigator.userAgent));
    const code = new URLSearchParams(window.location.hash.slice(1)).get('c') || '';
    // El código se borra de la barra de direcciones apenas se lee
    history.replaceState(null, '', '/mudanza');
    if (!code) { setErr(tr('Falta el código de la mudanza. Vuelve a FLOWI y toca Mudarme.')); setState('error'); return; }
    (async () => {
      try {
        const fn = httpsCallable<{ code: string }, { token: string; prefs: Record<string, string> }>(getFunctions(app, 'us-central1'), 'usarMudanza');
        const { token, prefs } = (await fn({ code })).data;
        applyPrefs(prefs);
        await signInWithCustomToken(auth, token);
        setState('done');
      } catch (e: any) {
        console.error('Mudanza:', e);
        setErr(e?.message || tr('No se pudo completar la mudanza.'));
        setState('error');
      }
    })();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-deep">
      <div className="w-full max-w-sm glass-dropdown rounded-3xl p-6 space-y-4 text-center">
        {state === 'working' && (
          <>
            <Loader2 className="w-10 h-10 text-accent animate-spin mx-auto" />
            <p className="ui-title">{tr('Trasteando tus cosas…')}</p>
            <p className="text-sm text-text-secondary">{tr('Estamos pasando tu cuenta y tus ajustes a la nueva casa de FLOWI.')}</p>
          </>
        )}
        {state === 'error' && (
          <>
            <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
            <p className="ui-title">{tr('No se pudo terminar')}</p>
            <p className="text-sm text-text-secondary">{err}</p>
            <a href="/login" className="ui-btn ui-btn-primary block">{tr('Entrar con mi cuenta')}</a>
          </>
        )}
        {state === 'done' && (
          <>
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <p className="ui-title">{tr('¡Bienvenido a la nueva casa!')}</p>
            <p className="text-sm text-text-secondary">{tr('Tu cuenta, tus datos y tus ajustes ya están aquí.')}</p>
            <div className="text-left space-y-2 rounded-2xl border border-glass-border p-3">
              <p className="text-xs font-bold text-text-primary">{tr('Instala FLOWI desde aquí')}</p>
              {ios ? (
                <p className="text-xs text-text-secondary flex gap-2"><Share className="w-4 h-4 shrink-0 text-accent" />{tr('En Safari toca Compartir y luego "Agregar a inicio".')}</p>
              ) : (
                <p className="text-xs text-text-secondary flex gap-2"><MoreVertical className="w-4 h-4 shrink-0 text-accent" />{tr('En Chrome toca el menú ⋮ y luego "Instalar app".')}</p>
              )}
              <p className="text-xs text-text-secondary">{tr('Después borra el ícono viejo de FLOWI para no confundirte.')}</p>
              <p className="text-xs text-text-muted">{tr('La IA y el bloqueo con huella se configuran de nuevo aquí, por seguridad.')}</p>
            </div>
            <a href="/" className="ui-btn ui-btn-primary block">{tr('Ir a mi FLOWI')}</a>
          </>
        )}
      </div>
    </div>
  );
}
