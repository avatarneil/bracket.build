import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { eq, inArray, and } from "drizzle-orm";
import {
  deleteNotificationFollow,
  deletePushSubscription,
  getNotificationSettings,
  saveNotificationFollow,
  saveNotificationPreferences,
  savePushSubscription,
  subscriptionId,
} from "./notifications";
import { getDatabase } from "./index";
import {
  notificationDeliveries,
  notificationEvents,
  notificationFollows,
  notificationSettings,
  notificationSnapshots,
  pushSubscriptions,
} from "./schema";
import {
  deliverNotifications,
  enqueueNotifications,
  recordGameObservations,
} from "@/lib/notifications/dispatch";
import { followKey, type NotificationGame } from "@/lib/notifications/types";

(process.env.TEST_DATABASE_URL ? test : test.skip)(
  "notification ownership, atomic preferences, deduplication, opt-outs, retries and expired devices",
  async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    const oldConfig = [
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY,
      process.env.VAPID_SUBJECT,
    ];
    process.env.VAPID_PUBLIC_KEY = "test-public";
    process.env.VAPID_PRIVATE_KEY = "test-private";
    process.env.VAPID_SUBJECT = "https://bracket.build";
    const id = randomUUID();
    const owner = `notification-a-${id}`,
      other = `notification-b-${id}`;
    const origin = `https://${id}.test`;
    const subscription = {
      endpoint: `https://fcm.googleapis.com/fcm/send/${id}`,
      keys: { p256dh: "B".repeat(87), auth: "A".repeat(22) },
    };
    const deviceId = subscriptionId(subscription.endpoint);
    const team = {
      id: "NE",
      name: "Patriots",
      location: "New England",
      abbreviation: "NE",
      displayName: "New England Patriots",
      record: "3-1",
      logoUrl: "",
      color: "#000000",
    };
    const game: NotificationGame = {
      id,
      league: "nfl",
      season: 2026,
      phase: "regular",
      week: 4,
      date: new Date().toISOString(),
      homeTeam: team,
      awayTeam: { ...team, id: "BUF", abbreviation: "BUF" },
      homeScore: 0,
      awayScore: 0,
      isComplete: false,
      isInProgress: false,
      statusText: "Scheduled",
      quarter: null,
      timeRemaining: null,
      winnerId: null,
      venue: null,
      broadcasts: [],
      possession: null,
      isRedZone: false,
    };
    const follow = {
      league: "nfl" as const,
      season: 2026,
      kind: "game" as const,
      targetId: id,
      label: "BUF at NE",
      gameStart: true,
      majorUpdates: true,
    };
    const db = getDatabase();
    const eventIds: string[] = [];
    try {
      assert.equal((await getNotificationSettings(owner)).preferences.enabled, false);
      await Promise.all([
        saveNotificationPreferences(owner, { enabled: true }),
        saveNotificationPreferences(owner, { heatingUp: true }),
      ]);
      const prefs = (await getNotificationSettings(owner)).preferences;
      assert.equal(prefs.enabled, true);
      assert.equal(prefs.heatingUp, true);
      assert.equal((await getNotificationSettings(other)).preferences.enabled, false);
      await saveNotificationFollow(owner, follow);
      await saveNotificationFollow(owner, follow);
      assert.equal((await getNotificationSettings(owner)).follows.length, 1);
      await deleteNotificationFollow(other, followKey(follow));
      assert.equal((await getNotificationSettings(owner)).follows.length, 1);
      await savePushSubscription(owner, subscription, origin);
      await assert.rejects(
        savePushSubscription(other, subscription, origin),
        /another notification account/,
      );
      await deletePushSubscription(other, subscription.endpoint);
      assert.equal(
        (await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.id, deviceId)))
          .length,
        1,
      );

      const now = new Date(Date.now() + 50);
      await recordGameObservations([game], new Date(now.getTime() - 1));
      const live = { ...game, isInProgress: true, quarter: 1, statusText: "15:00 - 1st" };
      await Promise.all([recordGameObservations([live], now), recordGameObservations([live], now)]);
      const eventId = `nfl:${id}:start`;
      eventIds.push(eventId);
      assert.equal(
        (await db.select().from(notificationEvents).where(eq(notificationEvents.id, eventId)))
          .length,
        1,
      );
      await Promise.all([enqueueNotifications(origin, now), enqueueNotifications(origin, now)]);
      assert.equal(
        (
          await db
            .select()
            .from(notificationDeliveries)
            .where(eq(notificationDeliveries.eventId, eventId))
        ).length,
        1,
      );
      let sent = 0;
      const send = async () => {
        sent++;
      };
      await Promise.all([
        deliverNotifications(origin, now, send),
        deliverNotifications(origin, now, send),
      ]);
      assert.equal(sent, 1, "overlapping runs must claim just once");
      await deliverNotifications(origin, now, send);
      assert.equal(sent, 1);

      const scored = { ...live, homeScore: 7 };
      await recordGameObservations([scored], new Date(now.getTime() + 1));
      const scoreId = `nfl:${id}:score:7:0`;
      eventIds.push(scoreId);
      await enqueueNotifications(origin, now);
      await saveNotificationPreferences(owner, { enabled: false });
      await deliverNotifications(origin, now, send);
      assert.equal(sent, 1, "opt-out must cancel already queued alerts");

      await saveNotificationPreferences(owner, { enabled: true });
      const later = new Date(Date.now() + 100);
      await recordGameObservations([{ ...scored, awayScore: 3 }], later);
      const retryId = `nfl:${id}:score:7:3`;
      eventIds.push(retryId);
      await enqueueNotifications(origin, later);
      await deliverNotifications(origin, later, async () => {
        throw { statusCode: 503 };
      });
      const [failed] = await db
        .select()
        .from(notificationDeliveries)
        .where(
          and(
            eq(notificationDeliveries.eventId, retryId),
            eq(notificationDeliveries.subscriptionId, deviceId),
          ),
        );
      assert.equal(failed.sent, false);
      assert.equal(failed.attempts, 1);
      await deliverNotifications(origin, new Date(later.getTime() + 61_000), async () => {
        throw { statusCode: 410 };
      });
      assert.equal(
        (await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.id, deviceId)))
          .length,
        0,
      );

      // An old baseline never causes a delayed score/final flood after an outage.
      await recordGameObservations(
        [{ ...scored, awayScore: 6 }],
        new Date(later.getTime() + 11 * 60_000),
      );
      assert.equal(
        (
          await db
            .select()
            .from(notificationEvents)
            .where(eq(notificationEvents.id, `nfl:${id}:score:7:6`))
        ).length,
        0,
      );
    } finally {
      await db.delete(pushSubscriptions).where(inArray(pushSubscriptions.ownerId, [owner, other]));
      await db
        .delete(notificationFollows)
        .where(inArray(notificationFollows.ownerId, [owner, other]));
      await db
        .delete(notificationSettings)
        .where(inArray(notificationSettings.ownerId, [owner, other]));
      await db.delete(notificationSnapshots).where(eq(notificationSnapshots.id, `nfl:${id}`));
      if (eventIds.length)
        await db.delete(notificationEvents).where(inArray(notificationEvents.id, eventIds));
      for (const [key, value] of [
        ["VAPID_PUBLIC_KEY", oldConfig[0]],
        ["VAPID_PRIVATE_KEY", oldConfig[1]],
        ["VAPID_SUBJECT", oldConfig[2]],
      ] as const) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  },
);
