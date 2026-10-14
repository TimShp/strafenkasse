// Service Worker: die App-Huelle liegt im Cache, damit in der Halle ohne Netz
// alles laeuft. Daten liegen in IndexedDB und laufen hier nicht durch.

const CACHE = 'strafenkasse-v5';

const HUELLE = [
  './',
  'index.html',
  'css/app.css',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'js/app.js',
  'js/db.js',
  'js/store.js',
  'js/konto.js',
  'js/format.js',
  'js/ui.js',
  'js/seed.js',
  'js/erfassen.js',
  'js/konten.js',
  'js/abschluss.js',
  'js/sicherung.js',
  'js/verwaltung.js',
  'fonts/Barlow-400.woff2',
  'fonts/Barlow-500.woff2',
  'fonts/Barlow-600.woff2',
  'fonts/BarlowCondensed-600.woff2',
  'fonts/BarlowCondensed-700.woff2'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(HUELLE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(namen => Promise.all(namen.filter(n => n !== CACHE).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

// Cache zuerst: offline ist der Normalfall, nicht die Ausnahme.
// Frische Dateien kommen beim naechsten Start aus dem Netz nach.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(treffer => {
      const ausNetz = fetch(e.request).then(antwort => {
        if (antwort.ok) caches.open(CACHE).then(c => c.put(e.request, antwort.clone()));
        return antwort;
      }).catch(() => treffer);
      return treffer || ausNetz;
    })
  );
});
