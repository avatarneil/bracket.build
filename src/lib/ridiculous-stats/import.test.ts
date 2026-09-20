import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { buildSeason, parseSchedule, seasonHash } from "./import";
import { espnHistoryContext } from "./espn";

const scheduleText = readFileSync(new URL("./fixtures/schedule.csv", import.meta.url), "utf8");
const stats = readFileSync(new URL("./fixtures/stats.csv", import.meta.url), "utf8");
const schedule = () => parseSchedule(scheduleText);

test("imports an actual nflverse box score with net yardage and both interception directions", () => {
  const rows = buildSeason(schedule(), stats, 2025, "2026-01-01");
  const ari = rows.find((r) => r.team === "ARI")!;
  assert.equal(rows.length, 2);
  assert.equal(ari.metrics.netPassingYards, 130);
  assert.equal(ari.metrics.rushingYards, 146);
  assert.equal(ari.metrics.totalYards, 276);
  assert.equal(ari.metrics.fieldGoals, 2);
  assert.equal(ari.metrics.punts, 4);
  assert.equal(ari.metrics.points, 20);
  assert.equal(ari.metrics.pointsAllowed, 13);
  assert.equal(ari.metrics.interceptionsThrown, 0);
  assert.equal(ari.metrics.interceptionsMade, 0);
  assert.equal(ari.metrics.takeaways, 0);
  assert.equal(seasonHash(rows), seasonHash(buildSeason(schedule(), stats, 2025, "2026-01-01")));
});

test("a missing team box score preserves both scheduled rows as unknown", () => {
  const lines = stats.trim().split(/\r?\n/);
  const rows = buildSeason(schedule(), lines.slice(0, 2).join("\n"), 2025, "2026-01-01");
  assert.equal(rows.length, 2);
  assert.ok(rows.every((r) => Object.values(r.metrics).every((v) => v === null)));
});

test("does not treat today's partial schedule scores as completed games", () => {
  const rows = buildSeason(schedule(), stats, 2025, "2025-09-07");
  assert.ok(rows.every((r) => r.metrics.points === null));
});

test("rejects source drift, duplicates, broken joins and invalid numbers", () => {
  assert.throws(() =>
    buildSeason(schedule(), stats.replace("passing_yards", "changed_yards"), 2025),
  );
  assert.throws(() => buildSeason([...schedule(), ...schedule()], stats, 2025));
  assert.throws(() =>
    buildSeason(schedule(), `${stats.trim()}\n${stats.trim().split(/\r?\n/)[1]}\n`, 2025),
  );
  assert.throws(() =>
    buildSeason(schedule(), stats.replaceAll("2025_01_ARI_NO", "2025_01_ARI_TB"), 2025),
  );
  const invalid = schedule();
  invalid[0].home_score = "not-a-score";
  assert.throws(() => buildSeason(invalid, stats, 2025));
});

test("ESPN maps defensive stats from the opponent and keeps missing values null", () => {
  const data = {
    header: {
      season: { year: 2025, type: 2 },
      competitions: [
        {
          date: "2025-11-18T01:00:00Z",
          competitors: [
            { homeAway: "home" as const, team: { abbreviation: "NE" }, score: "14" },
            { homeAway: "away" as const, team: { abbreviation: "PHI" }, score: "7" },
          ],
          status: { type: { state: "in" as const, completed: false } },
        },
      ],
    },
    boxscore: {
      teams: [
        {
          team: { abbreviation: "NE" },
          statistics: [{ name: "interceptions", displayValue: "1" }],
        },
        {
          team: { abbreviation: "PHI" },
          statistics: [
            { name: "interceptions", displayValue: "3" },
            { name: "sacksYardsLost", displayValue: "4-25" },
          ],
        },
      ],
    },
  };
  const context = espnHistoryContext(data, "123", 1)!;
  assert.equal(context.teams[0].date, "2025-11-17");
  assert.equal(context.teams[0].metrics.interceptionsMade, 3);
  assert.equal(context.teams[0].metrics.interceptionsThrown, 1);
  assert.equal(context.teams[0].metrics.sacksMade, 4);
  assert.equal(context.teams[0].metrics.rushingYards, null);
  assert.equal(context.teams[0].metrics.fieldGoals, null);
  data.header.season.type = 1;
  assert.equal(espnHistoryContext(data, "123", 1), null);
});
