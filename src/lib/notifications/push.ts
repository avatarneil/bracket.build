import "server-only";
import webpush from "web-push";
import { z } from "zod";

// Subscription URLs are user input: never let the sender become an SSRF proxy.
export function isPushEndpoint(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      !url.hash &&
      (url.hostname === "fcm.googleapis.com" ||
        url.hostname === "updates.push.services.mozilla.com" ||
        /^[a-z0-9-]+\.notify\.windows\.com$/.test(url.hostname) ||
        url.hostname === "web.push.apple.com" ||
        /^[a-z0-9-]+\.push\.apple\.com$/.test(url.hostname))
    );
  } catch {
    return false;
  }
}
export const pushSubscriptionSchema = z.object({
  endpoint: z.string().max(2048).refine(isPushEndpoint),
  keys: z.strictObject({
    p256dh: z.string().regex(/^[A-Za-z0-9_-]{87}=?$/),
    auth: z.string().regex(/^[A-Za-z0-9_-]{22}(==)?$/),
  }),
});

export function pushConfiguration() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return null;
  return { publicKey, privateKey, subject };
}

export async function sendPush(
  subscription: z.infer<typeof pushSubscriptionSchema>,
  payload: object,
  ttl = 300,
) {
  const vapidDetails = pushConfiguration();
  if (!vapidDetails) throw new Error("Web Push is not configured");
  pushSubscriptionSchema.parse(subscription);
  await webpush.sendNotification(subscription, JSON.stringify(payload), {
    vapidDetails,
    TTL: ttl,
    urgency: "normal",
    timeout: 10_000,
  });
}
