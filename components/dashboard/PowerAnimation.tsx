'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import PointsBurstAnimation from '@/components/ui/PointsBurstAnimation';

interface PowerAnimationEvent {
  amount: number;
  type: 'gasto' | 'ingreso' | 'abono' | 'edicion' | 'eliminacion';
}

export function PowerAnimation() {
  const [active, setActive] = useState(false);
  const [data, setData] = useState<PowerAnimationEvent | null>(null);

  useEffect(() => {
    const handleTrigger = (e: Event) => {
      const customEvent = e as CustomEvent<PowerAnimationEvent>;
      setData(customEvent.detail);
      setActive(true);
    };

    window.addEventListener('show-power-animation', handleTrigger);
    return () => window.removeEventListener('show-power-animation', handleTrigger);
  }, []);

  if (!active || !data || typeof document === 'undefined') return null;

  return createPortal(
    <PointsBurstAnimation
      amount={data.amount}
      type={data.type}
      targetSelector="[data-points-capsule]"
      onComplete={() => setActive(false)}
    />,
    document.body
  );
}

// Función helper para disparar la animación desde cualquier sitio
export function triggerPowerAnimation(amount: number, type: 'gasto' | 'ingreso' | 'abono' | 'edicion' | 'eliminacion') {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('show-power-animation', {
      detail: { amount, type }
    });
    window.dispatchEvent(event);
  }
}
