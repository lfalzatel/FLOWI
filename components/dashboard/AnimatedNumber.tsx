'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/format';

export function AnimatedNumber({ value, delay = 0, prefix = '' }: { value: number, delay?: number, prefix?: string }) {
  const [displayValue, setDisplayValue] = useState(0);
  const { profile } = useAuth();
  
  const fmt = (n: number) => formatCurrency(n, profile?.currency);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 1000; // 1 segundo
    
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setDisplayValue(Math.floor(progress * value));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    const timeoutId = setTimeout(() => {
      window.requestAnimationFrame(step);
    }, delay * 1000);

    return () => clearTimeout(timeoutId);
  }, [value, delay]);

  return <span>{prefix === '$' ? fmt(displayValue) : `${prefix}${fmt(displayValue)}`}</span>;
}
