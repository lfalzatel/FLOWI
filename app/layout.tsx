import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';


export const metadata: Metadata = {
  title: {
    default: 'FLOWI — Tu dinero, en flujo',
    template: '%s · FLOWI',
  },
  description: 'Organiza tus gastos dictando por voz 🎙️, controla tu presupuesto con la regla 50/30/20 🎯 y mira tus finanzas en tiempo real 📊.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FLOWI',
  },
  formatDetection: { telephone: false },
  icons: {
    icon:  [{ url: '/icons/icon-192.png' }],
    apple: [{ url: '/icons/icon-192.png' }],
  },
  openGraph: {
    title: 'FLOWI — Gastos Personales',
    description: 'Registra tus gastos por voz 🎙️, controla tu presupuesto 50/30/20 🎯 y mira tus finanzas en tiempo real 📊.',
    url: 'https://flowi-gastos.web.app/',
    siteName: 'FLOWI',
    images: [
      {
        url: 'https://flowi-gastos.web.app/icons/icon-512.png',
        width: 512,
        height: 512,
        alt: 'FLOWI App Icon',
      },
    ],
    locale: 'es_CO',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor:          '#00E5A0',
  width:               'device-width',
  initialScale:        1,
  maximumScale:        1,
  userScalable:        false,
  viewportFit:         'cover',
};

import { DataProvider } from '@/components/DataProvider';
import { WelcomeTour } from '@/components/layout/WelcomeTour';
import { InAppNotificationProvider } from '@/hooks/useInAppNotifications';
import { InAppToastStack } from '@/components/layout/InAppToastStack';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-deep text-text-primary antialiased">
        <InAppNotificationProvider>
          <ThemeProvider>
            <DataProvider>
              {children}
              <WelcomeTour />
              <InAppToastStack />
            </DataProvider>
          </ThemeProvider>
        </InAppNotificationProvider>
      </body>
    </html>
  );
}
