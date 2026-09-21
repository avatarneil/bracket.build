"use client";

import Image from "next/image";
import { Radio } from "lucide-react";
import { useGameDialog } from "@/contexts/GameDialogContext";
import { scheduleGameToLiveInfo } from "@/lib/schedule-game";
import { cn } from "@/lib/utils";
import type { ScheduleGame } from "@/types";

interface ScheduleGameRowProps {
  game: ScheduleGame;
}

function formatKickoff(date: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

function TeamLine({
  team,
  score,
  isDimmed,
  isLive,
  hasPossession,
  showScore,
}: {
  team: ScheduleGame["homeTeam"];
  score: number | null;
  isDimmed: boolean;
  isLive: boolean;
  hasPossession: boolean;
  showScore: boolean;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3", isDimmed && "text-gray-400")}>
      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-white sm:h-10 sm:w-10">
        <Image src={team.logoUrl} alt="" fill sizes="40px" className="object-contain p-1" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn("truncate font-semibold", !isDimmed && "text-white")}>
            <span className="sm:hidden">{team.abbreviation}</span>
            <span className="hidden sm:inline">{team.displayName}</span>
          </span>
          {hasPossession && (
            <span className="text-xs" aria-label={`${team.displayName} has possession`}>
              🏈
            </span>
          )}
        </div>
        {team.record && <span className="text-xs text-gray-400">{team.record}</span>}
      </div>
      {showScore && (
        <span
          className={cn(
            "font-mono text-2xl font-bold tabular-nums",
            isLive ? "text-yellow-300" : isDimmed ? "text-gray-500" : "text-white",
          )}
        >
          {score ?? 0}
        </span>
      )}
    </div>
  );
}

export function ScheduleGameRow({ game }: ScheduleGameRowProps) {
  const { openGameDialog, selectedGame } = useGameDialog();
  const isSelected = selectedGame?.matchup.id === `schedule-${game.id}`;
  const showScore = game.isInProgress || game.isComplete;
  const broadcast = game.broadcasts.join(", ");

  const openGame = () => {
    openGameDialog(scheduleGameToLiveInfo(game));
  };

  const content = (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="space-y-3">
        <TeamLine
          team={game.awayTeam}
          score={game.awayScore}
          isDimmed={game.isComplete && !!game.winnerId && game.winnerId !== game.awayTeam.id}
          isLive={game.isInProgress}
          hasPossession={game.possession === game.awayTeam.id}
          showScore={showScore}
        />
        <TeamLine
          team={game.homeTeam}
          score={game.homeScore}
          isDimmed={game.isComplete && !!game.winnerId && game.winnerId !== game.homeTeam.id}
          isLive={game.isInProgress}
          hasPossession={game.possession === game.homeTeam.id}
          showScore={showScore}
        />
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-gray-800 pt-3 sm:w-40 sm:flex-col sm:items-end sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0 sm:text-right">
        <div>
          {game.isInProgress ? (
            <div
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
                game.isRedZone ? "bg-red-600 text-white" : "bg-yellow-400 text-black",
              )}
            >
              <Radio className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{game.statusText}</span>
            </div>
          ) : game.isComplete ? (
            <div>
              <span className="text-sm font-bold text-gray-300">Final</span>
              <div className="mt-1 text-xs font-medium text-gray-400">Full stats →</div>
            </div>
          ) : (
            <time dateTime={game.date} className="text-sm font-semibold text-white">
              {formatKickoff(game.date)}
            </time>
          )}
        </div>
        <div className="min-w-0 text-right text-xs text-gray-400">
          {broadcast && <div className="font-medium text-gray-400">{broadcast}</div>}
          {game.venue && <div className="hidden truncate sm:block">{game.venue}</div>}
        </div>
      </div>
    </div>
  );

  return (
    <li
      data-testid={`schedule-game-${game.id}`}
      aria-current={isSelected ? "true" : undefined}
      className={cn(
        "relative px-4 py-4 sm:px-5",
        isSelected
          ? "bg-yellow-400/10 ring-2 ring-inset ring-yellow-300/70"
          : game.isInProgress && "bg-yellow-400/[0.06]",
      )}
    >
      {isSelected && <p className="mb-2 text-xs font-semibold text-yellow-300">Viewing details</p>}
      {game.isInProgress || game.isComplete ? (
        <button
          type="button"
          onClick={openGame}
          aria-label={`View ${game.isComplete ? "final stats" : "live updates"} for ${game.awayTeam.displayName} at ${game.homeTeam.displayName}`}
          className="-m-2 block w-[calc(100%+1rem)] rounded-lg p-2 text-left touch-manipulation transition-colors hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          {content}
        </button>
      ) : (
        <article>{content}</article>
      )}
    </li>
  );
}
