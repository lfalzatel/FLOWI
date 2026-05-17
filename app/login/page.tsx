'use client';
import { useState, useEffect } from 'react';
import { auth, googleProvider } from '@/lib/firebase';
import { signInWithPopup } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Wallet } from 'lucide-react';
import { SplashScreen } from '@/components/layout/SplashScreen';

export default function LoginPage() {
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('logout') === 'true') {
      setShowSplash(true);
    }
  }, []);

  if (showSplash) {
    return <SplashScreen duration={2500} onComplete={() => setShowSplash(false)} />;
  }

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      router.push('/?login=true');
    } catch (error) {
      console.error('Error logging in:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050B14] p-4">
      <div className="w-full max-w-md bg-[#0D1527] border border-white/5 rounded-3xl p-8 space-y-8 relative overflow-hidden">
        {/* Glow effects */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-emerald-500/10 blur-3xl rounded-full" />
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-violet-500/10 blur-3xl rounded-full" />

        <div className="relative z-10 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20">
            <Wallet className="w-8 h-8 text-emerald-400" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-white">Bienvenido a Flowi</h1>
            <p className="text-white/50 text-sm">Gestiona tus gastos de forma inteligente</p>
          </div>
        </div>

        <div className="relative z-10">
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white text-black font-medium py-3.5 px-4 rounded-xl hover:bg-white/90 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            Iniciar sesión con Google
          </button>
        </div>

        <div className="relative z-10 text-center">
          <p className="text-white/30 text-xs">
            Al continuar, aceptas los términos y condiciones.
          </p>
        </div>
      </div>
    </div>
  );
}
