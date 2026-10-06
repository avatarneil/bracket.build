export const PUSH_OWNER_KEY = "bracket-push-owner";

export function supportsPush() {
  return (
    window.isSecureContext &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}
export function needsHomeScreen() {
  return (
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) &&
    !window.matchMedia("(display-mode: standalone)").matches &&
    !(navigator as Navigator & { standalone?: boolean }).standalone
  );
}
export async function pushRegistration() {
  await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  let timeout: number | undefined;
  try {
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_resolve, reject) => {
        timeout = window.setTimeout(
          () => reject(new Error("Notification setup timed out. Please retry.")),
          10_000,
        );
      }),
    ]);
  } finally {
    window.clearTimeout(timeout);
  }
}
export function applicationServerKey(key: string) {
  const value = atob(key.replaceAll("-", "+").replaceAll("_", "/"));
  return Uint8Array.from(value, (character) => character.charCodeAt(0));
}
