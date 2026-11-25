'use client';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Home, Loader2, X } from 'lucide-react';
import { app, auth } from '@/lib/firebase';
import { tr } from '@/lib/i18n';
import { MOVE_TO, isOldHome, readLocalPrefs } from '@/lib/move';

// Aviso "FLOWI tiene nueva casa" en la dirección vieja (lib/move.ts). Con sesión abierta, "Mudarme"
// lleva la misma cuenta y los ajustes a la nueva dirección; sin sesión, solo la abre.
const LATER_KEY = 'flowi_move_later';
const LATER_MS = 2 * 86400000; // "Después" lo esconde 2 días

export function MoveBanner() {
  const [show, setShow] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!isOldHome(window.location.origin) || window.location.pathname.startsWith('/legal')) return;
    let later = 0;
    try { later = Number(localStorage.getItem(LATER_KEY)) || 0; } catch { /* nada */ }
    if (Date.now() - later < LATER_MS) return;
    setShow(true);
    return onAuthStateChanged(auth, setUser);
  }, []);

  if (!show) return null;

  const move = async () => {
    setErr('');
    if (!user) { window.location.href = MOVE_TO; return; }
    setBusy(true);
    try {
      const fn = httpsCallable<{ prefs: Record<string, string> }, { code: string }>(getFunctions(app, 'us-central1'), 'crearMudanza');
      const { code } = (await fn({ prefs: readLocalPrefs() })).data;
      window.location.href = `${MOVE_TO}/mudanza#c=${encodeURIComponent(code)}`;
    } catch (e) {
      console.error('No se pudo preparar la mudanza:', e);
      setErr(tr('No se pudo preparar la mudanza. Revisa tu internet e inténtalo de nuevo.'));
      setBusy(false);
    }
  };
  const later = () => {
    try { localStorage.setItem(LATER_KEY, String(Date.now())); } catch { /* nada */ }
    setShow(false);
  };

  return (
    <div className="fixed inset-x-0 z-[140] flex justify-center px-4 pointer-events-none" style={{ bottom: 'calc(max(1.25rem, env(safe-area-inset-bottom)) + 5.5rem)' }}>
      <div className="pointer-events-auto w-full max-w-md glass-dropdown rounded-2xl p-4 shadow-2xl animate-fade-in-up" role="dialog" aria-label={tr('FLOWI tiene nueva casa')}>
        <div className="flex items-start gap-3">
          <span className="ui-icon-box bg-accent/15 text-accent shrink-0"><Home className="w-5 h-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-text-primary">{tr('FLOWI tiene nueva casa')}</p>
            <p className="text-xs text-text-secondary mt-0.5">
              {user
                ? tr('Toca Mudarme: te llevamos con tu misma cuenta, tus datos y tus ajustes. No tienes que volver a entrar.')
                : tr('Ábrela en su nueva dirección. Ahí el inicio de sesión funciona en todos los celulares, también en iPhone.')}
            </p>
            {err && <p className="text-xs text-red-400 mt-1">{err}</p>}
            <div className="flex gap-2 mt-3">
              <button type="button" onClick={move} disabled={busy} className="ui-btn ui-btn-primary flex-1 flex items-center justify-center gap-2">
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}{user ? tr('Mudarme') : tr('Abrir la nueva')}
              </button>
              <button type="button" onClick={later} className="ui-btn ui-btn-ghost">{tr('Después')}</button>
            </div>
          </div>
          <button type="button" onClick={later} aria-label={tr('Cerrar')} className="text-text-muted -mt-1 -mr-1 p-1"><X className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
}
