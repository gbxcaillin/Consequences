/* Consequences service worker — network-first with cache fallback, so
 * updates land immediately when online and the game still runs offline. */
const CACHE = 'consequences-v4';
const CORE = [
  './',
  'index.html',
  'css/style.css',
  'js/audio.js',
  'js/storage.js',
  'js/engine.js',
  'data/game-data.json',
  'manifest.webmanifest',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/scenes/thornfield-village.png',
  'assets/scenes/aldrics-tower.png',
  'assets/scenes/greymarch.png',
  'assets/scenes/mount-ashenmere.png',
  'assets/scenes/high-court.png',
  'assets/scenes/willowmere.png',
  'assets/scenes/moonlit-glade.png',
  'assets/sprites/herald.png',
  'assets/sprites/aldric.png',
  'assets/sprites/grukha.png',
  'assets/sprites/dragon.png',
  'assets/sprites/king-aldren.png',
  'assets/sprites/halfling.png',
  'assets/sprites/unicorn.png',
  'assets/sprites/hero.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
