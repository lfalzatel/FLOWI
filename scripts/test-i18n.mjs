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

done();
