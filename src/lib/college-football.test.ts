import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { GET as scheduleRoute } from "@/app/api/schedule/route";
import { GET as statsRoute } from "@/app/api/game-stats/[eventId]/route";
import playoffFeed from "./fixtures/cfp-2025.json";
import { buildCollegeBracket, validCollegePicks, type CollegePicks } from "./college-playoff";
import { fetchSeasonSchedule, parseCollegeField } from "./football-schedule";
import { fetchGameBoxscore } from "./espn-boxscore";
import { footballTeamId } from "./football-league";
import { scheduleGameToLiveInfo } from "./schedule-game";

const feed = playoffFeed as unknown as Parameters<typeof parseCollegeField>[0];
const field = parseCollegeField(feed)!;

test("published CFP field creates four byes and fixed paths without reseeding", () => {
  assert.equal(field.length, 12);
  const picks: CollegePicks = {};
  for (let index = 0; index < 11; index++) {
    const game = buildCollegeBracket(field, picks)[index];
    picks[game.id] = game.teams[1]!.id; // advance lower seeds, including upsets
  }
  const games = buildCollegeBracket(field, picks);
  assert.deepEqual(
    games.slice(0, 4).map((game) => game.teams.map((team) => team!.seed)),
    [
      [8, 9],
      [5, 12],
      [7, 10],
      [6, 11],
    ],
  );
  assert.deepEqual(
    games.slice(4, 8).map((game) => game.teams.map((team) => team!.seed)),
    [
      [1, 9],
      [4, 12],
      [2, 10],
      [3, 11],
    ],
  );
  assert.equal(games.at(-1)!.winner!.seed, 11);
  const changed = validCollegePicks(field, {
    ...picks,
    "first-6": field.find((team) => team.seed === 6)!.id,
  });
  assert.equal(changed["quarter-3"], undefined);
  assert.equal(changed["semi-2"], undefined);
  assert.equal(changed.final, undefined);
  assert.equal(changed["quarter-1"], picks["quarter-1"]);
  assert.deepEqual(validCollegePicks(field, { final: field[0].id, nonsense: "bad" }), {});
  assert.deepEqual(buildCollegeBracket(field.slice(1), {}), []);
});

test("partial fields, rankings, duplicate seeds, and non-CFP bowls do not unlock picks", () => {
  assert.equal(parseCollegeField({ events: feed.events!.slice(0, 4) }), null);
  for (const mutation of ["notes", "duplicate", "pair"] as const) {
    const copy = structuredClone(feed);
    if (mutation === "notes")
      for (const event of copy.events!) event.competitions[0].notes = [{ headline: "Bowl game" }];
    else
      copy.events![0].competitions[0].competitors[0].curatedRank = {
        current: mutation === "duplicate" ? 9 : 7,
      };
    assert.equal(parseCollegeField(copy), null);
  }
});

test("college schedules use the FBS endpoint, full limit, college IDs and CFP calendar", async () => {
  const original = globalThis.fetch;
  const urls: URL[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = new URL(String(input));
    urls.push(url);
    return Response.json(feed);
  }) as typeof fetch;
  try {
    const schedule = await fetchSeasonSchedule("postseason", 999, 2025, "college-football");
    assert.equal(schedule.games.length, 11);
    assert.equal(schedule.collegePlayoffTeams?.length, 12);
    assert.equal(schedule.phaseAvailability.preseason, false);
    assert.ok(schedule.weeks.some((week) => week.number === 999));
    assert.ok(
      urls.every(
        (url) =>
          url.pathname.includes("college-football") &&
          url.searchParams.get("groups") === "80" &&
          url.searchParams.get("limit") === "200",
      ),
    );
    assert.equal(schedule.games[0].homeTeam.id, "cfb-201");
    assert.equal(scheduleGameToLiveInfo(schedule.games[0]).matchup.league, "college-football");
    assert.equal(footballTeamId({ id: "309", abbreviation: "LA" }, "college-football"), "cfb-309");
    assert.equal(footballTeamId({ id: "14", abbreviation: "LA" }, "nfl"), "LAR");
  } finally {
    globalThis.fetch = original;
  }
});

test("college box scores preserve team identity and never create NFL history context", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request) => {
    assert.match(String(input), /college-football\/summary\?event=123/);
    return Response.json({
      header: {
        competitions: [
          {
            competitors: [
              { homeAway: "home", team: { id: "309", abbreviation: "LA" }, score: "0" },
              { homeAway: "away", team: { id: "333", abbreviation: "ALA" }, score: "7" },
            ],
            status: { type: { state: "in", completed: false }, period: 1, displayClock: "2:00" },
          },
        ],
      },
      drives: {
        current: {
          team: { id: "309", abbreviation: "LA" },
          plays: [{ end: { down: 1, distance: 10, yardsToEndzone: 60 } }],
        },
      },
    });
  }) as typeof fetch;
  try {
    const stats = await fetchGameBoxscore("123", "college-football");
    assert.equal(stats.homeTeamId, "cfb-309");
    assert.equal(stats.homeScore, 0);
    assert.equal(stats.fieldPosition?.possessionTeamId, "cfb-309");
    assert.equal(stats.historicalContext, null);
  } finally {
    globalThis.fetch = original;
  }
});

test("public football APIs reject unknown leagues", async () => {
  assert.equal(
    (await scheduleRoute(new NextRequest("https://example.com/api/schedule?league=bad"))).status,
    400,
  );
  assert.equal(
    (
      await statsRoute(new Request("https://example.com/api/game-stats/123?league=bad"), {
        params: Promise.resolve({ eventId: "123" }),
      })
    ).status,
    400,
  );
});
