'use client';
import { AnimatedNumber } from '@/components/dashboard/AnimatedNumber';
import { DateFilter, type FilterType } from '@/components/dashboard/DateFilter';
import { getISOWeekString, getLocalDateString } from '@/lib/dateUtils';
import { formatCurrency } from '@/lib/format';
import type { Transaction } from '@/lib/firestore';
import { useState, useEffect } from 'react';
import { X, Shield, User as UserIcon } from 'lucide-react';
import Image from 'next/image';
import { useTheme } from '@/components/ThemeProvider';
import { getAllUsers, updateUserProfile, UserProfile } from '@/lib/firestore';

interface Props {
  onClose: () => void;
  currentUserEmail?: string;
}

export function ManageUsersModal({ onClose, currentUserEmail }: Props) {
  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  
  const [userStats, setUserStats] = useState<{gastos: number, ingresos: number, deudas: number, loading: boolean, error?: boolean, txCount?: number, txDays?: number, firstTx?: Date | null, lastTx?: Date | null}>({
    gastos: 0, ingresos: 0, deudas: 0, loading: false
  });

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'auto'; };
  }, []);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  // Movimientos y deudas del usuario abierto, para filtrar por todo / mes / semana / día como en Inicio
  const [userTx, setUserTx] = useState<Transaction[]>([]);
  const [userDebt, setUserDebt] = useState(0);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterValue, setFilterValue] = useState('');

  const loadUserStats = async (userId: string) => {
    setUserStats(prev => ({ ...prev, loading: true, error: false }));
    try {
      const { getUserTransactions, getUserDebts, calculateDebtInterest } = await import('@/lib/firestore');
      const [gastosTx, ingresosTx, deudas] = await Promise.all([
        getUserTransactions(userId, 'gasto'),
        getUserTransactions(userId, 'ingreso'),
        getUserDebts(userId)
      ]);
      const totalGastos = gastosTx.reduce((acc, t) => acc + t.amount, 0);
      const totalIngresos = ingresosTx.reduce((acc, t) => acc + t.amount, 0);
      const totalDeudas = deudas.filter(d => d.status === 'pending' && d.direction !== 'me_deben').reduce((acc, d) => acc + Math.max(0, d.totalAmount - d.paidAmount) + calculateDebtInterest(d).accumulatedInterest, 0);
      
      // Actividad calculada desde sus movimientos (el administrador puede leerlos)
      const dates = [...gastosTx, ...ingresosTx]
        .map(t => ((t.date as any)?.toDate ? (t.date as any).toDate() : new Date(t.date as any)))
        .filter((d: Date) => !isNaN(d.getTime()) && d.getTime() <= Date.now());
      const days = new Set(dates.map((d: Date) => d.toDateString()));
      const times = dates.map((d: Date) => d.getTime());
      setUserTx([...gastosTx, ...ingresosTx]);
      setUserDebt(totalDeudas);
      setFilterType('all');
      setFilterValue('');
      setUserStats({
        gastos: totalGastos, ingresos: totalIngresos, deudas: totalDeudas, loading: false,
        txCount: gastosTx.length + ingresosTx.length, txDays: days.size,
        firstTx: times.length ? new Date(Math.min(...times)) : null,
        lastTx: times.length ? new Date(Math.max(...times)) : null,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      setUserStats(prev => ({ ...prev, loading: false, error: true }));
    }
  };

  const handleSelectUser = (u: UserProfile) => {
    setSelectedUser(u);
    loadUserStats(u.id!); // el administrador puede leer los totales de cada usuario
  };

  const periodTx = userTx.filter(t => {
    if (filterType === 'all') return true;
    const d = (t.date as any)?.toDate ? (t.date as any).toDate() : new Date(t.date as any);
    const day = getLocalDateString(d);
    if (filterType === 'month') return day.startsWith(filterValue);
    if (filterType === 'week') return getISOWeekString(d) === filterValue;
    return day === filterValue;
  });
  const periodIngresos = periodTx.filter(t => t.type === 'ingreso').reduce((a, t) => a + t.amount, 0);
  const periodGastos = periodTx.filter(t => t.type === 'gasto').reduce((a, t) => a + t.amount, 0);
  const money = (n: number) => formatCurrency(Math.round(n), 'COP');

  const handleChangeRole = async (userId: string, newRole: string) => {
    setSavingId(userId);
    try {
      await updateUserProfile(userId, { role: newRole });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser(prev => prev ? { ...prev, role: newRole } : null);
      }
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Error al actualizar el rol.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 ${isTechTheme ? 'font-mono uppercase text-sm' : ''}`}>
      <div className={`absolute inset-0 ${theme === 'light' ? 'bg-black/10 backdrop-blur-[2px]' : 'bg-black/40 backdrop-blur-sm'}`} onClick={onClose} aria-hidden="true" />
      <div 
        className={`w-full max-w-md relative z-10 animate-fade-in-up max-h-[95vh] overflow-y-auto p-6 glass-dropdown ${isTechTheme ? 'rounded-none border border-accent/50' : 'rounded-3xl'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={() => {
            if (selectedUser) {
              setSelectedUser(null);
            } else {
              onClose();
            }
          }} 
          className={`absolute top-4 right-4 transition-colors ${isTechTheme ? 'text-accent hover:text-accent/70' : 'text-text-secondary hover:text-text-primary'}`}
        >
          <X className="w-5 h-5" />
        </button>

        {!selectedUser ? (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-10 h-10 ${isTechTheme ? 'rounded-none bg-accent/10 border border-accent/30' : 'rounded-xl bg-accent/10'} flex items-center justify-center`}>
                <Shield className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h2 className={`${isTechTheme ? 'font-mono font-bold text-accent uppercase tracking-widest text-lg' : 'font-syne font-bold text-text-primary text-xl'}`}>
                  {isTechTheme ? '>_ GESTION_USUARIOS' : 'Gestión de Usuarios'}
                </h2>
                <p className={`text-xs ${isTechTheme ? 'font-mono text-accent/50' : 'text-text-muted'}`}>Administra el acceso y roles</p>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-3">
                {users.map(u => {
                  const displayName = u.name || (u.email ? u.email.split('@')[0] : 'Usuario');
                  const initials = displayName
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase();
                  
                  // Generar un color de fondo consistente basado en el nombre
                  const colors = ['bg-[#FF5B5B]/20 text-[#FF5B5B]', 'bg-[#F5A623]/20 text-[#F5A623]', 'bg-[#A855F7]/20 text-[#A855F7]', 'bg-[#00E5A0]/20 text-[#00E5A0]', 'bg-[#3B82F6]/20 text-[#3B82F6]', 'bg-[#EC4899]/20 text-[#EC4899]'];
                  const colorIndex = displayName.length % colors.length;
                  const avatarColorClass = colors[colorIndex];

                  return (
                    <button 
                      key={u.id} 
                      onClick={() => handleSelectUser(u)}
                      className={`w-full text-left ${isTechTheme ? 'bg-black border border-accent/20 rounded-none hover:bg-accent/10' : 'bg-glass rounded-xl border border-glass-border hover:bg-glass-hover'} p-3 flex items-center gap-3 transition-colors`}
                    >
                      <div className={`relative w-10 h-10 overflow-hidden flex-shrink-0 flex items-center justify-center font-bold text-sm ${isTechTheme ? 'rounded-none border border-accent/30' : 'rounded-full'} ${!u.photoURL ? avatarColorClass : ''}`}>
                        {u.photoURL ? (
                          <Image src={u.photoURL} alt={displayName} fill className="object-cover" />
                        ) : (
                          <span>{initials}</span>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${isTechTheme ? 'font-mono text-white' : 'text-text-primary'}`}>{displayName}</p>
                        <p className={`text-[10px] truncate ${isTechTheme ? 'font-mono text-accent/50' : 'text-text-muted'}`}>{u.email}</p>
                        {(u.activeDays ?? 0) > 0 && (
                          <p className={`text-[10px] ${isTechTheme ? 'font-mono text-accent' : 'text-accent'}`}>📅 {u.activeDays} {u.activeDays === 1 ? 'día' : 'días'} de uso{typeof u.txCount === 'number' ? ` · ${u.txCount} registros` : ''}{u.lastActiveDay ? ` · último: ${new Date(u.lastActiveDay + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}` : ''}</p>
                        )}
                      </div>

                      <div className="flex-shrink-0">
                        {u.email === currentUserEmail ? (
                          <span className={`text-[10px] px-2 py-1 uppercase tracking-widest font-bold ${isTechTheme ? 'font-mono text-black bg-accent rounded-none' : 'rounded-full bg-accent text-black'}`}>Tú</span>
                        ) : (
                          <span className={`text-[10px] px-2 py-1 uppercase tracking-widest ${isTechTheme ? 'font-mono border border-accent/30 text-accent' : 'bg-glass border border-glass-border text-text-primary rounded-lg'}`}>
                            {u.role === 'admin' ? 'ADMIN' : 'USUARIO'}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <>
            {(() => {
              const displayName = selectedUser.name || (selectedUser.email ? selectedUser.email.split('@')[0] : 'Usuario');
              const initials = displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
              const colors = ['bg-[#FF5B5B]/20 text-[#FF5B5B]', 'bg-[#F5A623]/20 text-[#F5A623]', 'bg-[#A855F7]/20 text-[#A855F7]', 'bg-[#00E5A0]/20 text-[#00E5A0]', 'bg-[#3B82F6]/20 text-[#3B82F6]', 'bg-[#EC4899]/20 text-[#EC4899]'];
              const avatarColorClass = colors[displayName.length % colors.length];
              const created = selectedUser.createdAt ? (typeof (selectedUser.createdAt as any).toDate === 'function' ? (selectedUser.createdAt as any).toDate() : selectedUser.createdAt as Date) : null;
              const box = `p-3 ${isTechTheme ? 'border border-accent/20 bg-accent/5' : 'bg-glass rounded-2xl border border-glass-border'}`;
              const lbl = `text-[10px] uppercase tracking-wider ${isTechTheme ? 'font-mono text-white/50' : 'text-text-muted'}`;
              const val = `text-sm font-semibold ${isTechTheme ? 'font-mono' : ''}`;
              const isMe = selectedUser.email === currentUserEmail;
              const isAdmin = selectedUser.role === 'admin';
              const roleChip = (on: boolean) => `px-3 py-1.5 text-xs font-semibold border transition-all active:scale-95 disabled:opacity-50 ${isTechTheme ? 'rounded-none font-mono uppercase' : 'rounded-xl'} ${
                on ? 'bg-accent/15 border-accent text-accent' : 'border-glass-border text-text-secondary hover:text-text-primary'}`;
              const fmtDay = (d?: Date | null) => d ? d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
              const last = userStats.lastTx ?? (selectedUser.lastTxDay ? new Date(selectedUser.lastTxDay + 'T12:00:00') : null);
              const periodLabel = filterType === 'all' ? 'Todo el tiempo' : filterType === 'month' ? 'Este periodo (mes)' : filterType === 'week' ? 'Este periodo (semana)' : 'Este día';

              return (
                <div className="space-y-3">
                  {/* Encabezado compacto: volver, foto, nombre y datos en una fila */}
                  <div className="flex items-center gap-3">
                    <button onClick={() => setSelectedUser(null)} aria-label="Volver a la lista"
                            className={`shrink-0 w-8 h-8 flex items-center justify-center ${isTechTheme ? 'bg-accent/10 border border-accent/30 rounded-none text-accent' : 'bg-glass rounded-xl text-text-secondary hover:text-white'}`}>
                      {'<'}
                    </button>
                    <div className={`relative w-12 h-12 shrink-0 overflow-hidden flex items-center justify-center font-bold ${isTechTheme ? 'rounded-none border border-accent/50' : 'rounded-full'} ${!selectedUser.photoURL ? avatarColorClass : ''}`}>
                      {selectedUser.photoURL ? <Image src={selectedUser.photoURL} alt={displayName} fill className="object-cover" /> : <span>{initials}</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className={`text-sm font-semibold truncate ${isTechTheme ? 'font-mono text-white' : 'text-text-primary'}`}>{displayName}</h3>
                      <p className={`text-[11px] truncate ${isTechTheme ? 'font-mono text-accent/70' : 'text-text-muted'}`}>{selectedUser.email}</p>
                      <p className="text-[10px] text-text-muted">Registrado: {fmtDay(created)}{selectedUser.phone ? ` · ${selectedUser.phone}` : ''}</p>
                    </div>
                  </div>

                  {/* Rol con botones (sin la lista blanca del sistema) */}
                  <div className={`${box} flex items-center justify-between gap-2`}>
                    <span className={lbl}>Rol</span>
                    {isMe ? (
                      <span className={`text-xs px-2 py-1 uppercase tracking-widest font-bold ${isTechTheme ? 'font-mono text-black bg-accent rounded-none' : 'rounded-full bg-accent text-black'}`}>Tú (Administrador)</span>
                    ) : (
                      <div className="flex gap-1.5">
                        <button type="button" disabled={savingId === selectedUser.id || !isAdmin} onClick={() => handleChangeRole(selectedUser.id!, 'Usuario')} className={roleChip(!isAdmin)}>Usuario</button>
                        <button type="button" disabled={savingId === selectedUser.id || isAdmin} onClick={() => handleChangeRole(selectedUser.id!, 'admin')} className={roleChip(isAdmin)}>Administrador</button>
                      </div>
                    )}
                  </div>

                  {/* Filtro igual al de Inicio */}
                  <DateFilter inline filterType={filterType} filterValue={filterValue} transactions={userTx}
                              onChangeType={setFilterType} onChangeValue={setFilterValue} />

                  {/* Finanzas del periodo */}
                  <div className={box}>
                    <p className={`${lbl} mb-2`}>Finanzas · {periodLabel}</p>
                    {userStats.error ? (
                      <p className="text-xs text-amber-500 leading-snug">No hay acceso a los montos de este usuario. Falta publicar la regla de Firestore que permite al administrador leerlos.</p>
                    ) : userStats.loading ? (
                      <div className="flex justify-center py-3"><div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>
                    ) : (
                      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                        <div><p className={lbl}>Ingresos</p><p className={`${val} text-green-400`}><AnimatedNumber value={periodIngresos} format={money} /></p></div>
                        <div><p className={lbl}>Gastos</p><p className={`${val} text-red-400`}><AnimatedNumber value={periodGastos} format={money} /></p></div>
                        <div><p className={lbl}>Balance</p><p className={`${val} text-accent`}>{periodIngresos - periodGastos < 0 ? '−' : ''}<AnimatedNumber value={Math.abs(periodIngresos - periodGastos)} format={money} /></p></div>
                        <div><p className={lbl}>Deudas hoy</p><p className={`${val} text-orange-400`}><AnimatedNumber value={userDebt} format={money} /></p></div>
                      </div>
                    )}
                  </div>

                  {/* Actividad */}
                  <div className={box}>
                    <p className={`${lbl} mb-2`}>Actividad</p>
                    <div className="grid grid-cols-3 gap-x-2 gap-y-2">
                      <div><p className={lbl}>Registros</p><p className={`${val} text-text-primary`}>{userStats.loading ? '…' : (filterType === 'all' ? (userStats.txCount ?? '—') : periodTx.length)}</p></div>
                      <div><p className={lbl}>Días con registros</p><p className={`${val} text-text-primary`}>{userStats.loading ? '…' : (userStats.txDays ?? '—')}</p></div>
                      <div><p className={lbl}>Días en la app</p><p className={`${val} text-text-primary`}>{selectedUser.activeDays ?? '—'}</p></div>
                      <div><p className={lbl}>Primer registro</p><p className={`${val} text-text-primary text-xs`}>{fmtDay(userStats.firstTx)}</p></div>
                      <div><p className={lbl}>Último registro</p><p className={`${val} text-text-primary text-xs`}>{fmtDay(last)}</p></div>
                      <div><p className={lbl}>Último uso</p><p className={`${val} text-text-primary text-xs`}>{selectedUser.lastActiveDay ? fmtDay(new Date(selectedUser.lastActiveDay + 'T12:00:00')) : '—'}</p></div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
}
