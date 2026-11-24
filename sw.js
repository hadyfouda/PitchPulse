/* PitchPulse service worker.
 * The build step (vite.config.ts → precacheManifest) replaces the two placeholders below with the build id and the full
 * list of emitted files, so the whole app — including the match and league workers — is available offline after the
 * first visit. Pages are network-first (updates arrive when online); everything else is cache-first.
 */
const BUILD = 'mwuoy9mx';
const PRECACHE = ["./","./assets/index-BlbNeV5u.js","./assets/index-CYkPS9dr.css","./assets/leagueSim.worker-CY1ayOba.js","./assets/matchEngine.worker-CFthWNd1.js","./favicon.svg","./icons/apple-touch-icon.png","./icons/icon-192.png","./icons/icon-512.png","./icons/maskable-512.png","./index.html","./manifest.webmanifest"];
const CACHE = `pitchpulse-${BUILD}`;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('pitchpulse-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put('./index.html', copy));
      return res;
    }).catch(() => caches.match('./index.html', { ignoreSearch: true, ignoreVary: true }).then(r => r || caches.match(req))));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true, ignoreVary: true }).then(hit => hit || fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  })));
});
