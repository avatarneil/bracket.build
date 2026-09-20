import assert from "node:assert/strict";
import { test } from "node:test";
import { eq } from "drizzle-orm";
import { emptyMeasurements, type TeamGame } from "@/lib/ridiculous-stats/types";
import { getDatabase } from "./index";
import { historicalImports, historicalTeamGames } from "./schema";
import { loadHistoricalComparison, saveHistoricalSeason } from "./historical-stats";

(process.env.TEST_DATABASE_URL ? test : test.skip)(
  "historical snapshots are idempotent, corrected atomically, and roll back on conflict",
  async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    const row: TeamGame = {
      gameId: "test-history-2098",
      eventId: "99999998",
      season: 2098,
      date: "2098-09-01",
      phase: "REG",
      team: "ARI",
      opponent: "NO",
      location: "away",
      metrics: { ...emptyMeasurements(), points: 20 },
    };
    const db = getDatabase();
    try {
      await saveHistoricalSeason(2098, [row]);
      await saveHistoricalSeason(2098, [row]);
      let result = await loadHistoricalComparison(row.eventId!, [row.team], "2098-09-02");
      assert.equal(result.target.length, 1);
      assert.equal(result.target[0].metrics.points, 20);
      await saveHistoricalSeason(2098, [{ ...row, metrics: { ...row.metrics, points: 21 } }]);
      result = await loadHistoricalComparison(row.eventId!, [row.team], "2098-09-02");
      assert.equal(result.target[0].metrics.points, 21);
      await assert.rejects(saveHistoricalSeason(2098, [row, row]));
      result = await loadHistoricalComparison(row.eventId!, [row.team], "2098-09-02");
      assert.equal(result.target[0].metrics.points, 21);
      assert.equal(result.imports.find((i) => i.season === 2098)!.rowCount, 1);
    } finally {
      await db.delete(historicalTeamGames).where(eq(historicalTeamGames.season, 2098));
      await db.delete(historicalImports).where(eq(historicalImports.season, 2098));
    }
  },
);
