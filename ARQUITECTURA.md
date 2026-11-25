# FLOWI — Guía del código

Guía para quien trabaje en FLOWI: dónde está cada cosa, cómo se publica y las reglas para que el
código siga ordenado. Si algo de aquí deja de ser cierto, actualízalo en el mismo cambio.

## 1. Qué es

FLOWI es una PWA de finanzas personales (gastos, ingresos, deudas, cuentas, metas, amigos).

- **Next.js 14** (App Router) exportado como sitio estático (`next build` → `out/`).
- **Firebase** (proyecto `flowi-9af82`): inicio de sesión, Firestore, Cloud Messaging y Cloud Functions.
- **Hosting**: sitio `flowi-gastos` en el proyecto `tienda-38d40` → https://flowi-gastos.web.app
- **Tailwind CSS** con variables de color por tema (`app/globals.css`).
- **Android**: TWA generada con Bubblewrap en `android/` (abre la web con `?source=play`).

## 2. Carpetas

| Carpeta | Qué va ahí | Qué NO va ahí |
|---|---|---|
| `app/` | Una carpeta por pantalla (`page.tsx`). Arma la pantalla con componentes. | Cálculos de plata, acceso directo a Firestore repetido |
| `components/` | Piezas de pantalla, agrupadas por tema (`dashboard/`, `forms/`, `settings/`, `tour/`…) | Lógica de negocio larga |
| `components/ui/` | Kit de diseño: piezas genéricas reutilizables (tarjeta, botón, ventana…) | Nada específico de una pantalla |
| `lib/` | Lógica sin pantalla: cálculos, reglas, voz, planes, formatos, acceso a datos (`firestore.ts`) | JSX / componentes |
| `hooks/` | Datos en vivo para las pantallas (`useExpenses`, `useAccounts`…) | Dibujar nada |
| `functions/` | Cloud Functions (pagos, recordatorios push) | Código del navegador |
| `scripts/` | Pruebas automáticas (`test-*.mjs`), revisión de traducciones, utilidades | — |
| `public/` | Íconos, manifiesto, sonidos, `.well-known/assetlinks.json` | — |
| `android/` | Proyecto TWA (Bubblewrap). La llave de firma NUNCA va a git | — |

Archivos clave:

- `lib/i18n.tsx` + `lib/i18n-en.ts`: textos. Todo texto visible va con `tr('…')` (o `t('…')`) en español,
  y su inglés en `i18n-en.ts`. `node scripts/check-i18n.mjs` avisa si falta alguno.
- `components/ThemeProvider.tsx`: tema activo (`<html data-theme>`), menú rápido y color de las barras del celular.
- `app/globals.css`: variables de color de cada tema (`[data-theme='…'] { --accent… }`).
- `components/layout/MotionManager.tsx`: animaciones globales (ventanas que nacen del toque, brillo de
  tarjetas, arrastrar para cerrar). Nivel en `<html data-motion>`.
- `components/tour/`: tutoriales. Contenido en `tours.ts`; el componente `AppTour` los muestra;
  `PageTourButton` es el botón "Tutorial" de cada página. Las partes a señalar se marcan con `data-tour="…"`.

## 3. Cómo se publica (siempre con el sitio de pruebas primero)

1. El cambio se sube a la rama **`staging`** → GitHub Actions corre las pruebas y lo publica en el
   **sitio de pruebas**: https://flowi-gastos--staging-3s3phtyi.web.app (canal privado; las personas no lo ven).
2. Se revisa ahí (celular y computador).
3. Si está bien, se pasa a **`main`** → se corren las pruebas otra vez y se publica en https://flowi-gastos.web.app

Si una prueba falla, no se publica. Comandos locales:

```bash
npm test                                   # todas las pruebas + traducciones
NODE_OPTIONS=--max-old-space-size=4096 npx tsc --noEmit -p .   # tipos
```

Las reglas de Firestore y las Cloud Functions NO se publican con esto: se despliegan aparte y solo con
autorización del dueño.

## 4. Reglas para mantener el orden

1. **Una pantalla, un archivo corto.** Si un archivo pasa de ~400 líneas, se divide en componentes.
2. **Lógica en `lib/`, pantallas en `app/` y `components/`.** Si un cálculo se puede probar sin pantalla, va en `lib/` con su prueba en `scripts/`.
3. **Los temas solo cambian variables de color.** Nada de `theme === 'carbon' ? … : …` en las pantallas:
   el estilo de cada tema se define en `globals.css` (o en el kit `components/ui/`).
4. **Usa el kit de `components/ui/`** antes de crear un botón, tarjeta o ventana nueva.
5. **Todo texto visible con `tr()`** y su inglés en `i18n-en.ts`.
6. **Cada tutorial en `tours.ts`**, señalando con `data-tour` (no con clases de estilo, que cambian).
7. **Nada de datos personales en el código** ni llaves secretas (la llave de Android, la del webhook de Paddle…).
8. **Comentarios en español** explicando el *porqué*, no el *qué*.

## 5. Estado del orden (plan en curso)

- [x] Sitio de pruebas (staging) antes de publicar.
- [~] Kit de componentes en `components/ui/` + estilos por tema en `app/ui-kit.css`: listo `Sheet`, `Button`, `OptionRow`, `Card` y `useThemeKind()`. Migradas: `InvestmentKindSheet`. Faltan las demás ventanas y botones.
- [ ] Temas solo por variables (quitar las ramas `theme === …` de las pantallas).
- [ ] Dividir los archivos más grandes: `VoiceAssistantModal`, `AddExpenseModal`, `configuracion/page`, `AddDebtModal`.
- [ ] Pruebas automáticas de pantallas (Playwright) con un usuario invitado.
