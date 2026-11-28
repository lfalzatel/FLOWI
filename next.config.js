/** @type {import('next').NextConfig} */
const fs = require('fs');
const path = require('path');

// Todas las pantallas de la app (cada app/**/page.tsx sin rutas dinámicas), para guardarlas en el
// celular apenas se instala FLOWI: así abren sin internet aunque nunca se hayan visitado.
// Se guarda el HTML (/gastos) y lo que Next pide al navegar dentro de la app (/gastos.txt).
const SKIP_PAGES = ['/prueba-fondo'];
function appRoutes(dir = path.join(__dirname, 'app'), base = '') {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (e.name.startsWith('[') || e.name.startsWith('_') || e.name.startsWith('(')) continue;
      out.push(...appRoutes(path.join(dir, e.name), `${base}/${e.name}`));
    } else if (e.name === 'page.tsx' || e.name === 'page.ts') {
      out.push(base || '/');
    }
  }
  return out;
}
const buildRev = String(Date.now());
const pageEntries = appRoutes()
  .filter(r => !SKIP_PAGES.includes(r))
  .flatMap(r => [
    { url: r, revision: buildRev },
    { url: r === '/' ? '/index.txt' : `${r}.txt`, revision: buildRev },
  ]);

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
  additionalManifestEntries: pageEntries,
  // Al navegar dentro de la app Next pide /gastos.txt?_rsc=…: se ignora ese parámetro para usar lo guardado
  ignoreURLParametersMatching: [/^utm_/, /^fbclid$/, /^_rsc$/],
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
