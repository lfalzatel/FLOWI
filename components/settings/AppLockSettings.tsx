'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronUp, Fingerprint, KeyRound, Lock, Timer, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { PinPad } from '@/components/security/PinPad';
import {
  DELAYS, LOCK_EVENT, LockConfig, biometricAvailable, checkPin, disableBiometric, enableBiometric,
  getLock, removeLock, setDelay, setPin,
} from '@/lib/appLock';

type Step = 'new' | 'confirm' | 'verify-off' | 'verify-change' | 'bio';

const TITLES: Record<Step, { title: string; text: string }> = {
  'new': { title: 'Crea tu PIN', text: 'Escribe 4 números que recuerdes. Lo pediremos al abrir FLOWI.' },
  'confirm': { title: 'Repite tu PIN', text: 'Escríbelo otra vez para confirmar.' },
  'verify-off': { title: 'Quitar el bloqueo', text: 'Escribe tu PIN actual.' },
  'verify-change': { title: 'Cambiar el PIN', text: 'Primero escribe tu PIN actual.' },
  'bio': { title: '¿Usar tu huella?', text: '' },
};

// Sección de Configuración: bloquear FLOWI con PIN y huella o rostro en este celular
export function AppLockSettings({ isTechTheme, open = true, onToggle }: { isTechTheme: boolean; open?: boolean; onToggle?: () => void }) {
  const { user, profile } = useAuth();
  const uid = user?.uid ?? null;
  const [lock, setLock] = useState<LockConfig | null>(null);
  const [bioAvail, setBioAvail] = useState(false);
  const [step, setStep] = useState<Step | null>(null);
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState<{ text: string; n: number } | null>(null);
  const [bioError, setBioError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!uid) return;
    const read = () => setLock(getLock(uid));
    read();
    biometricAvailable().then(setBioAvail);
    window.addEventListener(LOCK_EVENT, read);
    return () => window.removeEventListener(LOCK_EVENT, read);
  }, [uid]);

  const fail = (text: string) => setError(e => ({ text, n: (e?.n ?? 0) + 1 }));
  const go = (s: Step | null) => { setError(null); setStep(s); };

  const onPin = async (pin: string) => {
    if (!uid || !step) return;
    if (step === 'new') { setFirstPin(pin); go('confirm'); return; }
    if (step === 'confirm') {
      if (pin !== firstPin) { setFirstPin(''); setStep('new'); fail('Los PIN no coinciden. Créalo de nuevo.'); return; }
      const isNew = !lock;
      await setPin(uid, pin);
      go(isNew && bioAvail ? 'bio' : null);
      return;
    }
    if (!(await checkPin(uid, pin))) { fail('PIN incorrecto'); return; }
    if (step === 'verify-off') { removeLock(uid); go(null); }
    else if (step === 'verify-change') go('new');
  };

  const turnOnBio = async () => {
    if (!uid) return;
    setBusy(true);
    setBioError(null);
    try {
      const ok = await enableBiometric(uid, profile?.name || user?.displayName || 'FLOWI');
      if (!ok) setBioError('No se pudo activar. Intenta de nuevo.');
      else if (step === 'bio') go(null);
    } catch {
      setBioError('No se activó. Revisa que tu celular tenga huella o rostro configurado.');
    } finally { setBusy(false); }
  };

  const mono = isTechTheme ? 'font-mono' : '';
  const row = `w-full flex items-center justify-between gap-3 p-4 border-b ${isTechTheme ? 'border-accent/15' : 'border-glass-border'}`;
  const icon = `w-8 h-8 shrink-0 flex items-center justify-center ${isTechTheme ? 'border border-accent/20 rounded-none bg-accent/5' : 'rounded-xl bg-accent/10'}`;
  const sw = (on: boolean) => (
    <span className={`w-12 h-6 shrink-0 rounded-full transition-colors relative ${on ? (isTechTheme ? 'bg-accent border border-accent' : 'bg-accent') : (isTechTheme ? 'bg-black/50 border border-accent/20' : 'bg-gray-600')}`}>
      <span className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-transform ${on ? 'translate-x-6 bg-white' : 'translate-x-0 bg-gray-300'}`} />
    </span>
  );

  return (
    <section className="space-y-3">
      {onToggle && (
        <button onClick={onToggle} className={`w-full flex items-center justify-between ${isTechTheme ? 'border-b border-accent/20 pb-1' : 'ml-2 pr-2'}`}>
          <h2 className={`${isTechTheme ? 'font-mono font-bold text-sm text-accent uppercase tracking-wide' : 'font-syne font-semibold text-sm text-text-secondary'}`}>Seguridad</h2>
          {open ? <ChevronUp className={`w-4 h-4 ${isTechTheme ? 'text-accent' : 'text-text-muted'}`} /> : <ChevronDown className={`w-4 h-4 ${isTechTheme ? 'text-accent' : 'text-text-muted'}`} />}
        </button>
      )}
      {(!onToggle || open) && (
        <div className={`overflow-hidden animate-fade-in ${isTechTheme ? 'border border-accent/20 rounded-none bg-deep' : 'glass-card rounded-2xl'}`}>
          <button type="button" onClick={() => go(lock ? 'verify-off' : 'new')} className={row}>
            <div className="flex items-center gap-3">
              <div className={icon}><Lock className="w-4 h-4 text-accent" /></div>
              <div className={`text-left ${mono}`}>
                <p className="text-sm font-medium text-text-primary">Bloquear FLOWI con PIN</p>
                <p className="text-[10px] text-text-muted leading-relaxed">Nadie ve tu plata aunque tome tu celular. Solo en este dispositivo.</p>
              </div>
            </div>
            {sw(!!lock)}
          </button>

          {lock && (
            <>
              {bioAvail && (
                <button type="button" disabled={busy} onClick={() => lock.credId ? disableBiometric(uid!) : turnOnBio()} className={row}>
                  <div className="flex items-center gap-3">
                    <div className={icon}><Fingerprint className="w-4 h-4 text-accent" /></div>
                    <div className={`text-left ${mono}`}>
                      <p className="text-sm font-medium text-text-primary">Usar huella o rostro</p>
                      <p className="text-[10px] text-text-muted">{bioError || 'Desbloquea sin escribir el PIN'}</p>
                    </div>
                  </div>
                  {sw(!!lock.credId)}
                </button>
              )}

              <div className={`${row} flex-col !items-stretch`}>
                <div className="flex items-center gap-3">
                  <div className={icon}><Timer className="w-4 h-4 text-accent" /></div>
                  <div className={`text-left ${mono}`}>
                    <p className="text-sm font-medium text-text-primary">Pedir el PIN otra vez</p>
                    <p className="text-[10px] text-text-muted">Después de estar fuera de FLOWI</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {DELAYS.map(d => (
                    <button key={d.sec} type="button" onClick={() => uid && setDelay(uid, d.sec)}
                            className={`px-2 py-2 text-xs font-medium border transition-colors ${isTechTheme ? 'rounded-none' : 'rounded-xl'} ${lock.delaySec === d.sec ? 'border-accent bg-accent/10 text-accent' : 'border-glass-border text-text-secondary hover:bg-glass'}`}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <button type="button" onClick={() => go('verify-change')} className={`${row} border-b-0`}>
                <div className="flex items-center gap-3">
                  <div className={icon}><KeyRound className="w-4 h-4 text-accent" /></div>
                  <p className={`text-sm font-medium text-text-primary ${mono}`}>Cambiar el PIN</p>
                </div>
              </button>
            </>
          )}
        </div>
      )}

      {step && createPortal(
        <div className="fixed inset-0 z-[9000] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={() => go(null)}>
          <div onClick={e => e.stopPropagation()}
               className={`relative w-full sm:max-w-sm bg-deep border border-glass-border p-6 pb-8 space-y-5 ${isTechTheme ? 'rounded-none' : 'rounded-t-3xl sm:rounded-3xl'}`}
               style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
            <button type="button" onClick={() => go(null)} aria-label="Cerrar" className="absolute top-4 right-4 w-8 h-8 rounded-full hover:bg-glass flex items-center justify-center">
              <X className="w-4 h-4 text-text-muted" />
            </button>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold font-syne text-text-primary">{TITLES[step].title}</h3>
              {TITLES[step].text && <p className="text-sm text-text-muted">{TITLES[step].text}</p>}
            </div>
            {step === 'bio' ? (
              <div className="space-y-3 text-center">
                <Fingerprint className="w-14 h-14 text-accent mx-auto" />
                <p className="text-sm text-text-secondary">Tu PIN quedó listo. También puedes entrar con la huella o el rostro de este celular.</p>
                {bioError && <p className="text-xs text-red-400">{bioError}</p>}
                <button type="button" disabled={busy} onClick={turnOnBio}
                        className={`w-full py-3 font-bold bg-accent text-black disabled:opacity-60 ${isTechTheme ? 'rounded-none' : 'rounded-2xl'}`}>
                  Activar huella o rostro
                </button>
                <button type="button" onClick={() => go(null)} className="w-full py-2 text-sm text-text-muted">Ahora no</button>
              </div>
            ) : (
              <PinPad key={`${step}-${error?.n ?? 0}`} onComplete={onPin} error={error?.text} />
            )}
          </div>
        </div>,
        document.body,
      )}
    </section>
  );
}
