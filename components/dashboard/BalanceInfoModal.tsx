'use client';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { CalendarCheck, ChevronRight, TrendingDown, X } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useDebts } from '@/hooks/useDebts';
import { formatCurrency } from '@/lib/format';
import { calculateDebtInterest } from '@/lib/firestore';
import { DailyBudget } from '@/lib/dailyBudget';

type Props =
  | { kind: 'today'; today: DailyBudget; currency?: string; onClose: () => void }
  | { kind: 'debts'; balance: number; currency?: string; onClose: () => void };

// Explicación de las tarjetas "Hoy puedes gastar" y "Deudas pendientes" de Inicio
export function BalanceInfoModal(props: Props) {
  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';
  const { onClose } = props;

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  if (typeof document === 'undefined') return null;

  const isToday = props.kind === 'today';
  return createPortal(
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 ${isTechTheme ? 'font-mono' : ''}`}>
      <div className={`absolute inset-0 ${theme === 'light' ? 'bg-black/20 backdrop-blur-xs' : 'bg-black/60 backdrop-blur-sm'}`} onClick={onClose} aria-hidden="true" />
      <div className={`w-full max-w-md relative z-10 animate-fade-in-up max-h-[88dvh] overflow-y-auto p-5 sm:p-6 glass-dropdown ${isTechTheme ? 'rounded-none border border-accent/50 bg-deep' : 'rounded-3xl'}`}
           onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-4 border-b border-glass-border mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isToday ? 'bg-accent/15 text-accent' : 'bg-[var(--yellow)]/15 text-[var(--yellow)]'}`}>
              {isToday ? <CalendarCheck className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            </div>
            <div>
              <h3 className={`font-bold ${isTechTheme ? 'text-accent uppercase' : 'font-syne text-lg text-text-primary'}`}>
                {isToday ? 'Hoy puedes gastar' : 'Deudas pendientes'}
              </h3>
              <p className="text-xs text-text-muted">{isToday ? 'Cómo se calcula tu cuota de hoy' : 'Lo que te falta por pagar'}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="p-2 rounded-xl text-text-muted hover:text-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        {props.kind === 'today'
          ? <TodayContent today={props.today} currency={props.currency} isTechTheme={isTechTheme} />
          : <DebtsContent balance={props.balance} currency={props.currency} onClose={onClose} />}
      </div>
    </div>,
    document.body
  );
}

function Row({ label, hint, value, sign, strong }: { label: string; hint?: string; value: string; sign?: '+' | '−' | '='; strong?: boolean }) {
  return (
    <div className={`flex items-start justify-between gap-3 py-2 ${strong ? 'border-t border-glass-border' : ''}`}>
      <div className="min-w-0">
        <p className={`text-sm ${strong ? 'font-bold text-text-primary' : 'text-text-secondary'}`}>{label}</p>
        {hint && <p className="text-[11px] text-text-muted leading-snug">{hint}</p>}
      </div>
      <p className={`text-sm shrink-0 tabular-nums ${strong ? 'font-bold text-text-primary' : 'text-text-primary'}`}>
        {sign && sign !== '=' ? `${sign} ` : ''}{value}
      </p>
    </div>
  );
}

function TodayContent({ today, currency, isTechTheme }: { today: DailyBudget; currency?: string; isTechTheme: boolean }) {
  const f = (n: number) => formatCurrency(n, currency);
  const over = today.remainingToday < 0;
  const freeNow = today.freeAtStartOfDay - today.spentToday; // ingresos − gastos del mes − compromisos

  if (!today.hasBase) {
    return (
      <p className="text-sm text-text-secondary leading-relaxed">
        Para calcular cuánto puedes gastar cada día necesito saber con cuánto cuentas este mes.
        Registra tus <strong>ingresos del mes</strong> (o define un presupuesto en Configuración) y aquí verás tu cuota diaria.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className={`p-4 ${isTechTheme ? 'rounded-none' : 'rounded-2xl'} ${over ? 'bg-red-500/10 border border-red-500/20' : 'bg-accent/10 border border-accent/20'}`}>
        <p className={`text-xs font-bold uppercase tracking-wider ${over ? 'text-red-400' : 'text-accent'}`}>{over ? 'Hoy te pasaste' : 'Te queda para hoy'}</p>
        <p className={`text-3xl font-bold mt-1 ${over ? 'text-red-400' : 'text-accent'} ${isTechTheme ? '' : 'font-syne'}`}>{f(Math.abs(today.remainingToday))}</p>
        <p className="text-xs text-text-secondary mt-1">
          {over
            ? `Tu cuota de hoy era ${f(today.todayAllowance)} y llevas ${f(today.spentToday)}. Lo que te pasaste se descuenta de los próximos días.`
            : today.mode === 'cuentas' && today.nextIncome
              ? `Es lo que puedes gastar hoy sin quedarte corto antes de tu próximo ingreso (${today.nextIncome.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })}).`
              : `Es lo que puedes gastar hoy sin quedarte corto antes de fin de mes.`}
        </p>
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-1">Así se calcula</p>
        {today.mode === 'cuentas' ? (
          <>
            <Row label="Plata en tus cuentas para gastar" hint="Saldo de hoy en Cuentas y patrimonio (sin las cuentas de ahorro)" value={f(today.cash)} sign="+" />
            {today.cardDebt > 0 && <Row label="Lo que debes en tarjetas" hint="Lo reservo para pagarlas" value={f(today.cardDebt)} sign="−" />}
          </>
        ) : (
          <>
            <Row label={today.baseIsBudget ? 'Tu presupuesto del mes' : 'Ingresos del mes'} value={f(today.base)} sign="+" />
            <Row label="Gastos del mes" hint="Lo mismo que la tarjeta Gastos (incluye lo de hoy)" value={f(today.spentMonth)} sign="−" />
          </>
        )}
        {today.pendingCommitments > 0 && (
          <Row label="Compromisos por pagar" hint="Pagos fijos que aún faltan este mes (los reservo primero)" value={f(today.pendingCommitments)} sign="−" />
        )}
        {today.savedMonth > 0 && (
          <Row label="Ahorrado en CDT este mes" hint="Plata que salió de tus cuentas hacia un CDT: no es gasto, pero ya no está disponible" value={f(today.savedMonth)} sign="−" />
        )}
        <Row label="Libre ahora" value={f(Math.max(0, freeNow))} strong />
        {today.tomorrowAllowance !== null && (
          <>
            <Row label={`Repartido en ${today.daysLeft - 1} días`}
                 hint={today.mode === 'cuentas' && today.nextIncome
                   ? `Desde mañana hasta tu próximo ingreso (${today.nextIncome.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}), según cuándo te llegó el último`
                   : 'Los días que faltan del mes, desde mañana'}
                 value={`÷ ${today.daysLeft - 1}`} />
            <Row label="Desde mañana puedes gastar" value={`${f(today.tomorrowAllowance)} / día`} strong />
          </>
        )}
      </div>

      <div className="p-3 rounded-2xl bg-white/5 border border-glass-border">
        <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-1">Y hoy</p>
        <p className="text-xs text-text-secondary leading-relaxed">
          Al empezar el día tu cuota era de <strong>{f(today.todayAllowance)}</strong> (lo libre que tenías esta mañana ÷ {today.daysLeft} días, contando hoy).
          {today.spentToday > 0
            ? <> Llevas <strong>{f(today.spentToday)}</strong> en gastos del día a día: {over
                ? <>te pasaste <strong className="text-red-400">{f(-today.remainingToday)}</strong>, y por eso la cuota de los próximos días baja.</>
                : <>te quedan <strong className="text-accent">{f(today.remainingToday)}</strong> para hoy.</>}</>
            : <> Aún no registras gastos del día a día hoy.</>}
        </p>
      </div>

      <p className="text-xs text-text-muted leading-relaxed">
        💡 Lo que hoy no gastes se reparte en los días siguientes y tu cuota sube. La cuota de hoy es la misma que ves en <strong>Límite diario</strong>, más abajo.
      </p>
    </div>
  );
}

function DebtsContent({ balance, currency, onClose }: { balance: number; currency?: string; onClose: () => void }) {
  const { debts, totalDeudas, totalMeDeben } = useDebts();
  const f = (n: number) => formatCurrency(n, currency);
  const pending = (dir: 'debo' | 'me_deben') => debts
    .filter(d => d.status === 'pending' && (d.direction || 'debo') === dir)
    .map(d => ({ id: d.id, title: d.title, left: Math.max(0, d.totalAmount - d.paidAmount) + calculateDebtInterest(d).accumulatedInterest, interest: !!d.interestRate }))
    .sort((a, b) => b.left - a.left);
  const owe = pending('debo');
  const owed = pending('me_deben');

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary leading-relaxed">
        Es la suma de lo que <strong>te falta por pagar</strong> de tus deudas activas: lo que debías menos los abonos que has hecho,
        más los intereses acumulados si la deuda tiene tasa.
      </p>

      {owe.length === 0 ? (
        <p className="text-sm text-emerald-400">No tienes deudas pendientes. 🎉</p>
      ) : (
        <div>
          {owe.slice(0, 6).map(d => (
            <Row key={d.id} label={d.title} hint={d.interest ? 'Incluye intereses' : undefined} value={f(d.left)} />
          ))}
          {owe.length > 6 && <p className="text-[11px] text-text-muted py-1">y {owe.length - 6} más…</p>}
          <Row label="Total que debes" value={f(totalDeudas)} strong />
        </div>
      )}

      {owed.length > 0 && (
        <p className="text-xs text-text-muted leading-relaxed">
          Aparte, <strong>te deben {f(totalMeDeben)}</strong> ({owed.length} {owed.length === 1 ? 'persona' : 'personas'}). Eso no se suma aquí porque no es plata que tengas que pagar.
        </p>
      )}

      <div className="p-3 rounded-2xl bg-white/5 border border-glass-border">
        <p className="text-xs text-text-secondary leading-relaxed">
          <strong>Balance neto (con deudas)</strong>, en la tarjeta de arriba, es tu dinero disponible menos estas deudas:
          {' '}{f(balance)} − {f(totalDeudas)} = <strong className={balance - totalDeudas < 0 ? 'text-red-400' : 'text-accent'}>{f(balance - totalDeudas)}</strong>.
          Te dice con cuánto quedarías si pagaras todo hoy.
        </p>
      </div>

      <Link href="/deudas" onClick={onClose} className="flex items-center justify-center gap-1 text-sm font-semibold text-accent py-2">
        Ver y abonar a mis deudas <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
