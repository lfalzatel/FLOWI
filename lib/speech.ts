// Prepara un texto para leerlo en voz alta con la voz del navegador (tutoriales, asistente, avisos).
// Sin dependencias (lo usa lib/voiceParser, que no puede importar lib/i18n).
// - "FLOWI" en mayúsculas lo deletreaba ("F, L, O…"): se lee como palabra.
// - "12000+3500" se leía raro ("tres, cinco, cero, cero"): se dice "12000 más 3500".
// - Los puntos o comas de miles ("50.480", "1,500,000") se quitan para que lea el número entero.
// - "%" y "50/30/20" se dicen con palabras.
export function speechText(text: string, lang: 'es' | 'en' = 'es'): string {
  const plus = lang === 'en' ? ' plus ' : ' más ';
  const pct = lang === 'en' ? ' percent' : ' por ciento';
  return text
    .replace(/\bFLOWI\b/g, 'Flowi')
    .replace(/(\d)\s*\+\s*(?=\d)/g, `$1${plus}`)
    // separadores de miles: 1.500.000 / 1,500,000 / 50.480 (sin tocar decimales como 28,17)
    .replace(/\d{1,3}(?:[.,]\d{3})+(?![.,]?\d)/g, m => m.replace(/[.,]/g, ''))
    .replace(/(\d)\s*%/g, `$1${pct}`)
    .replace(/(\d+)\/(\d+)\/(\d+)/g, '$1, $2, $3')
    .replace(/\$\s*-\s*(?=\d)/g, lang === 'en' ? 'minus ' : 'menos ')
    .replace(/\$\s*/g, '')
    .replace(/["«»“”]/g, '');
}
