'use client';
import { useEffect, useState } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { GlitterParticles, GLITTER_THEMES } from '@/components/effects/GlitterParticles';

// Fondo de toda la app: partículas brillantes con los colores del tema, detrás de todas las pantallas.
// Las pantallas dejan su fondo transparente (ver [data-particles] en globals.css) para que se vea.
export function ThemedBackground() {
  const { theme } = useTheme();
  const conf = GLITTER_THEMES[theme] || GLITTER_THEMES.dark;
  // Se pinta después de leer el tema guardado (así no aparece un instante el fondo de Glass)
  const [ready, setReady] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-particles', '1');
    setReady(true);
    return () => document.documentElement.removeAttribute('data-particles');
  }, []);

  if (!ready) return null;
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none" aria-hidden="true">
      <GlitterParticles density={0.85} background={conf.bg} colors={conf.colors} light={!!conf.light} />
    </div>
  );
}
