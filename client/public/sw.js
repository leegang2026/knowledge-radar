// Service Worker — 网络优先，降级缓存
const CACHE = "radar-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    (async () => {
      try {
        const resp = await fetch(event.request);
        // 缓存成功的 GET 响应
        if (resp.ok && resp.type === "basic") {
          const clone = resp.clone();
          const cache = await caches.open(CACHE);
          cache.put(event.request, clone);
        }
        return resp;
      } catch {
        // 离线时使用缓存
        const cached = await caches.match(event.request);
        return cached || new Response("离线状态", { status: 503 });
      }
    })()
  );
});
