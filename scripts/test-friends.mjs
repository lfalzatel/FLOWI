// Prueba de amigos (lib/friends.ts) y de la sincronización de abonos con amigos (lib/sharedLinks.ts).
// Uso: node scripts/test-friends.mjs   (sale con código 1 si alguna falla)
import { loadTs, tester } from './lib/load-ts.mjs';

const F = await loadTs('lib/friends.ts');
const L = await loadTs('lib/sharedLinks.ts');
const { eq, done } = tester();

// ── Perfil y buscador ──
eq('texto para buscar sin tildes (la ñ queda como n, igual al guardar y al buscar)', F.norm('  Leidy MARÍN Muñoz '), 'leidy marin munoz');
eq('se encuentra igual con o sin ñ', F.norm('Muñoz') === F.norm('Munoz'), true);
eq('@usuario con 4 letras del uid', F.usernameFor('Luis Felipe Alzate', 'K7f2abc'), 'luis.felipe.k7f2');
eq('@usuario sin nombre', F.usernameFor('', 'abcd9'), 'flowi.abcd');
const pre = F.searchPrefixes('Leidy Marín', 'leidy.marin.ab12');
eq('prefijos del nombre', ['le', 'lei', 'leidy', 'ma', 'marin'].every(p => pre.includes(p)), true);
eq('sin prefijos de una letra', pre.some(p => p.length < 2), false);
eq('a lo sumo 80 prefijos', F.searchPrefixes('a'.repeat(40) + ' ' + 'b'.repeat(40), 'x.y').length <= 80, true);
const req = { id: 'a_b', from: 'a', to: 'b', users: ['a', 'b'], status: 'accepted', fromName: 'Ana', fromPhoto: null, fromUsername: 'ana', toName: 'Beto', toPhoto: 'f.jpg', toUsername: 'beto' };
eq('el otro, visto desde quien envió', F.otherSide(req, 'a').name, 'Beto');
eq('el otro, visto desde quien recibió', F.otherSide(req, 'b').name, 'Ana');
eq('enlace de invitación', F.inviteLink('xyz'), 'https://flowi-9af82.web.app/amigos?u=xyz');
eq('WhatsApp trae el enlace', decodeURIComponent(F.friendWhatsapp('Luis Alzate', 'xyz', 'Leidy', true)).includes('/amigos?u=xyz'), true);
eq('WhatsApp de invitación saluda por el nombre', decodeURIComponent(F.friendWhatsapp('Luis', 'xyz', 'Leidy Marín', false)).includes('Hola Leidy'), true);

// ── Abonos entre los dos lados ──
const p = (id, amount, at = '2026-11-20T10:00:00.000Z') => ({ id, amount, at });
eq('id del enlace', L.linkId('tx1', 'leidy'), 'tx1_leidy');
eq('abono viejo sin id usa fecha y monto', L.payKey({ amount: 5, at: '2026-01-01' }), '2026-01-01|5');
{
  const m = L.mergePayments([p('a', 100)], [], [], 'ana');
  eq('abono local que falta en el enlace', m.toLink.map(x => [x.id, x.by]), [['a', 'ana']]);
  eq('…y lo local no cambia', m.changedLocal, false);
}
{
  const m = L.mergePayments([], [{ ...p('b', 200), by: 'beto' }], [], 'ana');
  eq('abono del otro llega a lo local', m.finalLocal.map(x => x.id), ['b']);
  eq('…sin cuenta (cada quien elige la suya)', m.finalLocal[0].accountId, null);
  eq('…y lo local cambia', m.changedLocal, true);
}
{
  const m = L.mergePayments([p('a', 100), p('b', 200)], [{ ...p('a', 100), by: 'x' }, { ...p('b', 200), by: 'y' }], [], 'ana');
  eq('ya sincronizados: nada que hacer', [m.toLink.length, m.changedLocal], [0, false]);
}
{
  const m = L.mergePayments([p('a', 100), p('b', 200)], [{ ...p('b', 200), by: 'y' }], ['a'], 'ana');
  eq('abono borrado no vuelve al enlace', m.toLink.length, 0);
  eq('…y se quita de lo local', m.finalLocal.map(x => x.id), ['b']);
}
{
  const m = L.mergePayments([p('x', 1, '2026-11-21T00:00:00Z')], [{ ...p('y', 2, '2026-11-19T00:00:00Z'), by: 'b' }], [], 'a');
  eq('abonos en orden de fecha', m.finalLocal.map(x => x.id), ['y', 'x']);
}

done();
