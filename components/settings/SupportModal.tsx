'use client';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { SupportProject } from '@/components/settings/SupportProject';

// La misma información de "Apoyar a FLOWI" de Configuración, en un modal (desde "Tu siguiente acción")
export function SupportModal({ onClose }: { onClose: () => void }) {
  const { theme } = useTheme();
  const isTech = theme === 'cyberpunk' || theme === 'kiloCode';
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className={`absolute inset-0 ${theme === 'light' ? 'bg-black/10' : 'bg-black/50'}`} onClick={onClose} aria-hidden="true" />
      <div className={`relative z-10 w-full max-w-md max-h-[88dvh] overflow-y-auto glass-dropdown p-5 animate-fade-in-up ${isTech ? 'rounded-none border border-accent/50' : 'rounded-3xl'}`}>
        <button type="button" onClick={onClose} aria-label="Cerrar" className={`absolute top-4 right-4 ${isTech ? 'text-accent' : 'text-text-secondary hover:text-text-primary'}`}><X className="w-5 h-5" /></button>
        <SupportProject isTechTheme={isTech} />
      </div>
    </div>,
    document.body,
  );
}
