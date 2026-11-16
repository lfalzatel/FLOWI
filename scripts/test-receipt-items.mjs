// Prueba de la limpieza y la revisión de suma de productos de un recibo (lib/receiptItems.ts).
// Uso: node scripts/test-receipt-items.mjs   (sale con código 1 si alguna falla)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ts = createRequire(path.join(root, 'package.json'))('typescript');
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowi-items-'));
const js = ts.transpileModule(fs.readFileSync(path.join(root, 'lib/receiptItems.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const out = path.join(outDir, 'receiptItems.mjs');
fs.writeFileSync(out, js);
const { sanitizeReceiptItems, itemsCheck, formatQty } = await import(pathToFileURL(out).href);

let fails = 0;
const check = (name, cond) => { if (!cond) fails++; console.log(`${cond ? '✓' : '✗'} ${name}`); };

// Recibo de mercado real (16 renglones, total 85.850)
const raw = [
  { name: 'HUEVOS LA 80 30uni TIPO A', qty: 1, unit: 'UNI', price: 16050, total: 16050 },
  { name: 'CEBOLLA RAMA LIMPIA kg A GRANEL', qty: 0.845, unit: 'KG', price: 7800, total: 6591 },
  { name: 'CILANTRO kg A GRANEL', qty: 0.1, unit: 'KG', price: 17000, total: 1700 },
  { name: 'AJO kg A GRANEL', qty: 0.14, unit: 'KG', price: 20500, total: 2870 },
  { name: 'ZANAHORIA kg A GRANEL', qty: 0.745, unit: 'KG', price: 4163, total: 3101 },
  { name: 'TOMATE ALIÑO kg A GRANEL', qty: 0.505, unit: 'KG', price: 6450, total: 3257 },
  { name: 'PEPINO kg A GRANEL', qty: 0.51, unit: 'KG', price: 5200, total: 2652 },
  { name: 'PIMENTON ROJO kg A GRANEL', qty: 0.145, unit: 'KG', price: 7800, total: 1131 },
  { name: 'CEBOLLA HUEVO BLANCA SIN PELA', qty: 0.54, unit: 'KG', price: 6200, total: 3348 },
  ...Array.from({ length: 6 }, () => ({ name: 'ATUN MUA 160g LOMITO ACEITE', qty: 1, unit: 'UNI', price: 4275, total: 4275 })),
  { name: 'BULTICO DE PAPA 10lbs', qty: 1, unit: 'UNI', price: 19500, total: 19500 },
];
const items = sanitizeReceiptItems(raw);
check('16 renglones → 11 productos (6 atunes juntos)', items.length === 11);
const atun = items.find(i => i.name.startsWith('ATUN'));
check('atún 6 × 4.275 = 25.650', atun?.qty === 6 && atun.total === 25650 && atun.price === 4275);
check('kilos con unidad kg', items[1].unit === 'kg' && items[1].qty === 0.845);
check('UNI sin unidad', items[0].unit === undefined);
check('la suma cuadra con 85.850', itemsCheck(items, 85850).ok && itemsCheck(items, 85850).sum === 85850);
check('no cuadra si falta un renglón', !itemsCheck(items.slice(1), 85850).ok);
check('tolera redondeo de 30 pesos', itemsCheck(items, 85880).ok);

const messy = sanitizeReceiptItems([
  { name: '  Gaseosa   600ml ', qty: '2', price: '3000', total: null },
  { name: 'null', total: 500 },
  { name: 'Sin valor', qty: 1 },
  { nombre: 'Pan', cantidad: 0, precio: 1200 },
  'basura',
]);
check('total = cantidad × precio si falta', messy[0]?.total === 6000 && messy[0].name === 'Gaseosa 600ml');
check('descarta "null" y sin valor', messy.length === 2);
check('cantidad 0 pasa a 1 y acepta claves en español', messy[1]?.name === 'Pan' && messy[1].qty === 1 && messy[1].total === 1200);
check('no es lista → vacío', sanitizeReceiptItems(null).length === 0);
check('formato de cantidad', formatQty(items[1]) === '0,845 kg');

fs.rmSync(outDir, { recursive: true, force: true });
console.log(fails ? `\n${fails} fallaron` : '\nTodas pasaron');
process.exit(fails ? 1 : 0);
