// Guarded service-worker registration. Registers /sw.js only in the real
// published app — never in dev, Lovable preview, iframes, or with ?sw=off.
// In any refused context it unregisters stale copies of /sw.js instead.
function isRefusedContext(): boolean {
  if (!import.meta.env.PROD) return true;
  if (window.self !== window.top) return true;
  const host = window.location.hostname;
  if (host.startsWith("id-preview--") || host.startsWith("preview--")) return true;
  if (host === "lovableproject.com" || host.endsWith(".lovableproject.com")) return true;
  if (host === "lovableproject-dev.com" || host.endsWith(".lovableproject-dev.com")) return true;
  if (host === "beta.lovable.dev" || host.endsWith(".beta.lovable.dev")) return true;
  if (new URLSearchParams(window.location.search).get("sw") === "off") return true;
  return false;
}

function unregisterStale() {
  navigator.serviceWorker
    .getRegistrations()
    .then((regs) =>
      regs.forEach((reg) => {
        const script =
          reg.active?.scriptURL ?? reg.waiting?.scriptURL ?? reg.installing?.scriptURL ?? "";
        if (script.endsWith("/sw.js")) void reg.unregister();
      }),
    )
    .catch(() => {});
}

export function registerServiceWorker(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (isRefusedContext()) {
    unregisterStale();
    return;
  }
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
