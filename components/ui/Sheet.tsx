'use client';
import { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { tr } from '@/lib/i18n';

// Ventana de FLOWI con todo lo común: fondo oscuro que la cierra al tocarlo, tecla Escape,
// arrastre hacia abajo para cerrar (data-drag-close, lo maneja MotionManager), animación de
// entrada, título y botón X opcionales. El estilo de cada tema está en app/ui-kit.css.
//  variant="sheet"  → sale desde abajo en el celular (fondo sólido del tema)
//  variant="dialog" → tarjeta de vidrio centrada, más angosta (avisos y formularios cortos)
export function Sheet({ title, subtitle, onClose, children, variant = 'sheet', showClose = false, z = 100, className = '' }: {
  title?: ReactNode;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  variant?: 'sheet' | 'dialog';
  showClose?: boolean;
  z?: number;
  className?: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (typeof document === 'undefined') return null;
  const dialog = variant === 'dialog';
  return createPortal(
    <div className={`fixed inset-0 flex items-end sm:items-center justify-center ${dialog ? 'p-4' : ''}`} style={{ zIndex: z }}
         role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined}>
      <div className={`ui-backdrop ${dialog ? 'backdrop-blur-sm' : ''}`} onClick={onClose} aria-hidden="true" />
      <div data-drag-close={dialog ? undefined : true} className={`${dialog ? 'ui-dialog glass-dropdown' : 'ui-sheet'} animate-fade-in-up ${className}`}>
        {showClose && (
          <button type="button" onClick={onClose} aria-label={tr('Cerrar')} className="ui-close"><X className="w-5 h-5" /></button>
        )}
        {(title || subtitle) && (
          <div className={`mb-3 ${showClose ? 'pr-8' : ''}`}>
            {title && <h2 className="ui-title">{title}</h2>}
            {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}
