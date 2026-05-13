// Phase 11 (2026-05-13): scan_date が古いまま固着する問題対策で v2 に bump。
// 加えて index.html / manifest.json は network-only (no-cache) にして
// 旧 SW で開いている既存ユーザーにも次回起動時に必ず最新が届くようにする。
const CACHE_NAME = 'tachikoma-v4-cache-v2';
const STATIC_ASSETS = [
    './icon-192.png',
    './icon-512.png'
  ];
const ALWAYS_NETWORK = [
    './',
    './index.html',
    './manifest.json',
    './sw.js'
  ];

self.addEventListener('install', event => {
    event.waitUntil(
          caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
        );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
          caches.keys().then(keys =>
                  Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
                                 )
        );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    const path = url.pathname.replace(/^.*\//, './');
    const isHtmlOrManifest = ALWAYS_NETWORK.some(p =>
        path === p || url.pathname.endsWith(p.replace('./', '/'))
    ) || event.request.mode === 'navigate';

    if (isHtmlOrManifest) {
        // network-only with cache fallback (オフライン時のみ古い HTML)
        event.respondWith(
            fetch(event.request, { cache: 'no-store' })
              .then(response => {
                  const clone = response.clone();
                  caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                  return response;
              })
              .catch(() => caches.match(event.request))
        );
    } else {
        // static assets: cache-first
        event.respondWith(
            caches.match(event.request).then(cached =>
                cached || fetch(event.request).then(response => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    return response;
                })
            )
        );
    }
});
