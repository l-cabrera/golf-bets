// Serve from cache instantly (spotty course signal), refresh the cache in the background.
const CACHE = 'golfbets-v15';
const ASSETS = ['./index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
// Firebase SDK for the live link; kept so the app can sync as soon as signal returns, even if it started offline
const FB_SDK = ['app', 'auth', 'database'].map(m => `https://www.gstatic.com/firebasejs/10.12.2/firebase-${m}.js`);

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(async c => {
    await c.addAll(ASSETS);
    // best effort: installing without signal must still succeed
    await Promise.all(FB_SDK.map(u => c.add(new Request(u, {mode: 'cors'})).catch(() => {})));
  }));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const sdk = FB_SDK.includes(url.origin + url.pathname);
  if (url.origin !== location.origin && !sdk) return;
  // every page load (/, /index.html, /?view=…) is the same file: keep one copy so an update can't hide behind another URL
  const page = e.request.mode === 'navigate' && /\/(index\.html)?$/.test(url.pathname);
  const key = page ? './index.html' : e.request;
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(key, {ignoreSearch: true});
    const net = fetch(e.request).then(r => { if (r.ok) c.put(key, r.clone()); return r; });
    if (hit) { net.catch(() => {}); return hit; }
    return net;
  }));
});
