// Prueba de extractos en PDF (lib/pdfTable.ts → lib/statementImport.ts) con líneas como las que da pdf.js.
// Uso: node scripts/test-pdf-table.mjs   (sale con código 1 si alguna falla)
import { loadTs, tester } from './lib/load-ts.mjs';

const P = await loadTs('lib/pdfTable.ts');
const S = await loadTs('lib/statementImport.ts');
const { eq, done } = tester();

// Un extracto tipo Nequi: título, datos de la persona, encabezado y movimientos; en la página 2 se repite el encabezado
const L = (...cells) => cells.map(([x, str]) => ({ x, str }));
const lines = [
  L([40, 'Extracto de tu cuenta Nequi']),
  L([40, 'Periodo: 01/10/2026 - 31/10/2026']),
  L([40, 'Fecha del movimiento'], [160, 'Descripción'], [380, 'Valor'], [470, 'Saldo']),
  L([40, '02/10/2026'], [160, 'Recibí de JUAN PEREZ'], [392, '$50.000,00'], [470, '$80.000,00']),
  L([40, '05/10/2026'], [160, 'Pago en'], [190, 'TIENDA D1'], [390, '-$23.450,00'], [470, '$56.550,00']),
  L([40, '10/10/2026'], [160, 'Envío a MARIA'], [394, '-$10.000,00'], [470, '$46.550,00']),
  L([40, 'Fecha del movimiento'], [160, 'Descripción'], [380, 'Valor'], [470, 'Saldo']),
  L([40, '15/10/2026'], [160, 'Pago PSE CLARO'], [391, '-$65.900,00'], [470, '-$19.350,00']),
];

const table = P.linesToTable(lines);
eq('encabezado con 4 columnas', table[0], ['Fecha del movimiento', 'Descripción', 'Valor', 'Saldo']);
eq('el encabezado repetido de la página 2 no se cuenta', table.filter(r => r[0] === 'Fecha del movimiento').length, 1);
eq('texto partido en dos se junta en su columna', table.find(r => r[0] === '05/10/2026')?.[1], 'Pago en TIENDA D1');

const map = S.guessColumns(table);
eq('columnas reconocidas', map && [map.date, map.description, map.amount], [0, 1, 2]);
const rows = S.buildRows(table, map, []);
eq('4 movimientos', rows.length, 4);
eq('ingreso y gastos', rows.map(r => r.type), ['ingreso', 'gasto', 'gasto', 'gasto']);
eq('montos', rows.map(r => r.amount), [50000, 23450, 10000, 65900]);
eq('fechas', rows.map(r => r.date), ['2026-10-02', '2026-10-05', '2026-10-10', '2026-10-15']);

// Sin encabezado reconocible: se separa por huecos
const loose = P.linesToTable([L([40, '01/11/2026'], [200, 'Compra'], [400, '-$1.000'])]);
eq('sin encabezado: separa por huecos', loose[0], ['01/11/2026', 'Compra', '-$1.000']);

done();
