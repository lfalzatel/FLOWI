'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, TrendingDown, TrendingUp,
  PieChart, Wallet, Settings,
} from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard',   href: '/',            color: '#00E5A0' },
  { icon: TrendingDown,    label: 'Gastos',       href: '/gastos',      color: '#FF5B5B' },
  { icon: TrendingUp,      label: 'Ingresos',     href: '/ingresos',    color: '#00E5A0' },
  { icon: Wallet,          label: 'Presupuesto',  href: '/presupuesto', color: '#F5A623' },
  { icon: PieChart,        label: 'Reportes',     href: '/reportes',    color: '#A855F7' },
  { icon: Settings,        label: 'Ajustes',      href: '/ajustes',     color: '#6B7280' },
];

export function SideNav() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-60 min-h-screen sticky top-0
                      bg-[#0D0D1A] border-r border-white/5 flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-8">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-accent to-accent-dim
                        flex items-center justify-center shadow-lg shadow-accent/20 flex-shrink-0">
          <span className="font-syne font-black text-black text-lg">₣</span>
        </div>
        <div>
          <span className="font-syne font-bold text-xl text-white block leading-none">flowi</span>
          <span className="text-[10px] text-white/30 leading-none">Tu dinero, en flujo</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 flex flex-col gap-0.5">
        <p className="text-[9px] font-semibold text-white/25 uppercase tracking-widest px-3 mb-2">
          Menú principal
        </p>
        {navItems.map(({ icon: Icon, label, href, color }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl
                          transition-all duration-200
                          ${active
                            ? 'bg-accent/10 border border-accent/20 text-white'
                            : 'text-white/45 hover:text-white/80 hover:bg-white/4 border border-transparent'
                          }`}
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0
                               transition-colors duration-200
                               ${active ? 'bg-accent/20' : 'bg-white/5 group-hover:bg-white/8'}`}>
                <Icon className="w-3.5 h-3.5"
                      style={{ color: active ? color : undefined }} />
              </div>
              <span className="text-sm font-medium">{label}</span>
              {active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/5">
        <div className="glass-card p-3 rounded-xl text-center">
          <p className="text-[10px] text-white/30">flowi v1.0</p>
          <p className="text-[10px] text-white/20">© 2026</p>
        </div>
      </div>
    </aside>
  );
}
