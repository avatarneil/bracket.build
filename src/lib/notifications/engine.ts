import type {
  GameAlert,
  NotificationFollow,
  NotificationGame,
  NotificationPreferences,
} from "./types";

export function gameUrl(game: NotificationGame) {
  return `/?${new URLSearchParams({ league: game.league, season: String(game.season), phase: game.phase, week: String(game.week), game: `schedule-${game.id}` })}`;
}

export function recommendationReason(game: NotificationGame): string | null {
  if (game.phase === "postseason") return "Postseason football";
  if (game.phase !== "regular") return null;
  if (
    game.league === "college-football" &&
    [game.homeTeam, game.awayTeam].every((team) => team.rank && team.rank <= 25)
  )
    return "Two top-25 teams meet";
  const winningRecord = (record: string | null) => {
    if (!record || !/^\d+-\d+(-\d+)?$/.test(record)) return false;
    const [wins, losses, ties = 0] = record.split("-").map(Number);
    return wins + losses + ties >= 3 && wins / (wins + losses + ties) >= 0.6;
  };
  return [game.homeTeam, game.awayTeam].every((team) => winningRecord(team.record))
    ? "Both teams have won at least 60% of their games"
    : null;
}

// Comparisons require a recent baseline. First observation never announces old
// scores, kickoffs, or finals. Missing scores are not treated as zero.
export function detectAlerts(
  game: NotificationGame,
  previous: NotificationGame | null,
  now: number,
): GameAlert[] {
  const alerts: GameAlert[] = [];
  const start = new Date(game.date).getTime();
  if (!Number.isFinite(start) || now - start > 8 * 60 * 60_000) return alerts;
  const matchup = `${game.awayTeam.abbreviation} at ${game.homeTeam.abbreviation}`;
  const score = `${game.awayTeam.abbreviation} ${game.awayScore ?? "–"}, ${game.homeTeam.abbreviation} ${game.homeScore ?? "–"}`;
  const add = (kind: GameAlert["kind"], key: string, title: string, body: string) =>
    alerts.push({
      id: `${game.league}:${game.id}:${key}`,
      kind,
      league: game.league,
      season: game.season,
      gameId: game.id,
      teamIds: [game.homeTeam.id, game.awayTeam.id],
      title,
      body,
      url: gameUrl(game),
    });
  if (!game.isComplete && !game.isInProgress && start > now && start - now <= 15 * 60_000) {
    const reason = recommendationReason(game);
    if (reason)
      add(
        "recommendations",
        "recommendation",
        `Worth watching: ${matchup}`,
        `${reason}. Scheduled to start within 15 minutes.`,
      );
  }
  if (game.isInProgress && !game.isComplete) {
    if (previous && !previous.isInProgress && !previous.isComplete)
      add("gameStart", "start", `Underway: ${matchup}`, `${score} · ${game.statusText}`);
    const scoresKnown = game.homeScore !== null && game.awayScore !== null;
    if (
      scoresKnown &&
      (game.quarter ?? 0) >= 4 &&
      ((game.quarter ?? 0) >= 5 || Math.abs(game.homeScore! - game.awayScore!) <= 8)
    )
      add(
        "heatingUp",
        "hot",
        `Heating up: ${matchup}`,
        `${score} · ${game.statusText}. ${(game.quarter ?? 0) >= 5 ? "Overtime" : "One-score game in the fourth quarter"}.`,
      );
    if (
      previous?.isInProgress &&
      !previous.isComplete &&
      scoresKnown &&
      previous.homeScore !== null &&
      previous.awayScore !== null &&
      game.homeScore! >= previous.homeScore &&
      game.awayScore! >= previous.awayScore &&
      (game.homeScore !== previous.homeScore || game.awayScore !== previous.awayScore)
    ) {
      const oldLead = Math.sign(previous.homeScore - previous.awayScore);
      const newLead = Math.sign(game.homeScore! - game.awayScore!);
      const label =
        oldLead !== newLead ? (newLead === 0 ? "Tie game" : "Lead change") : "Score update";
      add(
        "majorUpdates",
        `score:${game.homeScore}:${game.awayScore}`,
        `${label}: ${matchup}`,
        `${score} · ${game.statusText}`,
      );
    }
  }
  if (
    game.isComplete &&
    previous?.isInProgress &&
    !previous.isComplete &&
    game.homeScore !== null &&
    game.awayScore !== null
  )
    add("majorUpdates", "final", `Final: ${matchup}`, score);
  return alerts;
}

export function wantsAlert(
  preferences: NotificationPreferences,
  follows: NotificationFollow[],
  alert: GameAlert,
) {
  if (!preferences.enabled || !preferences[alert.kind]) return false;
  if (alert.kind === "recommendations" || alert.kind === "heatingUp")
    return alert.league === "nfl" ? preferences.nfl : preferences.collegeFootball;
  return follows.some(
    (follow) =>
      follow.league === alert.league &&
      follow.season === alert.season &&
      follow[alert.kind as "gameStart" | "majorUpdates"] &&
      (follow.kind === "game"
        ? follow.targetId === alert.gameId
        : alert.teamIds.includes(follow.targetId)),
  );
}
