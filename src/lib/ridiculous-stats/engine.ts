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
const MIN_INTERVENING_GAMES = 5;
type Filter = {
  id: string;
  label: string;
  wordplay?: boolean;
  matches: (game: TeamGame) => boolean;
};

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
  const opponents: Filter[] = [
    {
      id: `opponent-${target.opponent}`,
      label: `against ${teamName(target.opponent, target.season)}`,
      matches: (g) => g.opponent === target.opponent,
    },
    ...OPPONENT_GROUPS.filter((group) => group.matches(target.opponent, target.season)).map(
      (group) => ({ ...group, matches: (g: TeamGame) => group.matches(g.opponent, g.season) }),
    ),
  ];
  return [
    [],
    ...modifiers.map((modifier) => [modifier]),
    ...opponents.flatMap((opponent) => [
      [opponent],
      ...modifiers.map((modifier) => [opponent, modifier]),
      [opponent, modifiers[0], modifiers[1]],
    ]),
  ];
}

/** Only evidence present in the supplied archive can support a claim. Missing
 * seasons, games, or metric values suppress the affected comparison entirely. */
export function generateFacts(
  context: GameContext,
  history: TeamGame[],
  importedSeasons: number[],
): RidiculousFact[] {
  // Every claim must be triggered by a measured performance in this game.
  if (context.status === "pre") return [];
  const ranked: Array<RidiculousFact & { score: number; wordplay: boolean }> = [];
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
      const scope = filters.length ? ` ${filters.map((f) => f.label).join(" ")}` : "";
      for (const metric of Object.keys(METRICS) as Metric[]) {
        const value = target.metrics[metric];
        if (value == null) continue;
        if (cohort.some((g) => g.metrics[metric] == null)) continue;
        const values = cohort.map((g) => g.metrics[metric]!);
        const max = Math.max(...values);
        const min = Math.min(...values);
        const label = METRICS[metric];
        const number = (n: number) => new Intl.NumberFormat("en-US").format(n);
        const base = {
          wordplay: filters.some((f) => f.wordplay),
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
        // Even live yardage can go down. Only compare the current snapshot's
        // highs with completed games; low-total claims must wait for the final.
        const achievement = `${name} ${context.status === "live" ? "have" : "recorded"} ${number(value)} ${label}${context.status === "live" ? " so far" : ""} against ${teamName(target.opponent, target.season)} in this game`;
        let hasSince = false;
        for (const direction of context.status === "final" ? ["high", "low"] : ["high"]) {
          const last = cohort.findIndex((g) =>
            direction === "high" ? g.metrics[metric]! >= value : g.metrics[metric]! <= value,
          );
          if (last < MIN_INTERVENING_GAMES) continue;
          const previous = cohort[last];
          ranked.push({
            ...base,
            id: `${id}:since:${direction}`,
            kind: "since",
            value,
            text: `${achievement} — their first ${phase} game with ${direction === "high" ? "at least" : "at most"} ${number(value)} ${label}${scope} since ${displayDate(previous.date)} against ${teamName(previous.opponent, previous.season)}.`,
            score: score + 50 + Math.log2(last),
          });
          hasSince = true;
        }
        const extreme =
          value >= max && value > 0
            ? "most"
            : context.status === "final" && value <= min
              ? "fewest"
              : null;
        const ties = values.filter((n) => n === value).length;
        // Prefer the more concrete last occurrence over a tied-record restatement.
        if (!hasSince && extreme && ties / cohort.length <= 0.2) {
          ranked.push({
            ...base,
            id: `${id}:record`,
            kind: "record",
            value,
            text: `${achievement} — ${ties ? "tied for the" : "the"} ${extreme} in a ${phase} game${scope} in our archive from the ${firstSeason} season through this game.`,
            score: score + 30 + (ties ? 0 : 5),
          });
        }
      }
    }
  }
  // Prefer football context over letter counts, then first-since claims.
  // Sort before deduplicating so equivalent cohorts keep the natural label.
  ranked.sort(
    (a, b) =>
      Number(a.wordplay) - Number(b.wordplay) ||
      Number(b.kind === "since") - Number(a.kind === "since") ||
      b.score - a.score ||
      a.id.localeCompare(b.id),
  );
  const seen = new Set<string>();
  let includedWordplay = false;
  const facts = ranked.filter((fact) => {
    const key = `${fact.team}:${fact.metric}:${fact.kind}:${fact.receipts.map((r) => r.gameId).join(",")}`;
    if (seen.has(key)) return false;
    seen.add(key);
    // Odd/even and long nicknames share one slot across both teams and all
    // metrics. Keep that slot even when it is the game's only supported fact.
    if (fact.wordplay) {
      if (includedWordplay) return false;
      includedWordplay = true;
    }
    return true;
  });
  const result: RidiculousFact[] = [];
  while (facts.length) {
    const last = result.at(-1);
    // Team/metric variety must respect the category and claim priorities.
    const different = facts.findIndex(
      (f) =>
        f.wordplay === facts[0].wordplay &&
        f.kind === facts[0].kind &&
        f.metric !== last?.metric &&
        f.team !== last?.team,
    );
    const [fact] = facts.splice(Math.max(0, different), 1);
    const { score: _score, wordplay: _wordplay, ...publicFact } = fact;
    result.push(publicFact);
  }
  return result;
}
