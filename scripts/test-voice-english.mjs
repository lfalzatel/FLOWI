// Prueba del dictado en inglés (lib/voiceEnglish.ts + lib/voiceParser.ts).
// Uso: node scripts/test-voice-english.mjs   (sale con código 1 si alguna frase falla)
//      node scripts/test-voice-english.mjs --ver   (muestra lo que entiende cada frase)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ts = createRequire(path.join(root, 'package.json'))('typescript');
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowi-voice-en-'));
const transpile = (file, out, replaceImports) => {
  let js = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  for (const [from, to] of replaceImports) js = js.replace(from, to);
  fs.writeFileSync(path.join(outDir, out), js);
};
transpile('lib/categories.ts', 'categories.mjs', []);
transpile('lib/voiceEnglish.ts', 'voiceEnglish.mjs', []);
transpile('lib/voiceParser.ts', 'voiceParser.mjs', [
  [/from ['"]\.\/firestore['"]/, "from './firestore.mjs'"],
  [/from ['"]\.\/categories['"]/, "from './categories.mjs'"],
  [/from ['"]\.\/voiceEnglish['"]/, "from './voiceEnglish.mjs'"],
]);
// lib/speech.ts (lo importa voiceParser): se copia y se enlaza aquí también
fs.writeFileSync(path.join(outDir, 'speech.mjs'), ts.transpileModule(fs.readFileSync(path.join(root, 'lib/speech.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText);
{ const vp = path.join(outDir, 'voiceParser.mjs'); fs.writeFileSync(vp, fs.readFileSync(vp, 'utf8').replace(/from ['"]\.\/speech['"]/, "from './speech.mjs'")); }
fs.writeFileSync(path.join(outDir, 'firestore.mjs'), 'export function isFixedExpenseCategory() { return false; }\n');

transpile('lib/formDictation.ts', 'formDictation.mjs', [
  [/from ['"]\.\/categories['"]/, "from './categories.mjs'"],
  [/from ['"]\.\/voiceParser['"]/, "from './voiceParser.mjs'"],
]);

const EN = await import(pathToFileURL(path.join(outDir, 'voiceEnglish.mjs')).href);
const { parseMultiVoiceTransaction } = await import(pathToFileURL(path.join(outDir, 'voiceParser.mjs')).href);
EN.setVoiceEnglish(true);

const parse = (frase) => parseMultiVoiceTransaction(EN.englishToParserText(frase), []).filter(r => r.kind === 'transaction')
  .map(r => ({ ...r, description: EN.englishDescription(r.description) }));

const CASES = [
  ['I spent 20 thousand on lunch', [{ type: 'gasto', amount: 20000, description: 'Lunch' }]],
  ['spent twenty five thousand on groceries', [{ type: 'gasto', amount: 25000 }]],
  ['lunch 20 thousand and coffee 3 thousand', [{ type: 'gasto', amount: 20000 }, { type: 'gasto', amount: 3000 }]],
  ['I paid 50 dollars for gas', [{ type: 'gasto', amount: 50, category: 'Gasolina' }]],
  ['I got paid 500 thousand', [{ type: 'ingreso', amount: 500000 }]],
  ['salary 2 million', [{ type: 'ingreso', amount: 2000000 }]],
  ['I lent 100 thousand to Juan', [{ type: 'deuda', amount: 100000, description: 'Juan owes me' }]],
  ['I bought shoes for one hundred and fifty thousand yesterday', [{ type: 'gasto', amount: 150000, description: 'Shoes' }]],
  ['I spent 9000 on beer with Nequi', [{ type: 'gasto', amount: 9000, category: 'Licores y Bares' }]],
  ['rent 800 thousand', [{ type: 'gasto', amount: 800000 }]],
];

const ver = process.argv.includes('--ver');
let fails = 0;
for (const [frase, espera] of CASES) {
  const got = parse(frase);
  if (ver) console.log(frase, '→', EN.englishToParserText(frase), '→', JSON.stringify(got.map(r => ({ type: r.type, amount: r.amount, category: r.category, description: r.description, date: r.date, paymentMethod: r.paymentMethod }))));
  const ok = got.length === espera.length && espera.every((e, i) => Object.entries(e).every(([k, v]) => got[i][k] === v));
  if (!ok) { fails++; console.log('✗', frase, '\n   esperado', JSON.stringify(espera), '\n   obtenido', JSON.stringify(got.map(r => ({ type: r.type, amount: r.amount, description: r.description })))); }
}
// Formularios: deudas y CDT dictados en inglés
const FD = await import(pathToFileURL(path.join(outDir, 'formDictation.mjs')).href);
const now = new Date(2026, 10, 23);
const debt = FD.parseDebtSpeech(EN.englishToParserText('Credit line of 700 thousand at 28.17 percent for 60 months, I pay on the 15th'), now);
if (ver) console.log('deuda →', JSON.stringify(debt));
if (!(debt.amount === 700000 && debt.rate === 28.17 && debt.termMonths === 60 && debt.paymentDay === 15)) { fails++; console.log('✗ deuda en inglés', JSON.stringify(debt)); }
const lent = FD.parseDebtSpeech(EN.englishToParserText('My sister lent me one million yesterday'), now);
if (ver) console.log('prestaron →', JSON.stringify(lent));
if (!(lent.amount === 1000000 && lent.kind === 'persona')) { fails++; console.log('✗ me prestaron en inglés', JSON.stringify(lent)); }
const cdt = FD.parseInvestmentSpeech(EN.englishToParserText('CDT of 5 million at Bancolombia at 11 percent for 6 months'), now);
if (ver) console.log('cdt →', JSON.stringify(cdt));
if (!(cdt.amount === 5000000 && cdt.bank === 'Bancolombia' && cdt.rateEA === 11 && cdt.termMonths === 6)) { fails++; console.log('✗ CDT en inglés', JSON.stringify(cdt)); }
// Números en palabras
const nums = [['twenty five thousand', '25000'], ['one hundred and fifty', '150'], ['half a million', '500000'], ['three', '3']];
for (const [a, b] of nums) {
  const r = EN.englishNumbersToDigits(a);
  if (r !== b) { fails++; console.log('✗ número', a, '→', r, '(esperado', b + ')'); }
}
console.log(fails ? `\n${fails} fallaron` : `\n${CASES.length + nums.length}/${CASES.length + nums.length} correctas`);
process.exit(fails ? 1 : 0);
