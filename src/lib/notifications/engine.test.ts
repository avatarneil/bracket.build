import assert from "node:assert/strict";
import { test } from "node:test";
import { detectAlerts, gameUrl, recommendationReason, wantsAlert } from "./engine";
import { DEFAULT_NOTIFICATION_PREFERENCES, followSchema, type NotificationGame } from "./types";
import { isPushEndpoint, pushSubscriptionSchema } from "./push";

const now = Date.parse("2026-10-04T18:00:00Z");
export const exampleGame: NotificationGame = {
  id: "401000001",
  league: "nfl",
  season: 2026,
  phase: "regular",
  week: 4,
  date: "2026-10-04T17:00:00Z",
  venue: null,
  broadcasts: [],
  homeTeam: {
    id: "NE",
    abbreviation: "NE",
    name: "Patriots",
    location: "New England",
    displayName: "New England Patriots",
    logoUrl: "",
    color: "#000000",
    record: "3-1",
  },
  awayTeam: {
    id: "BUF",
    abbreviation: "BUF",
    name: "Bills",
    location: "Buffalo",
    displayName: "Buffalo Bills",
    logoUrl: "",
    color: "#000000",
    record: "3-1",
  },
  homeScore: 14,
  awayScore: 10,
  isInProgress: true,
  isComplete: false,
  quarter: 3,
  timeRemaining: "7:00",
  statusText: "7:00 - 3rd",
  possession: null,
  isRedZone: false,
  winnerId: null,
};
const pre = { ...exampleGame, isInProgress: false, homeScore: 0, awayScore: 0 };

test("kickoff follows a real pre-to-live transition; no cold-start score or final replay", () => {
  assert.deepEqual(detectAlerts(exampleGame, null, now), []);
  assert.deepEqual(
    detectAlerts({ ...exampleGame, isComplete: true, isInProgress: false }, null, now),
    [],
  );
  assert.equal(detectAlerts(exampleGame, pre, now)[0]?.kind, "gameStart");
  assert.deepEqual(detectAlerts(exampleGame, exampleGame, now), []);
});
test("scores, ties, lead changes and finals are classified; corrections and unknown scores stay quiet", () => {
  assert.match(
    detectAlerts({ ...exampleGame, awayScore: 17 }, exampleGame, now)[0].title,
    /Lead change/,
  );
  assert.match(
    detectAlerts({ ...exampleGame, awayScore: 14 }, exampleGame, now)[0].title,
    /Tie game/,
  );
  assert.match(
    detectAlerts({ ...exampleGame, homeScore: 17 }, exampleGame, now)[0].title,
    /Score update/,
  );
  assert.match(
    detectAlerts({ ...exampleGame, isComplete: true, isInProgress: false }, exampleGame, now)[0]
      .title,
    /Final/,
  );
  assert.deepEqual(detectAlerts({ ...exampleGame, homeScore: 10 }, exampleGame, now), []);
  assert.deepEqual(detectAlerts(exampleGame, { ...exampleGame, homeScore: null }, now), []);
  assert.deepEqual(detectAlerts({ ...exampleGame, awayScore: null }, exampleGame, now), []);
});
test("heating up means a known one-score fourth quarter or overtime, once per game", () => {
  const hot = { ...exampleGame, quarter: 4 };
  const first = detectAlerts(hot, exampleGame, now).find((alert) => alert.kind === "heatingUp")!;
  assert.ok(first);
  assert.equal(
    detectAlerts({ ...hot, homeScore: 17 }, hot, now).find((alert) => alert.kind === "heatingUp")
      ?.id,
    first.id,
  );
  assert.equal(
    detectAlerts({ ...hot, homeScore: 30 }, exampleGame, now).some(
      (alert) => alert.kind === "heatingUp",
    ),
    false,
  );
  assert.equal(detectAlerts({ ...hot, homeScore: null }, null, now).length, 0);
  assert.equal(detectAlerts({ ...hot, quarter: 5 }, null, now)[0].kind, "heatingUp");
  assert.deepEqual(detectAlerts(hot, null, now + 9 * 60 * 60_000), []);
});
test("recommendations require qualifying matchups and the 15-minute pregame window", () => {
  const soon = { ...pre, date: new Date(now + 10 * 60_000).toISOString() };
  assert.equal(detectAlerts(soon, null, now)[0].kind, "recommendations");
  assert.deepEqual(
    detectAlerts({ ...soon, date: new Date(now + 16 * 60_000).toISOString() }, null, now),
    [],
  );
  assert.deepEqual(detectAlerts({ ...soon, date: new Date(now - 1).toISOString() }, null, now), []);
  assert.equal(recommendationReason({ ...soon, phase: "preseason" }), null);
  assert.equal(
    recommendationReason({ ...soon, homeTeam: { ...soon.homeTeam, record: "2-0" } }),
    null,
  );
  assert.equal(
    recommendationReason({ ...soon, homeTeam: { ...soon.homeTeam, record: null } }),
    null,
  );
  assert.ok(
    recommendationReason({
      ...soon,
      league: "college-football",
      homeTeam: { ...soon.homeTeam, rank: 10, record: null },
      awayTeam: { ...soon.awayTeam, rank: 24, record: null },
    }),
  );
});
test("opt-in matching isolates leagues, seasons, alert kinds, teams and games", () => {
  const alert = detectAlerts(exampleGame, pre, now)[0];
  const follow = followSchema.parse({
    league: "nfl",
    season: 2026,
    kind: "team",
    targetId: "NE",
    label: "Patriots",
    gameStart: true,
    majorUpdates: false,
  });
  assert.equal(wantsAlert(DEFAULT_NOTIFICATION_PREFERENCES, [follow], alert), false);
  const enabled = { ...DEFAULT_NOTIFICATION_PREFERENCES, enabled: true };
  assert.equal(wantsAlert(enabled, [follow], alert), true);
  assert.equal(wantsAlert(enabled, [{ ...follow, season: 2025 }], alert), false);
  assert.equal(wantsAlert(enabled, [{ ...follow, league: "college-football" }], alert), false);
  assert.equal(wantsAlert(enabled, [{ ...follow, gameStart: false }], alert), false);
  assert.equal(
    wantsAlert(enabled, [{ ...follow, kind: "game", targetId: exampleGame.id }], alert),
    true,
  );
  assert.equal(wantsAlert(enabled, [], { ...alert, kind: "heatingUp" }), false);
  assert.equal(
    wantsAlert({ ...enabled, heatingUp: true }, [], { ...alert, kind: "heatingUp" }),
    true,
  );
  assert.equal(
    wantsAlert({ ...enabled, heatingUp: true }, [], {
      ...alert,
      league: "college-football",
      kind: "heatingUp",
    }),
    false,
  );
  const url = new URL(gameUrl(exampleGame), "https://bracket.build");
  assert.equal(url.searchParams.get("season"), "2026");
  assert.equal(url.searchParams.get("game"), `schedule-${exampleGame.id}`);
});
test("push endpoint validation blocks SSRF, credentials, lookalike domains and malformed keys", () => {
  for (const endpoint of [
    "https://localhost/push",
    "http://fcm.googleapis.com/push",
    "https://fcm.googleapis.com.evil.test/push",
    "https://127.0.0.1/push",
    "https://web.push.apple.com:444/push",
    "https://user:pass@web.push.apple.com/push",
    "https://push.apple.com.evil.test/push",
    "https://updates.push.services.mozilla.com@evil.test/",
  ])
    assert.equal(isPushEndpoint(endpoint), false, endpoint);
  for (const endpoint of [
    "https://fcm.googleapis.com/fcm/send/example",
    "https://updates.push.services.mozilla.com/wpush/v2/example",
    "https://web.push.apple.com/example",
    "https://web-123.push.apple.com/example",
    "https://wns2-sg2p.notify.windows.com/w/?token=example",
  ])
    assert.equal(isPushEndpoint(endpoint), true, endpoint);
  assert.equal(
    pushSubscriptionSchema.safeParse({
      endpoint: "https://fcm.googleapis.com/x",
      keys: { p256dh: "x", auth: "x" },
    }).success,
    false,
  );
});
