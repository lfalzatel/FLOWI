// Prueba del sistema de idiomas (lib/i18n.tsx): traducción con variables y listas lazyT.
// Uso: node scripts/test-i18n.mjs   (sale con código 1 si alguna falla)
import { loadTs, tester } from './lib/load-ts.mjs';

const I = await loadTs('lib/i18n.tsx');
const { eq, done } = tester();

eq('español tal cual', I.translate('es', 'Gastos'), 'Gastos');
eq('inglés', I.translate('en', 'Gastos'), 'Expenses');
eq('frase sin traducir queda en español', I.translate('en', 'Frase que no existe'), 'Frase que no existe');
eq('variables', I.translate('en', 'Desde mañana, máximo {a} al día', { a: '$5.000' }), 'From tomorrow, at most $5.000 a day');
eq('variables en español', I.translate('es', 'Quedan {n} días', { n: 3 }), 'Quedan 3 días');

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
