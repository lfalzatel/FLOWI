'use client';
import { X, LogOut, Shield, Mail, User as UserIcon } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from '@/lib/auth';

interface Props {
  onClose: () => void;
}

export function ProfileModal({ onClose }: Props) {
  const { user, profile } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      onClose();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0A0A0F] border border-white/10 p-6 rounded-3xl w-full max-w-md relative animate-fade-in-up max-h-[95vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white">
          <X className="w-5 h-5" />
        </button>

        <h2 className="font-syne font-bold text-xl text-white mb-6">
          Mi Perfil
        </h2>

        <div className="flex flex-col items-center mb-6">
          <div className="relative w-24 h-24 mb-4">
            {user?.photoURL ? (
              <Image
                src={user.photoURL}
                alt={user.displayName || 'Usuario'}
                fill
                className="rounded-full border-2 border-accent object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-white/5 border-2 border-white/10 flex items-center justify-center">
                <UserIcon className="w-12 h-12 text-white/20" />
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 bg-accent text-black text-xs font-bold px-2 py-0.5 rounded-full">
              {profile?.role === 'admin' ? 'Propietario' : 'Usuario'}
            </div>
          </div>

          <h3 className="font-syne font-bold text-lg text-white">{user?.displayName || 'Usuario'}</h3>
          <p className="text-white/40 text-sm">{user?.email}</p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="bg-white/5 p-4 rounded-xl flex items-center gap-3">
            <Mail className="w-5 h-5 text-accent" />
            <div>
              <p className="text-white/40 text-xs">Correo Electrónico</p>
              <p className="text-white text-sm font-medium">{user?.email || 'No disponible'}</p>
            </div>
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

        <button
          onClick={handleSignOut}
          className="w-full bg-red-500/10 border border-red-500/20 text-red-500 font-bold py-3.5 rounded-xl hover:bg-red-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm"
        >
          <LogOut className="w-4 h-4" />
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}
