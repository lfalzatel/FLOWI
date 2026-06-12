'use client';
import { useState, useEffect, useRef } from 'react';
import { X, LogOut, Shield, Mail, User as UserIcon, Phone, Camera, Trash2 } from 'lucide-react';
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

  useEffect(() => {
    if (profile && 'phone' in profile) {
      setPhone((profile as any).phone || '');
    }
  }, [profile]);

  // Bloquear scroll de fondo
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

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

  const handleDeleteAccount = async () => {
    if (!user) return;
    if (!window.confirm('⚠️ AVISO DE SEGURIDAD ⚠️\n\nEsta acción es IRREVERSIBLE. Se borrarán todos tus datos y perderás el acceso. ¿Estás COMPLETAMENTE SEGURO de que quieres eliminar tu cuenta?')) return;

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
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className={`${isCyberpunk ? 'bg-black border border-accent rounded-none shadow-[0_0_30px_rgba(0,229,160,0.15)]' : 'bg-[#0A0A0F] border border-white/10 rounded-3xl'} p-6 w-full max-w-md relative animate-fade-in-up max-h-[95vh] overflow-y-auto`}>
        <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>

        <h2 className={`${isCyberpunk ? 'font-mono font-bold text-accent uppercase tracking-widest' : 'font-syne font-bold text-white'} text-xl mb-6`}>
          {isCyberpunk ? '>_ MI_PERFIL' : 'Mi Perfil'}
        </h2>

        <div className="flex flex-col items-center mb-6">
          <div 
            className={`relative w-24 h-24 mb-4 cursor-pointer group ${isCyberpunk ? 'rounded-none' : 'rounded-full'}`}
            onClick={() => fileInputRef.current?.click()}
          >
            {user?.photoURL ? (
              <Image
                src={user.photoURL}
                alt={user.displayName || 'Usuario'}
                fill
                className={`${isCyberpunk ? 'rounded-none border-2 border-accent' : 'rounded-full border-2 border-accent'} object-cover group-hover:opacity-75 transition-opacity`}
              />
            ) : (
              <div className={`w-24 h-24 ${isCyberpunk ? 'rounded-none border border-accent/30 bg-accent/5' : 'rounded-full border-2 border-white/10 bg-white/5'} flex items-center justify-center group-hover:bg-white/10 transition-colors`}>
                <UserIcon className={`w-12 h-12 ${isCyberpunk ? 'text-accent/50' : 'text-white/20'}`} />
              </div>
            )}
            <div className={`absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${isCyberpunk ? 'bg-accent/20' : ''}`}>
              <Camera className={`w-8 h-8 ${isCyberpunk ? 'text-accent' : 'text-white'}`} />
            </div>
            {uploadingPhoto && (
              <div className={`absolute inset-0 bg-black/80 flex items-center justify-center ${isCyberpunk ? 'rounded-none' : 'rounded-full'}`}>
                <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <div className={`absolute -bottom-2 -right-2 bg-accent text-black text-[10px] uppercase font-bold px-2 py-0.5 ${isCyberpunk ? 'rounded-none font-mono tracking-widest border border-black' : 'rounded-full'}`}>
              {profile?.role === 'admin' ? 'Propietario' : 'Usuario'}
            </div>
          </div>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

          <h3 className={`${isCyberpunk ? 'font-mono text-accent tracking-wide uppercase' : 'font-syne text-white'} font-bold text-lg mt-2`}>{user?.displayName || 'Usuario'}</h3>
          <p className={`${isCyberpunk ? 'font-mono text-accent/50 text-xs' : 'text-white/40 text-sm'}`}>{user?.email}</p>
        </div>

        <div className="space-y-4 mb-6">
          <div className={`${isCyberpunk ? 'bg-black border border-accent/20 rounded-none' : 'bg-white/5 rounded-xl'} p-4 flex items-center gap-3`}>
            <Mail className="w-5 h-5 text-accent" />
            <div className="flex-1">
              <p className={`text-xs ${isCyberpunk ? 'font-mono text-accent/50 uppercase tracking-widest' : 'text-white/40'}`}>Correo Electrónico</p>
              <p className={`text-sm font-medium truncate ${isCyberpunk ? 'font-mono text-white' : 'text-white'}`}>{user?.email || 'No disponible'}</p>
            </div>
          </div>

          <div className={`${isCyberpunk ? 'bg-black border border-accent/20 rounded-none' : 'bg-white/5 rounded-xl'} p-4 flex items-center gap-3`}>
            <Phone className="w-5 h-5 text-accent" />
            <div className="flex-1">
              <p className={`text-xs ${isCyberpunk ? 'font-mono text-accent/50 uppercase tracking-widest' : 'text-white/40'}`}>Teléfono</p>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={`bg-transparent text-sm font-medium focus:outline-none w-full ${isCyberpunk ? 'font-mono text-accent placeholder:text-accent/30' : 'text-white'}`}
                placeholder="Ingresa tu teléfono"
              />
            </div>
            <button
              onClick={handleSavePhone}
              disabled={savingPhone}
              className={`text-xs font-semibold disabled:opacity-50 transition-colors ${isCyberpunk ? 'font-mono text-accent border border-accent px-2 py-1 uppercase tracking-wider hover:bg-accent hover:text-black' : 'text-accent hover:underline'}`}
            >
              {savingPhone ? (isCyberpunk ? '...' : 'Guardando...') : (isCyberpunk ? 'OK' : 'Guardar')}
            </button>
          </div>

          <div className={`${isCyberpunk ? 'bg-black border border-accent/20 rounded-none' : 'bg-white/5 rounded-xl'} p-4 flex items-center gap-3`}>
            <Shield className="w-5 h-5 text-accent" />
            <div>
              <p className={`text-xs ${isCyberpunk ? 'font-mono text-accent/50 uppercase tracking-widest' : 'text-white/40'}`}>Rol de Cuenta</p>
              <p className={`text-sm font-medium ${isCyberpunk ? 'font-mono text-accent tracking-wide uppercase' : 'text-white'}`}>
                {profile?.role === 'admin' ? 'Propietario (Acceso Total)' : 'Usuario Estándar'}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleSignOut}
            className={`w-full font-bold py-3.5 transition-all flex items-center justify-center gap-2 text-sm ${isCyberpunk ? 'bg-transparent border border-white text-white rounded-none uppercase font-mono tracking-widest hover:bg-white hover:text-black' : 'bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10 active:scale-[0.98]'}`}
          >
            <LogOut className="w-4 h-4" />
            {isCyberpunk ? '>_ CERRAR_SESION' : 'Cerrar Sesión'}
          </button>

          <button
            onClick={handleDeleteAccount}
            className={`w-full font-bold py-3.5 transition-all flex items-center justify-center gap-2 text-sm ${isCyberpunk ? 'bg-black border border-red-500/50 text-red-500 rounded-none uppercase font-mono tracking-widest hover:bg-red-500/10' : 'bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl hover:bg-red-500/20 active:scale-[0.98]'}`}
          >
            <Trash2 className="w-4 h-4" />
            {isCyberpunk ? '>_ ELIMINAR_CUENTA' : 'Eliminar Cuenta'}
          </button>
        </div>
      </div>
    </div>
  );
}
