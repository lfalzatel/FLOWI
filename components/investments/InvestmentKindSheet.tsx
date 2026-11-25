'use client';
import { tr } from '@/lib/i18n';
import { Landmark, LineChart, PiggyBank, Umbrella } from 'lucide-react';
import type { InvestmentKind } from '@/lib/firestore';
import { KIND_INFO } from '@/lib/investments';
import { OptionRow, Sheet } from '@/components/ui';

export const KIND_ICON: Record<InvestmentKind, any> = { cdt: Landmark, ahorro: PiggyBank, fondo: LineChart, pension: Umbrella };

// "¿Qué vas a registrar?": CDT, ahorro con intereses, acciones y fondos o pensión voluntaria.
// Hecho con el kit (components/ui): el estilo de cada tema está en app/ui-kit.css.
export function InvestmentKindSheet({ onPick, onClose }: { onPick: (k: InvestmentKind) => void; onClose: () => void }) {
  return (
    <Sheet title={tr('¿Qué vas a registrar?')} onClose={onClose}>
      <div className="space-y-2">
        {(Object.keys(KIND_INFO) as InvestmentKind[]).map(k => (
          <OptionRow key={k} icon={KIND_ICON[k]} title={KIND_INFO[k].label} detail={KIND_INFO[k].examples} onClick={() => onPick(k)} />
        ))}
      </div>
    </Sheet>
  );
}
