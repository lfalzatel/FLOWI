import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';


export const metadata: Metadata = {
  title: {
    default: 'Flowi — Tu dinero, en flujo',
    template: '%s · Flowi',
  },
  description: 'Administra tus gastos personales con estilo. PWA con Firebase.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Flowi',
  },
  formatDetection: { telephone: false },
  icons: {
    icon:  [{ url: '/icons/icon-192.png' }],
    apple: [{ url: '/icons/icon-192.png' }],
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
        <ThemeProvider>
          <DataProvider>
            {children}
            <WelcomeTour />
          </DataProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
