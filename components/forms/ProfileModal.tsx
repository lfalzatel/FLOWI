'use client';
import { useState, useEffect, useRef } from 'react';
import { X, LogOut, User as UserIcon, Phone, Camera, Trash2 } from 'lucide-react';
import { AnimatedNumber } from '@/components/dashboard/AnimatedNumber';
import { DateFilter, type FilterType } from '@/components/dashboard/DateFilter';
import { getISOWeekString, getLocalDateString } from '@/lib/dateUtils';
import { formatCurrency } from '@/lib/format';
import type { Transaction } from '@/lib/firestore';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from '@/lib/auth';
import { updateUserProfile } from '@/lib/firestore';
import { useTheme } from '@/components/ThemeProvider';
interface Props {
  onClose: () => void;
}

export function ProfileModal({ onClose }: Props) {
  const { user, profile } = useAuth();
  const [phone, setPhone] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { theme } = useTheme();
  const isCyberpunk = theme === 'cyberpunk' || theme === 'kiloCode';

  const [userStats, setUserStats] = useState<{gastos: number, ingresos: number, deudas: number, loading: boolean}>({
    gastos: 0, ingresos: 0, deudas: 0, loading: true
  });
  // Movimientos para filtrar por todo / mes / semana / día como en Inicio
  const [userTx, setUserTx] = useState<Transaction[]>([]);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterValue, setFilterValue] = useState('');

  useEffect(() => {
    if (profile && 'phone' in profile) {
      setPhone((profile as any).phone || '');
    }
  }, [profile]);

  // Bloquear scroll de fondo
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    
    html.style.overflow = 'hidden';
    html.style.height = '100%';
    body.style.overflow = 'hidden';
    body.style.height = '100%';

    return () => {
      html.style.overflow = '';
      html.style.height = '';
      body.style.overflow = '';
      body.style.height = '';
    };
  }, []);

  useEffect(() => {
    if (user?.uid) {
      loadUserStats(user.uid);
    }
  }, [user]);

  const loadUserStats = async (userId: string) => {
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
      
      setUserTx([...gastosTx, ...ingresosTx]);
      setUserStats({ gastos: totalGastos, ingresos: totalIngresos, deudas: totalDeudas, loading: false });
    } catch (error) {
      console.error('Error loading stats:', error);
      setUserStats(prev => ({ ...prev, loading: false }));
    }
  };

  const txDate = (t: Transaction) => ((t.date as any)?.toDate ? (t.date as any).toDate() : new Date(t.date as any));
  const periodTx = userTx.filter(t => {
    if (filterType === 'all') return true;
    const d = txDate(t);
    const day = getLocalDateString(d);
    if (filterType === 'month') return day.startsWith(filterValue);
    if (filterType === 'week') return getISOWeekString(d) === filterValue;
    return day === filterValue;
  });
  const periodIngresos = periodTx.filter(t => t.type === 'ingreso').reduce((a, t) => a + t.amount, 0);
  const periodGastos = periodTx.filter(t => t.type === 'gasto').reduce((a, t) => a + t.amount, 0);
  const money = (n: number) => formatCurrency(Math.round(n), 'COP');

  // Racha: días seguidos con al menos un registro (igual que en Estadísticas)
  const streak = (() => {
    const days = new Set(userTx.map(t => txDate(t).toDateString()));
    let n = 0;
    const d = new Date();
    if (!days.has(d.toDateString())) d.setDate(d.getDate() - 1);
    while (days.has(d.toDateString())) { n++; d.setDate(d.getDate() - 1); }
    return n;
  })();

  const handleSignOut = async () => {
    try {
      await signOut();
      onClose();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleSavePhone = async () => {
    if (!user) return;
    setSavingPhone(true);
    try {
      await updateUserProfile(user.uid, { phone });
      alert('Teléfono actualizado');
    } catch (error) {
      console.error('Error saving phone:', error);
      alert('Error al guardar el teléfono');
    } finally {
      setSavingPhone(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validar tamaño máximo de 500KB para no saturar Firestore
    if (file.size > 500 * 1024) {
      alert('La imagen es muy pesada. Por favor elige una de menos de 500 KB.');
      return;
    }

    setUploadingPhoto(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        await updateUserProfile(user.uid, { photoURL: base64String });
        alert('Foto de perfil actualizada correctamente.');
        setUploadingPhoto(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error saving photo:', error);
      alert('Error al guardar la foto');
      setUploadingPhoto(false);
    }
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteAccountClick = () => {
    setShowDeleteConfirm(true);
  };

  const executeDeleteAccount = async () => {
    if (!user) return;

    try {
      await user.delete();
      alert('Cuenta eliminada correctamente');
      onClose();
    } catch (error: any) {
      console.error('Error deleting account:', error);
      if (error.code === 'auth/requires-recent-login') {
        alert('Por seguridad, debes haber iniciado sesión recientemente para realizar esta acción. Por favor, cierra sesión e inicia sesión de nuevo.');
      } else {
        alert('Error al eliminar la cuenta. Por favor, intenta cerrar sesión e iniciar sesión de nuevo.');
      }
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 ${isCyberpunk ? 'font-mono uppercase text-sm' : ''}`}>
      <div className={`absolute inset-0 ${theme === 'light' ? 'bg-black/10 backdrop-blur-[2px]' : 'bg-black/40 backdrop-blur-sm'}`} onClick={onClose} aria-hidden="true" />
      <div
        className={`w-full max-w-md relative z-10 animate-fade-in-up max-h-[95vh] overflow-y-auto p-5 glass-dropdown ${isCyberpunk ? 'rounded-none border border-accent/50' : 'rounded-3xl'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} aria-label="Cerrar" className={`absolute top-4 right-4 transition-colors ${isCyberpunk ? 'text-accent hover:text-accent/70' : 'text-text-secondary hover:text-text-primary'}`}>
          <X className="w-5 h-5" />
        </button>

        <h2 className={`${isCyberpunk ? 'font-mono font-bold text-accent uppercase tracking-widest' : 'font-syne font-bold text-text-primary'} text-lg mb-3`}>
          {isCyberpunk ? '>_ MI_PERFIL' : 'Mi Perfil'}
        </h2>

        <div className="space-y-3">
          {/* Encabezado: foto a la izquierda; nombre, correo y rol a la derecha */}
          <div className="flex items-center gap-3">
            <div
              className={`relative w-16 h-16 shrink-0 cursor-pointer group ${isCyberpunk ? 'rounded-none' : 'rounded-full'}`}
              onClick={() => fileInputRef.current?.click()}
              title="Cambiar foto"
            >
              {user?.photoURL ? (
                <Image src={user.photoURL} alt={user.displayName || 'Usuario'} fill
                  className={`${isCyberpunk ? 'rounded-none' : 'rounded-full'} border-2 border-accent object-cover group-hover:opacity-75 transition-opacity`} />
              ) : (
                <div className={`w-16 h-16 ${isCyberpunk ? 'rounded-none border border-accent/30 bg-accent/5' : 'rounded-full border-2 border-glass-border bg-glass'} flex items-center justify-center`}>
                  <UserIcon className={`w-8 h-8 ${isCyberpunk ? 'text-accent/50' : 'text-text-muted'}`} />
                </div>
              )}
              <div className={`absolute -bottom-1 -right-1 w-6 h-6 flex items-center justify-center bg-accent text-black ${isCyberpunk ? 'rounded-none' : 'rounded-full'}`}>
                <Camera className="w-3.5 h-3.5" />
              </div>
              {uploadingPhoto && (
                <div className={`absolute inset-0 bg-black/80 flex items-center justify-center ${isCyberpunk ? 'rounded-none' : 'rounded-full'}`}>
                  <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            <div className="min-w-0 flex-1 pr-6">
              <h3 className={`${isCyberpunk ? 'font-mono text-accent tracking-wide uppercase' : 'font-syne text-text-primary'} font-bold text-base truncate`}>{user?.displayName || 'Usuario'}</h3>
              <p className={`truncate ${isCyberpunk ? 'font-mono text-accent/60 text-[11px]' : 'text-text-secondary text-xs'}`}>{user?.email}</p>
              <span className={`inline-block mt-1 bg-accent/15 text-accent border border-accent/40 text-[10px] uppercase font-bold px-2 py-0.5 ${isCyberpunk ? 'rounded-none font-mono tracking-widest' : 'rounded-full'}`}>
                {profile?.role === 'admin' ? 'Propietario' : 'Usuario'}
              </span>
            </div>
          </div>

          {/* Teléfono */}
          <div className={`${isCyberpunk ? 'bg-black border border-accent/20 rounded-none' : 'bg-glass border border-glass-border rounded-xl'} px-3 py-2 flex items-center gap-3`}>
            <Phone className="w-4 h-4 text-accent shrink-0" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={`flex-1 min-w-0 bg-transparent text-sm font-medium focus:outline-none ${isCyberpunk ? 'font-mono text-accent placeholder:text-accent/30' : 'text-text-primary'}`}
              placeholder="Ingresa tu teléfono"
              aria-label="Teléfono"
            />
            <button
              onClick={handleSavePhone}
              disabled={savingPhone}
              className={`text-xs font-semibold disabled:opacity-50 transition-colors ${isCyberpunk ? 'font-mono text-accent border border-accent px-2 py-1 uppercase tracking-wider hover:bg-accent hover:text-black' : 'text-accent hover:underline'}`}
            >
              {savingPhone ? (isCyberpunk ? '...' : 'Guardando...') : (isCyberpunk ? 'OK' : 'Guardar')}
            </button>
          </div>

          {/* Días usando FLOWI y racha, lado a lado */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`p-3 flex items-center gap-2 ${isCyberpunk ? 'border border-accent/20 bg-accent/5' : 'bg-glass rounded-2xl border border-glass-border'}`}>
              <span className="text-xl">📅</span>
              <div className="min-w-0">
                <p className={`text-[10px] uppercase tracking-wider leading-tight ${isCyberpunk ? 'font-mono text-accent/60' : 'text-text-muted'}`}>Días usando FLOWI</p>
                <p className={`text-base font-bold ${isCyberpunk ? 'font-mono text-accent' : 'text-text-primary'}`}>
                  <AnimatedNumber value={profile?.activeDays ?? 0} /> {(profile?.activeDays ?? 0) === 1 ? 'día' : 'días'}
                </p>
              </div>
            </div>
            <div className={`p-3 flex items-center gap-2 ${isCyberpunk ? 'border border-accent/20 bg-accent/5' : 'bg-glass rounded-2xl border border-glass-border'}`}>
              <span className="text-xl">🔥</span>
              <div className="min-w-0">
                <p className={`text-[10px] uppercase tracking-wider leading-tight ${isCyberpunk ? 'font-mono text-accent/60' : 'text-text-muted'}`}>Racha actual</p>
                <p className={`text-base font-bold ${isCyberpunk ? 'font-mono text-accent' : 'text-text-primary'}`}>
                  {userStats.loading ? '…' : <><AnimatedNumber value={streak} /> {streak === 1 ? 'día' : 'días'}</>}
                </p>
              </div>
            </div>
          </div>

          {/* Filtro igual al de Inicio */}
          <DateFilter inline filterType={filterType} filterValue={filterValue} transactions={userTx}
                      onChangeType={setFilterType} onChangeValue={setFilterValue} />

          {/* Finanzas del periodo */}
          <div className={`p-3 ${isCyberpunk ? 'border border-accent/20 bg-accent/5' : 'bg-glass rounded-2xl border border-glass-border'}`}>
            {userStats.loading ? (
              <div className="flex justify-center py-3">
                <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                <div>
                  <p className={`text-[10px] uppercase tracking-wider ${isCyberpunk ? 'font-mono text-accent/50' : 'text-text-muted'}`}>Ingresos</p>
                  <p className={`text-sm font-semibold text-green-400 ${isCyberpunk ? 'font-mono' : ''}`}><AnimatedNumber value={periodIngresos} format={money} /></p>
                </div>
                <div>
                  <p className={`text-[10px] uppercase tracking-wider ${isCyberpunk ? 'font-mono text-accent/50' : 'text-text-muted'}`}>Gastos</p>
                  <p className={`text-sm font-semibold text-red-400 ${isCyberpunk ? 'font-mono' : ''}`}><AnimatedNumber value={periodGastos} format={money} /></p>
                </div>
                <div>
                  <p className={`text-[10px] uppercase tracking-wider ${isCyberpunk ? 'font-mono text-accent/50' : 'text-text-muted'}`}>Balance</p>
                  <p className={`text-sm font-semibold text-accent ${isCyberpunk ? 'font-mono' : ''}`}>{periodIngresos - periodGastos < 0 ? '−' : ''}<AnimatedNumber value={Math.abs(periodIngresos - periodGastos)} format={money} /></p>
                </div>
                <div>
                  <p className={`text-[10px] uppercase tracking-wider ${isCyberpunk ? 'font-mono text-accent/50' : 'text-text-muted'}`}>Deudas hoy</p>
                  <p className={`text-sm font-semibold text-orange-400 ${isCyberpunk ? 'font-mono' : ''}`}><AnimatedNumber value={userStats.deudas} format={money} /></p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleSignOut}
              className={`w-full font-bold py-3 transition-all flex items-center justify-center gap-2 text-sm ${isCyberpunk ? 'bg-transparent border border-white text-white rounded-none uppercase font-mono tracking-widest hover:bg-white hover:text-black' : 'bg-glass border border-glass-border text-text-primary rounded-xl hover:bg-glass-hover active:scale-[0.98]'}`}
            >
              <LogOut className="w-4 h-4" />
              {isCyberpunk ? 'SALIR' : 'Cerrar sesión'}
            </button>
            <button
              onClick={handleDeleteAccountClick}
              className={`w-full font-bold py-3 transition-all flex items-center justify-center gap-2 text-sm ${isCyberpunk ? 'bg-black border border-red-500/50 text-red-500 rounded-none uppercase font-mono tracking-widest hover:bg-red-500/10' : 'bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl hover:bg-red-500/20 active:scale-[0.98]'}`}
            >
              <Trash2 className="w-4 h-4" />
              {isCyberpunk ? 'ELIMINAR' : 'Eliminar cuenta'}
            </button>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className={`${isCyberpunk ? 'bg-black border-2 rounded-none shadow-[0_0_50px_rgba(239,68,68,0.3)]' : 'bg-card border-2 rounded-3xl'} border-red-500 p-8 max-w-sm w-full text-center animate-fade-in-up`}>
            <h3 className={`text-red-500 text-xl font-bold mb-4 uppercase ${isCyberpunk ? 'font-mono tracking-widest' : 'font-syne'}`}>
              {isCyberpunk ? '>_ ADVERTENCIA_CRITICA' : 'Advertencia Crítica'}
            </h3>
            <p className={`text-sm mb-8 leading-relaxed ${isCyberpunk ? 'font-mono text-white/80' : 'text-text-secondary'}`}>
              ESTA ACCIÓN ES IRREVERSIBLE. SE BORRARÁN TODOS TUS DATOS DE MANERA PERMANENTE. ¿CONFIRMAR ELIMINACIÓN DE CUENTA?
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={executeDeleteAccount}
                className={`w-full bg-red-500/10 border border-red-500 text-red-500 font-bold uppercase py-3 transition-colors ${isCyberpunk ? 'font-mono tracking-widest hover:bg-red-500 hover:text-black' : 'rounded-xl hover:bg-red-500/20'}`}
              >
                {isCyberpunk ? '>_ CONFIRMAR_PURGA' : 'Confirmar Eliminación'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className={`w-full bg-transparent border font-bold uppercase py-3 transition-colors ${isCyberpunk ? 'border-white/30 text-white/70 font-mono tracking-widest hover:bg-white/10' : 'border-glass-border text-text-secondary rounded-xl hover:bg-glass-hover'}`}
              >
                {isCyberpunk ? '>_ ABORTAR' : 'Cancelar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
