'use client';
import { useEffect, useMemo } from 'react';
import { tr } from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';
import { useData } from '@/components/DataProvider';
import { useCategories } from '@/hooks/useCategories';
import { useReminders } from '@/hooks/useReminders';
import { useInAppNotifications } from '@/hooks/useInAppNotifications';
import { createCategoryResolver } from '@/lib/categoryGroups';
import { computeSmartAlerts, monthKey, pendingAlerts, type SmartAlert } from '@/lib/smartAlerts';
import { scheduleNotificationViaSW } from '@/lib/notifications';
import { inAppOn, pushOn } from '@/lib/notifPrefs';
import { formatCurrency, defaultCurrency } from '@/lib/format';

// Revisa los gastos cada vez que cambian y avisa (dentro de la app y en la barra del celular) cuando
// se llega al 80 % o se pasa del presupuesto, del mes o de una categoría, o cuando una categoría va muy
// por encima de lo normal. Cada aviso sale una sola vez por mes en este celular.
const MAX_PER_CHECK = 2; // si hay varias pendientes (p. ej. la primera vez), salen de a poco

export function SmartAlertWatcher() {
  const { user, profile } = useAuth();
  const { transactions, loadingTransactions } = useData();
  const { allCategories } = useCategories();
  const { reminders } = useReminders();
  const { push: pushInApp } = useInAppNotifications();
  const resolve = useMemo(() => createCategoryResolver(allCategories), [allCategories]);

  useEffect(() => {
    if (!user || loadingTransactions || !transactions.length) return;
    const timer = setTimeout(() => {
      const storeKey = `flowi_smart_alerts_${user.uid}`;
      const mk = monthKey(new Date());
      let seen: string[] = [];
      try { seen = JSON.parse(localStorage.getItem(storeKey) || '[]'); } catch { /* vacío */ }
      seen = seen.filter(k => k.startsWith(mk)); // solo cuenta el mes actual

      let categoryBudgets = profile?.categoryBudgets;
      if (!categoryBudgets) {
        try { categoryBudgets = JSON.parse(localStorage.getItem('flowi_category_budgets') || '{}'); } catch { categoryBudgets = {}; }
      }
      const currency = profile?.currency || defaultCurrency();
      const alerts = computeSmartAlerts({
        transactions,
        budget: profile?.budget,
        categoryBudgets,
        resolveLabel: c => resolve(c).label,
        minDiff: currency === 'COP' ? 30000 : 10,
        skipGlobal: reminders.some(r => r.type === 'budget_alert' && r.active),
      });
      const todo = pendingAlerts(alerts, new Set(seen)).slice(0, MAX_PER_CHECK);
      if (!todo.length) return;

      const money = (n: number) => formatCurrency(n, currency);
      for (const a of todo) {
        const { title, body } = message(a, money);
        if (pushOn()) {
          scheduleNotificationViaSW({
            title, body, tag: `smart-${a.key}`,
            data: { url: a.kind === 'unusual' ? '/servicios/resumen' : '/servicios/presupuestos' },
          });
        }
        if (inAppOn()) pushInApp({ title, body });
        seen.push(a.key);
      }
      try { localStorage.setItem(storeKey, JSON.stringify(seen)); } catch { /* sin almacenamiento */ }
    }, 3000); // espera a que terminen de llegar los cambios
    return () => clearTimeout(timer);
  }, [user, profile?.budget, profile?.categoryBudgets, profile?.currency, transactions, loadingTransactions, reminders, resolve, pushInApp]);

  return null;
}

function message(a: SmartAlert, money: (n: number) => string): { title: string; body: string } {
  const vars = { cat: tr(a.label || ''), pct: a.pct, spent: money(a.spent), limit: money(a.limit) };
  if (a.kind === 'unusual') {
    return { title: tr('Este mes gastas más en {cat}', vars), body: tr('Llevas {spent}, un {pct}% más de lo normal ({limit}).', vars) };
  }
  if (a.kind === 'global') {
    return a.level === 100
      ? { title: tr('Te pasaste del presupuesto del mes'), body: tr('Llevas {spent} de {limit} ({pct}%).', vars) }
      : { title: tr('Vas en el {pct}% de tu presupuesto del mes', vars), body: tr('Llevas {spent} de {limit}.', vars) };
  }
  return a.level === 100
    ? { title: tr('{cat}: te pasaste del presupuesto', vars), body: tr('Llevas {spent} de {limit} ({pct}%).', vars) }
    : { title: tr('{cat}: vas en el {pct}% del presupuesto', vars), body: tr('Llevas {spent} de {limit}.', vars) };
}
