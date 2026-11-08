'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mic, Camera, CalendarCheck, CalendarClock, Target, FileSpreadsheet, ShieldCheck, Sparkles,
  Smartphone, ChevronDown, Wallet,
} from 'lucide-react';
import { SplashScreen } from '@/components/layout/SplashScreen';
import { FlowLines } from '@/components/FlowLines';

// Página de entrada (landing): explica qué hace FLOWI y deja entrar con Google.
// Todas las pantallas mandan aquí a quien no ha iniciado sesión.

const FEATURES = [
  { icon: Mic, title: 'Registra con tu voz', text: 'Di "gasté 20 mil en almuerzo" y queda anotado. Entiende varias cosas a la vez, ingresos y deudas.' },
  { icon: CalendarCheck, title: 'Hoy puedes gastar', text: 'Cada día te dice cuánto puedes gastar sin quedarte corto a fin de mes, apartando primero tus pagos fijos.' },
  { icon: CalendarClock, title: 'Pagos que vienen', text: 'Arriendo, servicios, Netflix: te recuerda lo que falta pagar este mes y lo marcas con un toque.' },
  { icon: Target, title: 'Metas de ahorro', text: 'Crea tu fondo de emergencia o ahorra para un viaje, y mira cuándo lo lograrías a tu ritmo.' },
  { icon: Camera, title: 'Foto del recibo', text: 'Tómale foto al recibo y la IA gratuita lee el total, el comercio y la fecha por ti.' },
  { icon: FileSpreadsheet, title: 'Importa tu extracto', text: 'Sube el Excel o CSV de tu banco y trae tus movimientos sin digitarlos uno por uno.' },
];

const STEPS = [
  { title: 'Entra con tu cuenta de Google', text: 'Sin formularios ni contraseñas nuevas.' },
  { title: 'Anota lo que entra y lo que sale', text: 'Con la voz, una foto, el teclado o tu extracto.' },
  { title: 'Sigue tu cuota de cada día', text: 'Y al empezar el mes, ciérralo en dos minutos para ver cómo te fue.' },
];

const FAQ = [
  { q: '¿Cuánto cuesta?', a: 'Nada. FLOWI es gratis y no tiene anuncios.' },
  { q: '¿Tengo que conectar mi cuenta del banco?', a: 'No. Tú decides qué anotar. Si quieres, puedes subir el extracto que descargas de tu banco, pero FLOWI nunca entra a tu banco.' },
  { q: '¿Quién puede ver mis datos?', a: 'Solo tú. Cada cuenta ve únicamente sus propios movimientos.' },
  { q: '¿Funciona en mi celular?', a: 'Sí, en Android y iPhone desde el navegador. La puedes instalar como app desde el menú del navegador ("Agregar a la pantalla de inicio").' },
  { q: '¿La inteligencia artificial cuesta?', a: 'No. Es opcional y usa modelos gratuitos con tu propia cuenta gratis; la clave queda guardada solo en tu celular.' },
];

function Logo({ size = 'w-40 h-40' }: { size?: string }) {
  return (
    <div className={`relative ${size} mx-auto animate-float`}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="46" fill="none" stroke="#10B981" strokeWidth="2" strokeDasharray="70 26.3" className="animate-[spin_4s_linear_infinite] origin-center" strokeLinecap="round" />
        <circle cx="50" cy="50" r="41" fill="none" stroke="#00C4CC" strokeWidth="2" strokeDasharray="60 25.8" className="animate-[spin_6s_linear_infinite_reverse] origin-center" strokeLinecap="round" />
      </svg>
      <div className="absolute inset-[15%] rounded-full overflow-hidden border border-white/10 bg-[#0D1527] flex items-center justify-center shadow-2xl">
        <svg className="w-full h-full drop-shadow-lg relative z-0" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="FLOWI">
          <line x1="28" y1="25" x2="28" y2="75" stroke="#00C4CC" strokeWidth="14" strokeLinecap="round" />
          <line x1="28" y1="25" x2="60" y2="25" stroke="#10B981" strokeWidth="14" strokeLinecap="round" />
          <line x1="28" y1="50" x2="48" y2="50" stroke="#00C4CC" strokeWidth="14" strokeLinecap="round" />
          <circle cx="72" cy="50" r="7" fill="#F97316" />
        </svg>
        <div className="absolute inset-0 z-10 pointer-events-none bg-[repeating-linear-gradient(transparent,transparent_2px,rgba(0,0,0,0.15)_2px,rgba(0,0,0,0.15)_3px)]" />
      </div>
    </div>
  );
}

function GoogleButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-center gap-3 bg-white text-black font-semibold py-3.5 px-4 rounded-xl hover:bg-white/90 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-emerald-500/10"
    >
      <img src="https://www.google.com/favicon.ico" alt="" className="w-5 h-5" />
      Entrar con Google
    </button>
  );
}

// Vista de ejemplo de la app (cifras inventadas, no son datos de nadie)
function AppPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[300px] rounded-[2.2rem] border border-white/10 bg-[#0A1222] p-3 shadow-2xl shadow-emerald-500/10" aria-hidden="true">
      <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-white/10" />
      <div className="space-y-2.5">
        <div className="rounded-2xl bg-gradient-to-br from-[#0D2E1F] via-[#0A1929] to-[#150D2E] border border-white/5 p-4">
          <p className="text-[10px] text-white/50 flex items-center gap-1.5"><Wallet className="w-3 h-3 text-emerald-400" /> Dinero disponible</p>
          <p className="text-2xl font-bold text-emerald-400 font-syne">$ 2.179.000</p>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl bg-white/5 border border-white/5 p-3">
            <p className="text-[9px] text-white/50">Gastos</p>
            <p className="text-sm font-bold text-rose-400">$ 1.321.000</p>
          </div>
          <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-3">
            <p className="text-[9px] text-emerald-300/80">Hoy puedes gastar</p>
            <p className="text-sm font-bold text-emerald-400">$ 64.378</p>
          </div>
        </div>
        <div className="rounded-2xl bg-white/5 border border-white/5 p-3">
          <p className="text-[10px] font-bold text-white/70 mb-2">Próximos compromisos</p>
          {[['Internet hogar', 'Vence mañana', '$ 89.900'], ['Netflix', 'Hacia el 20', '$ 38.900']].map(([t, w, v]) => (
            <div key={t} className="flex items-center justify-between py-1">
              <div><p className="text-[11px] text-white/90">{t}</p><p className="text-[9px] text-orange-300/80">{w}</p></div>
              <p className="text-[11px] font-semibold text-white/80">{v}</p>
            </div>
          ))}
        </div>
        <div className="rounded-2xl bg-white/5 border border-white/5 p-3">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[11px] text-white/90">🛡️ Fondo de emergencia</p>
            <p className="text-[10px] font-bold text-emerald-400">30%</p>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full w-[30%] rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400" /></div>
        </div>
      </div>
      <div className="absolute -right-3 bottom-8 w-12 h-12 rounded-2xl bg-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/40">
        <Mic className="w-6 h-6 text-black" />
      </div>
    </div>
  );
}

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
      return;
    }
    // Quien ya tiene la sesión abierta va directo a su inicio
    let unsubscribe: (() => void) | undefined;
    Promise.all([import('firebase/auth'), import('@/lib/firebase')]).then(([{ onAuthStateChanged }, { auth }]) => {
      unsubscribe = onAuthStateChanged(auth, (u) => {
        if (u && !sessionStorage.getItem('login_in_progress')) router.replace('/');
      });
    });
    return () => unsubscribe?.();
  }, [router]);

  useEffect(() => {
    if (mode === 'login' && isSplashDone && authDoneUrl) {
      sessionStorage.setItem('login_splash_done', 'true');
      sessionStorage.removeItem('login_in_progress');
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
      // Evita que el aviso de "sesión abierta" salte a Inicio antes de crear el perfil
      sessionStorage.setItem('login_in_progress', 'true');
      const result = await signInWithPopup(auth, googleProvider);

      setMode('login');
      setIsSplashDone(false);
      setAuthDoneUrl(null);
      setShowSplash(true);

      const { processGoogleUser } = await import('@/lib/auth');
      const { isNewUser } = await processGoogleUser(result.user);
      setAuthDoneUrl(isNewUser ? '/?newuser=true' : '/?login=true');
    } catch (error) {
      console.error('Error logging in:', error);
      // En algunos celulares la ventana de Google responde con error aunque la sesión sí quedó
      // abierta: en ese caso se sigue (se crea el perfil si falta) en lugar de volver a la portada
      try {
        const { auth } = await import('@/lib/firebase');
        if (auth.currentUser) {
          const { processGoogleUser } = await import('@/lib/auth');
          const { isNewUser } = await processGoogleUser(auth.currentUser);
          setAuthDoneUrl(isNewUser ? '/?newuser=true' : '/?login=true');
          return;
        }
      } catch (e) {
        console.error('No se pudo terminar el ingreso:', e);
      }
      sessionStorage.removeItem('login_in_progress');
      setShowSplash(false);
    }
  };

  const section = 'relative z-10 w-full max-w-5xl mx-auto px-5';

  return (
    <div className="relative min-h-screen bg-[#050B14] text-white overflow-x-hidden">
      <FlowLines className="absolute inset-x-0 top-0 h-[720px]" />
      <div className="absolute top-40 -right-40 w-96 h-96 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute top-[520px] -left-40 w-96 h-96 bg-violet-500/10 blur-3xl rounded-full pointer-events-none" />

      {/* Portada */}
      <header className={`${section} pt-10 pb-14 md:pt-16 grid md:grid-cols-2 gap-10 items-center`}>
        <div className="text-center md:text-left space-y-6">
          <Logo size="w-28 h-28 md:mx-0" />
          <div className="space-y-3">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1">
              <Sparkles className="w-3 h-3" /> Gratis · Hecha en Colombia
            </p>
            <h1 className="text-4xl md:text-5xl font-bold font-syne leading-tight">
              Tu plata clara, <span className="text-emerald-400">todos los días</span>.
            </h1>
            <p className="text-white/65 text-base md:text-lg max-w-md mx-auto md:mx-0">
              Anota tus gastos con la voz, mira cuánto puedes gastar hoy y llega a fin de mes sin sustos.
            </p>
          </div>
          <div className="max-w-sm mx-auto md:mx-0 space-y-2">
            <GoogleButton onClick={handleGoogleLogin} />
            <p className="text-white/40 text-xs">Al continuar, aceptas los términos y condiciones.</p>
          </div>
          <a href="#como-funciona" className="hidden md:inline-flex items-center gap-1 text-sm text-white/50 hover:text-white">
            Mira cómo funciona <ChevronDown className="w-4 h-4" />
          </a>
        </div>
        <AppPreview />
      </header>

      {/* Funciones */}
      <section className={`${section} py-12`}>
        <h2 className="text-2xl md:text-3xl font-bold font-syne text-center mb-2">Todo lo que necesitas para ordenar tu plata</h2>
        <p className="text-white/55 text-center mb-8 max-w-xl mx-auto">Sin hojas de cálculo ni cuentas complicadas: FLOWI hace las sumas y te dice qué hacer.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-3xl bg-[#0D1527] border border-white/5 p-5 hover:border-emerald-500/30 transition-colors">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 flex items-center justify-center mb-3">
                <Icon className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="font-semibold mb-1">{title}</h3>
              <p className="text-sm text-white/60 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Cómo funciona */}
      <section id="como-funciona" className={`${section} py-12 scroll-mt-6`}>
        <h2 className="text-2xl md:text-3xl font-bold font-syne text-center mb-8">Empieza en un minuto</h2>
        <ol className="grid md:grid-cols-3 gap-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-3xl bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/15 p-5">
              <span className="w-8 h-8 rounded-full bg-emerald-400 text-black font-bold flex items-center justify-center mb-3">{i + 1}</span>
              <h3 className="font-semibold mb-1">{s.title}</h3>
              <p className="text-sm text-white/60">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Privacidad y celular */}
      <section className={`${section} py-12 grid md:grid-cols-2 gap-4`}>
        <div className="rounded-3xl bg-[#0D1527] border border-white/5 p-6">
          <ShieldCheck className="w-7 h-7 text-emerald-400 mb-3" />
          <h3 className="text-lg font-semibold mb-1">Tus datos son solo tuyos</h3>
          <p className="text-sm text-white/60 leading-relaxed">Cada cuenta ve únicamente sus propios movimientos. No pedimos la clave de tu banco y la IA opcional guarda su clave solo en tu celular.</p>
        </div>
        <div className="rounded-3xl bg-[#0D1527] border border-white/5 p-6">
          <Smartphone className="w-7 h-7 text-emerald-400 mb-3" />
          <h3 className="text-lg font-semibold mb-1">Como una app, sin descargar nada</h3>
          <p className="text-sm text-white/60 leading-relaxed">Funciona en Android, iPhone y computador. Instálala en tu pantalla de inicio y recibe recordatorios de tus pagos.</p>
        </div>
      </section>

      {/* Preguntas frecuentes */}
      <section className={`${section} py-12 max-w-3xl`}>
        <h2 className="text-2xl md:text-3xl font-bold font-syne text-center mb-6">Preguntas frecuentes</h2>
        <div className="space-y-2">
          {FAQ.map(({ q, a }) => (
            <details key={q} className="group rounded-2xl bg-[#0D1527] border border-white/5 px-5 py-4">
              <summary className="cursor-pointer list-none flex items-center justify-between gap-3 font-medium">
                {q} <ChevronDown className="w-4 h-4 text-white/40 transition-transform group-open:rotate-180 shrink-0" />
              </summary>
              <p className="mt-2 text-sm text-white/60 leading-relaxed">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Cierre */}
      <section className={`${section} py-14`}>
        <div className="rounded-[2rem] bg-gradient-to-br from-emerald-500/15 via-[#0D1527] to-violet-500/10 border border-emerald-500/20 p-8 text-center max-w-xl mx-auto space-y-4">
          <h2 className="text-2xl font-bold font-syne">Empieza hoy, es gratis</h2>
          <p className="text-white/60 text-sm">En un minuto sabes cuánto puedes gastar hoy.</p>
          <div className="max-w-sm mx-auto"><GoogleButton onClick={handleGoogleLogin} /></div>
        </div>
      </section>

      <footer className={`${section} pb-10 text-center text-xs text-white/35 space-y-1`}>
        <p>FLOWI · Tu dinero, en flujo · Hecha en Colombia</p>
        <p>
          ¿Dudas o sugerencias?{' '}
          <a href="https://wa.me/573104604592" target="_blank" rel="noopener noreferrer" className="text-emerald-400/80 hover:text-emerald-300">Escríbenos por WhatsApp</a>
        </p>
      </footer>
    </div>
  );
}
