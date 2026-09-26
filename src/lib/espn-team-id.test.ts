import assert from "node:assert/strict";
import { test } from "node:test";
import { mapTeamAbbreviation } from "./espn-team-id";
import { fetchSeasonSchedule } from "./football-schedule";
import { scheduleGameToLiveInfo } from "./schedule-game";

test("normalizes ESPN team aliases without changing other team IDs", () => {
  for (const [input, expected] of [
    ["WSH", "WAS"],
    ["was", "WAS"],
    ["LA", "LAR"],
    ["LAR", "LAR"],
    ["PHI", "PHI"],
  ]) {
    assert.equal(mapTeamAbbreviation(input), expected);
  }
});

test("Washington schedule scores, possession, and winner use boxscore team IDs", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    Response.json({
      season: { type: 2, year: 2026 },
      week: { number: 1 },
      leagues: [{ calendar: [{ value: "2", entries: [{ value: "1", label: "Week 1" }] }] }],
      events: [
        {
          id: "401900001",
          date: "2026-09-13T17:00:00Z",
          competitions: [
            {
              competitors: [
                {
                  id: "28",
                  homeAway: "away",
                  score: "9",
                  winner: true,
                  team: {
                    id: "28",
                    abbreviation: "WSH",
                    location: "Washington",
                    name: "Commanders",
                    displayName: "Washington Commanders",
                  },
                },
                {
                  id: "21",
                  homeAway: "home",
                  score: "14",
                  team: {
                    id: "21",
                    abbreviation: "PHI",
                    location: "Philadelphia",
                    name: "Eagles",
                    displayName: "Philadelphia Eagles",
                  },
                },
              ],
              status: {
                type: { state: "in", completed: false, shortDetail: "Halftime" },
                period: 2,
                displayClock: "0:00",
              },
              situation: { down: 3, lastPlay: { team: { id: "28" } } },
            },
          ],
        },
      ],
    })) as typeof fetch;
  try {
    const schedule = await fetchSeasonSchedule("regular", 1, 2026);
    const game = schedule.games[0];
    assert.equal(game.awayTeam.id, "WAS");
    assert.equal(game.possession, "WAS");
    assert.equal(game.winnerId, "WAS");
    const { matchup, liveResult } = scheduleGameToLiveInfo(game);
    assert.equal(matchup.awayTeam?.id, "WAS");
    assert.equal(liveResult?.awayTeamId, "WAS");
    assert.equal(liveResult?.awayScore, 9);
    assert.equal(liveResult?.homeScore, 14);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
