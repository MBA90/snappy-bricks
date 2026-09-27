/* Snappy Bricks offline helper: keeps the app working without internet after the first visit.
   Pages always try the network first, so updates show up right away when online. */
const CACHE = "snappy-bricks-v3";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE.map(u => new Request(u, {cache: "reload"})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  const isFont = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (url.origin !== location.origin && !isFont) return;
  const save = res => {
    if (res && (res.ok || res.type === "opaque")){ const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return res;
  };
  if (e.request.mode === "navigate"){
    // the page itself: newest from the network, saved copy when offline
    e.respondWith(fetch(e.request, {cache: "no-cache"}).then(save).catch(() => caches.match(e.request).then(hit => hit || caches.match("./index.html"))));
    return;
  }
  // icons, fonts and other files: saved copy first, refreshed in the background
  e.respondWith(caches.match(e.request).then(hit => {
    const net = fetch(e.request).then(save).catch(() => hit);
    return hit || net;
  }));
});
