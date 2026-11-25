'use client';
import { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';

// Ventana que sale desde abajo en el celular (y centrada en el computador). Trae todo lo común:
// fondo oscuro que la cierra al tocarlo, tecla Escape, arrastre hacia abajo para cerrar
// (data-drag-close, lo maneja MotionManager), animación de entrada y título opcional.
// El estilo de cada tema está en app/ui-kit.css (.ui-sheet, .ui-title…).
export function Sheet({ title, onClose, children, className = '', labelledBy }: {
  title?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  labelledBy?: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true"
         aria-label={typeof title === 'string' ? title : undefined} aria-labelledby={labelledBy}>
      <div className="ui-backdrop" onClick={onClose} aria-hidden="true" />
      <div data-drag-close className={`ui-sheet animate-fade-in-up ${className}`}>
        {title && <h2 className="ui-title mb-3">{title}</h2>}
        {children}
      </div>
    </div>,
    document.body,
  );
}
