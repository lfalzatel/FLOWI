'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { UserProfile } from '@/lib/firestore';

// Plan gratis con límites amables y FLOWI Premium sin límites.
// Recordatorios y notas son ilimitados para todos.

export const FREE_LIMITS = {
  accounts: Infinity,   // sin límite: para llevar las cuentas completas hacen falta todas (Nequi, banco, efectivo…)
  investments: 2,       // CDT, cajitas, fondos, pensión
  goals: 2,
  receiptsPerDay: 3,    // recibos leídos con foto, por día (se renuevan a medianoche)
};
// Premium: ilimitado en la práctica; el tope solo frena abusos o errores
export const PREMIUM_RECEIPTS_PER_DAY = 30;
export type LimitKind = 'accounts' | 'investments' | 'goals' | 'receipts';

export interface PlanOption {
  id: 'mensual' | 'trimestral' | 'anual';
  label: string;
  months: number;
  price: number; // COP
  best?: boolean;
}
// Deben coincidir con los precios del servidor (functions/index.js)
export const PLANS: PlanOption[] = [
  { id: 'mensual', label: 'Mensual', months: 1, price: 5000 },
  { id: 'trimestral', label: '3 meses', months: 3, price: 14000 },
  { id: 'anual', label: 'Anual', months: 12, price: 50000, best: true },
];

// Regalo de lanzamiento: quien ya usaba FLOWI antes de los planes tiene un mes de Premium
const LAUNCH = new Date('2026-11-09T00:00:00-05:00');
const GIFT_END = new Date('2026-12-09T23:59:59-05:00');

function toDate(v: any): Date | null {
  if (!v) return null;
  const d = typeof v?.toDate === 'function' ? v.toDate() : new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

/** Hasta cuándo tiene Premium (o null si está en el plan gratis). */
export function premiumUntil(profile: UserProfile | null | undefined, now = new Date()): Date | null {
  if (!profile) return null;
  const paid = toDate((profile as any).premiumUntil);
  const created = toDate(profile.createdAt);
  const gift = created && created < LAUNCH ? GIFT_END : null;
  const best = [paid, gift].filter((d): d is Date => !!d && d > now).sort((a, b) => b.getTime() - a.getTime())[0];
  return best ?? null;
}

/**
 * Cuándo termina (o terminó) el Premium de la persona, para avisarle que renueve.
 * null para el administrador o si nunca tuvo Premium.
 */
export function premiumEndInfo(profile: UserProfile | null | undefined): { until: Date; gift: boolean } | null {
  if (!profile || profile.role === 'admin') return null;
  const paid = toDate((profile as any).premiumUntil);
  const created = toDate(profile.createdAt);
  const gift = created && created < LAUNCH ? GIFT_END : null;
  if (paid && (!gift || paid >= gift)) return { until: paid, gift: false };
  if (gift) return { until: gift, gift: true };
  return null;
}

export function isPremium(profile: UserProfile | null | undefined, now = new Date()): boolean {
  if (profile?.role === 'admin') return true;
  return !!premiumUntil(profile, now);
}

/** Fecha de hoy en este dispositivo (AAAA-MM-DD): el conteo de recibos se renueva a medianoche. */
export function dayKeyNow(d = new Date()) {
  return d.toLocaleDateString('en-CA');
}

/** Recibos leídos hoy (se guarda en el perfil como receiptUsage: { day, count }). */
export function receiptsUsed(profile: UserProfile | null | undefined): number {
  const u = (profile as any)?.receiptUsage;
  return u && u.day === dayKeyNow() ? Number(u.count) || 0 : 0;
}

/** Cuántos recibos puede leer al día según su plan. */
export function receiptsDailyLimit(profile: UserProfile | null | undefined): number {
  return isPremium(profile) ? PREMIUM_RECEIPTS_PER_DAY : FREE_LIMITS.receiptsPerDay;
}

export function usePlan() {
  const { profile } = useAuth();
  const premium = isPremium(profile);
  return {
    premium,
    until: premiumUntil(profile),
    /** true si todavía puede agregar uno más de este tipo */
    canAdd: (kind: LimitKind, current: number) => {
      if (kind === 'receipts') return current < (premium ? PREMIUM_RECEIPTS_PER_DAY : FREE_LIMITS.receiptsPerDay);
      if (premium) return true;
      const max = FREE_LIMITS[kind];
      return current < max;
    },
  };
}

/**
 * Para formularios de "nuevo": decide una sola vez, cuando ya cargaron los datos, si se puede
 * abrir. Si se llegó al límite muestra el aviso de planes y cierra el formulario.
 * Devuelve true cuando el formulario puede mostrarse.
 */
export function usePlanGate(kind: LimitKind, count: number, loading: boolean, skip: boolean, onClose: () => void): boolean {
  const { canAdd } = usePlan();
  const [state, setState] = useState<'wait' | 'ok' | 'blocked'>(skip ? 'ok' : 'wait');
  useEffect(() => {
    if (state !== 'wait' || loading) return;
    if (canAdd(kind, count)) setState('ok');
    else { setState('blocked'); showLimit(kind); onClose(); }
  }, [state, loading, count]); // eslint-disable-line react-hooks/exhaustive-deps
  return state === 'ok';
}

// Aviso "llegaste al límite": cualquier parte de la app lo pide con este evento
export const LIMIT_EVENT = 'flowi:plan-limit';
export function showLimit(kind: LimitKind) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(LIMIT_EVENT, { detail: { kind } }));
}

export const LIMIT_TEXT: Record<LimitKind, { title: string; text: string }> = {
  accounts: { title: 'Cuentas', text: 'Las cuentas son ilimitadas en todos los planes.' },
  investments: { title: 'Ya tienes 2 inversiones', text: `El plan gratis incluye ${FREE_LIMITS.investments} inversiones o ahorros. Con Premium agregas todos tus CDT, cajitas y fondos.` },
  goals: { title: 'Ya tienes 2 metas', text: `El plan gratis incluye ${FREE_LIMITS.goals} metas de ahorro activas. Con Premium tienes todas las que quieras.` },
  receipts: { title: `Ya leíste tus ${FREE_LIMITS.receiptsPerDay} recibos de hoy 📸`, text: 'Mañana se renuevan. Mientras tanto, puedes registrar este gasto dictándolo o escribiéndolo; eso no tiene límite.' },
};
