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

  const handleChangeRole = async (userId: string, newRole: string) => {
    setSavingId(userId);
    try {
      await updateUserProfile(userId, { role: newRole });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
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
              <div key={u.id} className={`${isTechTheme ? 'bg-black border border-accent/20 rounded-none' : 'bg-glass rounded-xl border border-glass-border'} p-3 flex items-center gap-3`}>
                <div className={`relative w-10 h-10 overflow-hidden ${isTechTheme ? 'rounded-none' : 'rounded-full'}`}>
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
                    <select
                      value={u.role || 'Usuario'}
                      onChange={(e) => handleChangeRole(u.id!, e.target.value)}
                      disabled={savingId === u.id}
                      className={`text-xs focus:outline-none cursor-pointer appearance-none px-2 py-1 ${isTechTheme ? 'font-mono uppercase tracking-widest border border-accent/30 bg-black text-accent disabled:opacity-50' : 'bg-glass border border-glass-border text-text-primary rounded-lg disabled:opacity-50'}`}
                    >
                      <option value="Usuario">Usuario</option>
                      <option value="admin">Administrador</option>
                    </select>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
