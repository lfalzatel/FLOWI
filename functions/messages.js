// Textos de las notificaciones que manda el servidor, en el idioma de cada persona (users/{uid}.lang,
// lo guarda la app: components/layout/LangSync.tsx). La clave es la frase en español; {a} son valores.
const EN = {
  '👋 {a} quiere ser tu amigo': '👋 {a} wants to be your friend',
  'Acepta la solicitud en FLOWI para compartir gastos.': 'Accept the request in FLOWI to split expenses.',
  '🤝 {a} aceptó tu solicitud': '🤝 {a} accepted your request',
  'Ya son amigos en FLOWI.': 'You are now friends on FLOWI.',
  '👥 {a} compartió un gasto contigo': '👥 {a} shared an expense with you',
  '{a}: te toca ${b}. Acéptalo en FLOWI.': '{a}: your share is ${b}. Accept it in FLOWI.',
  'Un gasto': 'An expense',
  '🤝 {a} aceptó el gasto compartido': '🤝 {a} accepted the shared expense',
  '{a} ya está en su FLOWI.': '{a} is now in their FLOWI.',
  '💸 {a} te abonó ${b}': '💸 {a} paid you ${b}',
  'De {a}.': 'For {a}.',
  'un gasto compartido': 'a shared expense',
  'Alguien': 'Someone',
  '💬 {a} te escribió': '💬 {a} wrote to you',
  '🔒 Mensaje en un chat bloqueado': '🔒 Message in a locked chat',
  // Recordatorios y resumen de la mañana (functions/reminders.mjs)
  'Pronto: {a}': 'Soon: {a}',
  'Recordatorio de Flowi': 'Reminder from Flowi',
  'hoy': 'today', 'mañana': 'tomorrow', 'en {a} días': 'in {a} days', 'vence {a}': 'matures {a}',
  'Tienes 1 pago por hacer': 'You have 1 payment due',
  'Tienes {a} pagos por hacer': 'You have {a} payments due',
  'Tu CDT está por vencer': 'Your CDT is about to mature',
  'Fechas importantes': 'Important dates',
  '📊 Tu resumen de {a}': '📊 Your {a} summary',
  'Gastaste {a}': 'You spent {a}',
  ' ({a} % más que el mes anterior)': ' ({a}% more than the previous month)',
  ' ({a} % menos que el mes anterior)': ' ({a}% less than the previous month)',
  'te sobraron {a}': 'you had {a} left',
  'gastaste {a} más de lo que te ingresó': 'you spent {a} more than you earned',
  'lo que más se llevó: {a}': 'your top category: {a}',
  '{a}. Toca para verlo completo.': '{a}. Tap to see it all.',
  'Tu mes de Premium de regalo': 'Your gift month of Premium',
  'Tu FLOWI Premium': 'Your FLOWI Premium',
  '⏳ {a} vence en 3 días': '⏳ {a} ends in 3 days',
  '⏳ {a} vence hoy': '⏳ {a} ends today',
  '{a} terminó': '{a} has ended',
  'Renuévalo para seguir sin límites. Si renuevas antes, los días se suman. Toca para ver los planes.': 'Renew it to keep going without limits. If you renew early, the days add up. Tap to see the plans.',
  'Volviste al plan gratis: tus datos siguen ahí. Toca para renovar cuando quieras.': 'You are back on the free plan: your data is still there. Tap to renew whenever you want.',
};

const fill = (s, vars) => (vars ? s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m)) : s);

/** Frase en el idioma de la persona ('en' o 'es'; lo demás, español). */
function t(lang, es, vars) {
  return fill(lang === 'en' ? (EN[es] ?? es) : es, vars);
}
const locale = (lang) => (lang === 'en' ? 'en-US' : 'es-CO');

module.exports = { t, locale, EN };
