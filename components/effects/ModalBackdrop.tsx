'use client';
import { useTheme } from '@/components/ThemeProvider';
import { GlitterParticles, GLITTER_THEMES } from '@/components/effects/GlitterParticles';
import { FlowLines } from '@/components/FlowLines';

// Fondo de las ventanas importantes (eliminar, asistente de voz): la pantalla se oscurece y difumina,
// y encima flotan las partículas del tema y las ondas de FLOWI arriba y abajo, como al tocar el logo.
// Con animaciones Suaves/Apagadas las partículas quedan quietas (GlitterParticles lo maneja).
export function ModalBackdrop({ onClick, className = '' }: { onClick?: () => void; className?: string }) {
  const { theme } = useTheme();
  const conf = GLITTER_THEMES[theme] || GLITTER_THEMES.glassmorphism;
  const light = theme === 'light' || theme === 'nova';
  return (
    <div className={`absolute inset-0 animate-fade-in ${className}`} onClick={onClick} aria-hidden="true">
      <div className={`absolute inset-0 ${light ? 'bg-black/30 backdrop-blur-sm' : 'bg-black/70 backdrop-blur-md'}`} />
      <GlitterParticles density={0.6} background="none" colors={conf.colors} light={!!conf.light} />
      <FlowLines className="absolute inset-x-0 top-0 h-[30%]" />
      <FlowLines className="absolute inset-x-0 bottom-0 h-[30%] -scale-y-100" />
    </div>
  );
}
