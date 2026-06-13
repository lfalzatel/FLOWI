'use client';
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
  
  const [userStats, setUserStats] = useState<{gastos: number, ingresos: number, deudas: number, loading: boolean}>({
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

  const loadUserStats = async (userId: string) => {
    setUserStats(prev => ({ ...prev, loading: true }));
    try {
      const { getUserTransactions, getUserDebts } = await import('@/lib/firestore');
      const [gastosTx, ingresosTx, deudas] = await Promise.all([
        getUserTransactions(userId, 'gasto'),
        getUserTransactions(userId, 'ingreso'),
        getUserDebts(userId)
      ]);
      const totalGastos = gastosTx.reduce((acc, t) => acc + t.amount, 0);
      const totalIngresos = ingresosTx.reduce((acc, t) => acc + t.amount, 0);
      const totalDeudas = deudas.reduce((acc, d) => acc + (d.totalAmount - d.paidAmount), 0);
      
      setUserStats({ gastos: totalGastos, ingresos: totalIngresos, deudas: totalDeudas, loading: false });
    } catch (error) {
      console.error('Error loading stats:', error);
      setUserStats(prev => ({ ...prev, loading: false }));
    }
  };

  const handleSelectUser = (u: UserProfile) => {
    setSelectedUser(u);
    loadUserStats(u.id!);
  };

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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className={`${isTechTheme ? 'bg-black border border-accent rounded-none shadow-[0_0_30px_rgba(0,229,160,0.15)]' : 'bg-[#0A0A0F] border border-white/10 rounded-3xl'} p-6 w-full max-w-md relative animate-fade-in-up max-h-[90vh] overflow-y-auto`}>
        <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>

        {!selectedUser ? (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-10 h-10 ${isTechTheme ? 'rounded-none bg-accent/10 border border-accent/30' : 'rounded-xl bg-accent/10'} flex items-center justify-center`}>
                <Shield className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h2 className={`${isTechTheme ? 'font-mono font-bold text-accent uppercase tracking-widest text-lg' : 'font-syne font-bold text-white text-xl'}`}>
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
                {users.map(u => (
                  <button 
                    key={u.id} 
                    onClick={() => handleSelectUser(u)}
                    className={`w-full text-left ${isTechTheme ? 'bg-black border border-accent/20 rounded-none hover:bg-accent/10' : 'bg-glass rounded-xl border border-glass-border hover:bg-glass-hover'} p-3 flex items-center gap-3 transition-colors`}
                  >
                    <div className={`relative w-10 h-10 overflow-hidden flex-shrink-0 ${isTechTheme ? 'rounded-none' : 'rounded-full'}`}>
                      {u.photoURL ? (
                        <Image src={u.photoURL} alt={u.name || ''} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full bg-glass flex items-center justify-center"><UserIcon className="w-4 h-4 text-text-secondary" /></div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${isTechTheme ? 'font-mono text-white' : 'text-text-primary'}`}>{u.name || 'Sin nombre'}</p>
                      <p className={`text-[10px] truncate ${isTechTheme ? 'font-mono text-accent/50' : 'text-text-muted'}`}>{u.email}</p>
                    </div>

                    <div className="flex-shrink-0">
                      {u.email === currentUserEmail ? (
                        <span className={`text-[10px] px-2 py-1 uppercase tracking-widest font-bold ${isTechTheme ? 'font-mono text-black bg-accent rounded-none' : 'rounded-full bg-accent text-black'}`}>Tú</span>
                      ) : (
                        <span className={`text-[10px] px-2 py-1 uppercase tracking-widest ${isTechTheme ? 'font-mono border border-accent/30 text-accent' : 'bg-glass border border-glass-border text-text-primary rounded-lg'}`}>
                          {u.role || 'Usuario'}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setSelectedUser(null)} className={`w-8 h-8 flex items-center justify-center ${isTechTheme ? 'bg-accent/10 border border-accent/30 rounded-none text-accent' : 'bg-glass rounded-xl text-text-secondary hover:text-white'}`}>
                {'<'}
              </button>
              <div>
                <h2 className={`${isTechTheme ? 'font-mono font-bold text-accent uppercase tracking-widest text-lg' : 'font-syne font-bold text-white text-xl'}`}>
                  {isTechTheme ? '>_ PERFIL_USUARIO' : 'Perfil del Usuario'}
                </h2>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex flex-col items-center">
                <div className={`relative w-20 h-20 overflow-hidden mb-3 ${isTechTheme ? 'rounded-none border border-accent/50' : 'rounded-full'}`}>
                  {selectedUser.photoURL ? (
                    <Image src={selectedUser.photoURL} alt={selectedUser.name || ''} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full bg-glass flex items-center justify-center"><UserIcon className="w-8 h-8 text-text-secondary" /></div>
                  )}
                </div>
                <h3 className={`text-lg font-semibold ${isTechTheme ? 'font-mono text-white' : 'text-text-primary'}`}>{selectedUser.name || 'Sin nombre'}</h3>
                <p className={`text-sm ${isTechTheme ? 'font-mono text-accent/70' : 'text-text-muted'}`}>{selectedUser.email}</p>
                <p className={`text-[10px] mt-1 ${isTechTheme ? 'font-mono text-white/40' : 'text-white/40'}`}>Registrado: {selectedUser.createdAt ? (typeof (selectedUser.createdAt as any).toDate === 'function' ? (selectedUser.createdAt as any).toDate().toLocaleDateString() : (selectedUser.createdAt as Date).toLocaleDateString()) : 'N/A'}</p>
              </div>

              <div className={`p-4 ${isTechTheme ? 'border border-accent/20 bg-accent/5' : 'bg-glass rounded-2xl border border-glass-border'}`}>
                <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 ${isTechTheme ? 'font-mono text-accent' : 'text-text-secondary'}`}>Rol del Sistema</h4>
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${isTechTheme ? 'font-mono text-white' : 'text-text-primary'}`}>Nivel de acceso</span>
                  {selectedUser.email === currentUserEmail ? (
                    <span className={`text-xs px-2 py-1 uppercase tracking-widest font-bold ${isTechTheme ? 'font-mono text-black bg-accent rounded-none' : 'rounded-full bg-accent text-black'}`}>Tú (Administrador)</span>
                  ) : (
                    <select
                      value={selectedUser.role || 'Usuario'}
                      onChange={(e) => handleChangeRole(selectedUser.id!, e.target.value)}
                      disabled={savingId === selectedUser.id}
                      className={`text-sm focus:outline-none cursor-pointer appearance-none px-3 py-1.5 ${isTechTheme ? 'font-mono uppercase tracking-widest border border-accent/30 bg-black text-accent disabled:opacity-50' : 'bg-glass border border-glass-border text-text-primary rounded-xl disabled:opacity-50'}`}
                    >
                      <option value="Usuario">Usuario</option>
                      <option value="admin">Administrador</option>
                    </select>
                  )}
                </div>
              </div>

              <div className={`p-4 ${isTechTheme ? 'border border-accent/20 bg-accent/5' : 'bg-glass rounded-2xl border border-glass-border'}`}>
                <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 ${isTechTheme ? 'font-mono text-accent' : 'text-text-secondary'}`}>Estadísticas Financieras</h4>
                {userStats.loading ? (
                  <div className="flex justify-center py-4">
                    <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className={`text-[10px] uppercase tracking-wider ${isTechTheme ? 'font-mono text-white/50' : 'text-text-muted'}`}>Ingresos</p>
                      <p className={`text-sm font-semibold text-green-400 ${isTechTheme ? 'font-mono' : ''}`}>${userStats.ingresos.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className={`text-[10px] uppercase tracking-wider ${isTechTheme ? 'font-mono text-white/50' : 'text-text-muted'}`}>Gastos</p>
                      <p className={`text-sm font-semibold text-red-400 ${isTechTheme ? 'font-mono' : ''}`}>${userStats.gastos.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className={`text-[10px] uppercase tracking-wider ${isTechTheme ? 'font-mono text-white/50' : 'text-text-muted'}`}>Deudas</p>
                      <p className={`text-sm font-semibold text-orange-400 ${isTechTheme ? 'font-mono' : ''}`}>${userStats.deudas.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className={`text-[10px] uppercase tracking-wider ${isTechTheme ? 'font-mono text-white/50' : 'text-text-muted'}`}>Balance</p>
                      <p className={`text-sm font-semibold text-accent ${isTechTheme ? 'font-mono' : ''}`}>${(userStats.ingresos - userStats.gastos - userStats.deudas).toLocaleString()}</p>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </>
        )}
      </div>
    </div>
  );
}
