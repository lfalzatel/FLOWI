import { Debt, Goal, Reminder, Transaction } from './firestore';

// Datos de ejemplo para el recorrido guiado: un mes típico con sueldo, arriendo, servicios,
// gastos del día a día, una deuda, una meta y un pago por vencer. Solo viven en memoria
// mientras dura el recorrido; nunca se guardan.

export interface DemoData {
  transactions: Transaction[];
  reminders: Reminder[];
  debts: Debt[];
  goals: Goal[];
}

export function buildDemoData(now = new Date()): DemoData {
  const y = now.getFullYear();
  const m = now.getMonth();
  const today = now.getDate();
  const lastDay = new Date(y, m + 1, 0).getDate();
  const day = (d: number) => Math.min(Math.max(1, d), today); // este mes: nunca en el futuro
  const at = (month: number, d: number, h = 10) => new Date(y, month, d, h);
  const tx = (date: Date, type: Transaction['type'], amount: number, category: string, description: string, isFixed = false): Transaction =>
    ({ type, amount, category, description, isFixed, date, userId: 'demo' });

  // El internet vence mañana (para mostrar compromisos y "Tu siguiente acción")
  const internetDay = Math.min(today + 1, lastDay);

  const transactions: Transaction[] = [
    // Mes pasado
    tx(at(m - 1, 1), 'ingreso', 3500000, 'Sueldo', 'Sueldo'),
    tx(at(m - 1, 1), 'gasto', 1100000, 'Arriendo', 'Arriendo apartamento', true),
    tx(at(m - 1, Math.min(internetDay, new Date(y, m, 0).getDate())), 'gasto', 89900, 'Internet', 'Internet hogar', true),
    tx(at(m - 1, 20), 'gasto', 38900, 'Netflix', 'Netflix', true),
    tx(at(m - 1, 6), 'gasto', 420000, 'Mercado', 'Mercado del mes'),
    tx(at(m - 1, 12), 'gasto', 230000, 'Mercado', 'Mercado'),
    tx(at(m - 1, 15), 'gasto', 180000, 'Restaurantes', 'Almuerzos'),
    tx(at(m - 1, 22), 'gasto', 150000, 'Transporte', 'Pasajes del mes'),
    // Este mes
    tx(at(m, day(1), 9), 'ingreso', 3500000, 'Sueldo', 'Sueldo'),
    tx(at(m, day(1), 11), 'gasto', 1100000, 'Arriendo', 'Arriendo apartamento', true),
    tx(at(m, day(2), 18), 'gasto', 185000, 'Mercado', 'Mercado de la semana'),
    tx(at(m, day(today - 1), 13), 'gasto', 24000, 'Restaurantes', 'Almuerzo'),
    tx(at(m, today, 8), 'gasto', 12000, 'Transporte', 'Bus'),
  ];

  const reminders: Reminder[] = [{
    id: 'demo-internet', userId: 'demo', title: 'Internet hogar', category: 'Internet', type: 'monthly',
    dayOfMonth: internetDay, time: '08:00', sound: false, pushEnabled: false, inAppEnabled: true, active: true,
    createdAt: at(m - 2, 1),
  }];

  const debts: Debt[] = [
    { id: 'demo-debt', userId: 'demo', title: 'Préstamo de Juan', totalAmount: 600000, paidAmount: 200000, status: 'pending', direction: 'debo' },
    { id: 'demo-owed', userId: 'demo', title: 'Ana me debe', totalAmount: 50000, paidAmount: 0, status: 'pending', direction: 'me_deben' },
  ];

  const goals: Goal[] = [
    { id: 'demo-goal', userId: 'demo', name: 'Fondo de emergencia', emoji: '🛡️', targetAmount: 3000000, savedAmount: 900000, priority: 'alta' },
  ];

  return { transactions, reminders, debts, goals };
}
