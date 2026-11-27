// Prueba del sistema de idiomas (lib/i18n.tsx), moneda por defecto y formatos por idioma (lib/format.ts).
// Uso: node scripts/test-i18n.mjs   (sale con código 1 si alguna falla)
import { loadTs, tester } from './lib/load-ts.mjs';

const I = await loadTs('lib/i18n.tsx');
const F = await loadTs('lib/format.ts');
const D = await loadTs('lib/dateUtils.ts');
const { eq, done } = tester();

eq('español tal cual', I.translate('es', 'Gastos'), 'Gastos');
eq('inglés', I.translate('en', 'Gastos'), 'Expenses');
eq('portugués (pt-PT)', I.translate('pt', 'Gastos'), 'Despesas');
eq('español de España', I.translate('es-ES', 'Arriendo'), 'Alquiler');
eq('español de España conserva lo igual', I.translate('es-ES', 'Gastos'), 'Gastos');
eq('frase sin traducir queda en español', I.translate('en', 'Frase que no existe'), 'Frase que no existe');
eq('variables', I.translate('en', 'Desde mañana, máximo {a} al día', { a: '$5.000' }), 'From tomorrow, at most $5.000 a day');
eq('variables en español', I.translate('es', 'Quedan {n} días', { n: 3 }), 'Quedan 3 días');

eq('moneda inicial es → COP', F.defaultCurrency('es'), 'COP');
eq('moneda inicial en → COP', F.defaultCurrency('en'), 'COP');
eq('moneda inicial es-ES → EUR', F.defaultCurrency('es-ES'), 'EUR');
eq('moneda inicial pt → EUR', F.defaultCurrency('pt'), 'EUR');
eq('centavos EUR sí, COP no', [F.hasCents('EUR'), F.hasCents('COP')], [true, false]);
eq('formato EUR incluye símbolo €', F.formatCurrency(25.5, 'EUR').includes('€'), true);
eq('formato fecha mes', D.formatFilterText('month', '2026-11').length > 4, true);

const L = I.lazyT(() => [{ t: I.tr('Gastos') }, { t: I.tr('Ingresos') }]);
eq('lazyT: es arreglo', Array.isArray(L), true);
eq('lazyT: largo', L.length, 2);
eq('lazyT: map', L.map(x => x.t), ['Gastos', 'Ingresos']);
eq('lazyT: for…of', [...L].length, 2);
const R = I.lazyT(() => ({ a: I.tr('Gastos'), b: 'x' }));
eq('lazyT: objeto, llaves', Object.keys(R), ['a', 'b']);
eq('lazyT: objeto, entradas', Object.entries(R)[0], ['a', 'Gastos']);
eq('lazyT: acceso directo', R.b, 'x');

// Catálogo por país: botones sin mezclar países, búsqueda y reconocimiento globales
const C = await loadTs('lib/categories.ts');
const m = (cat, lang) => C.getMerchantsForCategory(cat, lang).map(x => x.label);
const p = (lang) => C.getPaymentMethodsForLang(lang).map(x => x.label);
const has = (arr, ...xs) => xs.every(x => arr.includes(x));
const none = (arr, ...xs) => xs.every(x => !arr.includes(x));
eq('Mercado es: Éxito, sin otros países', [has(m('Mercado', 'es'), 'Éxito'), none(m('Mercado', 'es'), 'Mercadona', 'Continente', 'Walmart')], [true, true]);
eq('Mercado es-ES: Mercadona, sin Éxito/Walmart', [has(m('Mercado', 'es-ES'), 'Mercadona'), none(m('Mercado', 'es-ES'), 'Éxito', 'Walmart')], [true, true]);
eq('Mercado pt: Continente y Pingo Doce, sin Éxito', [has(m('Mercado', 'pt'), 'Continente', 'Pingo Doce'), none(m('Mercado', 'pt'), 'Éxito')], [true, true]);
eq('Mercado en: Walmart y Costco, sin Éxito', [has(m('Mercado', 'en'), 'Walmart', 'Costco'), none(m('Mercado', 'en'), 'Éxito')], [true, true]);
eq('Netflix global en los 4 idiomas', ['es', 'es-ES', 'pt', 'en'].map(l => m('Suscripciones', l).includes('Netflix')), [true, true, true, true]);
eq('sin idioma = todo el catálogo', has(m('Mercado'), 'Éxito', 'Mercadona', 'Continente', 'Walmart'), true);
eq('pagos es: Nequi, sin MB WAY/Zelle', [has(p('es'), 'Nequi'), none(p('es'), 'MB WAY', 'Zelle')], [true, true]);
eq('pagos es-ES: Bizum, sin Nequi', [has(p('es-ES'), 'Bizum'), none(p('es-ES'), 'Nequi')], [true, true]);
eq('pagos pt: MB WAY, sin Bizum', [has(p('pt'), 'MB WAY'), none(p('pt'), 'Bizum')], [true, true]);
eq('pagos en: Zelle y Venmo', has(p('en'), 'Zelle', 'Venmo'), true);
eq('Efectivo en todos', ['es', 'es-ES', 'pt', 'en'].map(l => p(l).includes('Efectivo')), [true, true, true, true]);
eq('reconoce comercios de cualquier país', ['Mercadona', 'Continente', 'Walmart'].map(x => !!C.findCatalogEntry(x)), [true, true, true]);
eq('detecta Mercadona en texto', C.detectMerchantInText('compras en mercadona')?.label, 'Mercadona');

done();
