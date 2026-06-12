'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, TrendingDown, TrendingUp,
  PieChart, Plus, X, CreditCard,
} from 'lucide-react';
import { AddExpenseModal } from '@/components/forms/AddExpenseModal';
import { useTheme } from '@/components/ThemeProvider';

const navItems = [
  { icon: LayoutDashboard, label: 'Inicio',   href: '/' },
  { icon: TrendingDown,    label: 'Gastos',   href: '/gastos' },
  { icon: TrendingUp,      label: 'Ingresos', href: '/ingresos' },
  { icon: CreditCard,      label: 'Deudas',   href: '/deudas' },
];

export function BottomNav({ onSuccess }: { onSuccess?: () => void }) {
  const pathname        = usePathname();
  const [showAdd, setShowAdd] = useState(false);
  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';
  const isLight = theme === 'light';

  return (
    <>
      <style>{`
        @keyframes push-and-settle {
          0% { transform: scale(1) translateY(0); }
          40% { transform: scale(0.8) translateY(2px); }
          70% { transform: scale(1.2) translateY(-10px) rotate(-4deg); }
          100% { transform: scale(1.1) translateY(-8px) rotate(-2deg); }
        }
        @keyframes micro-bounce {
          from { transform: translateY(0); }
          to { transform: translateY(-3px); }
        }
      `}</style>

      <nav
        className={`lg:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-50
                   flex items-center gap-0.5 px-2.5 py-2
                   shadow-2xl shadow-black/10
                   bg-glass backdrop-blur-3xl border border-glass-border
                   ${isTechTheme ? 'rounded-none border-accent/30' : 'rounded-[28px]'}`}
      >
        {/* Inner highlight */}
        <div className={`absolute inset-0 pointer-events-none overflow-hidden ${isTechTheme ? 'rounded-none' : 'rounded-[28px]'}`}>
          <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r
                          from-transparent via-white/20 to-transparent" />
        </div>

        {navItems.slice(0, 2).map(item => (
          <NavItem key={item.href} {...item} active={pathname === item.href} isTechTheme={isTechTheme} isLight={isLight} />
        ))}

        {/* FAB */}
        <button
          onClick={() => setShowAdd(true)}
          className={`relative mx-1.5 w-12 h-12 flex-shrink-0
                     flex items-center justify-center
                     bg-gradient-to-br from-accent to-accent-dim
                     shadow-lg shadow-accent/35
                     active:scale-95 transition-transform duration-150
                     ${isTechTheme ? 'rounded-none border border-black' : 'rounded-full'}`}
        >
          <Plus className={`w-5 h-5 stroke-[2.5] ${isLight ? 'text-white' : 'text-black'}`} />
        </button>

        {navItems.slice(2).map(item => (
          <NavItem key={item.href} {...item} active={pathname === item.href} isTechTheme={isTechTheme} isLight={isLight} />
        ))}
      </nav>

      {showAdd && <AddExpenseModal onClose={() => setShowAdd(false)} onSuccess={onSuccess} initialType={pathname === '/ingresos' ? 'ingreso' : 'gasto'} />}
    </>
  );
}

function NavItem({ icon: Icon, label, href, active, isTechTheme, isLight }: any) {
  return (
    <Link href={href}
      className={`relative flex flex-col items-center gap-0.5 px-3.5 py-2
                  transition-all duration-200 ${isTechTheme ? 'rounded-none' : 'rounded-[20px]'}
                  ${active
                    ? `bg-accent ${isLight ? 'text-white' : 'text-black'} shadow-lg shadow-accent/35 animate-[push-and-settle_0.45s_cubic-bezier(0.175,0.885,0.32,1.275)_forwards] ${isTechTheme ? 'border border-black' : ''}`
                    : `text-accent hover:opacity-80 ${isLight ? 'active:text-accent-dim' : 'active:text-black'}`
                  }`}
    >
      <Icon className={`w-[18px] h-[18px] relative z-10 ${active ? 'animate-[micro-bounce_0.4s_infinite_alternate] [animation-delay:0.45s]' : ''}`} />
      <span className={`text-[9px] relative z-10 leading-none ${isTechTheme ? 'font-mono font-bold uppercase tracking-widest' : 'font-medium'}`}>{label}</span>
    </Link>
  );
}
