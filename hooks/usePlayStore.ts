'use client';
import { useEffect, useState } from 'react';
import { detectPlayStoreApp, isPlayStoreApp } from '@/lib/appStore';

/** true si FLOWI corre dentro de la app de Play Store (ahí no se muestran pagos ni donaciones). */
export function usePlayStore() {
  const [play, setPlay] = useState(false);
  useEffect(() => { detectPlayStoreApp(); setPlay(isPlayStoreApp()); }, []);
  return play;
}
