// Publica las funciones del servidor (notificaciones, pagos, recordatorios) en el proyecto flowi-9af82.
// Uso: npm run deploy:functions                  → todas
//      npm run deploy:functions -- avisarMensajeChat enviarRecordatorios   → solo esas
// GitHub NO publica las funciones (solo la página web): hay que correr esto cuando cambia functions/.
//
// Arreglos para este PC, ya incluidos:
//  - IPv6 hacia googleapis se cuelga: scripts/dns4.cjs obliga a usar IPv4 (DNS 8.8.8.8).
//  - PowerShell bloquea firebase.ps1: se corre firebase-tools directo con node.
//  - firebase.functions.json tiene "disallowLegacyRuntimeConfig": true (Runtime Config está retirado).
// Antes de publicar corre las pruebas de los textos del servidor; si fallan, no publica.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT = 'flowi-9af82';

// 1) Pruebas de los mensajes del servidor
const test = spawnSync(process.execPath, [path.join(root, 'scripts', 'test-server-messages.mjs')], { stdio: 'inherit' });
if (test.status !== 0) { console.error('\nLas pruebas fallaron: no se publica.'); process.exit(1); }

// 2) Buscar firebase-tools: el instalado con npm -g, o el del proyecto si existiera
const candidates = [
  process.env.APPDATA && path.join(process.env.APPDATA, 'npm', 'node_modules', 'firebase-tools', 'lib', 'bin', 'firebase.js'),
  path.join(os.homedir(), 'AppData', 'Roaming', 'npm', 'node_modules', 'firebase-tools', 'lib', 'bin', 'firebase.js'),
  path.join(root, 'node_modules', 'firebase-tools', 'lib', 'bin', 'firebase.js'),
].filter(Boolean);
const cli = candidates.find(p => fs.existsSync(p));
if (!cli) { console.error('No encontré firebase-tools. Instálalo con: npm install -g firebase-tools'); process.exit(1); }

// 3) Publicar
const names = process.argv.slice(2).filter(a => !a.startsWith('-'));
const only = names.length ? names.map(n => `functions:${n}`).join(',') : 'functions';
const dns4 = path.join(root, 'scripts', 'dns4.cjs').replace(/\\/g, '/');
const env = { ...process.env, NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} --require ${dns4}`.trim() };
const args = [cli, 'deploy', '--only', only, '--project', PROJECT, '--config', 'firebase.functions.json', '--force', '--non-interactive'];
console.log(`\nPublicando ${only} en ${PROJECT}…`);
// La red de este PC falla a ratos: hasta 3 intentos
for (let i = 1; i <= 3; i++) {
  const r = spawnSync(process.execPath, args, { cwd: root, env, stdio: 'inherit' });
  if (r.status === 0) process.exit(0);
  if (i < 3) console.log(`\nFalló el intento ${i}; reintentando…`);
}
console.error('\nNo se pudo publicar después de 3 intentos.');
process.exit(1);
