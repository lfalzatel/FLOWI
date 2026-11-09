// Prueba manual de los recordatorios push (el envío real lo hace Firebase cada 5 minutos:
// función enviarRecordatorios en functions/index.js, lógica en functions/reminders.mjs).
//   DRY_RUN=1 NOW=2026-11-09T13:02:00Z FIREBASE_SERVICE_ACCOUNT="$(cat llave.json)" node push/send-reminders.mjs
const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!raw) {
  console.log('Falta FIREBASE_SERVICE_ACCOUNT; no se envía nada.');
  process.exit(0);
}
const { runReminders } = await import('../functions/reminders.mjs');
await runReminders({
  credential: JSON.parse(raw),
  now: process.env.NOW ? new Date(process.env.NOW) : new Date(),
  dryRun: process.env.DRY_RUN === '1',
}).catch(err => {
  console.error('Error enviando recordatorios:', err.message);
  process.exit(1);
});
process.exit(0);
