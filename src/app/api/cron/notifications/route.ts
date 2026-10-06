import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { fetchNotificationGames } from "@/lib/football-schedule";
import {
  deliverNotifications,
  enqueueNotifications,
  recordGameObservations,
} from "@/lib/notifications/dispatch";
import { pushConfiguration } from "@/lib/notifications/push";
import { and, eq, sql } from "drizzle-orm";
import { getDatabase } from "@/lib/db";
import { notificationSettings, pushSubscriptions } from "@/lib/db/schema";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return json({ error: "Notification cron is not configured." }, 503);
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    return json({ error: "Unauthorized." }, 401);
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production")
    return json({ error: "Scheduled notifications run only in production." }, 403);
  if (!pushConfiguration()) return json({ skipped: "Web Push is not configured." });
  try {
    const origin = new URL(process.env.NOTIFICATION_ORIGIN ?? "https://bracket.build").origin;
    const [subscriber] = await getDatabase()
      .select({ id: pushSubscriptions.id })
      .from(pushSubscriptions)
      .innerJoin(notificationSettings, eq(notificationSettings.ownerId, pushSubscriptions.ownerId))
      .where(
        and(
          eq(pushSubscriptions.origin, origin),
          sql`${notificationSettings.preferences}->>'enabled' = 'true'`,
        ),
      )
      .limit(1);
    if (!subscriber) return json({ skipped: "No enabled notification devices." });
    const results = await Promise.allSettled(
      (["nfl", "college-football"] as const).map(async (league) => {
        const observedAt = new Date();
        await recordGameObservations(await fetchNotificationGames(league), observedAt);
      }),
    );
    await enqueueNotifications(origin);
    const delivered = await deliverNotifications(origin);
    const feedFailures = results.filter((result) => result.status === "rejected").length;
    return json({ ...delivered, feedFailures }, feedFailures ? 502 : 200);
  } catch {
    console.error("Notification dispatch failed; pending alerts will retry before expiry.");
    return json({ error: "Notification dispatch failed." }, 502);
  }
}
