'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';
import { LANGS, LANG_NAMES, LANG_SHORT, useT } from '@/lib/i18n';

// Cambio rápido de idioma del encabezado: muestra la sigla del idioma actual y, al tocarlo, la lista de los
// cuatro (cada uno escrito en su propio idioma, así se encuentra aunque la app esté en otro).
// El desplegable copia el del perfil (ProfileCapsule): mismo fondo glass-dropdown, borde, sombra, radio,
// filas y capa de fondo en un portal que cierra al tocar fuera.
export function LangMenu({ isTech }: { isTech: boolean }) {
  const { lang, setLang } = useT();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [open]);

  return (
    <div className="relative">
      <button
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

      {open && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 transition-opacity" onClick={() => setOpen(false)} aria-hidden="true" />,
        document.body
      )}
      {open && (
        <div role="menu"
             className={`absolute right-0 top-full mt-2.5 shadow-2xl shadow-black/10 animate-slide-down origin-top-right
                        overflow-y-auto z-50 glass-dropdown p-1.5
                        ${isTech ? 'rounded-none border border-accent/50' : 'rounded-2xl border border-glass-border/50'}`}
             style={{ width: '232px' }}>
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
                  <span className={`text-sm truncate ${isTech ? 'font-mono text-accent uppercase tracking-wide' : active ? 'font-semibold' : ''}`}>
                    {LANG_NAMES[code]}
                  </span>
                </div>
                {active && <Check className="w-4 h-4 shrink-0 text-accent" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
