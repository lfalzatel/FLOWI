// Prueba de "¿Cuánto gasto en…?" (lib/productSpend.ts). Uso: node scripts/test-product-spend.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ts = createRequire(path.join(root, 'package.json'))('typescript');
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowi-prod-'));
const tr = (file, out, fix = s => s) => fs.writeFileSync(path.join(outDir, out), fix(ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText));
tr('lib/categories.ts', 'categories.mjs');
tr('lib/productSpend.ts', 'productSpend.mjs', s => s.replace(/from '\.\/categories'/g, "from './categories.mjs'"));
const { productSpend, matchesProduct, frequentProducts } = await import(pathToFileURL(path.join(outDir, 'productSpend.mjs')).href);

let fails = 0;
const check = (n, c) => { if (!c) fails++; console.log(`${c ? '✓' : '✗'} ${n}`); };
const now = new Date(2026, 10, 16);
const tx = [
  { id: 'a', type: 'gasto', amount: 40000, category: 'Mercado', date: new Date(2026, 9, 5), items: [{ name: 'HUEVOS AA 30', qty: 1, price: 15000, total: 15000 }, { name: 'Arroz', qty: 1, total: 25000 }] },
  { id: 'b', type: 'gasto', amount: 16050, category: 'Mercado', date: new Date(2026, 10, 10), items: [{ name: 'HUEVOS LA 80 30uni', qty: 1, price: 16050, total: 16050 }] },
  { id: 'c', type: 'gasto', amount: 8000, category: 'Mercado', description: 'Huevos tienda', date: new Date(2026, 10, 12) },
  { id: 'd', type: 'gasto', amount: 9000, category: 'Licores y Bares', description: 'Cerveza', date: new Date(2026, 10, 12) },
];
check('"huevos" encuentra "HUEVOS"', matchesProduct('HUEVOS AA 30', 'huevos'));
check('"huevo" encuentra "Huevos"', matchesProduct('Huevos tienda', 'huevo'));
check('no confunde "arroz" con huevos', !matchesProduct('Arroz', 'huevos'));
const r = productSpend(tx, 'huevos', now);
check('3 compras (2 de recibos + 1 por descripción)', r.purchases.length === 3);
check('este mes 24.050', r.thisMonth === 24050);
check('meses oct y nov', r.months.length === 2 && r.months[0].total === 15000);
check('precio subió 7 %', Math.round(r.priceChange * 100) === 7 && r.lastPrice.price === 16050);
const tx2 = [...tx, { id: 'e', type: 'gasto', amount: 3348, category: 'Mercado', date: new Date(2026, 10, 16), items: [{ name: 'CEBOLLA HUEVO BLANCA', qty: 1, total: 3348 }] }];
check('no cuenta "cebolla huevo" cuando hay huevos de verdad', productSpend(tx2, 'huevos', now).purchases.length === 3);
check('si solo hay "cebolla huevo", sí la encuentra', productSpend(tx2.slice(4), 'huevo', now).purchases.length === 1);
check('productos frecuentes', frequentProducts(tx)[0] === 'Huevos');
fs.rmSync(outDir, { recursive: true, force: true });
console.log(fails ? `\n${fails} fallaron` : '\nTodas pasaron');
process.exit(fails ? 1 : 0);
