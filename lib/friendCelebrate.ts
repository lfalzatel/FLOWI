'use client';
// Celebración de amistades (en este celular):
// - Cada amistad nueva se celebra una vez (queda guardado qué amistades ya se celebraron; antes, si la
//   lista llegaba vacía un instante, la celebración se repetía por error).
// - La misma celebración vuelve a salir cada 20 días con el último amigo, para animar a usar Amigos.
//   Se puede desactivar en la página de Amigos; si después se hace un amigo nuevo, se vuelve a activar.

const celebratedKey = (uid: string) => `flowi-friends-celebrated-${uid}`;
const lastShownKey = (uid: string) => `flowi-friend-celebration-at-${uid}`;
export const FRIEND_REPEAT_OFF_KEY = 'flowi-friend-repeat-off';
export const REPEAT_DAYS = 20;

/** Ids de amistades ya celebradas, en el orden en que se hicieron amigos; null si nunca se ha guardado aquí. */
export function getCelebrated(uid: string): string[] | null {
  try {
    const raw = localStorage.getItem(celebratedKey(uid));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function setCelebrated(uid: string, ids: string[]) {
  try { localStorage.setItem(celebratedKey(uid), JSON.stringify(ids.slice(-200))); } catch { /* sin almacenamiento */ }
}

/** Se guarda cuándo salió la celebración por última vez (nueva o repetida). */
export function markCelebrationShown(uid: string) {
  try { localStorage.setItem(lastShownKey(uid), String(Date.now())); } catch { /* sin almacenamiento */ }
}

/** ¿Toca repetir la celebración? (activada y pasaron 20 días desde la última). La primera vez solo empieza a contar. */
export function repeatDue(uid: string): boolean {
  try {
    if (localStorage.getItem(FRIEND_REPEAT_OFF_KEY) === '1') return false;
    const last = Number(localStorage.getItem(lastShownKey(uid)) || 0);
    if (!last) { markCelebrationShown(uid); return false; }
    return Date.now() - last >= REPEAT_DAYS * 86400000;
  } catch { return false; }
}

export function friendRepeatOn(): boolean {
  try { return localStorage.getItem(FRIEND_REPEAT_OFF_KEY) !== '1'; } catch { return true; }
}

export function setFriendRepeatOn(on: boolean) {
  try { on ? localStorage.removeItem(FRIEND_REPEAT_OFF_KEY) : localStorage.setItem(FRIEND_REPEAT_OFF_KEY, '1'); } catch { /* sin almacenamiento */ }
}
