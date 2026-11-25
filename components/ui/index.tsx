'use client';
// Kit de diseño de FLOWI. Úsalo antes de crear un botón, tarjeta u opción nueva.
// El estilo (y cómo cambia en cada tema) está en app/ui-kit.css; aquí solo la estructura.
import { ButtonHTMLAttributes, ReactNode } from 'react';
import { useTheme } from '@/components/ThemeProvider';

export { Sheet } from './Sheet';

/** Rasgos del tema actual, para los pocos casos en que la estructura (no el estilo) cambia. */
export function useThemeKind() {
  const { theme } = useTheme();
  return {
    theme,
    isTech: theme === 'cyberpunk' || theme === 'kiloCode', // esquinas rectas, letra monoespaciada
    isLight: theme === 'light' || theme === 'nova',        // fondo claro
  };
}

type Variant = 'primary' | 'secondary' | 'ghost';

/** Botón del kit. variant: primary (acción principal), secondary (borde), ghost (solo texto). */
export function Button({ variant = 'primary', className = '', children, ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button type="button" {...rest} className={`ui-btn ui-btn-${variant} ${className}`}>
      {children}
    </button>
  );
}

/** Fila de opción: ícono, título y una línea de detalle. */
export function OptionRow({ icon: Icon, title, detail, onClick, className = '' }: {
  icon: any; title: ReactNode; detail?: ReactNode; onClick: () => void; className?: string;
}) {
  return (
    <button type="button" onClick={onClick} className={`ui-option ${className}`}>
      <span className="ui-icon-box"><Icon className="w-5 h-5" /></span>
      <span className="flex-1 min-w-0">
        <span className="ui-option-title">{title}</span>
        {detail && <span className="ui-option-detail">{detail}</span>}
      </span>
    </button>
  );
}

/** Tarjeta de vidrio (la de toda la app: borde, desenfoque y brillo según el tema). */
export function Card({ className = '', children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...rest} className={`glass-card ${className}`}>{children}</div>;
}
