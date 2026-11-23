// Corre todas las pruebas (scripts/test-*.mjs) y la revisión de traducciones.
// Uso: npm test   — sale con código 1 si alguna falla (así GitHub no publica una versión rota).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const files = fs.readdirSync(dir).filter(f => /^test-.+\.mjs$/.test(f) && f !== 'test-all.mjs').sort();
files.push('check-i18n.mjs');
let failed = [];
for (const f of files) {
  const r = spawnSync(process.execPath, [path.join(dir, f)], { encoding: 'utf8' });
  const out = `${r.stdout || ''}${r.stderr || ''}`;
  const passed = (out.match(/^✓/gm) || []).length;
  if (r.status === 0) console.log(`✓ ${f}${passed ? ` (${passed})` : ''}`);
  else { failed.push(f); console.log(`✗ ${f}\n${out.split('\n').filter(l => !l.startsWith('✓')).join('\n')}`); }
}
console.log(failed.length ? `\nFallaron: ${failed.join(', ')}` : `\nTodo bien (${files.length} archivos de prueba)`);
process.exit(failed.length ? 1 : 0);
