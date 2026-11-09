// Bloqueo de FLOWI con PIN y, opcional, huella o rostro (WebAuthn del propio celular).
// Es un candado de este dispositivo: se guarda en localStorage por cuenta y nunca sale del celular.
// El PIN se guarda como huella SHA-256 con sal, no en texto.

export type LockConfig = {
  pinHash: string;
  salt: string;
  credId?: string;      // credencial de huella/rostro registrada en este celular (base64url)
  delaySec: number;     // tiempo fuera de la app antes de volver a pedir el PIN
};

export const LOCK_EVENT = 'flowi:lock-changed';
export const DELAYS: { sec: number; label: string }[] = [
  { sec: 30, label: 'Al salir de la app' },
  { sec: 60, label: '1 minuto' },
  { sec: 300, label: '5 minutos' },
  { sec: 900, label: '15 minutos' },
];
const ACTIVE_KEY = 'flowi_lock_active_at'; // sessionStorage: última vez que la app estuvo a la vista

const key = (uid: string) => `flowi_lock_${uid}`;

export function getLock(uid: string | null | undefined): LockConfig | null {
  if (!uid || typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key(uid));
    const c = raw ? JSON.parse(raw) : null;
    return c && c.pinHash && c.salt ? c : null;
  } catch { return null; }
}

function save(uid: string, c: LockConfig | null) {
  try {
    if (c) localStorage.setItem(key(uid), JSON.stringify(c));
    else localStorage.removeItem(key(uid));
  } catch { /* sin almacenamiento: el bloqueo no queda activo */ }
  window.dispatchEvent(new Event(LOCK_EVENT));
}

function toB64(buf: ArrayBuffer | Uint8Array) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  bytes.forEach(b => { s += String.fromCharCode(b); });
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromB64(s: string) {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(b, c => c.charCodeAt(0));
}
const random = (n: number) => crypto.getRandomValues(new Uint8Array(n));

async function hashPin(pin: string, salt: string) {
  const data = new TextEncoder().encode(`${salt}:${pin}`);
  return toB64(await crypto.subtle.digest('SHA-256', data));
}

export async function setPin(uid: string, pin: string, delaySec?: number) {
  const prev = getLock(uid);
  const salt = toB64(random(16));
  save(uid, { pinHash: await hashPin(pin, salt), salt, credId: prev?.credId, delaySec: delaySec ?? prev?.delaySec ?? 60 });
  markActive();
}

export async function checkPin(uid: string, pin: string) {
  const c = getLock(uid);
  return !!c && (await hashPin(pin, c.salt)) === c.pinHash;
}

export function setDelay(uid: string, delaySec: number) {
  const c = getLock(uid);
  if (c) save(uid, { ...c, delaySec });
}

export function removeLock(uid: string) {
  save(uid, null);
}

/** ¿El celular tiene huella, rostro o patrón de pantalla que el navegador pueda usar? */
export async function biometricAvailable() {
  try {
    return typeof window !== 'undefined' && !!window.PublicKeyCredential
      && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch { return false; }
}

/** Registra la huella/rostro de este celular para desbloquear FLOWI. */
export async function enableBiometric(uid: string, displayName: string) {
  const c = getLock(uid);
  if (!c) return false;
  const cred = await navigator.credentials.create({
    publicKey: {
      challenge: random(32),
      rp: { name: 'FLOWI', id: location.hostname },
      user: { id: random(16), name: displayName || 'FLOWI', displayName: displayName || 'FLOWI' },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' },
      timeout: 60000,
      attestation: 'none',
    },
  }) as PublicKeyCredential | null;
  if (!cred) return false;
  save(uid, { ...c, credId: toB64(cred.rawId) });
  return true;
}

export function disableBiometric(uid: string) {
  const c = getLock(uid);
  if (c) save(uid, { ...c, credId: undefined });
}

/** Pide la huella o el rostro. Verdadero si la persona la confirmó en el celular. */
export async function verifyBiometric(uid: string) {
  const c = getLock(uid);
  if (!c?.credId) return false;
  try {
    const res = await navigator.credentials.get({
      publicKey: {
        challenge: random(32),
        allowCredentials: [{ type: 'public-key', id: fromB64(c.credId) }],
        userVerification: 'required',
        timeout: 60000,
      },
    });
    return !!res;
  } catch { return false; }
}

/** Guarda que la app estuvo a la vista ahora (para no pedir el PIN al recargar o al volver rápido). */
export function markActive() {
  try { sessionStorage.setItem(ACTIVE_KEY, String(Date.now())); } catch { /* nada */ }
}

/** ¿Pasó más tiempo del permitido desde la última vez que la app estuvo a la vista? */
export function shouldLock(uid: string) {
  const c = getLock(uid);
  if (!c) return false;
  let last = 0;
  try { last = Number(sessionStorage.getItem(ACTIVE_KEY)) || 0; } catch { /* nada */ }
  return !last || Date.now() - last >= c.delaySec * 1000;
}

/** Al bloquear se borra la marca, para que recargar la página no salte el PIN. */
export function clearActive() {
  try { sessionStorage.removeItem(ACTIVE_KEY); } catch { /* nada */ }
}
