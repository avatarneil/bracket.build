import "server-only";
import { createHash } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  followKey,
  type NotificationFollow,
  type NotificationPreferences,
} from "@/lib/notifications/types";
import { pushConfiguration, pushSubscriptionSchema } from "@/lib/notifications/push";
import { BracketStoreError } from "./brackets";
import { getDatabase } from "./index";
import { notificationFollows, notificationSettings, pushSubscriptions } from "./schema";

export async function getNotificationSettings(ownerId: string) {
  const db = getDatabase();
  const [settings, follows] = await Promise.all([
    db.select().from(notificationSettings).where(eq(notificationSettings.ownerId, ownerId)),
    db
      .select()
      .from(notificationFollows)
      .where(eq(notificationFollows.ownerId, ownerId))
      .orderBy(notificationFollows.key),
  ]);
  return {
    preferences: settings[0]?.preferences ?? { ...DEFAULT_NOTIFICATION_PREFERENCES },
    follows: follows.map((row) => row.follow),
    publicKey: pushConfiguration()?.publicKey ?? null,
  };
}

export async function saveNotificationPreferences(
  ownerId: string,
  patch: Partial<NotificationPreferences>,
) {
  const preferences = { ...DEFAULT_NOTIFICATION_PREFERENCES, ...patch };
  const [row] = await getDatabase()
    .insert(notificationSettings)
    .values({ ownerId, preferences })
    .onConflictDoUpdate({
      target: notificationSettings.ownerId,
      set: {
        preferences: sql`${notificationSettings.preferences} || ${JSON.stringify(patch)}::jsonb`,
        updatedAt: new Date(),
      },
    })
    .returning();
  return row.preferences;
}

export async function saveNotificationFollow(ownerId: string, follow: NotificationFollow) {
  return getDatabase().transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`notification-follow:${ownerId}`}))`,
    );
    const rows = await tx
      .select({ key: notificationFollows.key })
      .from(notificationFollows)
      .where(eq(notificationFollows.ownerId, ownerId));
    const key = followKey(follow);
    if (rows.length >= 100 && !rows.some((row) => row.key === key))
      throw new BracketStoreError(
        409,
        "You can follow up to 100 games and team seasons. Remove an old follow first.",
      );
    await tx
      .insert(notificationFollows)
      .values({ ownerId, key, follow })
      .onConflictDoUpdate({
        target: [notificationFollows.ownerId, notificationFollows.key],
        set: { follow, createdAt: new Date() },
      });
    return follow;
  });
}

export async function deleteNotificationFollow(ownerId: string, key: string) {
  await getDatabase()
    .delete(notificationFollows)
    .where(and(eq(notificationFollows.ownerId, ownerId), eq(notificationFollows.key, key)));
  return { ok: true };
}

export function subscriptionId(endpoint: string) {
  return createHash("sha256").update(endpoint).digest("hex");
}

export async function savePushSubscription(ownerId: string, input: unknown, origin: string) {
  if (!pushConfiguration())
    throw new BracketStoreError(503, "Notifications are not configured yet.");
  const subscription = pushSubscriptionSchema.parse(input);
  const id = subscriptionId(subscription.endpoint);
  return getDatabase().transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`notification-device:${ownerId}`}))`,
    );
    const rows = await tx
      .select({ id: pushSubscriptions.id })
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.ownerId, ownerId));
    if (rows.length >= 10 && !rows.some((row) => row.id === id))
      throw new BracketStoreError(
        409,
        "This account has 10 notification devices. Remove a device in settings first.",
      );
    const saved = await tx
      .insert(pushSubscriptions)
      .values({ id, ownerId, subscription, origin })
      .onConflictDoUpdate({
        target: pushSubscriptions.id,
        set: { subscription, origin },
        setWhere: eq(pushSubscriptions.ownerId, ownerId),
      })
      .returning({ id: pushSubscriptions.id });
    if (!saved.length)
      throw new BracketStoreError(
        409,
        "This browser belongs to another notification account. Reset this device and enable it again.",
      );
    return { ok: true };
  });
}

export async function deletePushSubscription(ownerId: string, endpoint?: string) {
  await getDatabase()
    .delete(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.ownerId, ownerId),
        endpoint ? eq(pushSubscriptions.id, subscriptionId(endpoint)) : undefined,
      ),
    );
  return { ok: true };
}
