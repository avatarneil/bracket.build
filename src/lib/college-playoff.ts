import type { ScheduleTeam } from "@/types";

export interface CollegePlayoffTeam extends ScheduleTeam {
  seed: number;
}

export type CollegePicks = Record<string, string>;

export interface CollegeMatchup {
  id: string;
  round: string;
  teams: [CollegePlayoffTeam | null, CollegePlayoffTeam | null];
  winner: CollegePlayoffTeam | null;
}

export function isCompleteCollegeField(teams: CollegePlayoffTeam[]): boolean {
  return (
    teams.length === 12 &&
    new Set(teams.map((team) => team.id)).size === 12 &&
    new Set(teams.map((team) => team.seed)).size === 12 &&
    teams.every((team) => Number.isInteger(team.seed) && team.seed >= 1 && team.seed <= 12)
  );
}

// Fixed CFP paths: 1–8/9, 4–5/12, 2–7/10, 3–6/11. No reseeding.
export function buildCollegeBracket(
  teams: CollegePlayoffTeam[],
  picks: CollegePicks,
): CollegeMatchup[] {
  if (!isCompleteCollegeField(teams)) return [];
  const seed = (number: number) => teams.find((team) => team.seed === number) ?? null;
  const games: CollegeMatchup[] = [];
  const add = (
    id: string,
    round: string,
    home: CollegePlayoffTeam | null,
    away: CollegePlayoffTeam | null,
  ) => {
    const winner =
      home && away ? ([home, away].find((team) => team.id === picks[id]) ?? null) : null;
    games.push({ id, round, teams: [home, away], winner });
    return winner;
  };
  const first = [8, 5, 7, 6].map((number) =>
    add(`first-${number}`, "First round", seed(number), seed(17 - number)),
  );
  const quarters = [1, 4, 2, 3].map((number, index) =>
    add(`quarter-${number}`, "Quarterfinals", seed(number), first[index]),
  );
  const semi1 = add("semi-1", "Semifinals", quarters[0], quarters[1]);
  const semi2 = add("semi-2", "Semifinals", quarters[2], quarters[3]);
  add("final", "National championship", semi1, semi2);
  return games;
}

export function validCollegePicks(teams: CollegePlayoffTeam[], value: unknown): CollegePicks {
  const raw =
    value && typeof value === "object" && !Array.isArray(value) ? (value as CollegePicks) : {};
  return Object.fromEntries(
    buildCollegeBracket(teams, raw).flatMap((game) =>
      game.winner ? [[game.id, game.winner.id]] : [],
    ),
  );
}
