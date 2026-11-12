// Prueba de lo que se dicta en los formularios de deudas e inversiones (lib/formDictation.ts).
// Uso: node scripts/test-form-dictation.mjs   (sale con código 1 si alguna falla)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ts = createRequire(path.join(root, 'package.json'))('typescript');
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowi-form-'));
const transpile = (file, out) => {
  let js = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  js = js.replace(/from ['"]\.\/firestore['"]/, "from './firestore.mjs'").replace(/from ['"]\.\/categories['"]/g, "from './categories.mjs'").replace(/from ['"]\.\/voiceParser['"]/, "from './voiceParser.mjs'");
  fs.writeFileSync(path.join(outDir, out), js);
};
transpile('lib/categories.ts', 'categories.mjs');
transpile('lib/voiceParser.ts', 'voiceParser.mjs');
transpile('lib/formDictation.ts', 'formDictation.mjs');
fs.writeFileSync(path.join(outDir, 'firestore.mjs'), 'export function isFixedExpenseCategory() { return false; }\n');
const { parseDebtSpeech, parseInvestmentSpeech } = await import(pathToFileURL(path.join(outDir, 'formDictation.mjs')).href);

const now = new Date(2026, 10, 12, 16, 0);
const cases = [
  [parseDebtSpeech, 'Crediágil de 700 mil al 28,17 a 60 meses, pago los 15, desembolso el 5 de noviembre',
    { kind: 'banco', title: 'Crediágil', amount: 700000, rate: 28.17, rateUnit: 'ea', termMonths: 60, paymentDay: 15, date: '2026-11-05' }],
  [parseDebtSpeech, 'le presté 500 mil a Claudia al 2% mensual', { kind: 'preste', title: 'Claudia', amount: 500000, rate: 2, rateUnit: 'mensual' }],
  [parseDebtSpeech, 'mi hermana me prestó un millón ayer', { kind: 'persona', amount: 1000000, date: '2026-11-11' }],
  [parseDebtSpeech, 'me prestó Juan 300 mil, ya le pagué 100 mil', { kind: 'persona', title: 'Juan', amount: 300000, paid: 100000 }],
  [parseDebtSpeech, 'crédito libre inversión de 10 millones al 24 por ciento efectivo anual a 3 años con seguro de 233', { kind: 'banco', title: 'Libre inversión', amount: 10000000, rate: 24, termMonths: 36, insurance: 233 }],
  [parseDebtSpeech, 'tarjeta de crédito 2 millones cuota de 150 mil el 30 de cada mes', { kind: 'banco', amount: 2000000, installment: 150000, paymentDay: 30 }],
  [parseInvestmentSpeech, 'CDT de 5 millones en Bancolombia al 11% a 6 meses', { bank: 'Bancolombia', amount: 5000000, rateEA: 11, termMonths: 6, maturityDate: '2027-05-12' }],
  [parseInvestmentSpeech, 'cajita de Nu con 2 millones al 9 por ciento', { bank: 'Nu', amount: 2000000, rateEA: 9 }],
  [parseInvestmentSpeech, 'CDT en Davivienda de 10 millones al 10,5 a 180 días desde el 1 de noviembre', { bank: 'Davivienda', amount: 10000000, rateEA: 10.5, termDays: 180, startDate: '2026-11-01', maturityDate: '2027-04-30' }],
  [parseInvestmentSpeech, 'fondo en Skandia, invertí 3 millones y ya tiene 3,4 millones', { bank: 'Skandia', amount: 3000000, current: 3400000 }],
];
let failed = 0;
for (const [fn, frase, exp] of cases) {
  const got = fn(frase, now);
  const bad = Object.entries(exp).filter(([k, v]) => got[k] !== v).map(([k, v]) => `${k}: esperaba ${v}, salió ${got[k]}`);
  if (bad.length) { failed++; console.log(`✗ "${frase}"\n   ${bad.join(' · ')}`); }
}
console.log(`${cases.length - failed}/${cases.length} frases correctas`);
fs.rmSync(outDir, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
