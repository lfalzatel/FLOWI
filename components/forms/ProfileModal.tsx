'use client';
import { useState, useEffect, useRef } from 'react';
import { X, LogOut, Shield, Mail, User as UserIcon, Phone, Camera, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from '@/lib/auth';
import { updateUserProfile } from '@/lib/firestore';
import { storage } from '@/lib/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

interface Props {
  onClose: () => void;
}

export function ProfileModal({ onClose }: Props) {
  const { user, profile } = useAuth();
  const [phone, setPhone] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    setUploadingPhoto(true);
    try {
      const fileRef = storageRef(storage, `profile_pictures/${user.uid}`);
      await uploadBytes(fileRef, file);
      const photoURL = await getDownloadURL(fileRef);
      await updateUserProfile(user.uid, { photoURL });
      alert('Foto de perfil actualizada. Los cambios pueden tardar unos segundos en reflejarse.');
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Error al subir la foto');
    } finally {
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
      <div className="bg-[#0A0A0F] border border-white/10 p-6 rounded-3xl w-full max-w-md relative animate-fade-in-up max-h-[95vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white">
          <X className="w-5 h-5" />
        </button>

        <h2 className="font-syne font-bold text-xl text-white mb-6">
          Mi Perfil
        </h2>

        <div className="flex flex-col items-center mb-6">
          <div 
            className="relative w-24 h-24 mb-4 cursor-pointer group"
            onClick={() => fileInputRef.current?.click()}
          >
            {user?.photoURL ? (
              <Image
                src={user.photoURL}
                alt={user.displayName || 'Usuario'}
                fill
                className="rounded-full border-2 border-accent object-cover group-hover:opacity-75 transition-opacity"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-white/5 border-2 border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                <UserIcon className="w-12 h-12 text-white/20" />
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-8 h-8 text-white" />
            </div>
            {uploadingPhoto && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
                <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 bg-accent text-black text-xs font-bold px-2 py-0.5 rounded-full">
              {profile?.role === 'admin' ? 'Propietario' : 'Usuario'}
            </div>
          </div>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

          <h3 className="font-syne font-bold text-lg text-white">{user?.displayName || 'Usuario'}</h3>
          <p className="text-white/40 text-sm">{user?.email}</p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="bg-white/5 p-4 rounded-xl flex items-center gap-3">
            <Mail className="w-5 h-5 text-accent" />
            <div className="flex-1">
              <p className="text-white/40 text-xs">Correo Electrónico</p>
              <p className="text-white text-sm font-medium truncate">{user?.email || 'No disponible'}</p>
            </div>
          </div>

          <div className="bg-white/5 p-4 rounded-xl flex items-center gap-3">
            <Phone className="w-5 h-5 text-accent" />
            <div className="flex-1">
              <p className="text-white/40 text-xs">Teléfono</p>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="bg-transparent text-white text-sm font-medium focus:outline-none w-full"
                placeholder="Ingresa tu teléfono"
              />
            </div>
            <button
              onClick={handleSavePhone}
              disabled={savingPhone}
              className="text-accent text-xs font-semibold hover:underline disabled:opacity-50"
            >
              {savingPhone ? 'Guardando...' : 'Guardar'}
            </button>
          </div>

          <div className="bg-white/5 p-4 rounded-xl flex items-center gap-3">
            <Shield className="w-5 h-5 text-accent" />
            <div>
              <p className="text-white/40 text-xs">Rol de Cuenta</p>
              <p className="text-white text-sm font-medium">
                {profile?.role === 'admin' ? 'Propietario (Acceso Total)' : 'Usuario Estándar'}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleSignOut}
            className="w-full bg-white/5 border border-white/10 text-white font-bold py-3.5 rounded-xl hover:bg-white/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </button>

          <button
            onClick={handleDeleteAccount}
            className="w-full bg-red-500/10 border border-red-500/20 text-red-500 font-bold py-3.5 rounded-xl hover:bg-red-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm"
          >
            <Trash2 className="w-4 h-4" />
            Eliminar Cuenta
          </button>
        </div>
      </div>
    </div>
  );
}
