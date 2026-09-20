import { franchise } from "./teams";
import { emptyMeasurements, nflDate, type GameContext, type Measurements } from "./types";

interface EspnStatsTeam {
  team: { abbreviation: string };
  statistics: Array<{ name: string; displayValue: string }>;
}

interface EspnPlayerTotals {
  team: { abbreviation: string };
  statistics: Array<{ name: string; keys: string[]; totals?: string[] }>;
}

export interface EspnHistorySummary {
  header?: {
    season?: { year: number; type: number };
    competitions?: Array<{
      date?: string;
      neutralSite?: boolean;
      competitors: Array<{
        homeAway: "home" | "away";
        team: { abbreviation: string };
        score: string;
      }>;
      status: { type: { state: "pre" | "in" | "post"; completed: boolean } };
    }>;
  };
  boxscore?: { teams?: EspnStatsTeam[]; players?: EspnPlayerTotals[] };
}

function number(value: string | undefined): number | null {
  if (value == null || !/^-?\d+(\.\d+)?$/.test(value.trim())) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function stat(team: EspnStatsTeam | undefined, key: string) {
  return team?.statistics.find((s) => s.name === key)?.displayValue;
}

function measurements(
  own: EspnStatsTeam | undefined,
  opponent: EspnStatsTeam | undefined,
  players: EspnPlayerTotals | undefined,
): Measurements {
  const values = emptyMeasurements();
  const ownStat = (key: string) => number(stat(own, key));
  const opponentStat = (key: string) => number(stat(opponent, key));
  values.rushingYards = ownStat("rushingYards");
  values.netPassingYards = ownStat("netPassingYards");
  values.totalYards = ownStat("totalYards");
  values.interceptionsThrown = ownStat("interceptions");
  values.interceptionsMade = opponentStat("interceptions");
  values.fumblesLost = ownStat("fumblesLost");
  values.takeaways = opponentStat("turnovers");
  values.rushingAttempts = ownStat("rushingAttempts");
  const penalties = stat(own, "totalPenaltiesYards")?.match(/^(\d+)-(\d+)$/);
  if (penalties) {
    values.penalties = Number(penalties[1]);
    values.penaltyYards = Number(penalties[2]);
  }
  const sacks = stat(opponent, "sacksYardsLost")?.match(/^(\d+)-(\d+)$/);
  if (sacks) values.sacksMade = Number(sacks[1]);
  const passing = stat(own, "completionAttempts")?.match(/^(\d+)[/-](\d+)$/);
  if (passing) {
    values.completions = Number(passing[1]);
    values.passingAttempts = Number(passing[2]);
  }
  // Read explicit team totals, never sum player rows or treat absent groups as zero.
  const total = (group: string, key: string) => {
    const category = players?.statistics.find((s) => s.name === group);
    const index = category?.keys.indexOf(key) ?? -1;
    return index < 0 ? undefined : category?.totals?.[index];
  };
  values.passingTouchdowns = number(total("passing", "passingTouchdowns"));
  values.rushingTouchdowns = number(total("rushing", "rushingTouchdowns"));
  values.punts = number(total("punting", "punts"));
  values.puntYards = number(total("punting", "puntYards"));
  const fieldGoals = total("kicking", "fieldGoalsMade/fieldGoalAttempts")?.match(
    /^(\d+)[/-](\d+)$/,
  );
  if (fieldGoals && Number(fieldGoals[1]) <= Number(fieldGoals[2]))
    values.fieldGoals = Number(fieldGoals[1]);
  return values;
}

/** Kept separate from the display parser: absent values must never become 0. */
export function espnHistoryContext(
  data: EspnHistorySummary,
  eventId: string,
  fetchedAt: number,
): GameContext | null {
  const competition = data.header?.competitions?.[0];
  const season = data.header?.season;
  if (
    !competition?.date ||
    !season ||
    ![2, 3].includes(season.type) ||
    !Number.isInteger(season.year) ||
    season.year < 1999
  )
    return null;
  const timestamp = new Date(competition.date);
  if (!Number.isFinite(timestamp.getTime())) return null;
  const home = competition.competitors.find((c) => c.homeAway === "home");
  const away = competition.competitors.find((c) => c.homeAway === "away");
  if (!home || !away) return null;
  try {
    const homeId = franchise(home.team.abbreviation);
    const awayId = franchise(away.team.abbreviation);
    if (homeId === awayId) return null;
    const box = (id: string) =>
      data.boxscore?.teams?.find((t) => franchise(t.team.abbreviation) === id);
    const status = competition.status.type.completed
      ? "final"
      : competition.status.type.state === "in"
        ? "live"
        : "pre";
    const team = (id: string, opponent: string, side: "home" | "away") => {
      const metrics =
        status === "pre"
          ? emptyMeasurements()
          : measurements(
              box(id),
              box(opponent),
              data.boxscore?.players?.find((t) => franchise(t.team.abbreviation) === id),
            );
      if (status !== "pre") {
        metrics.points = number(side === "home" ? home.score : away.score);
        metrics.pointsAllowed = number(side === "home" ? away.score : home.score);
      }
      return {
        gameId: `espn-${eventId}`,
        eventId,
        season: season.year,
        date: nflDate(timestamp),
        phase: season.type === 2 ? ("REG" as const) : ("POST" as const),
        team: id,
        opponent,
        location: competition.neutralSite ? ("neutral" as const) : side,
        metrics,
      };
    };
    return {
      eventId,
      status,
      fetchedAt,
      teams: [team(homeId, awayId, "home"), team(awayId, homeId, "away")],
    };
  } catch {
    return null; // Unknown teams or a changed feed cannot support a claim.
  }
}
