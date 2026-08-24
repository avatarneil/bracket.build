"use client";

import Image from "next/image";
import { Activity, Radio } from "lucide-react";
import { GameStatsDialog } from "@/components/dialogs/GameStatsDialog";
import { useGameDialog } from "@/contexts/GameDialogContext";
import { scheduleGameToLiveInfo } from "@/lib/schedule-game";
import { cn } from "@/lib/utils";
import type { ScheduleGame, SeasonSchedule } from "@/types";

function LiveTeamLine({
  team,
  score,
  hasPossession,
}: {
  team: ScheduleGame["homeTeam"];
  score: number | null;
  hasPossession: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-white shadow-sm">
        <Image src={team.logoUrl} alt="" fill sizes="44px" className="object-contain p-1.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-semibold text-white">{team.displayName}</span>
          {hasPossession && (
            <span aria-label={`${team.displayName} has possession`} className="text-xs">
              🏈
            </span>
          )}
        </div>
        {team.record && <span className="text-xs text-gray-400">{team.record}</span>}
      </div>
      <span className="font-mono text-3xl font-bold tabular-nums text-white">{score ?? 0}</span>
    </div>
  );
}

function LiveGameCard({ game, isSelected }: { game: ScheduleGame; isSelected: boolean }) {
  const { openGameDialog } = useGameDialog();
  const broadcast = game.broadcasts.join(", ");

  return (
    <button
      type="button"
      data-testid={`live-dashboard-game-${game.id}`}
      aria-pressed={isSelected}
      aria-label={`Show full stats for ${game.awayTeam.displayName} at ${game.homeTeam.displayName}`}
      onClick={() => openGameDialog(scheduleGameToLiveInfo(game))}
      className={cn(
        "group min-h-60 touch-manipulation rounded-2xl border bg-gray-900 p-5 text-left shadow-[0_18px_50px_rgba(0,0,0,0.28)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
        isSelected
          ? "border-yellow-300/70 bg-gray-900"
          : "border-gray-800 hover:border-gray-600 hover:bg-gray-900/80",
      )}
    >
      <div className="mb-5 flex min-w-0 items-center justify-between gap-3">
        <span
          className={cn(
            "inline-flex min-w-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide",
            game.isRedZone ? "bg-red-600 text-white" : "bg-yellow-300 text-black",
          )}
        >
          <Radio className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{game.isRedZone ? "Red zone" : game.statusText}</span>
        </span>
        {broadcast && (
          <span className="truncate text-xs font-medium text-gray-400">{broadcast}</span>
        )}
      </div>

      <div className="space-y-4">
        <LiveTeamLine
          team={game.awayTeam}
          score={game.awayScore}
          hasPossession={game.possession === game.awayTeam.id}
        />
        <LiveTeamLine
          team={game.homeTeam}
          score={game.homeScore}
          hasPossession={game.possession === game.homeTeam.id}
        />
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-gray-800 pt-4 text-xs">
        <span className="truncate text-gray-400">{game.venue ?? "Venue TBD"}</span>
        <span className="shrink-0 font-semibold text-gray-200 group-hover:text-white">
          {isSelected ? "Viewing details" : "Full stats →"}
        </span>
      </div>
    </button>
  );
}

export function LiveGamesDashboard({ schedule }: { schedule: SeasonSchedule | null }) {
  const { selectedGame, activeTab, closeGameDialog, setActiveTab } = useGameDialog();
  const liveGames = schedule?.games.filter((game) => game.isInProgress) ?? [];
  const selectedMatchupId = selectedGame?.matchup.id;
  const lastUpdated = schedule
    ? new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(
        schedule.fetchedAt,
      )
    : null;

  return (
    <section
      data-testid="live-games-dashboard"
      aria-labelledby="live-dashboard-title"
      className="min-h-[calc(100vh-3rem)] rounded-2xl border border-gray-800 bg-gray-950/70 p-5 2xl:p-6"
    >
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-gray-800 pb-5">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-yellow-300">
            <Activity className="h-4 w-4" aria-hidden="true" />
            Game center
          </div>
          <h2 id="live-dashboard-title" className="text-2xl font-bold tracking-tight text-white">
            Live dashboard
          </h2>
          <p className="mt-1 text-sm text-gray-400">
            Every active game, updating automatically in one view.
          </p>
        </div>
        <div className="text-right">
          <p
            data-testid="live-game-count"
            className="font-mono text-2xl font-bold tabular-nums text-white"
          >
            {liveGames.length}
          </p>
          <p className="text-xs text-gray-400">
            {liveGames.length === 1 ? "live game" : "live games"}
            {lastUpdated ? ` · updated ${lastUpdated}` : ""}
          </p>
        </div>
      </header>

      {liveGames.length > 0 ? (
        <div
          className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,22rem),1fr))] gap-4"
          aria-live="polite"
        >
          {liveGames.map((game) => (
            <LiveGameCard
              key={game.id}
              game={game}
              isSelected={selectedMatchupId === `schedule-${game.id}`}
            />
          ))}
        </div>
      ) : (
        <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-800 px-8 text-center">
          <div className="relative mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-900">
            <Activity className="h-7 w-7 text-gray-500" aria-hidden="true" />
          </div>
          <h3 className="text-lg font-semibold text-white">No games are live</h3>
          <p className="mt-2 max-w-sm text-sm leading-6 text-gray-400">
            The dashboard will fill in as this week’s games kick off. Upcoming and final games stay
            in the schedule rail.
          </p>
        </div>
      )}

      {selectedGame && (
        <div className="mt-5 scroll-mt-6" data-testid="selected-game-details">
          <GameStatsDialog
            open
            variant="panel"
            onOpenChange={(open) => {
              if (!open) closeGameDialog();
            }}
            matchup={selectedGame.matchup}
            liveResult={selectedGame.liveResult}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>
      )}
    </section>
  );
}
