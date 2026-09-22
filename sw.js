/* =========================================================
   ÚTILHUB V23 — NOVA FLOW
   Service Worker
   ========================================================= */

const CACHE_NAME = "utilhub-v23-nova-flow-v1";

const APP_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.webmanifest"
];

/* =========================================================
   INSTALACIÓN
   ========================================================= */

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.error("ÚtilHub V23: error instalando caché:", error);
      })
  );
});

/* =========================================================
   ACTIVACIÓN
   ========================================================= */

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => {
        return Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        );
      })
      .then(() => self.clients.claim())
  );
});

/* =========================================================
   PETICIONES
   ========================================================= */

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // No guardar peticiones externas de APIs.
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request)
          .then((networkResponse) => {
            if (
              !networkResponse ||
              networkResponse.status !== 200 ||
              networkResponse.type === "opaque"
            ) {
              return networkResponse;
            }

            const copy = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(request, copy);
              })
              .catch(() => {});

            return networkResponse;
          })
          .catch(() => {
            // Si es una navegación y no hay Internet,
            // intentar cargar la página principal.
            if (request.mode === "navigate") {
              return caches.match("./index.html");
            }

            return new Response(
              "Contenido no disponible sin conexión.",
              {
                status: 503,
                statusText: "Offline",
                headers: {
                  "Content-Type": "text/plain; charset=utf-8"
                }
              }
            );
          });
      })
  );
});

/* =========================================================
   MENSAJES DESDE LA APP
   ========================================================= */

self.addEventListener("message", (event) => {
  if (!event.data) return;

  // Actualizar inmediatamente el Service Worker.
  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  // Limpiar la caché de ÚtilHub.
  if (event.data.type === "CLEAR_CACHE") {
    event.waitUntil(
      caches.delete(CACHE_NAME)
    );
  }
});
