# 💸 FLOWI — App PWA de Gastos Personales
Stack: Next.js 14 (App Router) · Firebase · Tailwind CSS · Vercel

## 1. NOMBRE Y BRANDING
* **Nombre**: Flowi
* **Tagline**: Tu dinero, en flujo
* **Logo**: Símbolo ₣ o ícono de onda + moneda, estilo bold geométrico
* **Paleta**: Verde menta `#00E5A0`, negro profundo `#0A0A0F`, gris carbón `#1A1A2E`, blanco roto `#F0F4F8`
* **Fuentes**: Display: Syne (bold) · Body: DM Sans
* **Estilo**: Glassmorphism oscuro + acentos neón verdes

## 2. ESTRUCTURA DEL PROYECTO
```text
flowi/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx          ← Layout con header + menú
│   │   ├── page.tsx            ← Dashboard principal
│   │   ├── gastos/page.tsx
│   │   ├── ingresos/page.tsx
│   │   ├── presupuesto/page.tsx
│   │   ├── reportes/page.tsx
│   │   └── ajustes/page.tsx
│   ├── api/
│   │   └── auth/[...nextauth]/route.ts
│   ├── globals.css
│   ├── layout.tsx              ← Root layout + PWA meta
│   └── manifest.ts
├── components/
│   ├── ui/
│   │   ├── Header.tsx
│   │   ├── SideNav.tsx         ← PC/Tablet
│   │   ├── BottomNav.tsx       ← Móvil (glassmorphism)
│   │   ├── ProfileCapsule.tsx
│   │   └── DropdownMenu.tsx
│   ├── dashboard/
│   │   ├── BalanceCard.tsx
│   │   ├── ExpenseChart.tsx
│   │   └── TransactionList.tsx
│   └── forms/
│       └── AddExpenseModal.tsx
├── lib/
│   ├── firebase.ts
│   ├── auth.ts
│   └── firestore.ts
├── hooks/
│   ├── useAuth.ts
│   └── useExpenses.ts
├── public/
│   ├── icons/                  ← PWA icons (512x512, 192x192, etc.)
│   ├── manifest.json
│   └── sw.js                   ← Service Worker
├── next.config.js
├── tailwind.config.ts
└── vercel.json
```

## 3. DEPENDENCIAS
```bash
# Inicializar proyecto
npx create-next-app@latest flowi --typescript --tailwind --app --src-dir=false

cd flowi

# Firebase + Auth
npm install firebase next-auth@beta @auth/firebase-adapter

# UI y animaciones
npm install framer-motion lucide-react clsx

# Gráficas
npm install recharts

# PWA
npm install next-pwa

# Variables de entorno tipadas
npm install zod
```

## 4. CONFIGURACIÓN FIREBASE
### `lib/firebase.ts`
```typescript
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
```

### Estructura Firestore
* **users/**
  * `{uid}/`
    * `profile`: `{ name, email, photoURL, role, createdAt }`
    
* **expenses/**
  * `{expenseId}/`
    * `userId`: string
    * `amount`: number
    * `category`: string        // comida, transporte, ocio, salud...
    * `description`: string
    * `date`: timestamp
    * `type`: `'gasto' | 'ingreso'`
    
* **budgets/**
  * `{budgetId}/`
    * `userId`: string
    * `category`: string
    * `limit`: number
    * `month`: string           // "2026-05"

### Reglas Firestore
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    match /expenses/{expenseId} {
      allow read, write: if request.auth.uid == resource.data.userId;
      allow create: if request.auth.uid == request.resource.data.userId;
    }
    match /budgets/{budgetId} {
      allow read, write: if request.auth.uid == resource.data.userId;
    }
  }
}
```

## 5. CONFIGURACIÓN PWA
### `next.config.js`
```javascript
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['lh3.googleusercontent.com'], // Fotos de Google
  },
};

module.exports = withPWA(nextConfig);
```

### `public/manifest.json`
```json
{
  "name": "Flowi - Gestión de Gastos",
  "short_name": "Flowi",
  "description": "Tu dinero, en flujo",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0A0A0F",
  "theme_color": "#00E5A0",
  "orientation": "portrait-primary",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

### `app/layout.tsx` (Root)
```tsx
import type { Metadata, Viewport } from 'next';
import { Syne, DM_Sans } from 'next/font/google';
import './globals.css';

const syne = Syne({ subsets: ['latin'], variable: '--font-syne', weight: ['400','600','700','800'] });
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm' });

export const metadata: Metadata = {
  title: 'Flowi — Tu dinero, en flujo',
  description: 'Administra tus gastos personales con estilo',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Flowi' },
};

export const viewport: Viewport = {
  themeColor: '#00E5A0',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${syne.variable} ${dmSans.variable}`}>
      <body className="bg-[#0A0A0F] text-white font-dm antialiased">
        {children}
      </body>
    </html>
  );
}
```

## 6. AUTENTICACIÓN GOOGLE
### `lib/auth.ts`
```typescript
import { signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;

  // Crear/actualizar perfil en Firestore
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    await setDoc(userRef, {
      name: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      role: 'Personal',       // Default role
      createdAt: new Date(),
    });
  }

  return user;
}

export async function signOut() {
  await firebaseSignOut(auth);
}
```

### `hooks/useAuth.ts`
```typescript
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

interface UserProfile {
  name: string;
  email: string;
  photoURL: string;
  role: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (snap.exists()) setProfile(snap.data() as UserProfile);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
  }, []);

  return { user, profile, loading };
}
```

## 7. COMPONENTES PRINCIPALES
### 7.1 Header Sticky con Opacidad — `components/ui/Header.tsx`
```tsx
'use client';
import { useState, useEffect } from 'react';
import { ProfileCapsule } from './ProfileCapsule';

export function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`
        sticky top-0 z-50 w-full px-4 py-3
        flex items-center justify-between
        transition-all duration-300
        ${scrolled
          ? 'bg-[#0A0A0F]/80 backdrop-blur-xl border-b border-white/5 shadow-lg shadow-black/20'
          : 'bg-transparent'
        }
      `}
    >
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#00E5A0] to-[#00B37E] 
                        flex items-center justify-center font-syne font-black text-black text-sm">
          ₣
        </div>
        <span className="font-syne font-bold text-lg tracking-tight hidden sm:block">flowi</span>
      </div>

      {/* Profile Capsule */}
      <ProfileCapsule />
    </header>
  );
}
```

### 7.2 Cápsula de Perfil con Dropdown — `components/ui/ProfileCapsule.tsx`
```tsx
'use client';
import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from '@/lib/auth';
import { 
  User, Settings, CreditCard, Bell, 
  HelpCircle, LogOut, ChevronDown 
} from 'lucide-react';

const menuItems = [
  { icon: User,       label: 'Mi Perfil',       href: '/ajustes/perfil' },
  { icon: CreditCard, label: 'Presupuesto',      href: '/presupuesto' },
  { icon: Bell,       label: 'Notificaciones',   href: '/ajustes/notificaciones' },
  { icon: Settings,   label: 'Configuración',    href: '/ajustes' },
  { icon: HelpCircle, label: 'Ayuda',            href: '/ayuda' },
];

export function ProfileCapsule() {
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!user || !profile) return null;

  return (
    <div ref={ref} className="relative">
      {/* Cápsula */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 px-2 py-1.5 rounded-full
                   bg-white/5 border border-white/10 hover:bg-white/10
                   transition-all duration-200 group"
      >
        {/* Avatar */}
        <div className="relative w-7 h-7 rounded-full overflow-hidden ring-2 ring-[#00E5A0]/50">
          <Image
            src={profile.photoURL || '/default-avatar.png'}
            alt={profile.name}
            fill className="object-cover"
          />
        </div>
        {/* Info - oculto en móvil */}
        <div className="hidden md:flex flex-col items-start leading-none">
          <span className="text-xs font-semibold text-white/90">{profile.name.split(' ')[0]}</span>
          <span className="text-[10px] text-[#00E5A0] font-medium">{profile.role}</span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-white/50 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-64
                        bg-[#1A1A2E]/90 backdrop-blur-xl
                        border border-white/10 rounded-2xl
                        shadow-2xl shadow-black/50 overflow-hidden
                        animate-in fade-in slide-in-from-top-2 duration-200">
          
          {/* Header del dropdown */}
          <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-[#00E5A0]/40">
              <Image src={profile.photoURL} alt={profile.name} fill className="object-cover" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{profile.name}</p>
              <p className="text-xs text-white/50">{profile.email}</p>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00E5A0]/20 text-[#00E5A0] font-medium">
                {profile.role}
              </span>
            </div>
          </div>

          {/* Items */}
          <div className="p-1.5">
            {menuItems.map(({ icon: Icon, label, href }) => (
              <a key={href} href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl
                           text-white/70 hover:text-white hover:bg-white/5
                           transition-all duration-150 text-sm">
                <Icon className="w-4 h-4 text-[#00E5A0]" />
                {label}
              </a>
            ))}
          </div>

          {/* Cerrar sesión */}
          <div className="p-1.5 border-t border-white/5">
            <button
              onClick={() => signOut()}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                         text-red-400 hover:text-red-300 hover:bg-red-500/10
                         transition-all duration-150 text-sm"
            >
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

### 7.3 Menú Inferior Flotante Glassmorphism (Móvil) — `components/ui/BottomNav.tsx`
```tsx
'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, TrendingDown, TrendingUp, PieChart, Plus } from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { icon: LayoutDashboard, label: 'Inicio',     href: '/' },
  { icon: TrendingDown,    label: 'Gastos',     href: '/gastos' },
  { icon: TrendingUp,      label: 'Ingresos',   href: '/ingresos' },
  { icon: PieChart,        label: 'Reportes',   href: '/reportes' },
];

export function BottomNav() {
  const pathname = usePathname();
  const [showAdd, setShowAdd] = useState(false);

  return (
    <>
      {/* Contenedor flotante glassmorphism */}
      <nav className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50
                      flex items-center gap-1 px-3 py-2
                      bg-white/8 backdrop-blur-2xl
                      border border-white/15
                      rounded-[28px] shadow-2xl shadow-black/40
                      before:absolute before:inset-0 before:rounded-[28px]
                      before:bg-gradient-to-b before:from-white/10 before:to-transparent
                      before:pointer-events-none">
        
        {navItems.slice(0, 2).map(({ icon: Icon, label, href }) => (
          <NavItem key={href} Icon={Icon} label={label} href={href} active={pathname === href} />
        ))}

        {/* Botón central de añadir */}
        <button
          onClick={() => setShowAdd(true)}
          className="mx-2 w-12 h-12 rounded-full
                     bg-gradient-to-br from-[#00E5A0] to-[#00B37E]
                     flex items-center justify-center
                     shadow-lg shadow-[#00E5A0]/30
                     active:scale-95 transition-transform"
        >
          <Plus className="w-6 h-6 text-black stroke-[2.5]" />
        </button>

        {navItems.slice(2).map(({ icon: Icon, label, href }) => (
          <NavItem key={href} Icon={Icon} label={label} href={href} active={pathname === href} />
        ))}
      </nav>

      {/* Modal añadir gasto */}
      {showAdd && <AddExpenseModal onClose={() => setShowAdd(false)} />}
    </>
  );
}

function NavItem({ Icon, label, href, active }: any) {
  return (
    <Link href={href}
      className={`relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl
                  transition-all duration-200
                  ${active ? 'text-[#00E5A0]' : 'text-white/40 hover:text-white/70'}`}
    >
      {active && (
        <span className="absolute inset-0 rounded-2xl bg-[#00E5A0]/10" />
      )}
      <Icon className="w-5 h-5" />
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}
```

### 7.4 Menú Lateral (PC/Tablet) — `components/ui/SideNav.tsx`
```tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, TrendingDown, TrendingUp, 
  PieChart, Wallet, Settings 
} from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard',   href: '/' },
  { icon: TrendingDown,    label: 'Gastos',       href: '/gastos' },
  { icon: TrendingUp,      label: 'Ingresos',     href: '/ingresos' },
  { icon: Wallet,          label: 'Presupuesto',  href: '/presupuesto' },
  { icon: PieChart,        label: 'Reportes',     href: '/reportes' },
  { icon: Settings,        label: 'Ajustes',      href: '/ajustes' },
];

export function SideNav() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0
                      bg-[#0D0D1A] border-r border-white/5 p-4">
      
      {/* Logo */}
      <div className="flex items-center gap-3 px-2 py-4 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#00E5A0] to-[#00B37E]
                        flex items-center justify-center font-syne font-black text-black text-lg">
          ₣
        </div>
        <span className="font-syne font-bold text-xl tracking-tight">flowi</span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 flex flex-col gap-1">
        {navItems.map(({ icon: Icon, label, href }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl
                          transition-all duration-200 group
                          ${active
                            ? 'bg-[#00E5A0]/10 text-[#00E5A0] border border-[#00E5A0]/20'
                            : 'text-white/50 hover:text-white hover:bg-white/5'
                          }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">{label}</span>
              {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#00E5A0]" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer del sidebar */}
      <div className="mt-auto pt-4 border-t border-white/5">
        <p className="text-xs text-white/20 text-center">flowi v1.0 · {new Date().getFullYear()}</p>
      </div>
    </aside>
  );
}
```

## 8. LAYOUT DEL DASHBOARD
### `app/(dashboard)/layout.tsx`
```tsx
import { Header } from '@/components/ui/Header';
import { SideNav } from '@/components/ui/SideNav';
import { BottomNav } from '@/components/ui/BottomNav';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar (PC/Tablet) */}
      <SideNav />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-4 md:p-6 pb-28 lg:pb-6">
          {children}
        </main>
      </div>

      {/* Bottom nav (Móvil) */}
      <BottomNav />
    </div>
  );
}
```

## 9. CSS GLOBAL (Efectos Glassmorphism)
### `app/globals.css`
```css
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@400;500;600&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --accent: #00E5A0;
  --accent-dim: #00B37E;
  --bg-deep: #0A0A0F;
  --bg-card: #1A1A2E;
  --glass: rgba(255, 255, 255, 0.06);
  --glass-border: rgba(255, 255, 255, 0.1);
}

/* Scroll custom */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--glass-border); border-radius: 2px; }

/* Glass card utility */
.glass-card {
  background: var(--glass);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  border-radius: 20px;
}

/* Ambient glow background */
body::before {
  content: '';
  position: fixed;
  top: -30%;
  left: -10%;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(0, 229, 160, 0.06) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

/* Animaciones */
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-fade-in-up {
  animation: fade-in-up 0.4s ease-out forwards;
}
```

## 10. VARIABLES DE ENTORNO
### `.env.local`
```bash
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# NextAuth (si lo usas)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=genera-uno-con-openssl-rand-base64-32
```

## 11. DESPLIEGUE EN VERCEL
### `vercel.json`
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" }
      ]
    },
    {
      "source": "/sw.js",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" }
      ]
    }
  ]
}
```

## 12. CHECKLIST FINAL
* [ ] `next-pwa` configurado con service worker
* [ ] `manifest.json` con iconos PWA (192 y 512px)
* [ ] meta `apple-web-app` para iOS
* [ ] Firebase Auth con Google
* [ ] Firestore con reglas de seguridad
* [ ] Header sticky con blur al scroll
* [ ] ProfileCapsule con foto, nombre y rol de Google
* [ ] Dropdown con menú + cerrar sesión
* [ ] BottomNav glassmorphism solo en móvil
* [ ] SideNav solo en lg/xl
* [ ] Variables de entorno en Vercel

## 13. PÁGINAS POR IMPLEMENTAR
* `/`: Balance total, gráfica semanal, últimas transacciones
* `/gastos`: Lista filtrable con categorías y búsqueda
* `/ingresos`: Registro de entradas de dinero
* `/presupuesto`: Límites por categoría con barra de progreso
* `/reportes`: Gráficas mensuales con Recharts
* `/ajustes`: Perfil, notificaciones, exportar datos
