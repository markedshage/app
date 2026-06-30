const CACHE = 'markedshage-v220';
const ASSETS = [
  '/app/',
  '/app/index.html',
  '/app/manifest.json',
  '/app/icon-192.png',
  '/app/icon-512.png',
  '/app/favicon.svg',
  '/app/favicon-32.png',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.5.0/lz-string.min.js'
];

// Never cache or intercept these origins
const BYPASS_ORIGINS = [
  'api.jsonbin.io',
  'anthropic.com'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Pass through API calls and non-GET requests directly — never cache or intercept
  if (BYPASS_ORIGINS.some(origin => url.hostname.includes(origin))) {
    return; // let browser handle it natively
  }
  if (e.request.method !== 'GET') {
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        // Only cache same-origin and explicit CDN assets with ok status
        if (resp.ok && (url.origin === self.location.origin || ASSETS.includes(e.request.url))) {
          const clone = resp.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return resp;
      }).catch(() => {
        // Offline fallback for navigation only
        if (e.request.mode === 'navigate') {
          return caches.match('/app/index.html');
        }
        // For other failed requests, return a proper empty response
        return new Response('', { status: 503, statusText: 'Offline' });
      });
    })
  );
});
