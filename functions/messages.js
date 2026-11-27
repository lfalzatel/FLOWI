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

// Portugués de Portugal (pt-PT): trato de "tu", vocabulario de Portugal (igual que lib/i18n-pt.ts)
const PT = {
  '👋 {a} quiere ser tu amigo': '👋 {a} quer ser teu amigo',
  'Acepta la solicitud en FLOWI para compartir gastos.': 'Aceita o pedido na FLOWI para partilhar despesas.',
  '🤝 {a} aceptó tu solicitud': '🤝 {a} aceitou o teu pedido',
  'Ya son amigos en FLOWI.': 'Já são amigos na FLOWI.',
  '👥 {a} compartió un gasto contigo': '👥 {a} partilhou uma despesa contigo',
  '{a}: te toca ${b}. Acéptalo en FLOWI.': '{a}: a tua parte é {b} €. Aceita na FLOWI.',
  'Un gasto': 'Uma despesa',
  '🤝 {a} aceptó el gasto compartido': '🤝 {a} aceitou a despesa partilhada',
  '{a} ya está en su FLOWI.': '{a} já está na sua FLOWI.',
  '💸 {a} te abonó ${b}': '💸 {a} pagou-te {b} €',
  'De {a}.': 'De {a}.',
  'un gasto compartido': 'uma despesa partilhada',
  'Alguien': 'Alguém',
  '💬 {a} te escribió': '💬 {a} escreveu-te',
  '🔒 Mensaje en un chat bloqueado': '🔒 Mensagem num chat bloqueado',
  // Recordatorios y resumen de la mañana (functions/reminders.mjs)
  'Pronto: {a}': 'Em breve: {a}',
  'Recordatorio de Flowi': 'Lembrete da Flowi',
  'hoy': 'hoje', 'mañana': 'amanhã', 'en {a} días': 'daqui a {a} dias', 'vence {a}': 'vence {a}',
  'Tienes 1 pago por hacer': 'Tens 1 pagamento por fazer',
  'Tienes {a} pagos por hacer': 'Tens {a} pagamentos por fazer',
  'Tu CDT está por vencer': 'O teu depósito a prazo está prestes a vencer',
  'Fechas importantes': 'Datas importantes',
  '📊 Tu resumen de {a}': '📊 O teu resumo de {a}',
  'Gastaste {a}': 'Gastaste {a}',
  ' ({a} % más que el mes anterior)': ' ({a} % mais do que no mês anterior)',
  ' ({a} % menos que el mes anterior)': ' ({a} % menos do que no mês anterior)',
  'te sobraron {a}': 'sobraram-te {a}',
  'gastaste {a} más de lo que te ingresó': 'gastaste {a} mais do que recebeste',
  'lo que más se llevó: {a}': 'onde gastaste mais: {a}',
  '{a}. Toca para verlo completo.': '{a}. Toca para ver tudo.',
  'Tu mes de Premium de regalo': 'O teu mês de Premium de oferta',
  'Tu FLOWI Premium': 'O teu FLOWI Premium',
  '⏳ {a} vence en 3 días': '⏳ {a} termina daqui a 3 dias',
  '⏳ {a} vence hoy': '⏳ {a} termina hoje',
  '{a} terminó': '{a} terminou',
  'Renuévalo para seguir sin límites. Si renuevas antes, los días se suman. Toca para ver los planes.': 'Renova-o para continuares sem limites. Se renovares antes, os dias somam-se. Toca para ver os planos.',
  'Volviste al plan gratis: tus datos siguen ahí. Toca para renovar cuando quieras.': 'Voltaste ao plano grátis: os teus dados continuam lá. Toca para renovar quando quiseres.',
};

// Español de España (es-ES): solo las frases que cambian frente al español de Colombia (igual que lib/i18n-es-es.ts)
const ES_ES = {
  '🤝 {a} aceptó tu solicitud': '🤝 {a} ha aceptado tu solicitud',
  'Ya son amigos en FLOWI.': 'Ya sois amigos en FLOWI.',
  '👥 {a} compartió un gasto contigo': '👥 {a} ha compartido un gasto contigo',
  '{a}: te toca ${b}. Acéptalo en FLOWI.': '{a}: tu parte es {b} €. Acéptalo en FLOWI.',
  '🤝 {a} aceptó el gasto compartido': '🤝 {a} ha aceptado el gasto compartido',
  '💸 {a} te abonó ${b}': '💸 {a} te ha pagado {b} €',
  '💬 {a} te escribió': '💬 {a} te ha escrito',
  'Tu CDT está por vencer': 'Tu depósito está a punto de vencer',
  'gastaste {a} más de lo que te ingresó': 'gastaste {a} más de lo que ingresaste',
  'lo que más se llevó: {a}': 'en lo que más se fue: {a}',
  '{a} terminó': '{a} ha terminado',
  'Volviste al plan gratis: tus datos siguen ahí. Toca para renovar cuando quieras.': 'Has vuelto al plan gratis: tus datos siguen ahí. Toca para renovar cuando quieras.',
};

const LANGS = ['es', 'es-ES', 'en', 'pt'];
const LOCALES = { es: 'es-CO', 'es-ES': 'es-ES', en: 'en-US', pt: 'pt-PT' };
const DICTS = { en: EN, pt: PT, 'es-ES': ES_ES };

const normalizeLang = (lang) => (LANGS.includes(lang) ? lang : 'es');
const fill = (s, vars) => (vars ? s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m)) : s);

/** Frase en el idioma de la persona ('es', 'es-ES', 'en' o 'pt'; lo demás, español). */
function t(lang, es, vars) {
  const dict = DICTS[lang];
  return fill(dict ? (dict[es] ?? es) : es, vars);
}
const locale = (lang) => LOCALES[lang] || 'es-CO';

/** Monto en la notificación según la moneda guardada de la persona (o euros por defecto en España y Portugal). */
function money(amount, lang, currency) {
  const cur = currency || (lang === 'es-ES' || lang === 'pt' ? 'EUR' : 'COP');
  const n = Math.round(Number(amount) || 0).toLocaleString(locale(lang));
  return cur === 'EUR' ? `${n} €` : `$${n}`;
}

module.exports = { t, locale, normalizeLang, money, EN, PT, ES_ES };
