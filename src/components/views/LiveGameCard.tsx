"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import type { LiveGameInfo } from "@/types";

interface LiveGameCardProps {
  game: LiveGameInfo;
  onTap: () => void;
}

function formatQuarter(quarter: number): string {
  if (quarter === 1) return "1st";
  if (quarter === 2) return "2nd";
  if (quarter === 3) return "3rd";
  if (quarter === 4) return "4th";
  if (quarter >= 5) return `OT${quarter > 5 ? quarter - 4 : ""}`;
  return `Q${quarter}`;
}

function formatRound(round: string): string {
  switch (round) {
    case "wildCard":
      return "Wild Card";
    case "divisional":
      return "Divisional";
    case "conference":
      return "Conference Championship";
    case "superBowl":
      return "Super Bowl";
    default:
      return round;
  }
}

export function LiveGameCard({ game, onTap }: LiveGameCardProps) {
  const { matchup, liveResult } = game;
  const { homeTeam, awayTeam, winner } = matchup;

  if (!homeTeam || !awayTeam) return null;

  // Map ESPN home/away to our matchup home/away
  const homeScore =
    liveResult.homeTeamId === homeTeam.id ? liveResult.homeScore : liveResult.awayScore;
  const awayScore =
    liveResult.awayTeamId === awayTeam.id ? liveResult.awayScore : liveResult.homeScore;

  const {
    isInProgress,
    isComplete,
    quarter,
    timeRemaining,
    isHalftime,
    isRedZone,
    possession,
    isEndOfQuarter,
  } = liveResult;

  const getGameStatusText = () => {
    if (isComplete) return "FINAL";
    if (isHalftime) return "HALFTIME";
    if (isEndOfQuarter && quarter) return `END ${formatQuarter(quarter)}`;
    if (quarter && timeRemaining) return `${formatQuarter(quarter)} ${timeRemaining}`;
    if (quarter) return formatQuarter(quarter);
    if (isInProgress) return "LIVE";
    return "Upcoming";
  };

  const homeHasPossession = isInProgress && possession === homeTeam.id;
  const awayHasPossession = isInProgress && possession === awayTeam.id;

  return (
    <button
      type="button"
      data-testid={`live-game-card-${matchup.id}`}
      onClick={onTap}
      className={cn(
        "w-full rounded-xl border-2 bg-gray-800 p-4 text-left transition-all",
        "hover:border-gray-500 hover:bg-gray-750 active:scale-[0.99]",
        isInProgress ? "border-yellow-500/50" : "border-gray-700",
      )}
    >
      {/* Round label */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
          {formatRound(game.round)} • {game.conference === "superBowl" ? "" : game.conference}
        </span>
        {/* Game status badge */}
        <div
          className={cn(
            "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide",
            isInProgress && isRedZone
              ? "bg-red-600 text-white"
              : isInProgress
                ? "bg-yellow-500 text-black"
                : isComplete
                  ? "bg-gray-600 text-white"
                  : "bg-gray-700 text-gray-400",
          )}
        >
          {isInProgress && (
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
            </span>
          )}
          {getGameStatusText()}
        </div>
      </div>

      {/* Teams */}
      <div className="space-y-2">
        {/* Away Team (listed first traditionally) */}
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-white">
            <Image
              src={awayTeam.logoUrl}
              alt={`${awayTeam.city} ${awayTeam.name} logo`}
              fill
              className="object-contain p-1"
              sizes="40px"
            />
          </div>
          <div
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
            style={{ backgroundColor: awayTeam.primaryColor }}
          >
            {awayTeam.seed}
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <span
              className={cn(
                "truncate font-semibold",
                winner?.id === awayTeam.id ? "text-green-400" : "text-white",
              )}
            >
              {awayTeam.city} {awayTeam.name}
            </span>
          </div>
          {/* Possession indicator */}
          {awayHasPossession && (
            <div
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-sm",
                isRedZone ? "bg-red-500" : "bg-yellow-400",
              )}
            >
              🏈
            </div>
          )}
          {/* Score */}
          {(isInProgress || isComplete) && awayScore !== null && (
            <div className="ml-auto">
              <span
                className={cn(
                  "font-mono text-2xl font-bold tabular-nums",
                  isInProgress
                    ? "text-yellow-400"
                    : winner?.id === awayTeam.id
                      ? "text-green-400"
                      : "text-gray-400",
                )}
              >
                {awayScore}
              </span>
            </div>
          )}
        </div>

        {/* Home Team */}
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-white">
            <Image
              src={homeTeam.logoUrl}
              alt={`${homeTeam.city} ${homeTeam.name} logo`}
              fill
              className="object-contain p-1"
              sizes="40px"
            />
          </div>
          <div
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
            style={{ backgroundColor: homeTeam.primaryColor }}
          >
            {homeTeam.seed}
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <span
              className={cn(
                "truncate font-semibold",
                winner?.id === homeTeam.id ? "text-green-400" : "text-white",
              )}
            >
              {homeTeam.city} {homeTeam.name}
            </span>
          </div>
          {/* Possession indicator */}
          {homeHasPossession && (
            <div
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-sm",
                isRedZone ? "bg-red-500" : "bg-yellow-400",
              )}
            >
              🏈
            </div>
          )}
          {/* Score */}
          {(isInProgress || isComplete) && homeScore !== null && (
            <div className="ml-auto">
              <span
                className={cn(
                  "font-mono text-2xl font-bold tabular-nums",
                  isInProgress
                    ? "text-yellow-400"
                    : winner?.id === homeTeam.id
                      ? "text-green-400"
                      : "text-gray-400",
                )}
              >
                {homeScore}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tap hint */}
      <div className="mt-3 text-center text-xs text-gray-500">Tap for detailed stats</div>
    </button>
  );
}
