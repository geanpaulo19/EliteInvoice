/* ══════════════════════════════════════════════════
   EliteInvoice — Service Worker
   Strategy:
   - App shell (HTML/CSS/JS): Cache-first, update in background
   - FX API calls: Network-first, fall back to cached
   - AI Worker calls: Network-only (can't work offline)
   - Everything else: Stale-while-revalidate
══════════════════════════════════════════════════ */

const VERSION      = 'v1';
const CACHE_SHELL  = `eliteinvoice-shell-${VERSION}`;
const CACHE_ASSETS = `eliteinvoice-assets-${VERSION}`;

// App shell — cached on install, served immediately
const SHELL_FILES = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/404.html',
  '/icon-192.png',
  '/icon-512.png'
];

// ── Install: pre-cache shell ──
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_SHELL)
      .then(cache => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
      .catch(err => console.warn('[SW] Install cache failed:', err))
  );
});

// ── Activate: remove old caches ──
self.addEventListener('activate', (e) => {
  const keep = [CACHE_SHELL, CACHE_ASSETS];
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => !keep.includes(k))
          .map(k => {
            console.log('[SW] Removing old cache:', k);
            return caches.delete(k);
          })
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: routing logic ──
self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // Skip non-GET and browser extension requests
  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // AI Worker / FX API — network only / network first
  const isWorker = url.hostname.endsWith('workers.dev');
  const isFxApi  = url.hostname.includes('frankfurter') ||
                   url.hostname.includes('open.er-api');

  if (isWorker) {
    // Network-only — AI can't work offline
    return;
  }

  if (isFxApi) {
    // Network-first — serve cached rates if offline
    e.respondWith(networkFirst(request, CACHE_ASSETS));
    return;
  }

  // App shell files — cache-first, update in background
  if (isShellFile(url)) {
    e.respondWith(cacheFirst(request, CACHE_SHELL));
    return;
  }

  // Google Fonts and other CDN assets — stale-while-revalidate
  if (url.hostname.includes('fonts.googleapis') ||
      url.hostname.includes('fonts.gstatic') ||
      url.hostname.includes('cdnjs.cloudflare')) {
    e.respondWith(staleWhileRevalidate(request, CACHE_ASSETS));
    return;
  }

  // Everything else on same origin — cache-first
  if (url.origin === self.location.origin) {
    e.respondWith(cacheFirst(request, CACHE_SHELL));
  }
});

// ── Helpers ──

function isShellFile(url) {
  return url.origin === self.location.origin &&
    (url.pathname === '/' ||
     SHELL_FILES.some(f => url.pathname === f || url.pathname.endsWith(f)));
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) {
    // Refresh in background
    refreshCache(request, cacheName);
    return cached;
  }
  return fetchAndCache(request, cacheName);
}

async function networkFirst(request, cacheName) {
  try {
    return await fetchAndCache(request, cacheName);
  } catch (_) {
    const cached = await caches.match(request);
    return cached || offlineFallback(request);
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cached = await caches.match(request);
  const fetchPromise = fetchAndCache(request, cacheName).catch(() => {});
  return cached || fetchPromise;
}

async function fetchAndCache(request, cacheName) {
  const response = await fetch(request);
  if (response.ok && response.type !== 'opaque') {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

function refreshCache(request, cacheName) {
  fetch(request)
    .then(response => {
      if (response.ok) {
        caches.open(cacheName).then(c => c.put(request, response));
      }
    })
    .catch(() => {});
}

function offlineFallback(request) {
  const url = new URL(request.url);
  if (request.headers.get('accept')?.includes('text/html')) {
    return caches.match('/index.html');
  }
  return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
}
