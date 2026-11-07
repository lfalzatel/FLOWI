'use client';
import { CategoryIcon } from '@/components/CategoryIcon';
import { Account } from '@/lib/firestore';
import { KIND_EMOJI } from '@/lib/accounts';
import { PAYMENT_METHODS, normalizeText } from '@/lib/categories';

// Ícono de una cuenta: el logo real del banco o billetera si se reconoce (igual que en Ingresos
// y Gastos), si no el emoji de su tipo
export function accountLogo(account: Pick<Account, 'name' | 'methods' | 'kind'>): { icon: string; label: string } | null {
  if (account.kind === 'efectivo' || account.kind === 'credito') return null;
  const candidates = [account.name, ...(account.methods || [])].map(normalizeText);
  for (const c of candidates) {
    const hit = PAYMENT_METHODS.find(p => {
      const k = normalizeText(p.label);
      return c === k || c.includes(k) || (k.length > 3 && k.includes(c));
    });
    if (hit && !['efectivo', 'tarjeta debito', 'tarjeta credito', 'transferencia'].includes(normalizeText(hit.label))) {
      return { icon: hit.icon, label: hit.label };
    }
  }
  return null;
}

export function AccountIcon({ account, className = 'w-6 h-6 text-xl flex items-center justify-center' }: {
  account: Pick<Account, 'name' | 'methods' | 'kind'>; className?: string;
}) {
  const logo = accountLogo(account);
  if (logo) return <CategoryIcon icon={logo.icon} label={logo.label} className={className} />;
  return <span className={className}>{KIND_EMOJI[account.kind]}</span>;
}
