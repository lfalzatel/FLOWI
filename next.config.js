/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  // El manifest siempre de la red: si el service worker da uno viejo, Android instala FLOWI sin "Compartir"
  publicExcludes: ['!noprecache/**/*', '!manifest.json', '!offline.html'],
  // Sin internet y con una pantalla que no está guardada: muestra public/offline.html (servida como /offline)
  // en vez de la página blanca de Chrome "No hay conexión".
  fallbacks: { document: '/offline' },
});

const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
    ],
  },
};

module.exports = withPWA(nextConfig);
