'use client';
import { useTheme } from '@/components/ThemeProvider';
import { GlitterParticles, GLITTER_THEMES } from '@/components/effects/GlitterParticles';
import { FlowLines } from '@/components/FlowLines';

// Fondo de las ventanas importantes (eliminar, asistente de voz): en vez de oscurecer la página,
// se pone el cielo del tema con sus partículas (igual que mientras la IA lee un recibo) y las ondas de
// FLOWI arriba y abajo, como al tocar el logo. La página de atrás apenas se insinúa (96 % cubierta).
// Con animaciones Suaves/Apagadas las partículas quedan quietas (GlitterParticles lo maneja).
export function ModalBackdrop({ onClick, className = '' }: { onClick?: () => void; className?: string }) {
  const { theme } = useTheme();
  const conf = GLITTER_THEMES[theme] || GLITTER_THEMES.glassmorphism;
  return (
    <div className={`absolute inset-0 animate-fade-in ${className}`} onClick={onClick} aria-hidden="true">
      <GlitterParticles density={1.1} background={conf.bg} colors={conf.colors} light={!!conf.light} className="opacity-[0.96]" />
      <FlowLines className="absolute inset-x-0 top-0 h-[30%]" />
      <FlowLines className="absolute inset-x-0 bottom-0 h-[30%] -scale-y-100" />
    </div>
  );
}
