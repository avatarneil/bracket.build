import assert from "node:assert/strict";
import { test } from "node:test";
import { fetchNotificationGames } from "@/lib/football-schedule";

test("notification scoreboards recover event season/week across midnight and prefer current observations", async () => {
  const originalFetch = globalThis.fetch;
  const requested: string[] = [];
  const competitor = (id: string, homeAway: string) => ({
    id,
    homeAway,
    score: "7",
    team: {
      id,
      abbreviation: id === "1" ? "NE" : "BUF",
      name: "Team",
      location: "Location",
      displayName: "Football team",
    },
  });
  const event = {
    id: "401234567",
    date: "2026-10-06T00:15:00Z",
    season: { year: 2026, type: 2 },
    week: { number: 4 },
    competitions: [
      {
        date: "2026-10-06T00:15:00Z",
        competitors: [competitor("1", "home"), competitor("2", "away")],
        status: { displayClock: "2:00", period: 4, type: { state: "in", completed: false } },
      },
    ],
  };
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    requested.push(url);
    return Response.json(
      url.includes("dates=")
        ? { events: [event] }
        : {
            season: { year: 2026, type: 2 },
            week: { number: 5 },
            events: [
              {
                ...event,
                competitions: [
                  {
                    ...event.competitions[0],
                    status: {
                      displayClock: "1:00",
                      period: 4,
                      type: { state: "in", completed: false },
                    },
                  },
                ],
              },
            ],
          },
    );
  }) as typeof fetch;
  try {
    const games = await fetchNotificationGames("nfl", new Date("2026-10-06T05:00:00Z"));
    assert.equal(games.length, 1);
    assert.equal(games[0].season, 2026);
    assert.equal(games[0].week, 4);
    assert.equal(games[0].timeRemaining, "1:00");
    assert.ok(requested.some((url) => url.includes("dates=20261005")));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
