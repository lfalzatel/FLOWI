'use client';
import { tr } from '@/lib/i18n';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Crown } from 'lucide-react';
import { LIMIT_EVENT, LIMIT_TEXT, LimitKind, PREMIUM_RECEIPTS_PER_DAY, usePlan } from '@/lib/plans';
import { usePlayStore } from '@/hooks/usePlayStore';
import { Button, Sheet } from '@/components/ui';

// Aviso amable cuando se llega a un límite del plan gratis, con el camino a los planes.
// Hecho con el kit (components/ui): el estilo de cada tema está en app/ui-kit.css.
export function LimitPrompter() {
  const [kind, setKind] = useState<LimitKind | null>(null);
  const router = useRouter();
  const { premium } = usePlan();
  const playStore = usePlayStore();

  useEffect(() => {
    const on = (e: Event) => setKind((e as CustomEvent).detail?.kind ?? null);
    window.addEventListener(LIMIT_EVENT, on);
    return () => window.removeEventListener(LIMIT_EVENT, on);
  }, []);

  if (!kind) return null;
  const close = () => setKind(null);
  const receipts = kind === 'receipts';
  const copy = receipts && premium
    ? { title: tr('Ya leíste muchos recibos hoy'), text: tr('Por seguridad, hasta {a} recibos al día. Mañana sigues; mientras tanto puedes dictarlo o escribirlo.', { a: PREMIUM_RECEIPTS_PER_DAY }) }
    : LIMIT_TEXT[kind];
  const goPlans = () => { close(); router.push('/planes'); };

  return (
    <Sheet variant="dialog" showClose onClose={close} z={130}>
      <div className="ui-icon-box mb-3 bg-amber-400/15 text-amber-400"><Crown className="w-5 h-5" /></div>
      <h3 className="ui-title text-base mb-1 pr-8">{copy.title}</h3>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">{copy.text}</p>
      {receipts ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => { close(); window.dispatchEvent(new CustomEvent('flowi-dictate')); }}>🎤 {tr('Dictarlo')}</Button>
            <Button variant="secondary" onClick={() => { close(); window.dispatchEvent(new CustomEvent('flowi-open-add')); }}>⌨️ {tr('Escribirlo')}</Button>
          </div>
          {!premium && !playStore && (
            <button onClick={goPlans} className="mt-3 w-full text-xs text-text-muted hover:text-text-primary">
              {tr('Con Premium lees recibos sin límite')} · <span className="text-accent font-semibold underline">{tr('Ver planes')}</span>
            </button>
          )}
        </>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={close}>{tr('Ahora no')}</Button>
          <Button onClick={goPlans}>{tr('Ver planes')}</Button>
        </div>
      )}
    </Sheet>
  );
}
