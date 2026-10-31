const VERSION = 'blink-shell-v2';
const ROOT = new URL('./', self.location.href);
const SHELL = [ROOT.href, new URL('index.html', ROOT).href, new URL('manifest.webmanifest', ROOT).href, new URL('blink-mark.svg', ROOT).href, new URL('blink-192.png', ROOT).href, new URL('blink-512.png', ROOT).href];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('blink-shell-') && key !== VERSION).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      const copy = response.clone(); caches.open(VERSION).then(cache => cache.put(new URL('index.html', ROOT).href, copy));
      return response;
    }).catch(() => caches.match(new URL('index.html', ROOT).href)));
    return;
  }
  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (response.ok) caches.open(VERSION).then(cache => cache.put(request, response.clone()));
    return response;
  })));
});
