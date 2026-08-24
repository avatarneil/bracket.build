import type { LiveGameInfo, ScheduleGame, SeededTeam } from "@/types";

const AFC_TEAMS = new Set([
  "BAL",
  "BUF",
  "CIN",
  "CLE",
  "DEN",
  "HOU",
  "IND",
  "JAX",
  "KC",
  "LAC",
  "LV",
  "MIA",
  "NE",
  "NYJ",
  "PIT",
  "TEN",
]);

function toSeededTeam(team: ScheduleGame["homeTeam"]): SeededTeam {
  return {
    id: team.id,
    name: team.name,
    city: team.location,
    conference: AFC_TEAMS.has(team.id) ? "AFC" : "NFC",
    primaryColor: team.color,
    secondaryColor: team.color,
    logoUrl: team.logoUrl,
    seed: 0,
  };
}

export function scheduleGameToLiveInfo(game: ScheduleGame): LiveGameInfo {
  const homeTeam = toSeededTeam(game.homeTeam);
  const awayTeam = toSeededTeam(game.awayTeam);
  const matchupId = `schedule-${game.id}`;

  return {
    matchup: {
      id: matchupId,
      round: "wildCard",
      conference: homeTeam.conference,
      homeTeam,
      awayTeam,
      winner: null,
      gameNumber: 0,
    },
    liveResult: {
      matchupId,
      homeTeamId: game.homeTeam.id,
      awayTeamId: game.awayTeam.id,
      homeScore: game.homeScore,
      awayScore: game.awayScore,
      winnerId: game.winnerId,
      isComplete: game.isComplete,
      isInProgress: game.isInProgress,
      gameDate: game.date,
      quarter: game.quarter,
      timeRemaining: game.timeRemaining,
      possession: game.possession,
      isRedZone: game.isRedZone,
      isHalftime: game.statusText.toLowerCase().includes("halftime"),
      isEndOfQuarter: game.statusText.toLowerCase().includes("end"),
    },
    conference: homeTeam.conference,
    round: "wildCard",
  };
}
