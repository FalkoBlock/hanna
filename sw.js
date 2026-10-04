// Offline-Betrieb: eigene Dateien zuerst aus dem Netz (Updates), bei Funkloch aus dem Speicher.
const PREFIX = "uebungen-tochter-";
const CACHE = PREFIX + "v8";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icon-rosa-180.png", "./icon-rosa-192.png", "./icon-rosa-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)));
  self.skipWaiting();
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(k => k.startsWith(PREFIX) && k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
function store(req, res) {
  const copy = res.clone();
  caches.open(CACHE).then(c => c.put(req, copy));
  return res;
}
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Unterordner (z. B. tochter/) gehören einer anderen App: nicht anfassen
  const base = new URL("./", self.registration.scope).pathname;
  if (url.origin === location.origin && url.pathname.startsWith(base) && url.pathname.slice(base.length).includes("/")) return;
  if (url.origin === location.origin) {
    const net = fetch(req).then(res => store(req, res));
    const slow = new Promise((_, reject) => setTimeout(reject, 3000));
    e.respondWith(Promise.race([net, slow]).catch(() =>
      caches.match(req).then(r => r || caches.match("./index.html")).then(r => r || net)));
  } else if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => store(req, res))));
  }
});
