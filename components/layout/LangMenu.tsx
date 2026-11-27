'use client';
import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { LANGS, LANG_NAMES, LANG_SHORT, useT } from '@/lib/i18n';

// Cambio rápido de idioma del encabezado: muestra la sigla del idioma actual y, al tocarlo, la lista de los
// cuatro (cada uno escrito en su propio idioma, así se encuentra aunque la app esté en otro).
export function LangMenu({ isTech }: { isTech: boolean }) {
  const { lang, setLang } = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  return (
    <div ref={ref} className="relative">
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
      {open && (
        <div role="menu"
             className={`absolute right-0 top-11 z-50 min-w-[190px] p-1 bg-bg-card border border-glass-border shadow-xl
                        ${isTech ? 'rounded-none font-mono' : 'rounded-xl'}`}>
          {LANGS.map(code => (
            <button key={code} type="button" role="menuitemradio" aria-checked={lang === code}
                    onClick={() => { setLang(code); setOpen(false); }}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-sm text-left
                               ${isTech ? 'rounded-none' : 'rounded-lg'}
                               ${lang === code ? 'bg-accent/15 text-accent font-semibold' : 'text-text-primary hover:bg-glass-hover'}`}>
              <span><span className="inline-block w-8 text-[11px] font-bold text-text-muted">{LANG_SHORT[code]}</span>{LANG_NAMES[code]}</span>
              {lang === code && <Check className="w-4 h-4 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
