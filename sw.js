// ابزاربوک — کش آفلاین: بعد از اولین بازدید، همه ابزارها بدون اینترنت کار می‌کنند.
const VERSION = 'abzarbook-v3';
const PRECACHE = [
  '/',
  '/index.html',
  '/hoghoogh-dastmazd.html',
  '/eydi-1405.html',
  '/sanavat-payan-kar.html',
  '/maliat-hoghoogh-1405.html',
  '/hoghoogh-khales-1405.html',
  '/rahn-vam.html',
  '/tabdil-rahn-ejare.html',
  '/ghest-vam-ezdevaj-1405.html',
  '/saghf-ejare-1405.html',
  '/llms.txt',
  '/text-tools.html',
  '/vahed.html',
  '/salamat.html',
  '/size-chart.html',
  '/etebarsanji.html',
  '/taghvim.html',
  '/sen.html',
  '/qrcode.html',
  '/ramz.html',
  '/404.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// شبکه اول (تازه‌ترین نسخه)، اگر آفلاین بود از کش
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((cached) => {
          if (cached) return cached;
          if (req.mode === 'navigate') return caches.match('/index.html');
          return Response.error();
        })
      )
  );
});
