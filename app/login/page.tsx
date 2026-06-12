'use client';
import { useState, useEffect } from 'react';
import { auth, googleProvider } from '@/lib/firebase';
import { signInWithPopup, getAdditionalUserInfo } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Wallet } from 'lucide-react';
import { SplashScreen } from '@/components/layout/SplashScreen';
import { useTheme } from '@/components/ThemeProvider';

export default function LoginPage() {
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(false);
  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';

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
      const credential = await signInWithPopup(auth, googleProvider);
      const additionalInfo = getAdditionalUserInfo(credential);
      if (additionalInfo?.isNewUser) {
        router.push('/?newuser=true');
      } else {
        router.push('/?login=true');
      }
    } catch (error) {
      console.error('Error logging in:', error);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${isTechTheme ? 'bg-deep' : 'bg-[#050B14]'}`}>
      <div className={`w-full max-w-md p-8 space-y-8 relative overflow-hidden ${
        isTechTheme 
          ? 'bg-deep border border-accent/30 rounded-none shadow-[0_0_20px_rgba(0,255,178,0.05)]' 
          : 'bg-[#0D1527] border border-white/5 rounded-3xl'
      }`}>
        {/* Glow effects */}
        {!isTechTheme && (
          <>
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-emerald-500/10 blur-3xl rounded-full" />
            <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-violet-500/10 blur-3xl rounded-full" />
          </>
        )}

        <div className="relative z-10 text-center space-y-4">
          <div className="relative w-40 h-40 mx-auto">
            {/* SVG Lines */}
            <svg className={`absolute inset-0 w-full h-full ${isTechTheme ? 'text-accent' : 'text-[#10B981]'}`} viewBox="0 0 100 100">
              {/* Circle 1 (Outer, Clockwise) */}
              <circle
                cx="50" cy="50" r="46"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="150 100"
                className="animate-[spin_4s_linear_infinite] origin-center"
                strokeLinecap={isTechTheme ? "square" : "round"}
              />
              {/* Circle 2 (Inner, Counter-clockwise) */}
              <circle
                cx="50" cy="50" r="41"
                fill="none"
                stroke={isTechTheme ? "var(--accent-dim)" : "#3B82F6"}
                strokeWidth="2"
                strokeDasharray="120 80"
                className="animate-[spin_6s_linear_infinite_reverse] origin-center"
                strokeLinecap={isTechTheme ? "square" : "round"}
              />
            </svg>

            {/* Logo Container */}
            <div className={`absolute inset-[15%] overflow-hidden bg-[#0D1527] flex items-center justify-center ${isTechTheme ? 'rounded-none border border-accent/40' : 'rounded-full border border-white/10'}`}>
              <img src="/icons/icon-512.png" alt="Logo" className="w-full h-full object-cover scale-[1.15]" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className={`text-3xl font-bold ${isTechTheme ? 'text-accent font-mono uppercase tracking-widest' : 'text-text-primary'}`}>
              Flowi
            </h1>
            <p className={`text-sm ${isTechTheme ? 'text-accent/70 font-mono tracking-wider uppercase' : 'text-text-secondary'}`}>
              Gestiona tus gastos de forma inteligente
            </p>
          </div>
        </div>

        <div className="relative z-10">
          <button
            onClick={handleGoogleLogin}
            className={`w-full flex items-center justify-center gap-3 font-medium py-3.5 px-4 transition-all duration-200 active:scale-[0.98] ${
              isTechTheme 
                ? 'bg-accent/10 border border-accent text-accent rounded-none hover:bg-accent/20 uppercase font-mono tracking-widest text-sm' 
                : 'bg-white text-black rounded-xl hover:bg-white/90 transform hover:scale-[1.02]'
            }`}
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            Iniciar sesión con Google
          </button>
        </div>

        <div className="relative z-10 text-center">
          <p className={`text-xs ${isTechTheme ? 'text-accent/50 font-mono tracking-wide' : 'text-text-muted'}`}>
            Al continuar, aceptas los términos y condiciones.
          </p>
        </div>
      </div>
    </div>
  );
}

