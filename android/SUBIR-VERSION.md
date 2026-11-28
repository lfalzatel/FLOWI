# Subir una versión nueva del paquete Android (prueba cerrada de Google Play)

Versión actual preparada: **1.0.1 (código 2)** — arregla "Compartir con FLOWI" desde el banco.

## 1. Generar el archivo firmado (lo hace Luis: escribe la contraseña de la llave)

En la terminal (PowerShell):

```powershell
cd D:\Usuario\Downloads\Apps\FLOWI\android
$env:NoDefaultCurrentDirectoryInExePath = ''
$env:JAVA_TOOL_OPTIONS = '-Djava.net.preferIPv4Stack=true'
C:\Users\hp\.bubblewrap\cli\node_modules\.bin\bubblewrap.cmd build
```

- Pide dos contraseñas (la de la llave `flowi-release.keystore` y la del alias `flowi`): las mismas de la primera vez.
- Si alguna vez pregunta "apply changes to twa-manifest" → responder **N** (no). Decir "Y" borra los arreglos
  de `mavenCentral` y `minSdk 24` del proyecto. Nunca correr `bubblewrap update`.
- Resultado: `android/app-release-bundle.aab` (fecha de hoy).

## 2. Subirlo a Play Console

1. Play Console → FLOWI → **Pruebas → Prueba cerrada** → la pista que ya existe → **Crear versión nueva**.
2. En "App bundles" → **Subir** → elegir `D:\Usuario\Downloads\Apps\FLOWI\android\app-release-bundle.aab`.
3. Notas de la versión (es-419): `Arreglo: compartir comprobantes del banco a FLOWI.` (en-US: `Fix: sharing bank receipts to FLOWI.`)
4. **Siguiente → Guardar → Enviar a revisión**. Cuando Google la apruebe, en el celular: Play Store → FLOWI → **Actualizar**.

## Si cambias algo en twa-manifest.json

El mismo cambio va a mano en `app/build.gradle` (y `AndroidManifest.xml` si aplica), sube `appVersionCode`
y `versionCode` en 1, y actualiza `manifest-checksum.txt` con el SHA-1 de `twa-manifest.json`
(si no, `bubblewrap build` ofrece regenerar el proyecto).
