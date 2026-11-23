# Pruebas de las reglas de Firestore

Prueban `firestore.rules` contra el emulador (no tocan la base de datos real).
No corren en `npm test` porque necesitan Java y el emulador.

1. Instalar en una carpeta aparte: `npm i @firebase/rules-unit-testing@3 firebase@10`
2. Arrancar el emulador (necesita Java 21): `npx firebase emulators:start --only firestore --project demo-flowi --config firebase.firestore.json`
3. Correr cada archivo con Node desde esa carpeta, por ejemplo: `node ruta/a/FLOWI/scripts/rules/amigos.rules-test.mjs`

Correrlas siempre antes de publicar reglas nuevas.
