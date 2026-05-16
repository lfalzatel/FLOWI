'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, TrendingDown, TrendingUp,
  PieChart, Plus, X,
} from 'lucide-react';
import { AddExpenseModal } from '@/components/forms/AddExpenseModal';

const navItems = [
  { icon: LayoutDashboard, label: 'Inicio',   href: '/' },
  { icon: TrendingDown,    label: 'Gastos',   href: '/gastos' },
  { icon: TrendingUp,      label: 'Ingresos', href: '/ingresos' },
  { icon: PieChart,        label: 'Reportes', href: '/reportes' },
];

export function BottomNav() {
  const pathname        = usePathname();
  const [showAdd, setShowAdd] = useState(false);

  return (
    <>
      <nav
        className="lg:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-50
                   flex items-center gap-0.5 px-2.5 py-2
                   rounded-[28px]
                   shadow-2xl shadow-black/50"
        style={{
          background: 'rgba(18, 18, 40, 0.75)',
          backdropFilter: 'blur(28px) saturate(200%)',
          WebkitBackdropFilter: 'blur(28px) saturate(200%)',
          border: '1px solid rgba(255,255,255,0.12)',
        }}
      >
        {/* Inner highlight */}
        <div className="absolute inset-0 rounded-[28px] pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r
                          from-transparent via-white/20 to-transparent" />
        </div>

        {navItems.slice(0, 2).map(item => (
          <NavItem key={item.href} {...item} active={pathname === item.href} />
        ))}

        {/* FAB */}
        <button
          onClick={() => setShowAdd(true)}
          className="relative mx-1.5 w-12 h-12 rounded-full flex-shrink-0
                     flex items-center justify-center
                     bg-gradient-to-br from-accent to-accent-dim
                     shadow-lg shadow-accent/35
                     active:scale-95 transition-transform duration-150"
        >
          <Plus className="w-5 h-5 text-black stroke-[2.5]" />
        </button>

        {navItems.slice(2).map(item => (
          <NavItem key={item.href} {...item} active={pathname === item.href} />
        ))}
      </nav>

      {showAdd && <AddExpenseModal onClose={() => setShowAdd(false)} />}
    </>
  );
}

function NavItem({ icon: Icon, label, href, active }: any) {
  return (
    <Link href={href}
      className={`relative flex flex-col items-center gap-0.5 px-3.5 py-2
                  rounded-[20px] transition-all duration-200
                  ${active
                    ? 'text-accent'
                    : 'text-white/35 hover:text-white/60 active:text-white/80'
                  }`}
    >
      {active && (
        <span className="absolute inset-0 rounded-[20px] bg-accent/8" />
      )}
      <Icon className="w-[18px] h-[18px] relative z-10" />
      <span className="text-[9px] font-medium relative z-10 leading-none">{label}</span>
    </Link>
  );
}
