// Prueba del analizador de comandos de voz (lib/voiceParser.ts) con frases reales.
// Uso: node scripts/test-voice-parser.mjs   (sale con código 1 si alguna frase falla)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ts = createRequire(path.join(root, 'package.json'))('typescript');
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowi-voice-'));

// Transpila el analizador y el catálogo; firestore se reemplaza para no cargar Firebase
const transpile = (file, out, replaceImports) => {
  let js = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  for (const [from, to] of replaceImports) js = js.replace(from, to);
  fs.writeFileSync(path.join(outDir, out), js);
};
transpile('lib/categories.ts', 'categories.mjs', []);
transpile('lib/voiceParser.ts', 'voiceParser.mjs', [
  [/from ['"]\.\/firestore['"]/, "from './firestore.mjs'"],
  [/from ['"]\.\/categories['"]/, "from './categories.mjs'"],
  [/from ['"]\.\/voiceEnglish['"]/, "from './voiceEnglish.mjs'"],
]);
// lib/speech.ts (lo importa voiceParser): se copia y se enlaza aquí también
fs.writeFileSync(path.join(outDir, 'speech.mjs'), ts.transpileModule(fs.readFileSync(path.join(root, 'lib/speech.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText);
{ const vp = path.join(outDir, 'voiceParser.mjs'); fs.writeFileSync(vp, fs.readFileSync(vp, 'utf8').replace(/from ['"]\.\/speech['"]/, "from './speech.mjs'")); }
transpile('lib/voiceEnglish.ts', 'voiceEnglish.mjs', []);
fs.writeFileSync(path.join(outDir, 'firestore.mjs'), 'export function isFixedExpenseCategory() { return false; }\n');

const { parseMultiVoiceTransaction } = await import(pathToFileURL(path.join(outDir, 'voiceParser.mjs')).href);
const cases = JSON.parse(fs.readFileSync(path.join(root, 'scripts', 'voice-cases.json'), 'utf8'));

const show = r => (r.kind === 'command'
  ? `comando ${r.action}`
  : `${r.type} $${(r.amount ?? 0).toLocaleString('es-CO')} · ${r.category}${r.merchant ? ' · ' + r.merchant : ''}${r.debtDirection ? ' · ' + r.debtDirection : ''}${r.debtPerson ? ' · ' + r.debtPerson : ''} · "${r.description}"`);

let failed = 0;
for (const c of cases) {
  const results = parseMultiVoiceTransaction(c.frase, []);
  const problems = [];
  if (results.length !== c.espera.length) problems.push(`se esperaban ${c.espera.length} movimientos y salieron ${results.length}`);
  c.espera.forEach((exp, i) => {
    const r = results[i];
    if (!r) return;
    if (exp.command) {
      if (r.kind !== 'command' || r.action !== exp.command) problems.push(`#${i + 1}: se esperaba el comando ${exp.command}`);
      return;
    }
    for (const [key, value] of Object.entries(exp)) {
      if (r[key] !== value) problems.push(`#${i + 1}: ${key} = ${JSON.stringify(r[key])}, se esperaba ${JSON.stringify(value)}`);
    }
  });

  if (problems.length) {
    failed++;
    console.log(`✗ "${c.frase}"`);
    results.forEach((r, i) => console.log(`    ${i + 1}. ${show(r)}`));
    problems.forEach(p => console.log(`    → ${p}`));
  } else {
    console.log(`✓ "${c.frase}"`);
    results.forEach((r, i) => console.log(`    ${i + 1}. ${show(r)}`));
  }
}

// Recordatorios dictados (fecha fija: miércoles 25 de noviembre de 2026)
const { parseReminderSpeech } = await import(pathToFileURL(path.join(outDir, 'voiceParser.mjs')).href);
const now = new Date(2026, 10, 25, 18, 0);
const remCases = [
  ['recuérdame pagar el internet el 15', { title: 'Pagar el internet', dueDate: '2026-12-15', frequency: 'once', time: undefined, amount: null }],
  ['pagar el internet 90 mil el 15 de cada mes', { title: 'Pagar el internet', dueDate: '2026-12-15', frequency: 'monthly', amount: 90000 }],
  ['arriendo 1.200.000 cada mes el 30', { title: 'Arriendo', dueDate: '2026-11-30', frequency: 'monthly', amount: 1200000 }],
  ['cita con el odontólogo el 3 de diciembre a las 4 de la tarde', { title: 'Cita con el odontólogo', dueDate: '2026-12-03', time: '16:00' }],
  ['llamar a mamá mañana a las 7 pm', { title: 'Llamar a mamá', dueDate: '2026-11-26', time: '19:00' }],
  ['pagar la tarjeta el 5 de enero', { title: 'Pagar la tarjeta', dueDate: '2027-01-05' }],
];
let remFailed = 0;
for (const [frase, exp] of remCases) {
  const r = parseReminderSpeech(frase, now);
  const problems = Object.entries(exp).filter(([k, v]) => r[k] !== v).map(([k, v]) => `${k} = ${JSON.stringify(r[k])}, se esperaba ${JSON.stringify(v)}`);
  if (problems.length) { remFailed++; console.log(`✗ recordatorio "${frase}"`); problems.forEach(p => console.log(`    → ${p}`)); }
  else console.log(`✓ recordatorio "${frase}" → ${r.title} · ${r.dueDate}${r.time ? ' ' + r.time : ''} · ${r.frequency}${r.amount ? ' · $' + r.amount : ''}`);
}
failed += remFailed;

fs.rmSync(outDir, { recursive: true, force: true });
console.log(`\n${cases.length + remCases.length - failed}/${cases.length + remCases.length} frases correctas`);
process.exit(failed ? 1 : 0);
