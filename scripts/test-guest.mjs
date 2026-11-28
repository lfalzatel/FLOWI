// Prueba de dónde se puede entrar como invitado (lib/guest.ts).
// Uso: node scripts/test-guest.mjs   (sale con código 1 si alguna falla)
import { loadTs, tester } from './lib/load-ts.mjs';

const G = await loadTs('lib/guest.ts');
const { eq, done } = tester();

if (!G.GUEST_MODE_OPEN) {
  eq('cerrado en la web real', G.guestModeAvailable('flowi-gastos.web.app'), false);
  eq('cerrado en la app de Play', G.guestModeAvailable('flowi-9af82.web.app'), false);
}
eq('abierto en el computador de desarrollo', G.guestModeAvailable('localhost'), true);
eq('abierto en 127.0.0.1', G.guestModeAvailable('127.0.0.1'), true);
eq('abierto en el sitio de pruebas', G.guestModeAvailable('flowi-gastos--staging-3s3phtyi.web.app'), true);

done();
