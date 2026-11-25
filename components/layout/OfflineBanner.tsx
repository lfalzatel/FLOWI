'use client';
import { useEffect, useState } from 'react';
import { CloudOff, CloudUpload } from 'lucide-react';
import { tr } from '@/lib/i18n';

// Aviso pequeño arriba cuando no hay internet: FLOWI sigue funcionando y lo registrado se sube solo
// al volver la conexión (lib/firebase.ts + lib/db.ts). Al volver, avisa unos segundos que se sincronizó.
export function OfflineBanner() {
  const [state, setState] = useState<'online' | 'offline' | 'back'>('online');
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const update = () => {
      if (!navigator.onLine) { setState('offline'); return; }
      setState(prev => (prev === 'offline' ? 'back' : prev));
      clearTimeout(t);
      t = setTimeout(() => setState('online'), 4000);
    };
    if (!navigator.onLine) setState('offline');
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); clearTimeout(t); };
  }, []);

  if (state === 'online') return null;
  const off = state === 'offline';
  return (
    <div className="fixed top-2 inset-x-0 z-[150] flex justify-center px-4 pointer-events-none" role="status" aria-live="polite">
      <div className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-semibold shadow-lg border backdrop-blur-md animate-fade-in-up ${off ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'}`}>
        {off ? <CloudOff className="w-4 h-4 shrink-0" /> : <CloudUpload className="w-4 h-4 shrink-0" />}
        <span>{off ? tr('Sin internet: lo que registres se guarda en tu celular y se sube solo.') : tr('Conexión de vuelta: tus cambios se están subiendo.')}</span>
      </div>
    </div>
  );
}
