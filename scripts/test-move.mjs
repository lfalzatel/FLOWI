// Prueba de qué ajustes viajan en la mudanza (lib/move.ts).
// Uso: node scripts/test-move.mjs   (sale con código 1 si alguna falla)
import { loadTs, tester } from './lib/load-ts.mjs';

const M = await loadTs('lib/move.ts');
const { eq, done } = tester();

const prefs = M.collectPrefs([
  ['flowi-theme', 'obsidiana'],
  ['flowi-lang', 'en'],
  ['sound_gasto', 'pop'],
  ['flowi_category_budgets', '{"Mercado":300000}'],
  ['flowi_openrouter_key', 'sk-secreta'],
  ['flowi_lock_abc', '{"pin":"x"}'],
  ['flowi-draft-expense', '{}'],
  ['firebase:authUser:x', '{}'],
  ['notifications_enabled', 'true'],
  ['push_enabled', 'true'],
]);
eq('viaja el tema', prefs['flowi-theme'], 'obsidiana');
eq('viaja el idioma', prefs['flowi-lang'], 'en');
eq('viajan los sonidos', prefs['sound_gasto'], 'pop');
eq('viajan los presupuestos', prefs['flowi_category_budgets'], '{"Mercado":300000}');
eq('NO viaja la clave de la IA', prefs['flowi_openrouter_key'], undefined);
eq('NO viaja el PIN', prefs['flowi_lock_abc'], undefined);
eq('NO viajan borradores', prefs['flowi-draft-expense'], undefined);
eq('NO viaja la sesión de Firebase', prefs['firebase:authUser:x'], undefined);
eq('el permiso de avisos se pide otra vez', prefs['notifications_enabled'], undefined);
eq('valores enormes no viajan', Object.keys(M.collectPrefs([['x', 'a'.repeat(30000)]])).length, 0);

done();
