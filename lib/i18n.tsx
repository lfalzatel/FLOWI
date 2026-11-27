'use client';
import { Fragment, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { EN } from '@/lib/i18n-en';
import { PT } from '@/lib/i18n-pt';
import { ES_ES } from '@/lib/i18n-es-es';

// Idioma de la app. FLOWI está escrito en español (de Colombia); cada otro idioma busca la frase en su
// diccionario: inglés lib/i18n-en.ts, portugués de Portugal lib/i18n-pt.ts y español de España
// lib/i18n-es-es.ts (este último solo trae lo que cambia: móvil, dinero, euros…).
// Lo que aún no esté traducido se ve en español (nunca un texto vacío ni una clave rara).
//  - La primera vez se usa el idioma del celular: es-ES → España, es-… → español, pt-… → portugués,
//    cualquier otro → inglés.
//  - Si la persona lo cambia en Configuración, se recuerda en este celular.

export type Lang = 'es' | 'es-ES' | 'en' | 'pt';
export const LANGS: Lang[] = ['es', 'es-ES', 'en', 'pt'];
/** Nombre de cada idioma escrito en ese mismo idioma (para el selector). */
export const LANG_NAMES: Record<Lang, string> = { es: 'Español', 'es-ES': 'Español (España)', en: 'English', pt: 'Português' };
/** Sigla corta para el botón del encabezado. */
export const LANG_SHORT: Record<Lang, string> = { es: 'ES', 'es-ES': 'ES', en: 'EN', pt: 'PT' };
const LOCALES: Record<Lang, string> = { es: 'es-CO', 'es-ES': 'es-ES', en: 'en-US', pt: 'pt-PT' };
const KEY = 'flowi-lang';

/** ¿Es una variante del español? ('es' o 'es-ES'). */
export const isSpanish = (l: Lang) => l === 'es' || l === 'es-ES';

export function detectLang(): Lang {
  try {
    const saved = localStorage.getItem(KEY) as Lang | null;
    if (saved && LANGS.includes(saved)) return saved;
  } catch { /* sin almacenamiento: se detecta */ }
  const nav = (typeof navigator !== 'undefined' ? (navigator.languages?.[0] || navigator.language || 'es') : 'es').toLowerCase();
  if (nav.startsWith('es-es')) return 'es-ES';
  if (nav.startsWith('es')) return 'es';
  if (nav.startsWith('pt')) return 'pt';
  return 'en';
}

type Vars = Record<string, string | number>;
const fill = (s: string, vars?: Vars) => (vars ? s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`)) : s);

/** Traduce una frase en español al idioma pedido. Acepta {variables}: t('Hola {nombre}', { nombre }). */
export function translate(lang: Lang, es: string, vars?: Vars): string {
  const dict = lang === 'en' ? EN : lang === 'pt' ? PT : lang === 'es-ES' ? ES_ES : null;
  return fill(dict ? dict[es] ?? es : es, vars);
}

// Idioma actual para tr(): sirve en cualquier parte (listas, funciones, textos armados fuera de una pantalla)
// porque al cambiar de idioma toda la app se vuelve a dibujar (ver LanguageProvider).
let current: Lang = 'es';
export const currentLang = () => current;
export const currentLocale = () => LOCALES[current];
export function tr(es: string, vars?: Vars): string {
  return translate(current, es, vars);
}

/**
 * Texto "técnico" de los temas Cyber y Kilo (MI_PERFIL). En español se usa tal cual; en los demás idiomas se
 * arma desde la traducción del texto normal: 'Mi perfil' → 'My profile' → 'MY_PROFILE'.
 */
export function trTech(tech: string, es: string, vars?: Vars): string {
  if (current === 'es' || (current === 'es-ES' && !(es in ES_ES))) return fill(tech, vars);
  return translate(current, es, vars).toUpperCase().replace(/[\s,.:;]+/g, '_').replace(/_+$/, '');
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
  locale: string;                      // para fechas y números: es-CO / es-ES / en-US / pt-PT
  setLang: (l: Lang) => void;
  t: (es: string, vars?: Vars) => string;
}

const Ctx = createContext<LangCtx>({
  lang: 'es', locale: 'es-CO', setLang: () => {}, t: (es, vars) => fill(es, vars),
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('es');
  useEffect(() => { setLangState(detectLang()); }, []);
  // <html lang>: 'es', 'es-ES', 'en' o 'pt-PT' (lo lee lib/voiceParser para hablar en el idioma de la app)
  useEffect(() => { document.documentElement.lang = lang === 'pt' ? 'pt-PT' : lang; }, [lang]);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(KEY, l); } catch { /* se usa solo en esta sesión */ }
  }, []);
  const value = useMemo<LangCtx>(() => ({
    lang, setLang, locale: LOCALES[lang],
    t: (es, vars) => translate(lang, es, vars),
  }), [lang, setLang]);
  current = lang;
  // key: al cambiar de idioma se vuelve a dibujar todo, así cada tr() toma el idioma nuevo
  return <Ctx.Provider value={value}><Fragment key={lang}>{children}</Fragment></Ctx.Provider>;
}

export const useT = () => useContext(Ctx);
