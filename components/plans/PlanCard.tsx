'use client';
import { usePlayStore } from '@/hooks/usePlayStore';
import Link from 'next/link';
import { ChevronRight, Crown } from 'lucide-react';
import { usePlan } from '@/lib/plans';

// "Tu plan" con acceso a Planes (Configuración y Apoyar a FLOWI)
export function PlanCard({ isTechTheme }: { isTechTheme: boolean }) {
  const { premium, until } = usePlan();
  const playStore = usePlayStore();
  const untilText = until ? until.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }) : null;
  return (
    <Link href="/planes"
          className={`flex items-center gap-3 p-4 border transition-colors hover:border-amber-400/60 ${isTechTheme ? 'rounded-none border-amber-400/30 bg-amber-400/5 font-mono' : 'rounded-2xl border-amber-400/30 bg-amber-400/5'}`}>
      <span className={`w-10 h-10 shrink-0 flex items-center justify-center bg-amber-400/15 ${isTechTheme ? 'rounded-none' : 'rounded-xl'}`}>
        <Crown className="w-5 h-5 text-amber-400" />
      </span>
      <span className="flex-1 min-w-0 text-left">
        <span className="block text-sm font-bold text-text-primary normal-case">
          {premium ? 'Tienes FLOWI Premium' : 'Tu plan: Gratis'}
        </span>
        <span className="block text-[11px] text-text-muted normal-case leading-snug">
          {premium
            ? (untilText ? `Activo hasta el ${untilText}.${playStore ? '' : ' Toca para renovar o ver tu plan.'}` : 'Activo.')
            : playStore ? 'Mira qué incluye cada plan.' : 'Pásate a Premium desde $4.167 al mes: inversiones, metas y recibos sin límite.'}
        </span>
      </span>
      <ChevronRight className="w-4 h-4 text-amber-400 shrink-0" />
    </Link>
  );
}
