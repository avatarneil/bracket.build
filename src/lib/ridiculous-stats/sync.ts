import "server-only";
import { importedSeasons, saveHistoricalSeason } from "@/lib/db/historical-stats";
import {
  buildSeason,
  downloadCsv,
  FIRST_SEASON,
  parseSchedule,
  SCHEDULE_SOURCE,
  statsSource,
} from "./import";
import { nflDate } from "./types";

export async function syncHistory(options: { from?: number; to?: number; dryRun?: boolean } = {}) {
  const today = nflDate(new Date());
  const schedule = parseSchedule(await downloadCsv(SCHEDULE_SOURCE));
  const current = Math.max(
    ...schedule.filter((g) => g.gameday <= today).map((g) => Number(g.season)),
  );
  const from = options.from ?? FIRST_SEASON;
  const to = options.to ?? current;
  if (
    !Number.isInteger(from) ||
    !Number.isInteger(to) ||
    from < FIRST_SEASON ||
    to > current ||
    to < from
  )
    throw new Error(`Choose seasons between ${FIRST_SEASON} and ${current}.`);
  const existing = options.dryRun ? [] : await importedSeasons();
  const summaries = [];
  // Explicit ranges refresh every requested season. Scheduled syncs backfill
  // missing seasons and refresh the two latest seasons for stat corrections.
  for (let season = from; season <= to; season++) {
    if (options.from == null && existing.some((r) => r.season === season) && season < current - 1)
      continue;
    const rows = buildSeason(schedule, await downloadCsv(statsSource(season)), season, today);
    if (!options.dryRun) await saveHistoricalSeason(season, rows);
    summaries.push({
      season,
      teamGames: rows.length,
      completeBoxscores: rows.filter((row) => row.metrics.points != null).length,
    });
  }
  return summaries;
}
