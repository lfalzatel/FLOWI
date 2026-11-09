'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Lock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePopupHold } from '@/lib/tourGate';
import { LOCK_EVENT, checkPin, clearActive, getLock, markActive, removeLock, shouldLock, verifyBiometric } from '@/lib/appLock';
import { PinPad } from './PinPad';

const MAX_TRIES = 5;
const WAIT_SEC = 30;

// Pantalla de bloqueo: aparece al abrir FLOWI y al volver después del tiempo elegido, si la
// persona activó el PIN en Configuración. No aparece justo después de entrar con Google.
export function AppLock() {
  const { user, profile, loading } = useAuth();
  const uid = user?.uid ?? null;
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tries, setTries] = useState(0);
  const [waitUntil, setWaitUntil] = useState(0);
  const [, tick] = useState(0);
  const [hasBio, setHasBio] = useState(false);
  const lockedRef = useRef(false);
  const resolved = useRef(false);
  const prevUid = useRef<string | null>(null);
  const autoBio = useRef(false);

  usePopupHold(locked);

  const lock = useCallback(() => {
    clearActive();
    lockedRef.current = true;
    autoBio.current = false;
    setError(null);
    setLocked(true);
  }, []);

  const unlock = useCallback(() => {
    lockedRef.current = false;
    markActive();
    setTries(0);
    setError(null);
    setLocked(false);
  }, []);

  // Al abrir la app (o recargar) y cuando cambia la cuenta
  useEffect(() => {
    if (loading) return;
    const cold = !resolved.current;
    resolved.current = true;
    const prev = prevUid.current;
    prevUid.current = uid;
    if (!uid) { lockedRef.current = false; setLocked(false); return; }
    if (cold) {
      if (shouldLock(uid)) lock(); else markActive();
    } else if (prev !== uid) {
      unlock(); // acaba de entrar con Google: no pedir el PIN otra vez
    }
  }, [loading, uid, lock, unlock]);

  // Al salir y volver a la app; también si se quita el bloqueo desde Configuración
  useEffect(() => {
    if (!uid) return;
    const onVis = () => {
      if (document.visibilityState === 'hidden') { if (!lockedRef.current) markActive(); }
      else if (!lockedRef.current && shouldLock(uid)) lock();
    };
    const onHide = () => { if (!lockedRef.current) markActive(); };
    const onChange = () => { if (!getLock(uid) && lockedRef.current) unlock(); };
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible' && !lockedRef.current) markActive();
    }, 5000);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', onHide);
    window.addEventListener(LOCK_EVENT, onChange);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', onHide);
      window.removeEventListener(LOCK_EVENT, onChange);
    };
  }, [uid, lock, unlock]);

  const tryBiometric = useCallback(async () => {
    if (!uid) return;
    if (await verifyBiometric(uid)) unlock();
  }, [uid, unlock]);

  // Al bloquear, se pide la huella de una vez si está activada
  useEffect(() => {
    if (!locked || !uid) return;
    const bio = !!getLock(uid)?.credId;
    setHasBio(bio);
    if (bio && !autoBio.current) {
      autoBio.current = true;
      tryBiometric();
    }
  }, [locked, uid, tryBiometric]);

  // Cuenta regresiva tras varios intentos fallidos
  useEffect(() => {
    if (waitUntil <= Date.now()) return;
    const t = setInterval(() => { tick(n => n + 1); if (Date.now() >= waitUntil) clearInterval(t); }, 1000);
    return () => clearInterval(t);
  }, [waitUntil]);

  if (!locked || !uid) return null;

  const waiting = waitUntil > Date.now();
  const secondsLeft = Math.ceil((waitUntil - Date.now()) / 1000);

  const onPin = async (pin: string) => {
    if (waiting) return;
    if (await checkPin(uid, pin)) { unlock(); return; }
    const n = tries + 1;
    setTries(n);
    if (n >= MAX_TRIES) {
      setWaitUntil(Date.now() + WAIT_SEC * 1000);
      setTries(0);
      setError(`Demasiados intentos. Espera ${WAIT_SEC} segundos.`);
    } else {
      setError(`PIN incorrecto. Te quedan ${MAX_TRIES - n} intentos.`);
    }
  };

  const forgot = async () => {
    if (!confirm('Para entrar sin el PIN debes volver a iniciar sesión con tu cuenta de Google. Se quitará el bloqueo de este celular y podrás crear un PIN nuevo en Configuración. ¿Continuar?')) return;
    removeLock(uid);
    const { signOut } = await import('@/lib/auth');
    await signOut();
    window.location.href = '/login';
  };

  const firstName = (profile?.name || user?.displayName || '').split(' ')[0];

  return (
    <div className="fixed inset-0 z-[10000] bg-deep overflow-y-auto animate-fade-in">
     <div className="min-h-full flex flex-col items-center justify-center px-6 py-8"
          style={{ paddingTop: 'max(2rem, env(safe-area-inset-top))', paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
      <div className="flex flex-col items-center gap-3 mb-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-accent/15 flex items-center justify-center">
          <Lock className="w-8 h-8 text-accent" />
        </div>
        <h1 className="text-xl font-bold font-syne text-text-primary">{firstName ? `Hola, ${firstName}` : 'FLOWI está bloqueada'}</h1>
        <p className="text-sm text-text-muted">
          {waiting ? `Espera ${secondsLeft} s para intentar de nuevo` : hasBio ? 'Usa tu huella o escribe tu PIN' : 'Escribe tu PIN para entrar'}
        </p>
      </div>
      <PinPad onComplete={onPin} error={error} disabled={waiting} onBiometric={hasBio ? tryBiometric : undefined} />
      <button type="button" onClick={forgot} className="mt-8 text-sm text-text-muted hover:text-text-primary underline">
        Olvidé mi PIN
      </button>
     </div>
    </div>
  );
}
