'use client';
import { createPortal } from 'react-dom';
import { Camera, Images } from 'lucide-react';
import { tr } from '@/lib/i18n';

export type PhotoSource = 'camera' | 'gallery';

/**
 * Abre el selector de fotos con la fuente elegida, usando el MISMO <input type="file"> (y su onChange).
 * En Android, un campo con `multiple` abre solo la galería (sin cámara); por eso la cámara va sin `multiple`
 * y con `capture`, y la galería con `multiple` (un recibo largo puede venir en varias fotos).
 * Hay que llamarlo dentro del toque de la persona, o el celular no lo abre.
 */
export function openPhotoPicker(input: HTMLInputElement | null, source: PhotoSource) {
  if (!input) return;
  if (source === 'camera') { input.removeAttribute('multiple'); input.setAttribute('capture', 'environment'); }
  else { input.setAttribute('multiple', ''); input.removeAttribute('capture'); }
  input.click();
}

/** Hoja pequeña: "Tomar foto" o "Elegir de la galería". */
export function PhotoSourceSheet({ open, onPick, onClose, isTech }: {
  open: boolean;
  onPick: (source: PhotoSource) => void;
  onClose: () => void;
  isTech: boolean;
}) {
  if (!open || typeof document === 'undefined') return null;
  const btn = `w-full flex items-center gap-3 px-4 py-3.5 text-left font-semibold border transition-all active:scale-[0.98] ${
    isTech ? 'rounded-none border-accent/40 text-accent' : 'rounded-xl border-glass-border text-text-primary bg-white/5 hover:bg-white/10'}`;
  return createPortal(
    <div className="fixed inset-0 z-[230] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className={`relative animate-fade-in-up p-4 pb-6 space-y-2 border-t ${isTech ? 'bg-deep border-accent/30 font-mono' : 'bg-card border-glass-border rounded-t-2xl'}`}>
        <p className="text-sm font-bold text-text-primary mb-1">{tr('Foto del recibo')}</p>
        <button type="button" className={btn} onClick={() => onPick('camera')}>
          <Camera className="w-5 h-5 text-accent shrink-0" /> {tr('Tomar foto')}
        </button>
        <button type="button" className={btn} onClick={() => onPick('gallery')}>
          <Images className="w-5 h-5 text-accent shrink-0" />
          <span>{tr('Elegir de la galería')}<span className="block text-[11px] font-normal text-text-muted">{tr('Puedes escoger varias si el recibo es largo')}</span></span>
        </button>
        <button type="button" onClick={onClose} className="w-full py-2.5 text-sm font-semibold text-text-secondary">{tr('Cancelar')}</button>
      </div>
    </div>,
    document.body,
  );
}
