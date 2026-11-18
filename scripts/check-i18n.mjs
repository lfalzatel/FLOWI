// Revisa que cada frase marcada con t('…') tenga su versión en inglés en lib/i18n-en.ts.
// Uso: node scripts/check-i18n.mjs   (sale con código 1 si falta alguna)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const en = fs.readFileSync(path.join(root, 'lib/i18n-en.ts'), 'utf8');
const unq = (s) => s.replace(/\\'/g, "'");
const keys = new Set([...en.matchAll(/^\s*'((?:[^'\\]|\\.)*)':/gm)].map(m => unq(m[1])));

const files = [];
const walk = (dir) => {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.next', 'out', 'migracion', 'functions', 'push'].includes(f.name)) continue;
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p);
    else if (/\.tsx?$/.test(f.name)) files.push(p);
  }
};
['app', 'components', 'lib', 'hooks'].forEach(d => walk(path.join(root, d)));

const missing = [];
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  if (!/\buseT\b|\btranslate\(|\btr\(/.test(s) || f.endsWith('i18n.tsx')) continue;
  for (const m of s.matchAll(/\b(?:t|tr)\('((?:[^'\\]|\\.)*)'/g)) {
    const k = unq(m[1]);
    if (!keys.has(k)) missing.push(`${path.relative(root, f)}: ${k}`);
  }
}
// Textos que se traducen desde listas (portada y menú inferior)
const login = fs.readFileSync(path.join(root, 'app/login/page.tsx'), 'utf8');
for (const m of login.matchAll(/(?:title|text|q|a): '((?:[^'\\]|\\.)*)'/g)) if (!keys.has(unq(m[1]))) missing.push(`login (lista): ${unq(m[1])}`);
const nav = fs.readFileSync(path.join(root, 'components/layout/BottomNav.tsx'), 'utf8');
for (const m of nav.matchAll(/label: '([^']*)'/g)) if (!keys.has(m[1])) missing.push(`menú: ${m[1]}`);

if (missing.length) { console.log('Faltan en inglés:\n' + missing.map(x => '  ' + x).join('\n')); process.exit(1); }
console.log(`Todo traducido (${keys.size} frases)`);
