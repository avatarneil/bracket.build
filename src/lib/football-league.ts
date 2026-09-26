import { mapTeamAbbreviation } from "@/lib/espn-team-id";

export type FootballLeague = "nfl" | "college-football";

export function isFootballLeague(value: string): value is FootballLeague {
  return value === "nfl" || value === "college-football";
}

export function footballTeamId(
  team: { id: string; abbreviation: string },
  league: FootballLeague,
): string {
  return league === "nfl" ? mapTeamAbbreviation(team.abbreviation) : `cfb-${team.id}`;
}
