'use client';
import { useEffect } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { GlitterParticles, GLITTER_THEMES } from '@/components/effects/GlitterParticles';

// Fondo de toda la app: partículas brillantes con los colores del tema, detrás de todas las pantallas.
// Las pantallas dejan su fondo transparente (ver [data-particles] en globals.css) para que se vea.
export function ThemedBackground() {
  const { theme } = useTheme();
  const conf = GLITTER_THEMES[theme] || GLITTER_THEMES.dark;

  useEffect(() => {
    document.documentElement.setAttribute('data-particles', '1');
    return () => document.documentElement.removeAttribute('data-particles');
  }, []);

  return (
    <div className="fixed inset-0 -z-10 pointer-events-none" aria-hidden="true">
      <GlitterParticles density={0.6} background={conf.bg} colors={conf.colors} light={!!conf.light} />
    </div>
  );
}
