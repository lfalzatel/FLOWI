'use client';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/format';

export function AnimatedNumber({ value, delay = 0, prefix = '' }: { value: number, delay?: number, prefix?: string }) {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);
  const isFirstRender = useRef(true);
  const { profile } = useAuth();
  
  const fmt = (n: number) => formatCurrency(n, profile?.currency);

  useEffect(() => {
    // En la primera carga, fijar el valor inicial sin saltar desde 0
    if (isFirstRender.current) {
      isFirstRender.current = false;
      setDisplayValue(value);
      prevValueRef.current = value;
      return;
    }

    const startVal = prevValueRef.current;
    const diff = value - startVal;
    if (diff === 0) return;

    let startTimestamp: number | null = null;
    const duration = 1200; // 1.2s de conteo fluido que acompaña a la absorción
    
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // Easing cúbico suave (easeOutCubic) para desaceleración elegante
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = startVal + diff * easeOut;
      
      setDisplayValue(current);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        prevValueRef.current = value;
      }
    };

    const timeoutId = setTimeout(() => {
      window.requestAnimationFrame(step);
    }, delay * 1000);

    return () => clearTimeout(timeoutId);
  }, [value, delay]);

  return <span>{prefix === '$' ? fmt(displayValue) : `${prefix}${fmt(displayValue)}`}</span>;
}
