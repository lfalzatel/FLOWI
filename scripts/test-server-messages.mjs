// Prueba: cada texto de notificación del servidor (msg(lang, '…') en functions/) tiene su versión en inglés.
// Uso: node scripts/test-server-messages.mjs   (sale con código 1 si falta alguna)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { EN, t } = createRequire(path.join(root, 'functions', 'package.json'))('./messages.js');

const missing = [];
for (const f of ['functions/index.js', 'functions/reminders.mjs']) {
  const src = fs.readFileSync(path.join(root, f), 'utf8');
  for (const m of src.matchAll(/msg\(\s*lang\s*,\s*'((?:[^'\\]|\\.)*)'/g)) {
    const key = m[1].replace(/\\'/g, "'");
    if (!(key in EN)) missing.push(`${f}: ${key}`);
  }
  // Textos elegidos con un condicional dentro de msg(lang, cond ? '…' : '…')
  for (const m of src.matchAll(/msg\(\s*lang\s*,[^)]*?\?\s*'((?:[^'\\]|\\.)*)'\s*:\s*(?:[^'?]*\?\s*'((?:[^'\\]|\\.)*)'\s*:\s*)?'((?:[^'\\]|\\.)*)'/g)) {
    for (const k of [m[1], m[2], m[3]].filter(Boolean)) if (!(k in EN)) missing.push(`${f}: ${k}`);
  }
}
let fails = missing.length;
if (missing.length) console.log('Faltan en inglés:\n  ' + [...new Set(missing)].join('\n  '));
const sample = t('en', '{a}: te toca ${b}. Acéptalo en FLOWI.', { a: 'Lunch', b: '20,000' });
if (sample !== 'Lunch: your share is $20,000. Accept it in FLOWI.') { fails++; console.log('✗ ejemplo:', sample); }
if (t('es', 'Pronto: {a}', { a: 'Arriendo' }) !== 'Pronto: Arriendo') { fails++; console.log('✗ español'); }
console.log(fails ? `\n${fails} fallaron` : 'Todos los textos del servidor tienen inglés');
process.exit(fails ? 1 : 0);
