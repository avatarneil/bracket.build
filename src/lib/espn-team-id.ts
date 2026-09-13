/** Keep ESPN aliases consistent across schedules, scoreboards, and box scores. */
export function mapTeamAbbreviation(espnAbbr: string): string {
  const abbreviation = espnAbbr.toUpperCase();
  if (abbreviation === "WSH") return "WAS";
  if (abbreviation === "LA") return "LAR";
  return abbreviation;
}
