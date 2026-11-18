// Keeps the app's own files on the device so it opens offline; research and the AI need a connection.
const CACHE = 'prio-0.39.0';
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', 'index.html', 'app.css', 'web.css', 'account.css', 'session.js', 'accounts-core.js', 'account-page.js', 'app.js', 'deck-options.js', 'publishing.js', 'services.js', 'advertising-service.json', 'home.js', 'home-games.js', 'home.css', 'intro.js', 'engine.js', 'studio-web.js', 'pages-web.js', 'crm.js', 'targets.js', 'targets-page.js', 'buddy.js', 'company.js', 'make.js', 'compare.js', 'plates.js', 'logo-schemes.js', 'marks.js', 'themes.js', 'viewer.html', 'viewer.js', 'manifest.json'])).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  // The newest copy when online, the saved copy when not.
  e.respondWith(fetch(e.request).then((r) => { const c = r.clone(); caches.open(CACHE).then((x) => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request)));
});
