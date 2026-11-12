// Prueba de las correcciones por voz sobre una transacción en pantalla (lib/voiceCorrection.ts).
// Uso: node scripts/test-voice-correction.mjs   (sale con código 1 si alguna falla)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ts = createRequire(path.join(root, 'package.json'))('typescript');
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowi-corr-'));
const transpile = (file, out, replace) => {
  let js = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  for (const [from, to] of replace) js = js.replace(from, to);
  fs.writeFileSync(path.join(outDir, out), js);
};
const fix = [[/from ['"]\.\/firestore['"]/, "from './firestore.mjs'"], [/from ['"]\.\/categories['"]/g, "from './categories.mjs'"], [/from ['"]\.\/voiceParser['"]/, "from './voiceParser.mjs'"]];
transpile('lib/categories.ts', 'categories.mjs', []);
transpile('lib/voiceParser.ts', 'voiceParser.mjs', fix);
transpile('lib/voiceCorrection.ts', 'voiceCorrection.mjs', fix);
fs.writeFileSync(path.join(outDir, 'firestore.mjs'), 'export function isFixedExpenseCategory() { return false; }\n');

const { applyVoiceCorrection } = await import(pathToFileURL(path.join(outDir, 'voiceCorrection.mjs')).href);
const { BASE_CATEGORY_DEFS } = await import(pathToFileURL(path.join(outDir, 'categories.mjs')).href);

const base = { kind: 'transaction', type: 'gasto', amount: 22550, category: 'Mercado', description: 'Compra de panela', isFixed: false, rawText: '', date: '2026-11-12', time: '15:20', paymentMethod: 'BBVA' };
const pay = ['Nequi', 'Bancolombia', 'BBVA', 'Efectivo'];
const now = new Date(2026, 10, 12, 16, 0);
const cases = [
  ['eran 25 mil', { amount: 25000 }],
  ['fueron 22.800', { amount: 22800 }],
  ['ponlo en Nequi', { paymentMethod: 'Nequi' }],
  ['lo pagué en efectivo', { paymentMethod: 'Efectivo' }],
  ['fue ayer', { date: '2026-11-11' }],
  ['fue el 3 de noviembre', { date: '2026-11-03' }],
  ['la categoría es restaurantes', { category: 'Restaurantes' }],
  ['es un ingreso', { type: 'ingreso' }],
  ['la descripción es mercado de la semana', { description: 'Mercado de la semana' }],
  ['eran 30 mil y lo pagué con Bancolombia', { amount: 30000, paymentMethod: 'Bancolombia' }],
];
let failed = 0;
for (const [frase, exp] of cases) {
  const { item, changed } = applyVoiceCorrection(base, frase, BASE_CATEGORY_DEFS, pay, now);
  const bad = Object.entries(exp).filter(([k, v]) => item[k] !== v).map(([k, v]) => `${k}: esperaba ${v}, salió ${item[k]}`);
  const extra = changed.filter(k => !(k in exp));
  if (extra.length) bad.push(`cambió además: ${extra.join(', ')}`);
  if (bad.length) { failed++; console.log(`✗ "${frase}" → ${bad.join(' · ')}`); }
}
console.log(`${cases.length - failed}/${cases.length} correcciones correctas`);
fs.rmSync(outDir, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
