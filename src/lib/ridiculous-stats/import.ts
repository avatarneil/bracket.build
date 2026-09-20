import { createHash } from "node:crypto";
import { parse } from "csv-parse/sync";
import { franchise } from "./teams";
import { emptyMeasurements, nflDate, type Measurements, type TeamGame } from "./types";

export const FIRST_SEASON = 1999;
export const SCHEDULE_SOURCE =
  "https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv";
export const statsSource = (season: number) =>
  `https://github.com/nflverse/nflverse-data/releases/download/stats_team/stats_team_week_${season}.csv`;

type Row = Record<string, string>;

export function parseCsv(text: string, required: string[]): Row[] {
  const rows: Row[] = parse(text, { columns: true, bom: true, skip_empty_lines: true });
  if (!rows.length || required.some((column) => !Object.hasOwn(rows[0], column))) {
    throw new Error("Historical source is empty or its columns have changed.");
  }
  return rows;
}

function numeric(value: string | undefined): number | null {
  if (value == null || value.trim() === "" || value === "NA") return null;
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error("Invalid historical numeric value.");
  return number;
}

function sum(a: number | null, b: number | null): number | null {
  return a == null || b == null ? null : a + b;
}

const SOURCE_METRICS = {
  rushingYards: "rushing_yards",
  interceptionsMade: "def_interceptions",
  interceptionsThrown: "passing_interceptions",
  sacksMade: "def_sacks",
  penalties: "penalties",
  penaltyYards: "penalty_yards",
  fumblesLost: "fumbles_lost_total",
  passingTouchdowns: "passing_tds",
  rushingTouchdowns: "rushing_tds",
  fieldGoals: "fg_made",
  punts: "pt_att",
  puntYards: "pt_yards",
  passingAttempts: "attempts",
  completions: "completions",
  rushingAttempts: "carries",
} as const;

export function parseSchedule(text: string): Row[] {
  return parseCsv(text, [
    "game_id",
    "season",
    "game_type",
    "gameday",
    "home_team",
    "away_team",
    "home_score",
    "away_score",
    "location",
    "espn",
  ]);
}

/** Build a complete season snapshot before touching the database. Gaps remain
 * null; contradictory rows, duplicate keys, and broken joins reject the import. */
export function buildSeason(
  schedule: Row[],
  statsText: string,
  season: number,
  today = nflDate(new Date()),
): TeamGame[] {
  if (!Number.isInteger(season) || season < FIRST_SEASON || season > Number(today.slice(0, 4)))
    throw new Error("Invalid import season.");
  const games = schedule.filter((row) => Number(row.season) === season);
  if (!games.length) throw new Error("Season has no schedule.");
  const stats = parseCsv(statsText, [
    "game_id",
    "team",
    "opponent_team",
    "season",
    "season_type",
    "passing_yards",
    "sack_yards_lost",
    "fumble_recovery_opp",
    ...Object.values(SOURCE_METRICS),
  ]);
  const byGame = new Map<string, Row>();
  const gameIds = new Set(games.map((game) => game.game_id));
  if (gameIds.size !== games.length) throw new Error("Duplicate schedule game.");
  for (const row of stats) {
    if (Number(row.season) !== season || !gameIds.has(row.game_id))
      throw new Error("Historical stats do not match the schedule.");
    // nflverse contains an unassigned placeholder for 1999 PHI/CAR. It cannot
    // identify either team; keep the scheduled rows with null measurements.
    if (!row.team && !row.opponent_team) continue;
    const key = `${row.game_id}:${franchise(row.team)}`;
    if (byGame.has(key)) throw new Error("Duplicate historical team game.");
    byGame.set(key, row);
  }
  const result: TeamGame[] = [];
  for (const game of games) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(game.gameday) || !Number.isFinite(Date.parse(game.gameday)))
      throw new Error("Invalid historical date.");
    if (!["REG", "WC", "DIV", "CON", "SB"].includes(game.game_type))
      throw new Error("Unknown historical season phase.");
    if (!["Home", "Neutral"].includes(game.location))
      throw new Error("Unknown historical location.");
    const home = franchise(game.home_team);
    const away = franchise(game.away_team);
    if (home === away) throw new Error("Historical opponents must differ.");
    const phase = game.game_type === "REG" ? "REG" : "POST";
    const homeStats = byGame.get(`${game.game_id}:${home}`);
    const awayStats = byGame.get(`${game.game_id}:${away}`);
    const hasFinalStats =
      game.gameday < today &&
      homeStats &&
      awayStats &&
      numeric(game.home_score) != null &&
      numeric(game.away_score) != null;
    for (const [team, opponent, side] of [
      [home, away, "home"],
      [away, home, "away"],
    ] as const) {
      const row = byGame.get(`${game.game_id}:${team}`);
      if (row && (franchise(row.opponent_team) !== opponent || row.season_type !== phase))
        throw new Error("Historical opponent or phase mismatch.");
      const metrics: Measurements = emptyMeasurements();
      if (hasFinalStats && row) {
        for (const [metric, column] of Object.entries(SOURCE_METRICS))
          metrics[metric as keyof Measurements] = numeric(row[column]);
        const lost = numeric(row.sack_yards_lost);
        metrics.netPassingYards = sum(
          numeric(row.passing_yards),
          lost == null ? null : -Math.abs(lost),
        );
        metrics.totalYards = sum(metrics.netPassingYards, metrics.rushingYards);
        metrics.takeaways = sum(metrics.interceptionsMade, numeric(row.fumble_recovery_opp));
        metrics.points = numeric(game[`${side}_score`]);
        metrics.pointsAllowed = numeric(game[`${side === "home" ? "away" : "home"}_score`]);
      }
      result.push({
        gameId: game.game_id,
        eventId: /^\d+$/.test(game.espn) ? game.espn : null,
        season,
        date: game.gameday,
        phase,
        team,
        opponent,
        location: game.location === "Neutral" ? "neutral" : side,
        metrics,
      });
      if (row) byGame.delete(`${game.game_id}:${team}`);
    }
  }
  if (byGame.size) throw new Error("Historical team cannot be joined to its game.");
  return result;
}

export async function downloadCsv(url: string): Promise<string> {
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(20_000), cache: "no-store" });
      if (!response.ok) throw new Error(`Historical source returned HTTP ${response.status}.`);
      return await response.text();
    } catch (error) {
      if (attempt >= 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }
}

export function seasonHash(rows: TeamGame[]): string {
  return createHash("sha256").update(JSON.stringify(rows)).digest("hex");
}
