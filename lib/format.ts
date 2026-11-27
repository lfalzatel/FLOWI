import { currentLang, currentLocale, type Lang } from '@/lib/i18n';

export const CURRENCIES = [
  { code: 'COP', name: 'Peso Colombiano', locale: 'es-CO' },
  { code: 'USD', name: 'Dólar Estadounidense', locale: 'en-US' },
  { code: 'EUR', name: 'Euro', locale: 'es-ES' },
  { code: 'MXN', name: 'Peso Mexicano', locale: 'es-MX' },
  { code: 'BRL', name: 'Real Brasileño', locale: 'pt-BR' },
  { code: 'ARS', name: 'Peso Argentino', locale: 'es-AR' },
  { code: 'CLP', name: 'Peso Chileno', locale: 'es-CL' },
  { code: 'PEN', name: 'Sol Peruano', locale: 'es-PE' },
  { code: 'GBP', name: 'Libra Esterlina', locale: 'en-GB' },
  { code: 'JPY', name: 'Yen Japonés', locale: 'ja-JP' },
  { code: 'CAD', name: 'Dólar Canadiense', locale: 'en-CA' },
  { code: 'AUD', name: 'Dólar Australiano', locale: 'en-AU' },
];

// Monedas que en la práctica no usan centavos (en Colombia nadie escribe 0,25 pesos)
const NO_CENTS = new Set(['COP', 'CLP', 'JPY', 'PYG', 'KRW', 'VND']);

/** Moneda inicial según el idioma: euros en España y Portugal, pesos colombianos en los demás. */
export function defaultCurrency(lang: Lang = currentLang()): string {
  return lang === 'es-ES' || lang === 'pt' ? 'EUR' : 'COP';
}

/** ¿Esta moneda usa centavos? (euro y dólar sí: "gasté 0,25 €") */
export function hasCents(currencyCode?: string): boolean {
  return !NO_CENTS.has(currencyCode || defaultCurrency());
}

/** Redondea a lo que maneja la moneda: pesos enteros, o centavos. */
export function roundMoney(amount: number, currencyCode?: string): number {
  const code = currencyCode || defaultCurrency();
  return hasCents(code) ? Math.round(amount * 100) / 100 : Math.round(amount);
}

export function formatCurrency(amount: number, currencyCode?: string): string {
  const code = currencyCode || defaultCurrency();
  const currencyInfo = CURRENCIES.find(c => c.code === code) || CURRENCIES[0];

  // Los miles, decimales y posición del símbolo siguen el idioma activo de la app (es-CO, es-ES, en-US, pt-PT)
  return new Intl.NumberFormat(currentLocale(), {
    style: 'currency',
    currency: currencyInfo.code,
    currencyDisplay: 'narrowSymbol', // "$2,600,000" / "1.250,50 €" sin prefijos largos como "COP"
    maximumFractionDigits: hasCents(currencyInfo.code) ? 2 : 0,
  }).format(amount);
}
