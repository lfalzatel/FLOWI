# Reglas para asistentes de código (Claude, Antigravity, Gemini, Copilot…)

- Habla siempre en **español** con el dueño del proyecto.
- Guía del código: `ARQUITECTURA.md`.

## Publicar

| Qué | Cómo | Quién |
|---|---|---|
| Página web (sitio de pruebas) | `git push origin staging` → GitHub publica en https://flowi-gastos--staging-3s3phtyi.web.app | el asistente |
| Página web (la real) | push a `main` → GitHub publica en https://flowi-gastos.web.app. **Solo con el OK explícito del dueño.** | el asistente |
| Funciones del servidor (`functions/`: notificaciones, pagos, recordatorios) | `npm run deploy:functions` (o `npm run deploy:functions -- nombreFuncion`) | **el asistente, no el dueño** |
| Reglas de Firestore | `npx firebase deploy --config firebase.firestore.json --project flowi-9af82 --only firestore` (con el mismo `NODE_OPTIONS=--require scripts/dns4.cjs`) | el asistente |

GitHub **no** publica las funciones: si cambias algo en `functions/`, corre `npm run deploy:functions` y
revisa que termine en `Deploy complete!`. No le pidas al dueño que corra comandos en su terminal.

Por qué existe `scripts/deploy-functions.mjs` (ya resuelve todo esto):
- En este PC las conexiones a Google por IPv6 se cuelgan → `scripts/dns4.cjs` fuerza IPv4.
- PowerShell bloquea `firebase.ps1` → se corre firebase-tools directo con `node`.
- `firebase.functions.json` lleva `"disallowLegacyRuntimeConfig": true`: Runtime Config está retirado y
  su falla ("Cloud Runtime Config is currently experiencing issues") cortaba el deploy. No lo quites.
- Si tu propia terminal no llega a `*.googleapis.com`, corre el comando sin sandbox o pide permiso de red;
  no lo pases al dueño.

## Cuidado
- **Nunca** corras `migracion/copiar.mjs --copiar`.
- Nunca subas llaves ni `.env` a git.
- Para probar en la vista previa usa el modo invitado ("Probar sin cuenta"), no la cuenta real del dueño.
- Textos nuevos en pantalla: envuélvelos con `t('…')`/`tr('…')` y agrega la frase en `lib/i18n-en.ts`,
  `lib/i18n-pt.ts` (y en `lib/i18n-es-es.ts` si cambia en España). `npm test` revisa que no falte ninguna.
- Antes de subir: `npm test`.
