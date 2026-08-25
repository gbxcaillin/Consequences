/* Consequences service worker — network-first with cache fallback, so
 * updates land immediately when online and the game still runs offline. */
const CACHE = 'consequences-v53';
const CORE = [
  './',
  'index.html',
  'css/style.css',
  'js/audio.js',
  'js/music.js',
  'js/storage.js',
  'js/engine.js',
  'data/game-data.json',
  'manifest.webmanifest',
  'assets/icons/icon-192.png',
  'assets/icons/sound-on.webp',
  'assets/icons/sound-off.webp',
  'assets/icons/icon-512.png',
  'assets/scenes/thornfield-village.webp',
  'assets/scenes/aldrics-tower.webp',
  'assets/scenes/greymarch.webp',
  'assets/scenes/mount-ashenmere.webp',
  'assets/scenes/high-court.webp',
  'assets/scenes/willowmere.webp',
  'assets/scenes/moonlit-glade.webp',
  'assets/scenes/river-meridian.webp',
  'assets/scenes/wayrest-inn.webp',
  'assets/scenes/vellbrook.webp',
  'assets/scenes/opening-sky.webp',
  'assets/scenes/opening-sky.mp4',
  'assets/scenes/opening-sky.webm',
  'assets/map/journey-map.webp',
  'assets/map/traveler.webp',
  'assets/portraits/wren.webp',
  'assets/portraits/tam.webp',
  'assets/portraits/hedda.webp',
  'assets/portraits/aldric.webp',
  'assets/portraits/brakka.webp',
  'assets/portraits/grukha.webp',
  'assets/portraits/vhaleth.webp',
  'assets/portraits/king-aldren.webp',
  'assets/portraits/odile.webp',
  'assets/portraits/marigold.webp',
  'assets/portraits/priestess.webp',
  'assets/portraits/herald.webp',
  'assets/portraits/unicorn.webp',
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
        // Never cache errors — a 404 cached during an outage would poison
        // the app shell and outlive the outage itself.
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone)).catch(() => {});
          return res;
        }
        // The host serves 404s while the site is on hold; anyone who has
        // loaded the game once gets the cached copy instead of the outage.
        return caches.match(e.request).then((m) =>
          m || (e.request.mode === 'navigate' ? caches.match('index.html').then((i) => i || res) : res));
      })
      .catch(() =>
        caches.match(e.request).then((m) =>
          m || (e.request.mode === 'navigate' ? caches.match('index.html') : undefined))
      )
  );
});
