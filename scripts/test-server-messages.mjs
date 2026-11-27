// Prueba: cada texto de notificación del servidor (msg(lang, '…') en functions/) tiene su versión en inglés y portugués,
// y las variantes de España, formatos y locales funcionan.
// Uso: node scripts/test-server-messages.mjs   (sale con código 1 si falta alguna)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { EN, PT, ES_ES, t, locale, normalizeLang, money } = createRequire(path.join(root, 'functions', 'package.json'))('./messages.js');

const keysUsed = new Set();
for (const f of ['functions/index.js', 'functions/reminders.mjs']) {
  const src = fs.readFileSync(path.join(root, f), 'utf8');
  for (const m of src.matchAll(/msg\(\s*lang\s*,\s*'((?:[^'\\]|\\.)*)'/g)) {
    keysUsed.add(`${f}:::${m[1].replace(/\\'/g, "'")}`);
  }
  // Textos elegidos con un condicional dentro de msg(lang, cond ? '…' : '…')
  for (const m of src.matchAll(/msg\(\s*lang\s*,[^)]*?\?\s*'((?:[^'\\]|\\.)*)'\s*:\s*(?:[^'?]*\?\s*'((?:[^'\\]|\\.)*)'\s*:\s*)?'((?:[^'\\]|\\.)*)'/g)) {
    for (const k of [m[1], m[2], m[3]].filter(Boolean)) keysUsed.add(`${f}:::${k}`);
  }
}

const missingEn = [];
const missingPt = [];
for (const item of keysUsed) {
  const [f, key] = item.split(':::');
  if (!(key in EN)) missingEn.push(`${f}: ${key}`);
  if (!(key in PT)) missingPt.push(`${f}: ${key}`);
}
// Toda clave de EN debe estar también en PT, y toda clave de ES_ES debe existir en EN
for (const k of Object.keys(EN)) if (!(k in PT)) missingPt.push(`messages.js (EN→PT): ${k}`);
const badEsEs = Object.keys(ES_ES).filter(k => !(k in EN));

let fails = missingEn.length + missingPt.length + badEsEs.length;
if (missingEn.length) console.log('Faltan en inglés:\n  ' + [...new Set(missingEn)].join('\n  '));
if (missingPt.length) console.log('Faltan en portugués:\n  ' + [...new Set(missingPt)].join('\n  '));
if (badEsEs.length) console.log('Claves desconocidas en ES_ES:\n  ' + badEsEs.join('\n  '));

const check = (label, got, want) => {
  if (got !== want) { fails++; console.log(`✗ ${label}: "${got}" !== "${want}"`); }
};

check('en gasto compartido', t('en', '{a}: te toca ${b}. Acéptalo en FLOWI.', { a: 'Lunch', b: '20,000' }), 'Lunch: your share is $20,000. Accept it in FLOWI.');
check('pt gasto compartido', t('pt', '{a}: te toca ${b}. Acéptalo en FLOWI.', { a: 'Almoço', b: '15' }), 'Almoço: a tua parte é 15 €. Aceita na FLOWI.');
check('es-ES amigos', t('es-ES', 'Ya son amigos en FLOWI.'), 'Ya sois amigos en FLOWI.');
check('es-ES fallback español', t('es-ES', 'Pronto: {a}', { a: 'Alquiler' }), 'Pronto: Alquiler');
check('es tal cual', t('es', 'Pronto: {a}', { a: 'Arriendo' }), 'Pronto: Arriendo');
check('locale pt', locale('pt'), 'pt-PT');
check('locale es-ES', locale('es-ES'), 'es-ES');
check('normalizeLang pt', normalizeLang('pt'), 'pt');
check('normalizeLang es-ES', normalizeLang('es-ES'), 'es-ES');
check('normalizeLang desconocido', normalizeLang('fr'), 'es');
check('money pt por defecto EUR', money(25, 'pt'), '25 €');
check('money es-ES por defecto EUR', money(25, 'es-ES'), '25 €');
check('money pt con COP guardado', money(50, 'pt', 'COP'), '$50');

console.log(fails ? `\n${fails} fallaron` : 'Todos los textos del servidor tienen inglés, portugués y España');
process.exit(fails ? 1 : 0);
