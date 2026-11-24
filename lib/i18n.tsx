'use client';
import { Fragment, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { EN } from '@/lib/i18n-en';

// Idioma de la app. FLOWI está escrito en español; en inglés se busca cada frase en lib/i18n-en.ts.
// Lo que aún no esté traducido se ve en español (nunca un texto vacío ni una clave rara).
//  - La primera vez se usa el idioma del celular: español si es "es-…", inglés en cualquier otro.
//  - Si la persona lo cambia en Configuración, se recuerda en este celular.

export type Lang = 'es' | 'en';
const KEY = 'flowi-lang';

export function detectLang(): Lang {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'es' || saved === 'en') return saved;
  } catch { /* sin almacenamiento: se detecta */ }
  const nav = typeof navigator !== 'undefined' ? (navigator.languages?.[0] || navigator.language || 'es') : 'es';
  return nav.toLowerCase().startsWith('es') ? 'es' : 'en';
}

type Vars = Record<string, string | number>;
const fill = (s: string, vars?: Vars) => (vars ? s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`)) : s);

/** Traduce una frase en español al idioma pedido. Acepta {variables}: t('Hola {nombre}', { nombre }). */
export function translate(lang: Lang, es: string, vars?: Vars): string {
  return fill(lang === 'en' ? EN[es] ?? es : es, vars);
}

// Idioma actual para tr(): sirve en cualquier parte (listas, funciones, textos armados fuera de una pantalla)
// porque al cambiar de idioma toda la app se vuelve a dibujar (ver LanguageProvider).
let current: Lang = 'es';
export const currentLang = () => current;
export const currentLocale = () => (current === 'en' ? 'en-US' : 'es-CO');
export function tr(es: string, vars?: Vars): string {
  return translate(current, es, vars);
}

/**
 * Texto "técnico" de los temas Cyber y Kilo (MI_PERFIL). En español se usa tal cual; en inglés se arma
 * desde la traducción del texto normal: 'Mi perfil' → 'My profile' → 'MY_PROFILE'.
 */
export function trTech(tech: string, es: string, vars?: Vars): string {
  if (current !== 'en') return fill(tech, vars);
  return translate('en', es, vars).toUpperCase().replace(/[\s,.:;]+/g, '_').replace(/_+$/, '');
}

/**
 * Lista o tabla de textos definida fuera de un componente (se evalúa una sola vez al cargar). Con lazyT se
 * vuelve a armar con el idioma actual cada vez que se usa: const TIPS = lazyT(() => [{ title: tr('…') }]).
 */
export function lazyT<T extends object>(factory: () => T): T {
  let cache: { lang: Lang; value: T } | null = null;
  const value = () => {
    if (!cache || cache.lang !== current) cache = { lang: current, value: factory() };
    return cache.value as any;
  };
  const target = (Array.isArray(factory()) ? [] : {}) as T;
  return new Proxy(target, {
    get: (_, p) => { const v = value()[p]; return typeof v === 'function' ? v.bind(value()) : v; },
    has: (_, p) => p in value(),
    ownKeys: () => Reflect.ownKeys(value()),
    getOwnPropertyDescriptor: (_, p) => {
      const d = Reflect.getOwnPropertyDescriptor(value(), p);
      return d ? { ...d, configurable: true } : undefined;
    },
  });
}

interface LangCtx {
  lang: Lang;
  locale: string;                      // para fechas y números: es-CO / en-US
  setLang: (l: Lang) => void;
  t: (es: string, vars?: Vars) => string;
}

const Ctx = createContext<LangCtx>({
  lang: 'es', locale: 'es-CO', setLang: () => {}, t: (es, vars) => fill(es, vars),
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('es');
  useEffect(() => { setLangState(detectLang()); }, []);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(KEY, l); } catch { /* se usa solo en esta sesión */ }
  }, []);
  const value = useMemo<LangCtx>(() => ({
    lang, setLang, locale: lang === 'en' ? 'en-US' : 'es-CO',
    t: (es, vars) => translate(lang, es, vars),
  }), [lang, setLang]);
  current = lang;
  // key: al cambiar de idioma se vuelve a dibujar todo, así cada tr() toma el idioma nuevo
  return <Ctx.Provider value={value}><Fragment key={lang}>{children}</Fragment></Ctx.Provider>;
}

export const useT = () => useContext(Ctx);
