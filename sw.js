/* Recall service worker. Network-first for the app shell, so updates show up as soon as you're online,
   with the cached copy as the offline fallback. Bump CACHE when shell files change. */
const CACHE = "recall-v8";
const SHELL = ["./", "index.html", "styles.css", "manifest.webmanifest",
  "lib.js", "migrate.js", "entitlements.js", "langs.js", "push.js", "app.js", "voice.js", "flow.js", "boot.js",
  "fonts/inter-latin-wght-normal.woff2", "fonts/space-grotesk-latin-wght-normal.woff2",
  "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "icons/favicon.svg", "icons/favicon-32.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("recall-") && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok && res.type === "basic") { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || (req.mode === "navigate" ? caches.match("index.html") : Response.error())))
  );
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(cs => cs.length ? cs[0].focus() : self.clients.openWindow("./")));
});
