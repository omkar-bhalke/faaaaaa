const cacheName = "finora-" + new URL(self.location.href).searchParams.get("v");
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(cacheName);
      const index = await fetch("./index.html", { cache: "reload" });
      if (!index.ok) throw new Error("App shell unavailable");
      const html = await index.clone().text();
      const assets = Array.from(
        html.matchAll(/(?:src|href)="([^"]+\/assets\/[^"]+|\/assets\/[^"]+)"/g),
        (match) => match[1],
      );
      await cache.addAll(assets);
      await cache.put("./index.html", index);
      await self.skipWaiting();
    })(),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await Promise.all(
        (await caches.keys())
          .filter((k) => k.startsWith("finora-") && k !== cacheName)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});
self.addEventListener("fetch", (event) => {
  if (
    event.request.method !== "GET" ||
    new URL(event.request.url).origin !== location.origin
  )
    return;
  event.respondWith(
    fetch(event.request).catch(
      async () =>
        (await caches.match(
          event.request.mode === "navigate" ? "./index.html" : event.request,
        )) || Response.error(),
    ),
  );
});
