'use client';
import { useState, useEffect } from 'react';
import { auth, googleProvider } from '@/lib/firebase';
import { signInWithPopup, getAdditionalUserInfo } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Wallet } from 'lucide-react';
import { SplashScreen } from '@/components/layout/SplashScreen';

export default function LoginPage() {
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(false);
  const [mode, setMode] = useState<'login' | 'logout'>('login');
  const [mounted, setMounted] = useState(false);
  const [isSplashDone, setIsSplashDone] = useState(false);
  const [authDoneUrl, setAuthDoneUrl] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const params = new URLSearchParams(window.location.search);
    if (params.get('logout') === 'true') {
      setMode('logout');
      setShowSplash(true);
      window.history.replaceState({}, '', '/login');
      import('@/lib/auth').then(({ signOut }) => signOut().catch(console.error));
    }
  }, []);

  useEffect(() => {
    if (mode === 'login' && isSplashDone && authDoneUrl) {
      sessionStorage.setItem('login_splash_done', 'true');
      router.push(authDoneUrl);
    }
  }, [mode, isSplashDone, authDoneUrl, router]);

  if (!mounted) {
    return <div className="min-h-screen bg-[#050B14]" />;
  }

  if (showSplash) {
    return <SplashScreen duration={2500} mode={mode} onComplete={() => {
      if (mode === 'login') {
        setIsSplashDone(true);
      } else {
        setShowSplash(false);
      }
    }} />;
  }

  const handleGoogleLogin = async () => {
    try {
      const { signInWithPopup } = await import('firebase/auth');
      const { auth, googleProvider } = await import('@/lib/firebase');
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, googleProvider);

      setMode('login');
      setIsSplashDone(false);
      setAuthDoneUrl(null);
      setShowSplash(true);

      const { processGoogleUser } = await import('@/lib/auth');
      const { isNewUser } = await processGoogleUser(result.user);
      
      setAuthDoneUrl(isNewUser ? '/?newuser=true' : '/?login=true');
    } catch (error) {
      setShowSplash(false);
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
          <div className="relative w-40 h-40 mx-auto animate-float">
            {/* SVG Lines */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
              {/* Circle 1 (Outer, Green, Clockwise, 3 parts) */}
              <circle
                cx="50" cy="50" r="46"
                fill="none"
                stroke="#10B981"
                strokeWidth="2"
                strokeDasharray="70 26.3"
                className="animate-[spin_4s_linear_infinite] origin-center"
                strokeLinecap="round"
              />
              {/* Circle 2 (Inner, Cyan, Counter-clockwise, 3 parts) */}
              <circle
                cx="50" cy="50" r="41"
                fill="none"
                stroke="#00C4CC"
                strokeWidth="2"
                strokeDasharray="60 25.8"
                className="animate-[spin_6s_linear_infinite_reverse] origin-center"
                strokeLinecap="round"
              />
            </svg>

            {/* Logo Container */}
            <div className="absolute inset-[15%] rounded-full overflow-hidden border border-white/10 bg-[#0D1527] flex items-center justify-center shadow-2xl">
              <svg className="w-full h-full drop-shadow-lg relative z-0" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                {/* Vertical stem */}
                <line x1="28" y1="25" x2="28" y2="75" stroke="#00C4CC" strokeWidth="14" strokeLinecap="round" />
                {/* Top bar */}
                <line x1="28" y1="25" x2="60" y2="25" stroke="#10B981" strokeWidth="14" strokeLinecap="round" />
                {/* Middle bar */}
                <line x1="28" y1="50" x2="48" y2="50" stroke="#00C4CC" strokeWidth="14" strokeLinecap="round" />
                {/* Dot */}
                <circle cx="72" cy="50" r="7" fill="#F97316" />
              </svg>
              {/* Scanlines Overlay */}
              <div className="absolute inset-0 z-10 pointer-events-none bg-[repeating-linear-gradient(transparent,transparent_2px,rgba(0,0,0,0.15)_2px,rgba(0,0,0,0.15)_3px)]" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-white">Bienvenido a Flowi</h1>
            <p className="text-white/60 text-sm">Gestiona tus gastos de forma inteligente</p>
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
          <p className="text-white/40 text-xs">
            Al continuar, aceptas los términos y condiciones.
          </p>
        </div>
      </div>
    </div>
  );
}

