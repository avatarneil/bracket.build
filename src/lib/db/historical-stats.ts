import "server-only";
import { and, eq, inArray, lt, sql } from "drizzle-orm";
import { getDatabase } from "./index";
import { historicalImports, historicalTeamGames } from "./schema";
import { seasonHash } from "@/lib/ridiculous-stats/import";
import type { TeamGame } from "@/lib/ridiculous-stats/types";

export async function saveHistoricalSeason(season: number, rows: TeamGame[]) {
  if (!rows.length || rows.some((r) => r.season !== season))
    throw new Error("Invalid season snapshot.");
  const db = getDatabase();
  const hash = seasonHash(rows);
  await db.transaction(async (tx) => {
    // Cron, CLI, and correction imports serialize without exposing a half-loaded season.
    await tx.execute(sql`select pg_advisory_xact_lock(184731030, ${season})`);
    const [previous] = await tx
      .select()
      .from(historicalImports)
      .where(eq(historicalImports.season, season));
    if (previous?.sourceHash !== hash) {
      await tx.delete(historicalTeamGames).where(eq(historicalTeamGames.season, season));
      for (let start = 0; start < rows.length; start += 100) {
        await tx.insert(historicalTeamGames).values(rows.slice(start, start + 100));
      }
    }
    await tx
      .insert(historicalImports)
      .values({ season, sourceHash: hash, rowCount: rows.length, importedAt: new Date() })
      .onConflictDoUpdate({
        target: historicalImports.season,
        set: { sourceHash: hash, rowCount: rows.length, importedAt: new Date() },
      });
  });
}

export async function importedSeasons() {
  return getDatabase().select().from(historicalImports);
}

export async function loadHistoricalComparison(eventId: string, teams: string[], cutoff: string) {
  const db = getDatabase();
  // A single transaction sees one coherent snapshot even while imports update.
  return db.transaction(async (tx) => {
    await tx.execute(sql`set transaction isolation level repeatable read, read only`);
    const imports = await tx.select().from(historicalImports);
    const history = await tx
      .select()
      .from(historicalTeamGames)
      .where(and(inArray(historicalTeamGames.team, teams), lt(historicalTeamGames.date, cutoff)));
    const target = await tx
      .select()
      .from(historicalTeamGames)
      .where(eq(historicalTeamGames.eventId, eventId));
    return { imports, history, target };
  });
}
