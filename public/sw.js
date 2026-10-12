const CACHE = "so-na-rede-v1";
const APP_ASSETS = [];
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(
        [
          "/",
          "/index.html",
          "/manifest.webmanifest",
          "/manifest-public.webmanifest",
          "/icon.svg",
          "/team-logo.png",
          "/team-logo-transparent.png",
          "/icon-192.png",
          "/icon-512.png",
          "/live-config.json",
          "/live-setup.sql",
          "/videos-setup.sql",
          "/ativar-online.md",
          "/CLOUDFLARE.md",
          "/VERCEL.md",
          ...APP_ASSETS,
        ].map((url) => new Request(url, { cache: "reload" })),
      );
      const page = await (await cache.match("/index.html")).text();
      const assets = [
        ...page.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g),
      ].map((m) => m[1]);
      await cache.addAll(
        assets.map((url) => new Request(url, { cache: "reload" })),
      );
      // APP_ASSETS includes lazy page chunks and the Portuguese font.
      await self.skipWaiting();
    })(),
  );
});
self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      // Keep one prior app bundle while open tabs finish loading their HTML.
      const previous = (await caches.keys())
        .filter((key) => key.startsWith("so-na-rede-") && key !== CACHE)
        .sort()
        .reverse();
      for (const key of previous.slice(1)) await caches.delete(key);
      await self.clients.claim();
    })(),
  ),
);
self.addEventListener("fetch", (event) => {
  if (
    event.request.method !== "GET" ||
    new URL(event.request.url).origin !== location.origin
  )
    return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      if (new URL(event.request.url).pathname === "/live-config.json") {
        try {
          const response = await fetch(event.request, { cache: "no-cache" });
          if (response.ok) await cache.put(event.request, response.clone());
          return response;
        } catch {
          return (await cache.match(event.request)) || Response.error();
        }
      }
      if (event.request.mode === "navigate") {
        try {
          const response = await fetch(event.request, { cache: "no-cache" });
          if (response.ok) {
            // Promote HTML only after its matching bundle is available offline.
            // An already controlling worker can serve a newer build before the
            // new worker finishes installation; keep the previous complete page.
            try {
              const page = await response.clone().text();
              const assets = [
                ...page.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g),
              ].map((m) => m[1]);
              const manifest = await fetch("/app-assets.json", {
                cache: "no-cache",
              });
              if (!manifest.ok)
                throw new Error("Offline bundle manifest unavailable");
              const completeBundle = await manifest.json();
              if (
                !Array.isArray(completeBundle) ||
                completeBundle.some(
                  (url) =>
                    typeof url !== "string" || !url.startsWith("/assets/"),
                )
              )
                throw new Error("Invalid bundle manifest");
              assets.push(...completeBundle);
              for (const url of assets) {
                if (!(await cache.match(url)))
                  await cache.add(new Request(url, { cache: "reload" }));
              }
              await cache.put("/index.html", response.clone());
            } catch {
              /* Preserve the last complete offline page if precaching fails. */
            }
            return response;
          }
        } catch {
          /* The cached page and assets remain available offline. */
        }
        return (await cache.match("/index.html")) || Response.error();
      }
      const hit =
        // Static files are identical for all same-origin request modes. A
        // precache request can omit Origin while module/font requests include
        // it; Vary: Origin must not make an installed bundle disappear offline.
        (await cache.match(event.request, { ignoreVary: true })) ||
        (await caches.match(event.request, { ignoreVary: true }));
      if (hit) return hit;
      try {
        const response = await fetch(event.request);
        if (
          response.ok &&
          !(
            new URL(event.request.url).pathname.startsWith("/assets/") &&
            response.headers.get("content-type")?.includes("text/html")
          )
        )
          await cache.put(event.request, response.clone());
        return response;
      } catch (error) {
        if (event.request.mode === "navigate")
          return (await cache.match("/index.html")) || Response.error();
        return Response.error();
      }
    })(),
  );
});
