'use client';
import { tr } from '@/lib/i18n';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';
import type { AuthCredential } from 'firebase/auth';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/components/ThemeProvider';
import { enterExistingAccount, linkGuestWithGoogle } from '@/lib/auth';

// Modo invitado: aviso fijo de que los datos solo están en este celular, con el botón para vincular Google.
export function GuestBanner() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isTech = theme === 'cyberpunk' || theme === 'kiloCode';
  const [open, setOpen] = useState(false);
  if (!user?.isAnonymous) return null;
  return (
    <>
      <div className={`mx-4 mt-1 mb-2 px-3 py-2 flex items-center gap-2 border border-amber-400/50 bg-amber-400/10 text-amber-200 text-xs ${isTech ? 'rounded-none font-mono' : 'rounded-xl'}`}>
        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
        <span className="flex-1 min-w-0 leading-snug">{tr('Estás como invitado: tus datos solo están en este celular.')}</span>
        <button type="button" onClick={() => setOpen(true)}
                className={`shrink-0 px-2.5 py-1 font-bold bg-amber-400 text-black ${isTech ? 'rounded-none' : 'rounded-lg'}`}>
          {tr('Vincular')}
        </button>
      </div>
      {open && <LinkAccountModal onClose={() => setOpen(false)} />}
    </>
  );
}

/** Vincular la cuenta de Google (también se abre desde Amigos o Planes cuando hace falta una cuenta). */
export function LinkAccountModal({ onClose, reason }: { onClose: () => void; reason?: string }) {
  const { theme } = useTheme();
  const isTech = theme === 'cyberpunk' || theme === 'kiloCode';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState<{ cred: AuthCredential; email?: string } | null>(null);
  const [done, setDone] = useState(false);
  useEffect(() => { document.documentElement.style.overflow = 'hidden'; return () => { document.documentElement.style.overflow = ''; }; }, []);

  const link = async () => {
    setBusy(true); setError('');
    const r = await linkGuestWithGoogle();
    setBusy(false);
    // Recargar para que toda la app vea la cuenta ya vinculada (el uid es el mismo, Firebase no avisa)
    if (r.ok) { setDone(true); setTimeout(() => window.location.reload(), 1800); return; }
    if ('conflict' in r) setConflict({ cred: r.conflict, email: r.email });
    else setError(r.error);
  };
  const enterExisting = async () => {
    if (!conflict) return;
    setBusy(true);
    try { await enterExistingAccount(conflict.cred); window.location.href = '/'; }
    catch { setBusy(false); setError(tr('No se pudo entrar a tu cuenta. Inténtalo de nuevo.')); }
  };

  const btn = `w-full py-3 text-sm font-bold ${isTech ? 'rounded-none uppercase' : 'rounded-xl'}`;
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className={`fixed inset-0 z-[120] flex items-center justify-center p-4 ${isTech ? 'font-mono' : ''}`}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className={`relative w-full max-w-sm p-5 space-y-4 glass-dropdown animate-fade-in-up ${isTech ? 'rounded-none border border-accent/50' : 'rounded-3xl'}`}>
        <button type="button" onClick={onClose} aria-label={tr('Cerrar')} className="absolute top-4 right-4 text-text-secondary"><X className="w-5 h-5" /></button>
        <h2 className={isTech ? 'font-bold text-lg text-accent uppercase pr-6' : 'font-syne font-bold text-lg text-text-primary pr-6'}>
          {done ? tr('¡Cuenta vinculada!') : conflict ? tr('Ya tienes una cuenta') : tr('Guarda tus datos')}
        </h2>
        {done ? (
          <p className="text-sm text-text-secondary">{tr('Todo lo que registraste quedó en tu cuenta de Google y se sincroniza en cualquier celular. ✓')}</p>
        ) : conflict ? (
          <>
            <p className="text-sm text-text-secondary">
              {conflict.email ? <b>{conflict.email}</b> : tr('Esa cuenta de Google')} ya tiene datos en FLOWI. Puedes entrar a esa cuenta, pero
              lo que registraste como invitado <b>{tr('no se pasa')}</b> a ella.
            </p>
            <button type="button" disabled={busy} onClick={enterExisting} className={`${btn} bg-accent text-black`}>{busy ? 'Entrando…' : 'Entrar a mi cuenta'}</button>
            <button type="button" disabled={busy} onClick={() => { setConflict(null); link(); }} className={`${btn} border border-glass-border text-text-secondary`}>{tr('Usar otra cuenta de Google')}</button>
          </>
        ) : (
          <>
            {reason && <p className="text-sm text-amber-300">{reason}</p>}
            <p className="text-sm text-text-secondary">
              {tr('Como invitado, lo que registras solo está en este celular: si borras la app o cambias de celular, se pierde.')}
              Vincula tu cuenta de Google y <b>{tr('se conserva todo')}</b>, se sincroniza y puedes usar Amigos y Premium.
            </p>
            <button type="button" disabled={busy} onClick={link}
                    className={`${btn} bg-white text-black flex items-center justify-center gap-2`}>
              <img src="https://www.google.com/favicon.ico" alt="" className="w-5 h-5" /> {busy ? 'Vinculando…' : 'Vincular con Google'}
            </button>
          </>
        )}
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    </div>,
    document.body,
  );
}
