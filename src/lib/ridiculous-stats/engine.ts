import { OPPONENT_GROUPS, teamName } from "./teams";
import {
  displayDate,
  METRICS,
  type GameContext,
  type Metric,
  type RidiculousFact,
  type TeamGame,
} from "./types";

export const MIN_COMPARISONS = 10;
type Filter = { id: string; label: string; matches: (game: TeamGame) => boolean };

function filterSets(target: TeamGame): Filter[][] {
  const month = target.date.slice(5, 7);
  const weekday = new Date(`${target.date}T12:00:00Z`).getUTCDay();
  const modifiers: Filter[] = [
    {
      id: target.location,
      label:
        target.location === "neutral"
          ? "at neutral sites"
          : target.location === "home"
            ? "at home"
            : "on the road",
      matches: (g) => g.location === target.location,
    },
    {
      id: `month-${month}`,
      label: `in ${new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(new Date(`${target.date}T12:00:00Z`))}`,
      matches: (g) => g.date.slice(5, 7) === month,
    },
    {
      id: `weekday-${weekday}`,
      label: `on ${["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"][weekday]}`,
      matches: (g) => new Date(`${g.date}T12:00:00Z`).getUTCDay() === weekday,
    },
  ];
  return OPPONENT_GROUPS.filter((group) => group.matches(target.opponent, target.season)).flatMap(
    (group) => {
      const base: Filter = { ...group, matches: (g) => group.matches(g.opponent, g.season) };
      return [
        [base],
        ...modifiers.map((modifier) => [base, modifier]),
        [base, modifiers[0], modifiers[1]],
      ];
    },
  );
}

/** Only evidence present in the supplied archive can support a claim. Missing
 * seasons, games, or metric values suppress the affected comparison entirely. */
export function generateFacts(
  context: GameContext,
  history: TeamGame[],
  importedSeasons: number[],
): RidiculousFact[] {
  const ranked: Array<RidiculousFact & { score: number }> = [];
  const seasons = new Set(importedSeasons);
  for (const target of context.teams) {
    // Require a continuous archive through the selected game's season. A partial
    // import must never quietly turn into an "all-time" or "since" record.
    let firstSeason = target.season;
    if (!seasons.has(firstSeason)) continue;
    while (seasons.has(firstSeason - 1)) firstSeason--;
    const prior = history.filter(
      (g) =>
        g.team === target.team &&
        g.phase === target.phase &&
        g.season >= firstSeason &&
        g.date < target.date,
    );
    const phase = target.phase === "REG" ? "regular-season" : "postseason";
    const name = teamName(target.team, target.season);
    for (const filters of filterSets(target)) {
      const cohort = prior
        .filter((g) => filters.every((f) => f.matches(g)))
        .sort((a, b) => b.date.localeCompare(a.date));
      if (cohort.length < MIN_COMPARISONS) continue;
      const scope = filters.map((f) => f.label).join(" ");
      for (const metric of Object.keys(METRICS) as Metric[]) {
        if (cohort.some((g) => g.metrics[metric] == null)) continue;
        const values = cohort.map((g) => g.metrics[metric]!);
        const max = Math.max(...values);
        const min = Math.min(...values);
        const value = target.metrics[metric];
        const label = METRICS[metric];
        const number = (n: number) => new Intl.NumberFormat("en-US").format(n);
        const base = {
          metric,
          metricLabel: label,
          team: name,
          filters: [`${phase} games`, ...filters.map((f) => f.label)],
          sampleSize: cohort.length,
          coverageStart: `${firstSeason} season`,
          cutoff: target.date,
          receipts: cohort.map((g) => ({
            gameId: g.gameId,
            eventId: g.eventId,
            date: g.date,
            opponent: teamName(g.opponent, g.season),
            location: g.location,
            value: g.metrics[metric]!,
          })),
        };
        const id = `${target.team}:${metric}:${filters.map((f) => f.id).join(":")}`;
        const score = filters.length * 5 + Math.log2(cohort.length);
        if (context.status !== "pre" && value != null) {
          // Yardage can go down during a live game. This is a snapshot claim,
          // explicitly compared with completed games, never a final record.
          const achievement = `${name} ${context.status === "live" ? "have" : "recorded"} ${number(value)} ${label}${context.status === "live" ? " so far" : ""}`;
          const extreme =
            value >= max && value > 0
              ? "most"
              : context.status === "final" && value <= min
                ? "fewest"
                : null;
          const ties = values.filter((n) => n === value).length;
          if (extreme && ties / cohort.length <= 0.2) {
            ranked.push({
              ...base,
              id: `${id}:record`,
              kind: "record",
              value,
              text: `${achievement} — ${ties ? "tied for the" : "the"} ${extreme} in a ${phase} game ${scope} in our archive from the ${firstSeason} season through this game.`,
              score: score + 30 + (ties ? 0 : 5),
            });
          } else if (value > 0) {
            const last = cohort.findIndex((g) => g.metrics[metric]! >= value);
            if (last >= MIN_COMPARISONS && target.season - cohort[last].season >= 3) {
              ranked.push({
                ...base,
                id: `${id}:since`,
                kind: "since",
                value,
                text: `${achievement} — their first ${phase} game with at least that many ${scope} since ${displayDate(cohort[last].date)}.`,
                score: score + 20 + Math.log2(last),
              });
            }
          }
        }
        // Pregame and uneventful games still get a relevant, verifiable fact.
        if (max > 0) {
          const record = cohort.find((g) => g.metrics[metric] === max)!;
          ranked.push({
            ...base,
            id: `${id}:history`,
            kind: "history",
            value: max,
            text: `Before this game, ${name}’s highest ${label} total in a ${phase} game ${scope} was ${number(max)} (most recently against ${teamName(record.opponent, record.season)} on ${displayDate(record.date)}), in our archive from the ${firstSeason} season.`,
            score,
          });
        }
      }
    }
  }
  // Prefer actual achievements, then variety. Equivalent cohorts should not
  // yield the same fact with a different redundant adjective on every click.
  ranked.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const seen = new Set<string>();
  const facts = ranked.filter((fact) => {
    const key = `${fact.team}:${fact.metric}:${fact.kind}:${fact.receipts.map((r) => r.gameId).join(",")}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const result: RidiculousFact[] = [];
  while (facts.length) {
    const last = result.at(-1);
    const different = facts.findIndex((f) => f.metric !== last?.metric && f.team !== last?.team);
    const [fact] = facts.splice(Math.max(0, different), 1);
    const { score: _score, ...publicFact } = fact;
    result.push(publicFact);
  }
  return result;
}
