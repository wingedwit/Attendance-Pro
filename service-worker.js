// Keep in sync with APP_VERSION in app.js for controlled release rollouts.
const APP_VERSION = '1.0.5';
const CACHE_VERSION = `attendance-pro-v${APP_VERSION}`;
const SHELL_CACHE = `shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;
const RUNTIME_CACHE_MAX_ENTRIES = 40;

const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './lib/date-utils.js',
  './lib/storage-utils.js',
  './lib/attendance-logic.js',
  './app.js',
  './pwa-register.js',
  './manifest.webmanifest',
  './assets/css/tailwind.min.css',
  './assets/vendor/flatpickr/flatpickr.min.js',
  './assets/vendor/flatpickr/themes/dark.css',
  './assets/vendor/flatpickr/themes/light.css',
  './assets/icons/icon.svg',
  './assets/icons/icon-maskable.svg'
];

const OFFLINE_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Offline - Attendance Pro</title>
  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#edf5ff;color:#11213f;margin:0;display:grid;place-items:center;min-height:100vh;padding:24px}
    .card{max-width:460px;background:#fff;border:1px solid #dbe7ff;border-radius:14px;padding:20px;box-shadow:0 8px 24px rgba(23,64,129,.08)}
    h1{margin:0 0 8px;font-size:1.25rem}
    p{margin:0;line-height:1.5}
  </style>
</head>
<body>
  <div class="card">
    <h1>You are offline</h1>
    <p>Attendance Pro could not load this page right now. Reconnect to the internet and refresh.</p>
  </div>
</body>
</html>`;

const shouldCacheResponse = (response) =>
  Boolean(response) && response.ok && response.type === 'basic';

const addShellAsset = async (cache, url) => {
  try {
    await cache.add(url);
  } catch (_) {
    // A missing optional asset should not block the whole service worker update.
  }
};

const trimRuntimeCache = async () => {
  const cache = await caches.open(RUNTIME_CACHE);
  const keys = await cache.keys();
  if (keys.length <= RUNTIME_CACHE_MAX_ENTRIES) return;
  const deleteCount = keys.length - RUNTIME_CACHE_MAX_ENTRIES;
  await Promise.all(keys.slice(0, deleteCount).map((request) => cache.delete(request)));
};

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await Promise.all(APP_SHELL.map((url) => addShellAsset(cache, url)));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter((name) => name !== SHELL_CACHE && name !== RUNTIME_CACHE)
        .map((name) => caches.delete(name))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(event.request);
        if (shouldCacheResponse(fresh)) {
          const runtime = await caches.open(RUNTIME_CACHE);
          await runtime.put(event.request, fresh.clone());
          await trimRuntimeCache();
        }
        return fresh;
      } catch (_) {
        const cachedPage = await caches.match(event.request);
        if (cachedPage) return cachedPage;
        const cachedShell = await caches.match('./index.html');
        if (cachedShell) return cachedShell;
        return new Response(OFFLINE_HTML, {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;

    try {
      const fresh = await fetch(event.request);
      if (shouldCacheResponse(fresh)) {
        const runtime = await caches.open(RUNTIME_CACHE);
        await runtime.put(event.request, fresh.clone());
        await trimRuntimeCache();
      }
      return fresh;
    } catch (_) {
      if (event.request.destination === 'document') {
        const cachedShell = await caches.match('./index.html');
        if (cachedShell) return cachedShell;
        return new Response(OFFLINE_HTML, {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      }
      return new Response('', { status: 503, statusText: 'Offline' });
    }
  })());
});
