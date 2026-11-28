'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';
import { LANGS, LANG_NAMES, LANG_SHORT, useT } from '@/lib/i18n';

const MENU_W = 232;   // ancho del desplegable (cabe "Español (España)" en una línea)
const EDGE = 12;      // margen mínimo con los bordes de la pantalla

// Cambio rápido de idioma del encabezado: muestra la sigla del idioma actual y, al tocarlo, la lista de los
// cuatro (cada uno escrito en su propio idioma, así se encuentra aunque la app esté en otro).
// El desplegable copia el del perfil (ProfileCapsule): mismo fondo glass-dropdown, borde, sombra, radio,
// filas y capa de fondo que cierra al tocar fuera. Va en un portal con posición fija, centrado bajo el
// botón y ajustado para no salirse de la pantalla en celulares.
export function LangMenu({ isTech }: { isTech: boolean }) {
  const { lang, setLang } = useT();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    if (!open) { setPos(null); return; }
    const place = () => {
      const r = btnRef.current?.getBoundingClientRect();
      if (!r) return;
      const vw = window.innerWidth;
      const width = Math.min(MENU_W, vw - EDGE * 2);
      const centered = r.left + r.width / 2 - width / 2;
      const left = Math.max(EDGE, Math.min(centered, vw - width - EDGE));
      setPos({ top: r.bottom + 10, left, width });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`relative w-9 h-9 bg-glass border border-glass-border flex items-center justify-center
                   hover:bg-glass-hover transition-colors text-[11px] font-bold tracking-wide text-text-secondary
                   rounded-xl ${isTech ? 'font-mono' : ''}`}
        title="Idioma · Language · Idioma"
        aria-label="Idioma · Language · Idioma"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {LANG_SHORT[lang]}
      </button>

      {open && pos && typeof document !== 'undefined' && createPortal(
        <>
          <div className="fixed inset-0 z-[70]" onClick={() => setOpen(false)} aria-hidden="true" />
          <div role="menu"
               className={`fixed z-[71] shadow-2xl shadow-black/10 animate-slide-down origin-top
                          overflow-y-auto glass-dropdown p-1.5
                          ${isTech ? 'rounded-none border border-accent/50' : 'rounded-2xl border border-glass-border/50'}`}
               style={{ top: pos.top, left: pos.left, width: pos.width }}>
            {LANGS.map(code => {
              const active = lang === code;
              return (
                <button key={code} type="button" role="menuitemradio" aria-checked={active}
                        onClick={() => { setLang(code); setOpen(false); }}
                        className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-colors
                                   ${active ? 'text-text-primary bg-glass' : 'text-text-secondary hover:text-text-primary hover:bg-glass'}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold transition-colors
                                    ${isTech ? 'font-mono' : ''} ${active ? 'bg-accent/25 text-accent' : 'bg-glass-strong'}`}>
                      {LANG_SHORT[code]}
                    </div>
                    <span className={`text-sm whitespace-nowrap truncate ${isTech ? 'font-mono text-accent uppercase tracking-wide' : active ? 'font-semibold' : ''}`}>
                      {LANG_NAMES[code]}
                    </span>
                  </div>
                  {active && <Check className="w-4 h-4 shrink-0 text-accent" />}
                </button>
              );
            })}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
