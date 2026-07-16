/* Recipe Box service worker */
var CACHE = 'recipe-box-v2';
var SDK_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
var SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  SDK_URL
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { if (k !== CACHE) return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);

  // Supabase SDK from CDN: cache-first so the app opens offline
  if (e.request.url === SDK_URL) {
    e.respondWith(
      caches.match(SDK_URL).then(function (hit) {
        return hit || fetch(e.request).then(function (res) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(SDK_URL, copy); });
          return res;
        });
      })
    );
    return;
  }

  // Never intercept other cross-origin calls (Supabase API, auto-fetch) — let them hit the network
  if (url.origin !== location.origin) return;

  // App shell: network-first so updates arrive, cache fallback for offline
  e.respondWith(
    fetch(e.request).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      return res;
    }).catch(function () {
      return caches.match(e.request, { ignoreSearch: true }).then(function (hit) {
        return hit || caches.match('./index.html', { ignoreSearch: true });
      });
    })
  );
});
