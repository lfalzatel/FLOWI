'use client';
import Link from 'next/link';
import { Search, Users, ChevronRight } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useFriends } from '@/components/FriendsProvider';
import { useData } from '@/components/DataProvider';
import { Avatar } from '@/components/friends/Avatar';
import { sharedBalances, personKey } from '@/lib/shared';
import { formatCurrency } from '@/lib/format';

// Inicio: tus amigos en FLOWI, solicitudes nuevas y el atajo para buscar amigos
export function FriendsCard({ currency = 'COP' }: { currency?: string }) {
  const { theme } = useTheme();
  const isTech = theme === 'cyberpunk' || theme === 'kiloCode';
  const { friends, incoming, unavailable } = useFriends();
  const { transactions } = useData();
  if (unavailable) return null;
  // Quién de tus amigos te debe (por nombre, de tus gastos compartidos)
  const owes = sharedBalances(transactions).filter(b => b.net > 0 && friends.some(f => personKey(f.name.split(/\s+/)[0]) === personKey(b.name.split(/\s+/)[0])));
  const box = isTech ? 'rounded-none' : 'rounded-3xl';

  return (
    <div className={`glass-card p-4 space-y-3 ${box} ${isTech ? 'font-mono' : ''}`}>
      <Link href="/amigos" className="flex items-center gap-2">
        <Users className="w-4 h-4 text-accent" />
        <span className={`flex-1 text-sm font-semibold ${isTech ? 'text-accent uppercase tracking-wider' : 'text-text-primary font-syne'}`}>Amigos</span>
        {incoming.length > 0 && (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-accent text-black">
            {incoming.length === 1 ? '1 solicitud' : `${incoming.length} solicitudes`}
          </span>
        )}
        <ChevronRight className="w-4 h-4 text-text-muted" />
      </Link>

      {friends.length > 0 ? (
        <Link href="/amigos" className="flex items-center gap-2">
          <span className="flex -space-x-2">
            {friends.slice(0, 5).map(f => <Avatar key={f.uid} p={f} size={32} isTech={isTech} />)}
          </span>
          <span className="text-xs text-text-muted truncate">
            {friends.length === 1 ? friends[0].name.split(/\s+/)[0] : `${friends.length} amigos`}
          </span>
        </Link>
      ) : (
        <p className="text-xs text-text-muted">Agrega a tus amigos para compartir gastos y cobrarse fácil.</p>
      )}

      {owes.slice(0, 2).map(b => (
        <p key={b.key} className="text-xs text-text-secondary">
          👥 {b.name.split(/\s+/)[0]} te debe <b className="text-accent">{formatCurrency(b.net, currency)}</b>
        </p>
      ))}

      <Link href="/amigos" className={`w-full py-2.5 text-sm font-semibold inline-flex items-center justify-center gap-2 border border-accent/40 text-accent ${isTech ? 'rounded-none' : 'rounded-xl'}`}>
        <Search className="w-4 h-4" /> Buscar amigos
      </Link>
    </div>
  );
}
