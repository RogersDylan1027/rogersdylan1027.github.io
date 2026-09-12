/* My Dashboard · Service Worker · Version 0.9.0 · 2026-09-12 */
const CACHE_NAME = "my-dashboard-v0.9.0";
const BASE_PATH = "/Projects/Dashboard/";
const CORE_ASSETS = [
  BASE_PATH,
  BASE_PATH + "index.html",
  BASE_PATH + "login.html",
  BASE_PATH + "dashboard-config.js",
  BASE_PATH + "dashboard-entry.js",
  BASE_PATH + "dashboard-auth.js",
  BASE_PATH + "dashboard-pwa.js",
  BASE_PATH + "projects.json",
  BASE_PATH + "manifest.webmanifest",
  BASE_PATH + "logo.svg",
  BASE_PATH + "Reviews/"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE_PATH)) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(async () => {
          return (await caches.match(request)) || (await caches.match(BASE_PATH + "index.html"));
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

self.addEventListener("push", event => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "You have a new Dashboard notification." };
  }

  const title = payload.title || "My Dashboard";
  const options = {
    body: payload.body || "You have a new Dashboard notification.",
    icon: BASE_PATH + "logo.svg",
    badge: BASE_PATH + "logo.svg",
    tag: payload.tag || "my-dashboard-notification",
    data: {
      url: payload.url || BASE_PATH
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = event.notification?.data?.url || BASE_PATH;
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if ("focus" in client && client.url.includes(BASE_PATH)) {
          client.navigate(target);
          return client.focus();
        }
      }
      return clients.openWindow ? clients.openWindow(target) : undefined;
    })
  );
});
