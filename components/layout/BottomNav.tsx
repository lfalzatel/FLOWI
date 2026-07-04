'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, TrendingDown, TrendingUp,
  Plus, Bell, CreditCard
} from 'lucide-react';
import { AddExpenseModal } from '@/components/forms/AddExpenseModal';
import { AddDebtModal } from '@/components/forms/AddDebtModal';
import { ReminderFormModal } from '@/components/forms/ReminderFormModal';
import { useTheme } from '@/components/ThemeProvider';

const navItems = [
  { icon: LayoutDashboard, label: 'Inicio',        href: '/' },
  { icon: TrendingDown,    label: 'Gastos',        href: '/gastos' },
  { icon: TrendingUp,      label: 'Ingresos',      href: '/ingresos' },
  { icon: CreditCard,      label: 'Deudas',        href: '/deudas' },
  { icon: Bell,            label: 'Recordatorios', href: '/recordatorios' },
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
        @keyframes float-bounce {
          0%, 100% { transform: translateY(0) scale(1) translateX(-50%); }
          30%       { transform: translateY(-10px) scale(1.05) translateX(-50%); }
          60%       { transform: translateY(-5px) scale(1.02) translateX(-50%); }
        }
      `}</style>

      {/* Floating FAB above the nav */}
      <button
        onClick={() => setShowAdd(true)}
        aria-label="Nueva transacción"
        className={`md:hidden fixed z-50 flex items-center justify-center
                    w-14 h-14
                    bg-gradient-to-br from-accent to-accent-dim
                    shadow-xl shadow-accent/40 transition-all active:scale-95
                    ${isTechTheme ? 'rounded-none border-2 border-black' : 'rounded-full'}
                    ${isLight ? 'text-white' : 'text-black'}`}
        style={{
          bottom: '88px',
          left: '50%',
          transform: 'translateX(-50%)',
          animation: 'float-bounce 2.2s ease-in-out infinite',
        }}
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </button>

      <nav
        className={`md:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-50
                   flex items-center gap-0.5 px-2 py-1.5
                   shadow-2xl shadow-black/10
                   bg-glass backdrop-blur-3xl border border-glass-border
                   ${isTechTheme ? 'rounded-none border-accent/30' : 'rounded-[28px]'}`}
      >
        {/* Inner highlight */}
        <div className={`absolute inset-0 pointer-events-none overflow-hidden ${isTechTheme ? 'rounded-none' : 'rounded-[28px]'}`}>
          <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r
                          from-transparent via-white/20 to-transparent" />
        </div>

        {navItems.map(item => (
          <NavItem 
            key={item.href} 
            {...item} 
            active={pathname === item.href} 
            isTechTheme={isTechTheme} 
            isLight={isLight} 
          />
        ))}
      </nav>

      {showAdd && (
        pathname === '/deudas' ? (
          <AddDebtModal onClose={() => setShowAdd(false)} onSuccess={onSuccess || (() => {})} />
        ) : pathname === '/recordatorios' ? (
          <ReminderFormModal onClose={() => setShowAdd(false)} onSuccess={onSuccess || (() => {})} />
        ) : (
          <AddExpenseModal onClose={() => setShowAdd(false)} onSuccess={onSuccess} initialType={pathname === '/ingresos' ? 'ingreso' : 'gasto'} />
        )
      )}
    </>
  );
}

function NavItem({ icon: Icon, label, href, active, isTechTheme, isLight }: any) {
  return (
    <Link href={href}
      className={`relative flex flex-col items-center gap-0.5 px-2.5 py-1.5
                  transition-all duration-200 ${isTechTheme ? 'rounded-none' : 'rounded-[20px]'}
                  ${active
                    ? `bg-accent ${isLight ? 'text-white' : 'text-black'} shadow-lg shadow-accent/35 animate-[push-and-settle_0.45s_cubic-bezier(0.175,0.885,0.32,1.275)_forwards] ${isTechTheme ? 'border border-black' : ''}`
                    : `text-accent hover:opacity-80 ${isLight ? 'active:text-accent-dim' : 'active:text-black'}`
                  }`}
    >
      <Icon className={`w-[18px] h-[18px] relative z-10 ${active ? 'animate-[micro-bounce_0.4s_infinite_alternate] [animation-delay:0.45s]' : ''}`} />
      <span className={`text-[9px] relative z-10 leading-none nav-label ${isTechTheme ? 'font-mono font-bold uppercase tracking-widest' : 'font-medium'}`}>{label}</span>
    </Link>
  );
}
