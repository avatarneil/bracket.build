import "server-only";
import { and, eq, gt, inArray, lt, sql } from "drizzle-orm";
import { getDatabase } from "@/lib/db";
import {
  notificationDeliveries as deliveries,
  notificationEvents as events,
  notificationFollows as follows,
  notificationSettings as settings,
  notificationSnapshots as snapshots,
  pushSubscriptions as subscriptions,
} from "@/lib/db/schema";
import { detectAlerts, wantsAlert } from "./engine";
import { sendPush } from "./push";
import type { NotificationGame } from "./types";

export async function recordGameObservations(games: NotificationGame[], observedAt: Date) {
  if (!games.length) return;
  await getDatabase().transaction(async (tx) => {
    // Serialize overlapping cron observations; event and baseline commit together.
    await tx.execute(sql`select pg_advisory_xact_lock(73921416)`);
    const ids = games.map((game) => `${game.league}:${game.id}`);
    const previousRows = await tx.select().from(snapshots).where(inArray(snapshots.id, ids));
    const previous = new Map(previousRows.map((row) => [row.id, row]));
    for (const game of games) {
      const distance = new Date(game.date).getTime() - observedAt.getTime();
      if (!Number.isFinite(distance) || distance > 30 * 60_000 || distance < -8 * 60 * 60_000)
        continue;
      const id = `${game.league}:${game.id}`;
      const old = previous.get(id);
      if (old && old.observedAt >= observedAt) continue;
      if (old?.game.isComplete && game.isComplete) continue;
      const baseline =
        old && observedAt.getTime() - old.observedAt.getTime() <= 10 * 60_000 ? old.game : null;
      for (const alert of detectAlerts(game, baseline, observedAt.getTime())) {
        await tx
          .insert(events)
          .values({
            id: alert.id,
            alert,
            createdAt: observedAt,
            expiresAt: new Date(observedAt.getTime() + 5 * 60_000),
          })
          .onConflictDoNothing();
      }
      await tx
        .insert(snapshots)
        .values({ id, game, observedAt })
        .onConflictDoUpdate({ target: snapshots.id, set: { game, observedAt } });
    }
  });
}

export async function enqueueNotifications(origin: string, now = new Date()) {
  const db = getDatabase();
  const activeEvents = await db.select().from(events).where(gt(events.expiresAt, now));
  if (!activeEvents.length) return;
  let cursor = "";
  for (;;) {
    const devices = await db
      .select({
        device: subscriptions,
        preferences: settings.preferences,
        updatedAt: settings.updatedAt,
      })
      .from(subscriptions)
      .innerJoin(settings, eq(settings.ownerId, subscriptions.ownerId))
      .where(
        and(
          eq(subscriptions.origin, origin),
          gt(subscriptions.id, cursor),
          sql`${settings.preferences}->>'enabled' = 'true'`,
        ),
      )
      .orderBy(subscriptions.id)
      .limit(100);
    if (!devices.length) break;
    const ownerFollows = await db
      .select()
      .from(follows)
      .where(
        inArray(
          follows.ownerId,
          devices.map(({ device }) => device.ownerId),
        ),
      );
    const pending: (typeof deliveries.$inferInsert)[] = [];
    for (const { device, preferences, updatedAt } of devices) {
      for (const event of activeEvents) {
        // Never replay alerts that predate enrollment or a settings change.
        if (device.createdAt > event.createdAt || updatedAt > event.createdAt) continue;
        const selected = ownerFollows
          .filter((row) => row.ownerId === device.ownerId && row.createdAt <= event.createdAt)
          .map((row) => row.follow);
        if (wantsAlert(preferences, selected, event.alert))
          pending.push({
            eventId: event.id,
            subscriptionId: device.id,
            claimedAt: new Date(0),
            attempts: 0,
          });
      }
    }
    if (pending.length) await db.insert(deliveries).values(pending).onConflictDoNothing();
    cursor = devices[devices.length - 1].device.id;
  }
}

export async function deliverNotifications(origin: string, now = new Date(), send = sendPush) {
  const db = getDatabase();
  const pending = await db
    .select({
      delivery: deliveries,
      event: events,
      device: subscriptions,
      preferences: settings.preferences,
    })
    .from(deliveries)
    .innerJoin(events, eq(events.id, deliveries.eventId))
    .innerJoin(subscriptions, eq(subscriptions.id, deliveries.subscriptionId))
    .innerJoin(settings, eq(settings.ownerId, subscriptions.ownerId))
    .where(
      and(
        eq(subscriptions.origin, origin),
        gt(events.expiresAt, now),
        eq(deliveries.sent, false),
        lt(deliveries.attempts, 3),
        lt(deliveries.claimedAt, new Date(now.getTime() - 60_000)),
      ),
    )
    .orderBy(events.createdAt, deliveries.subscriptionId)
    .limit(100);
  let sent = 0;
  let failed = 0;
  // Ten at a time bounds network concurrency and stays inside the cron budget.
  for (let offset = 0; offset < pending.length; offset += 10) {
    await Promise.all(
      pending.slice(offset, offset + 10).map(async ({ delivery, event, device }) => {
        const claimedAt = new Date(Math.max(now.getTime(), Date.now()));
        const key = and(
          eq(deliveries.eventId, delivery.eventId),
          eq(deliveries.subscriptionId, delivery.subscriptionId),
        );
        const claimed = await db
          .update(deliveries)
          .set({ claimedAt, attempts: sql`${deliveries.attempts} + 1` })
          .where(
            and(
              key,
              eq(deliveries.sent, false),
              lt(deliveries.attempts, 3),
              lt(deliveries.claimedAt, new Date(claimedAt.getTime() - 60_000)),
            ),
          )
          .returning();
        if (!claimed.length) return;
        // Recheck opt-outs immediately before delivery, including removed follows/devices.
        const [current] = await db
          .select({
            preferences: settings.preferences,
            updatedAt: settings.updatedAt,
            createdAt: subscriptions.createdAt,
          })
          .from(subscriptions)
          .innerJoin(settings, eq(settings.ownerId, subscriptions.ownerId))
          .where(eq(subscriptions.id, device.id));
        const selected = await db.select().from(follows).where(eq(follows.ownerId, device.ownerId));
        if (
          !current ||
          current.updatedAt > event.createdAt ||
          current.createdAt > event.createdAt ||
          event.expiresAt <= new Date() ||
          !wantsAlert(
            current.preferences,
            selected.filter((row) => row.createdAt <= event.createdAt).map((row) => row.follow),
            event.alert,
          )
        ) {
          await db.update(deliveries).set({ sent: true }).where(key);
          return;
        }
        try {
          await send(
            device.subscription,
            {
              title: event.alert.title,
              body: event.alert.body,
              url: event.alert.url,
              tag: event.id,
            },
            Math.max(1, Math.floor((event.expiresAt.getTime() - Date.now()) / 1000)),
          );
          await db.update(deliveries).set({ sent: true }).where(key);
          sent++;
        } catch (error) {
          const status =
            typeof error === "object" && error && "statusCode" in error ? error.statusCode : null;
          if (status === 404 || status === 410)
            await db.delete(subscriptions).where(eq(subscriptions.id, device.id));
          // Other failures retry on a later run (at most three attempts before expiry).
          failed++;
        }
      }),
    );
  }
  const cutoff = new Date(now.getTime() - 8 * 24 * 60 * 60_000);
  await db.delete(events).where(lt(events.createdAt, cutoff));
  await db.delete(snapshots).where(lt(snapshots.observedAt, cutoff));
  return { sent, failed };
}
