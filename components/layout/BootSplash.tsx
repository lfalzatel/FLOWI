'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { SplashScreen, splashSession } from '@/components/layout/SplashScreen';

// Splash al recargar la app en cualquier pantalla que no sea Inicio (Inicio y Login tienen el suyo).
export function BootSplash() {
  const pathname = usePathname() || '/';
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (splashSession.shown) return;
    if (pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/prueba') || pathname.startsWith('/legal')) return;
    splashSession.shown = true;
    setShow(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!show) return null;
  return <SplashScreen duration={1200} mode="reload" onComplete={() => setShow(false)} />;
}
