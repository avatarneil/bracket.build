import assert from "node:assert/strict";
import { test } from "node:test";
import { generateFacts } from "./engine";
import { emptyMeasurements, type GameContext, type Metric, type TeamGame } from "./types";
import { franchise, OPPONENT_GROUPS, teamName } from "./teams";

const game = (overrides: Partial<TeamGame> = {}): TeamGame => ({
  gameId: "target",
  eventId: "123",
  season: 2025,
  date: "2025-11-30",
  phase: "REG",
  team: "NE",
  opponent: "PHI",
  location: "home",
  metrics: { ...emptyMeasurements(), rushingYards: 200 },
  ...overrides,
});
const context = (status: GameContext["status"] = "final"): GameContext => ({
  eventId: "123",
  status,
  fetchedAt: 1,
  teams: [game(), game({ team: "PHI", opponent: "NE" })],
});
const history = () =>
  Array.from({ length: 15 }, (_, i) =>
    game({
      gameId: `old-${i}`,
      eventId: String(1000 + i),
      season: 2024,
      date: `2024-11-${String(i + 1).padStart(2, "0")}`,
      metrics: { ...emptyMeasurements(), rushingYards: 100 + i },
    }),
  );

test("generates supported records, ordered receipts, and honest ties", () => {
  const rows = history();
  let facts = generateFacts(context(), rows, [2024, 2025]);
  assert.ok(facts.some((f) => f.kind === "record" && f.metric === "rushingYards"));
  const fact = facts.find((f) => f.kind === "record")!;
  assert.equal(fact.sampleSize, 15);
  assert.equal(fact.receipts[0].date, "2024-11-15");
  assert.match(fact.text, /from the 2024 season/);
  assert.match(fact.text, /200 rushing yards against Philadelphia Eagles in this game/);
  rows.at(-1)!.metrics.rushingYards = 200;
  facts = generateFacts(context(), rows, [2024, 2025]);
  assert.match(facts.find((f) => f.kind === "record")!.text, /tied for the most/);
});

test("missing measurements are not zeros and suppress affected comparisons", () => {
  const rows = history();
  rows[0].metrics.rushingYards = null;
  assert.equal(generateFacts(context(), rows, [2024, 2025]).length, 0);
  assert.equal(generateFacts(context(), history().slice(0, 9), [2024, 2025]).length, 0);
});

test("does not mix phases, include the current game, or look into the future", () => {
  const rows = history();
  const unrelated = [
    game({ metrics: { ...emptyMeasurements(), rushingYards: 900 } }),
    game({ date: "2025-12-01", metrics: { ...emptyMeasurements(), rushingYards: 900 } }),
    game({
      phase: "POST",
      date: "2024-11-29",
      metrics: { ...emptyMeasurements(), rushingYards: 900 },
    }),
  ];
  const facts = generateFacts(context(), [...rows, ...unrelated], [2024, 2025]);
  assert.equal(facts.find((f) => f.kind === "record")!.sampleSize, 15);
  assert.ok(facts.every((f) => f.receipts.every((r) => r.gameId.startsWith("old-"))));
});

test("requires contiguous imported seasons and labels the actual coverage", () => {
  assert.equal(generateFacts(context(), history(), [2023, 2025]).length, 0);
  assert.equal(generateFacts(context(), history(), [2024]).length, 0);
  const facts = generateFacts(context(), history(), [1999, 2024, 2025]);
  assert.ok(facts.every((f) => f.coverageStart === "2024 season"));
});

test("live comparisons are provisional and never claim a fewest record", () => {
  const live = context("live");
  let facts = generateFacts(live, history(), [2024, 2025]);
  assert.ok(facts.filter((f) => f.kind === "record").every((f) => f.text.includes("so far")));
  live.teams[0].metrics.rushingYards = 0;
  facts = generateFacts(live, history(), [2024, 2025]);
  assert.deepEqual(facts, []);
  assert.deepEqual(generateFacts(context("pre"), history(), [2024, 2025]), []);
});

test("first-since uses the latest equal-or-higher game and enough intervening games", () => {
  const rows = history();
  rows.push(
    game({
      gameId: "previous",
      season: 2020,
      date: "2020-11-01",
      metrics: { ...emptyMeasurements(), rushingYards: 250 },
    }),
  );
  const facts = generateFacts(context(), rows, [2020, 2021, 2022, 2023, 2024, 2025]);
  const since = facts.find((f) => f.kind === "since")!;
  assert.ok(since);
  assert.match(since.text, /since Nov 1, 2020/);
  assert.match(since.text, /at least 200 rushing yards/);
  assert.match(since.text, /since Nov 1, 2020 against Philadelphia Eagles/);
  assert.equal(since.value, 200);
});

test("first-since can find a same-season occurrence after five qualifying games", () => {
  const rows = history().map((g) => ({
    ...g,
    season: 2025,
    date: g.date.replace("2024", "2025"),
  }));
  rows[9].metrics.rushingYards = 250;
  const facts = generateFacts(context("live"), rows, [2025]);
  assert.ok(facts.length);
  assert.match(facts[0].text, /so far.*since Nov 10, 2025/);
  // Four intervening games are still too few, regardless of the calendar gap.
  rows[10].metrics.rushingYards = 200;
  assert.deepEqual(generateFacts(context("live"), rows, [2025]), []);
});

test("ordinary or missing current totals never fall back to unrelated historical records", () => {
  const target = context();
  target.teams[0].metrics.rushingYards = 110;
  assert.deepEqual(generateFacts(target, history(), [2024, 2025]), []);
  target.teams[0].metrics.rushingYards = null;
  assert.deepEqual(generateFacts(target, history(), [2024, 2025]), []);
});

test("a more recent equal performance prevents an incorrect first-since claim", () => {
  const rows = history();
  rows.push(
    game({
      gameId: "previous",
      season: 2020,
      date: "2020-11-01",
      metrics: { ...emptyMeasurements(), rushingYards: 250 },
    }),
  );
  rows.at(-2)!.metrics.rushingYards = 200;
  assert.deepEqual(generateFacts(context(), rows, [2020, 2021, 2022, 2023, 2024, 2025]), []);
});

test("first-since compares rare low totals only after the selected game finishes", () => {
  const rows: TeamGame[] = history().map((g, i) => ({
    ...g,
    metrics: { ...emptyMeasurements(), points: 20 + i },
  }));
  rows.push(
    game({
      gameId: "previous-low",
      season: 2020,
      date: "2020-11-01",
      metrics: { ...emptyMeasurements(), points: 0 },
    }),
  );
  const target = context();
  target.teams[0].metrics = { ...emptyMeasurements(), points: 3 };
  const seasons = [2020, 2021, 2022, 2023, 2024, 2025];
  const facts = generateFacts(target, rows, seasons);
  assert.ok(facts.length);
  assert.ok(facts.every((f) => f.kind === "since" && f.value === 3));
  assert.match(facts[0].text, /recorded 3 points scored against Philadelphia Eagles in this game/);
  assert.match(facts[0].text, /at most 3 points scored.*since Nov 1, 2020/);
  target.status = "live";
  assert.deepEqual(generateFacts(target, rows, seasons), []);
  target.status = "final";
  target.teams[0].metrics.points = 0;
  assert.match(generateFacts(target, rows, seasons)[0].text, /at most 0 points scored/);
});

test("first-since claims lead records, including when a rare performance ties the record", () => {
  const rows = history();
  rows.forEach((g) => {
    g.metrics.passingTouchdowns = 1;
  });
  rows.push(
    game({
      gameId: "previous-tie",
      season: 2020,
      date: "2020-11-01",
      metrics: { ...emptyMeasurements(), rushingYards: 200, passingTouchdowns: 1 },
    }),
  );
  const target = context();
  target.teams[0].metrics.passingTouchdowns = 5;
  const facts = generateFacts(target, rows, [2020, 2021, 2022, 2023, 2024, 2025]);
  assert.equal(facts[0].kind, "since");
  assert.ok(facts.some((f) => f.kind === "record"));
  const firstRecord = facts.findIndex((f) => f.kind === "record");
  assert.ok(facts.slice(firstRecord).every((f) => f.kind === "record"));
  assert.ok(facts.filter((f) => f.metric === "rushingYards").every((f) => f.kind === "since"));
});

test("team history supports current-game claims even without ten matching opponent categories", () => {
  const rows = history().map((g, i) => ({ ...g, opponent: ["PIT", "DAL", "GB"][i % 3] }));
  const facts = generateFacts(context(), rows, [2024, 2025]);
  assert.ok(facts.length);
  assert.ok(facts.every((f) => f.value === 200 && f.metric === "rushingYards"));
  assert.ok(facts.every((f) => !f.filters.some((f) => f.includes("against"))));
});

test("records span kicking, punting, penalties, scoring and passing", () => {
  const target = context();
  const rows = history();
  for (const metric of [
    "fieldGoals",
    "punts",
    "penalties",
    "points",
    "passingTouchdowns",
  ] as const) {
    target.teams[0].metrics[metric] = 6;
    rows.forEach((row) => {
      row.metrics[metric] = 3;
    });
  }
  const metrics = new Set(
    generateFacts(target, rows, [2024, 2025])
      .filter((f) => f.kind === "record")
      .map((f) => f.metric),
  );
  for (const metric of [
    "fieldGoals",
    "punts",
    "penalties",
    "points",
    "passingTouchdowns",
  ] as Metric[])
    assert.ok(metrics.has(metric));
});

test("franchises survive relocations while names and categories follow their era", () => {
  assert.equal(franchise("OAK"), "LV");
  assert.equal(franchise("SD"), "LAC");
  assert.equal(franchise("STL"), "LAR");
  assert.equal(teamName("LAR", 2003), "St. Louis Rams");
  assert.equal(teamName("WAS", 2021), "Washington Football Team");
  assert.equal(teamName("WAS", 2025), "Washington Commanders");
  assert.equal(OPPONENT_GROUPS.find((g) => g.id === "animals")!.matches("BUF"), false);
});
