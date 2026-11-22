'use client';
import { useState } from 'react';

// Foto de un amigo (o su inicial si no tiene foto o no carga)
export function Avatar({ p, size = 40, isTech }: { p: { name: string; photo?: string | null }; size?: number; isTech?: boolean }) {
  const [broken, setBroken] = useState(false);
  const style = { width: size, height: size };
  return p.photo && !broken
    ? <img src={p.photo} alt="" style={style} referrerPolicy="no-referrer" onError={() => setBroken(true)}
           className={`object-cover shrink-0 ${isTech ? 'rounded-none border border-accent/30' : 'rounded-full'}`} />
    : <span style={style} className={`shrink-0 flex items-center justify-center font-bold text-sm ${isTech ? 'rounded-none border border-accent/30 text-accent' : 'rounded-full bg-accent/15 text-accent'}`}>
        {(p.name || '?').charAt(0).toUpperCase()}
      </span>;
}
