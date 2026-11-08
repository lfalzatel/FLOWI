'use client';
import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { usePopupBusy } from '@/lib/tourGate';

// Mantiene la app instalada al día. El service worker nuevo se activa solo (skipWaiting), pero la
// página abierta sigue con el código viejo hasta recargar. Aquí:
//  - se busca una versión nueva al volver a la app y cada 30 minutos;
//  - si llega una y la app está en segundo plano, se recarga sola;
//  - si está en primer plano, se ofrece "Actualizar" (para no perder lo que se esté escribiendo).
export function UpdateWatcher() {
  const [ready, setReady] = useState(false);
  const busy = usePopupBusy(); // no tapar el tutorial: el aviso aparece al terminar

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const hadController = !!navigator.serviceWorker.controller;
    let reloaded = false;
    const reload = () => { if (!reloaded) { reloaded = true; window.location.reload(); } };

    const onChange = () => {
      if (!hadController) return; // primera instalación: no hay versión vieja que reemplazar
      if (document.visibilityState === 'hidden') reload();
      else setReady(true);
    };
    navigator.serviceWorker.addEventListener('controllerchange', onChange);

    const check = () => navigator.serviceWorker.getRegistration().then(r => r?.update()).catch(() => {});
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      check();
    };
    const onHidden = () => { if (document.visibilityState === 'hidden' && ready) reload(); };
    document.addEventListener('visibilitychange', onVisible);
    document.addEventListener('visibilitychange', onHidden);
    const timer = setInterval(check, 30 * 60 * 1000);
    check();

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onChange);
      document.removeEventListener('visibilitychange', onVisible);
      document.removeEventListener('visibilitychange', onHidden);
      clearInterval(timer);
    };
  }, [ready]);

  if (!ready || busy) return null;
  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-28 md:bottom-6 z-[120] w-[min(92vw,380px)] animate-fade-in-up">
      <div className="glass-dropdown rounded-2xl border border-accent/40 p-3 flex items-center gap-3 shadow-xl">
        <RefreshCw className="w-5 h-5 text-accent shrink-0" />
        <p className="flex-1 text-xs text-text-secondary">Hay una versión nueva de FLOWI.</p>
        <button type="button" onClick={() => window.location.reload()}
                className="shrink-0 px-3 py-1.5 rounded-xl bg-accent text-black text-xs font-bold">Actualizar</button>
      </div>
    </div>
  );
}
