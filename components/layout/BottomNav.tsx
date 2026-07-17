'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, TrendingDown, TrendingUp,
  Plus, Bell, CreditCard, Grid
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
  { icon: Grid,            label: 'Servicios',     href: '/servicios' },
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
          0%, 100% { transform: translateY(0) scale(1); }
          30%       { transform: translateY(-10px) scale(1.05); }
          60%       { transform: translateY(-5px) scale(1.02); }
        }
      `}</style>

      {/* Main Container for Nav and FAB (Side by Side) */}
      <div className="md:hidden fixed bottom-5 left-0 right-0 z-50 flex items-center justify-between pointer-events-none px-2 w-full max-w-[100vw]">
        
        {/* Navigation Menu */}
        <nav
          className={`pointer-events-auto flex-1 flex items-center justify-between px-1 py-1.5 mr-2
                     shadow-2xl shadow-black/10
                     glass-dropdown
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

        {/* Floating FAB on the right */}
        <button
          onClick={() => setShowAdd(true)}
          aria-label="Nueva transacción"
          className={`pointer-events-auto flex-shrink-0 flex items-center justify-center
                      w-14 h-14
                      bg-gradient-to-br from-accent to-accent-dim
                      shadow-xl shadow-accent/40 transition-all active:scale-95
                      ${isTechTheme ? 'rounded-none border-2 border-black' : 'rounded-full'}
                      ${isLight ? 'text-white' : 'text-black'}`}
          style={{
            animation: 'float-bounce 2.2s ease-in-out infinite',
          }}
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>

      </div>

      {showAdd && (
        pathname === '/deudas' ? (
          <AddDebtModal onClose={() => setShowAdd(false)} onSuccess={onSuccess || (() => {})} />
        ) : pathname.startsWith('/servicios') ? (
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
      className={`relative flex flex-col items-center justify-center flex-1 gap-0.5 py-1.5
                  transition-all duration-200 ${isTechTheme ? 'rounded-none' : 'rounded-[20px]'}
                  ${active
                    ? `bg-accent ${isLight ? 'text-white' : 'text-black'} shadow-lg shadow-accent/35 animate-[push-and-settle_0.45s_cubic-bezier(0.175,0.885,0.32,1.275)_forwards] ${isTechTheme ? 'border border-black' : ''}`
                    : `text-accent hover:opacity-80 ${isLight ? 'active:text-accent-dim' : 'active:text-white'}`
                  }`}
    >
      <Icon className={`w-[18px] h-[18px] relative z-10 ${active ? 'animate-[micro-bounce_0.4s_infinite_alternate] [animation-delay:0.45s]' : ''}`} />
      <span className={`text-[8px] relative z-10 leading-none nav-label text-center max-w-full overflow-hidden text-ellipsis whitespace-nowrap px-0.5 ${isTechTheme ? 'font-mono font-bold uppercase tracking-wide' : 'font-medium'}`}>{label}</span>
    </Link>
  );
}
