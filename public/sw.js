/* Web Push only: account pages and live scores are never cached offline. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let message = {};
  try {
    message = event.data?.json() ?? {};
  } catch {
    /* Show a safe fallback. */
  }
  event.waitUntil(
    self.registration.showNotification(
      typeof message.title === "string" ? message.title.slice(0, 180) : "bracket.build",
      {
        body:
          typeof message.body === "string"
            ? message.body.slice(0, 500)
            : "Open bracket.build for game updates.",
        icon: "/pwa-icon/192",
        badge: "/icon",
        tag: typeof message.tag === "string" ? message.tag : "bracket-update",
        data: { url: typeof message.url === "string" ? message.url : "/" },
      },
    ),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  let url = new URL("/", self.location.origin);
  try {
    const target = new URL(event.notification.data?.url ?? "/", self.location.origin);
    if (target.origin === self.location.origin && ["/", "/settings"].includes(target.pathname))
      url = target;
  } catch {
    /* Ignore malformed targets. */
  }
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const existing = windows.find((client) => client.url === url.href);
      if (existing) return existing.focus();
      // Preserve any bracket editing in another window.
      return self.clients.openWindow(url.href);
    })(),
  );
});
