// Mudanza de FLOWI a su nueva dirección (dentro de su propio proyecto de Firebase).
// La dirección vieja (flowi-gastos.web.app) está en otro proyecto, y por eso el inicio de sesión
// con Google falla en iPhone. Con "Mudarme", la app vieja pide al servidor un código de un solo uso
// (functions: crearMudanza / usarMudanza) y abre la nueva dirección con él: allí se entra con la
// MISMA cuenta (también los invitados) y se copian los ajustes de este celular.
// No se copian por seguridad: la clave de la IA, el PIN del bloqueo, los borradores ni los
// permisos de avisos (el celular los vuelve a pedir en la nueva dirección).

/** Dirección nueva (vacía = no hay mudanza en este sitio). */
export const MOVE_TO = (process.env.NEXT_PUBLIC_MOVE_TO || '').replace(/\/$/, '');

/** ¿Este sitio es la dirección vieja que debe ofrecer la mudanza? */
export function isOldHome(origin: string): boolean {
  return !!MOVE_TO && origin.replace(/\/$/, '') !== MOVE_TO && !/localhost|127\.0\.0\.1/.test(origin);
}

const SKIP = [
  /^flowi_openrouter/,         // clave y datos de la IA (se conecta de nuevo)
  /^flowi_lock/,               // PIN y huella del bloqueo (son de cada celular)
  /^flowi-draft-/,             // borradores a medio hacer
  /^firebase/i,                // sesión interna de Firebase (la nueva se crea al entrar)
  /^(notifications_enabled|push_enabled|flowi_notif_prompt)$/, // el permiso de avisos se pide de nuevo
  /^receipt$/,
];
const MAX_VALUE = 20000;
const MAX_TOTAL = 60000;

/** Ajustes de este celular que viajan en la mudanza. */
export function collectPrefs(entries: [string, string][]): Record<string, string> {
  const out: Record<string, string> = {};
  let total = 0;
  for (const [k, v] of entries) {
    if (SKIP.some(r => r.test(k)) || typeof v !== 'string' || v.length > MAX_VALUE) continue;
    if (total + k.length + v.length > MAX_TOTAL) break;
    out[k] = v;
    total += k.length + v.length;
  }
  return out;
}

/** Lee los ajustes del localStorage real. */
export function readLocalPrefs(): Record<string, string> {
  const entries: [string, string][] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) entries.push([k, localStorage.getItem(k) || '']);
    }
  } catch { /* sin acceso al almacenamiento */ }
  return collectPrefs(entries);
}

/** Guarda en este celular los ajustes que llegaron (sin pisar las claves que no viajan). */
export function applyPrefs(prefs: Record<string, string> | null | undefined) {
  if (!prefs) return;
  for (const [k, v] of Object.entries(collectPrefs(Object.entries(prefs)))) {
    try { localStorage.setItem(k, v); } catch { /* lleno o bloqueado */ }
  }
}
