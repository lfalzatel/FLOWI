// Prueba del dictado en portugués (pt-PT) (lib/voicePortuguese.ts + lib/voiceParser.ts).
// Uso: node scripts/test-voice-portuguese.mjs   (sale con código 1 si alguna frase falla)
//      node scripts/test-voice-portuguese.mjs --ver   (muestra lo que entiende cada frase)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ts = createRequire(path.join(root, 'package.json'))('typescript');
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowi-voice-pt-'));
const transpile = (file, out, replaceImports) => {
  let js = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  for (const [from, to] of replaceImports) js = js.replace(from, to);
  fs.writeFileSync(path.join(outDir, out), js);
};
const fix = [
  [/from ['"]\.\/firestore['"]/, "from './firestore.mjs'"],
  [/from ['"]\.\/categories['"]/g, "from './categories.mjs'"],
  [/from ['"]\.\/voiceEnglish['"]/, "from './voiceEnglish.mjs'"],
  [/from ['"]\.\/voicePortuguese['"]/, "from './voicePortuguese.mjs'"],
  [/from ['"]\.\/speech['"]/, "from './speech.mjs'"],
  [/from ['"]\.\/voiceParser['"]/, "from './voiceParser.mjs'"],
];
transpile('lib/categories.ts', 'categories.mjs', []);
transpile('lib/voiceEnglish.ts', 'voiceEnglish.mjs', []);
transpile('lib/voicePortuguese.ts', 'voicePortuguese.mjs', []);
transpile('lib/speech.ts', 'speech.mjs', []);
transpile('lib/voiceParser.ts', 'voiceParser.mjs', fix);
transpile('lib/formDictation.ts', 'formDictation.mjs', fix);
transpile('lib/voiceCorrection.ts', 'voiceCorrection.mjs', fix);
fs.writeFileSync(path.join(outDir, 'firestore.mjs'), 'export function isFixedExpenseCategory() { return false; }\n');

const PT = await import(pathToFileURL(path.join(outDir, 'voicePortuguese.mjs')).href);
const { parseMultiVoiceTransaction } = await import(pathToFileURL(path.join(outDir, 'voiceParser.mjs')).href);
const { BASE_CATEGORY_DEFS } = await import(pathToFileURL(path.join(outDir, 'categories.mjs')).href);
PT.setVoicePortuguese(true);

const parse = (frase) => parseMultiVoiceTransaction(PT.portugueseToParserText(frase), []).filter(r => r.kind === 'transaction')
  .map(r => ({ ...r, description: PT.portugueseDescription(r.description) }));

const CASES = [
  ['Gastei 20 euros no almoço', [{ type: 'gasto', amount: 20, category: 'Restaurantes', description: 'Almoço' }]],
  ['gastei vinte e cinco euros no supermercado', [{ type: 'gasto', amount: 25, category: 'Mercado' }]],
  ['almoço 12 euros e café 2 euros', [{ type: 'gasto', amount: 12, category: 'Restaurantes' }, { type: 'gasto', amount: 2, category: 'Café y Antojos' }]],
  ['paguei 2 euros e 50 cêntimos num café', [{ type: 'gasto', amount: 2.5, category: 'Café y Antojos' }]],
  ['paguei 50 euros de gasolina', [{ type: 'gasto', amount: 50, category: 'Gasolina' }]],
  ['pagaram-me 1500 euros', [{ type: 'ingreso', amount: 1500 }]],
  ['salário 1800 euros', [{ type: 'ingreso', amount: 1800 }]],
  ['Emprestei 100 euros ao João', [{ type: 'deuda', amount: 100, debtPerson: 'João', description: 'João deve-me' }]],
  ['comprei sapatos por cento e cinquenta euros ontem', [{ type: 'gasto', amount: 150, category: 'Calzado', description: 'Sapatos' }]],
  ['gastei 9 euros em cerveja com MB WAY', [{ type: 'gasto', amount: 9, category: 'Licores y Bares' }]],
  ['renda 750 euros', [{ type: 'gasto', amount: 750, category: 'Arriendo' }]],
];

const ver = process.argv.includes('--ver');
let fails = 0;
for (const [frase, espera] of CASES) {
  const got = parse(frase);
  if (ver) console.log(frase, '→', PT.portugueseToParserText(frase), '→', JSON.stringify(got));
  const ok = got.length === espera.length && espera.every((e, i) => Object.entries(e).every(([k, v]) => got[i][k] === v));
  if (!ok) {
    fails++;
    console.log('✗', frase, '\n   esperado', JSON.stringify(espera), '\n   obtenido', JSON.stringify(got));
  } else {
    console.log('✓', frase);
  }
}

// Formularios: deudas y depósitos dictados en portugués
const FD = await import(pathToFileURL(path.join(outDir, 'formDictation.mjs')).href);
const now = new Date(2026, 10, 23);
const debt = FD.parseDebtSpeech(PT.portugueseToParserText('Crédito pessoal de 7000 euros a 8,5 por cento a 60 meses, pago no dia 15'), now);
if (ver) console.log('deuda →', JSON.stringify(debt));
if (!(debt.amount === 7000 && debt.rate === 8.5 && debt.termMonths === 60 && debt.paymentDay === 15)) {
  fails++; console.log('✗ deuda en portugués', JSON.stringify(debt));
} else console.log('✓ deuda en portugués');

const lent = FD.parseDebtSpeech(PT.portugueseToParserText('A minha irmã emprestou-me mil euros ontem'), now);
if (ver) console.log('prestaron →', JSON.stringify(lent));
if (!(lent.amount === 1000 && lent.kind === 'persona')) {
  fails++; console.log('✗ me prestaron en portugués', JSON.stringify(lent));
} else console.log('✓ me prestaron en portugués');

const dep = FD.parseInvestmentSpeech(PT.portugueseToParserText('Depósito a prazo de 5000 euros no Santander a 3 por cento a 6 meses'), now);
if (ver) console.log('depósito →', JSON.stringify(dep));
if (!(dep.amount === 5000 && dep.bank === 'Santander' && dep.rateEA === 3 && dep.termMonths === 6)) {
  fails++; console.log('✗ depósito en portugués', JSON.stringify(dep));
} else console.log('✓ depósito en portugués');

// Correcciones por voz en portugués
const VC = await import(pathToFileURL(path.join(outDir, 'voiceCorrection.mjs')).href);
const base = { kind: 'transaction', type: 'gasto', amount: 20, category: 'Mercado', description: 'Compras', isFixed: false, rawText: '', date: '2026-11-23', paymentMethod: 'Efectivo' };
const corr = VC.applyVoiceCorrection(base, PT.portugueseToParserText('eram 25 euros e põe no Revolut'), BASE_CATEGORY_DEFS, ['Revolut', 'MB WAY', 'Efectivo'], now);
if (!(corr.item.amount === 25 && corr.item.paymentMethod === 'Revolut')) {
  fails++; console.log('✗ corrección en portugués', JSON.stringify(corr));
} else console.log('✓ corrección en portugués');

// Números en palabras
const nums = [['vinte e cinco mil', '25000'], ['cento e cinquenta', '150'], ['meio milhão', '500000'], ['dezasseis', '16'], ['um café', 'um café']];
for (const [a, b] of nums) {
  const r = PT.portugueseNumbersToDigits(a);
  if (r !== b) { fails++; console.log('✗ número', a, '→', r, '(esperado', b + ')'); }
  else console.log('✓ número:', a);
}

fs.rmSync(outDir, { recursive: true, force: true });
console.log(fails ? `\n${fails} fallaron` : `\nTodas las pruebas de voz en portugués pasaron`);
process.exit(fails ? 1 : 0);
