"use client";

import { BarChart3, Trophy } from "lucide-react";
import { useState } from "react";
import { GameStatsDialog } from "@/components/dialogs/GameStatsDialog";
import { useBracket } from "@/contexts/BracketContext";
import { cn } from "@/lib/utils";
import type { SeededTeam } from "@/types";
import { TeamCard } from "./TeamCard";

/**
 * Format quarter number to display string
 */
function formatQuarter(quarter: number): string {
  if (quarter === 1) return "1st";
  if (quarter === 2) return "2nd";
  if (quarter === 3) return "3rd";
  if (quarter === 4) return "4th";
  if (quarter >= 5) return `OT${quarter > 5 ? quarter - 4 : ""}`;
  return `Q${quarter}`;
}

export function SuperBowl() {
  const { bracket, selectWinner, clearWinner, isMatchupLocked, getLiveResultForMatchup } =
    useBracket();
  const { superBowl } = bracket;

  // State for game stats dialog
  const [showStatsDialog, setShowStatsDialog] = useState(false);

  if (!superBowl) return null;

  const { homeTeam, awayTeam, winner } = superBowl;
  const isLocked = isMatchupLocked(superBowl.id);
  const liveResult = getLiveResultForMatchup(superBowl.id);
  const canSelect = homeTeam !== null && awayTeam !== null && !isLocked;

  // Show stats/scores for games with live data (in progress or completed)
  const hasGameData = liveResult && (liveResult.isInProgress || liveResult.isComplete);
  const isInProgress = liveResult?.isInProgress;

  // Get scores - map ESPN home/away to our matchup home/away
  const homeScore =
    liveResult?.homeTeamId === homeTeam?.id ? liveResult?.homeScore : liveResult?.awayScore;
  const awayScore =
    liveResult?.awayTeamId === awayTeam?.id ? liveResult?.awayScore : liveResult?.homeScore;
  const showScores = hasGameData;

  // Game clock info
  const quarter = liveResult?.quarter;
  const timeRemaining = liveResult?.timeRemaining;
  const isHalftime = liveResult?.isHalftime;
  const isRedZone = liveResult?.isRedZone;
  const possession = liveResult?.possession;

  const getGameStatusText = () => {
    if (isHalftime) return "HALFTIME";
    if (liveResult?.isEndOfQuarter && quarter) return `END ${formatQuarter(quarter)}`;
    if (quarter && timeRemaining) return `${formatQuarter(quarter)} ${timeRemaining}`;
    if (quarter) return formatQuarter(quarter);
    return "LIVE";
  };

  const handleSelect = (team: SeededTeam) => {
    if (!canSelect) return;

    // If clicking on the current winner, clear the selection
    if (winner?.id === team.id) {
      clearWinner(superBowl.id);
    } else {
      selectWinner(superBowl.id, team);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2 sm:gap-3 lg:gap-2">
      {/* Super Bowl Header */}
      <div className="flex flex-col items-center gap-1">
        <Trophy className="h-5 w-5 text-[#D4BE8C] sm:h-6 sm:w-6 lg:h-5 lg:w-5" />
        <div className="rounded-lg border border-white/20 bg-black px-3 py-1 text-center text-xs font-bold uppercase tracking-wider text-white shadow-lg sm:px-4 sm:py-1.5 sm:text-sm lg:px-3 lg:py-1 lg:text-xs">
          Super Bowl LX
        </div>
      </div>

      {/* Matchup */}
      <div
        data-testid="matchup-superBowl"
        className="relative flex flex-col items-center gap-2 rounded-xl border-2 border-[#D4BE8C]/30 bg-gray-800/50 p-3 sm:gap-3 sm:p-4 lg:gap-2 lg:p-3"
      >
        {/* In-progress game clock badge */}
        {isInProgress && (
          <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2">
            <div
              className={cn(
                "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide shadow-lg",
                isRedZone ? "bg-red-600 text-white" : "bg-yellow-500 text-black",
              )}
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
              </span>
              <span>{getGameStatusText()}</span>
            </div>
          </div>
        )}

        {/* AFC Champion */}
        <div className="w-48 sm:w-52 lg:w-48">
          <div className="mb-1 text-center text-[10px] font-semibold uppercase text-red-400 sm:text-xs lg:text-[10px]">
            AFC Champion
          </div>
          <TeamCard
            team={homeTeam}
            isWinner={winner?.id === homeTeam?.id}
            isLoser={winner !== null && winner?.id !== homeTeam?.id}
            onClick={() => homeTeam && handleSelect(homeTeam)}
            disabled={!canSelect}
            mobileSize="sm"
            desktopSize="sm"
            isLocked={isLocked}
            hasPossession={isInProgress && possession === homeTeam?.id}
            isRedZone={isRedZone}
            score={showScores ? homeScore : undefined}
            scoreColorClass={
              isInProgress
                ? "text-yellow-400"
                : winner?.id === homeTeam?.id
                  ? "text-green-400"
                  : "text-gray-400"
            }
          />
        </div>

        <div className="text-base font-bold text-gray-500 sm:text-lg lg:text-base">VS</div>

        {/* NFC Champion */}
        <div className="w-48 sm:w-52 lg:w-48">
          <div className="mb-1 text-center text-[10px] font-semibold uppercase text-blue-400 sm:text-xs lg:text-[10px]">
            NFC Champion
          </div>
          <TeamCard
            team={awayTeam}
            isWinner={winner?.id === awayTeam?.id}
            isLoser={winner !== null && winner?.id !== awayTeam?.id}
            onClick={() => awayTeam && handleSelect(awayTeam)}
            disabled={!canSelect}
            mobileSize="sm"
            desktopSize="sm"
            isLocked={isLocked}
            hasPossession={isInProgress && possession === awayTeam?.id}
            isRedZone={isRedZone}
            score={showScores ? awayScore : undefined}
            scoreColorClass={
              isInProgress
                ? "text-yellow-400"
                : winner?.id === awayTeam?.id
                  ? "text-green-400"
                  : "text-gray-400"
            }
          />
        </div>

        {/* Champion Display */}
        {winner && (
          <div className="mt-1 flex flex-col items-center gap-1.5 rounded-lg bg-[#D4BE8C]/15 px-3 py-2 sm:mt-2 sm:px-4 sm:py-3 lg:mt-1 lg:gap-1 lg:px-3 lg:py-2">
            <Trophy className="h-6 w-6 text-[#D4BE8C] sm:h-8 sm:w-8 lg:h-6 lg:w-6" />
            <div className="text-center">
              <div className="text-[10px] font-semibold uppercase text-[#D4BE8C] sm:text-xs lg:text-[10px]">
                Super Bowl Champion
              </div>
              <div className="text-sm font-bold text-white sm:text-base lg:text-sm">
                {winner.city} {winner.name}
              </div>
            </div>
          </div>
        )}

        {/* Stats button for games with data */}
        {hasGameData && (
          <button
            type="button"
            data-testid={`stats-btn-${superBowl.id}`}
            onClick={() => setShowStatsDialog(true)}
            className={cn(
              "absolute -bottom-6 left-1/2 -translate-x-1/2",
              "flex items-center gap-1.5 rounded-full px-3 py-1.5",
              "text-[10px] font-semibold uppercase tracking-wide",
              "transition-all duration-200 active:scale-95",
              "shadow-sm",
              isInProgress
                ? "border border-yellow-500/40 bg-yellow-500/20 text-yellow-400 hover:border-yellow-500/60 hover:bg-yellow-500/30"
                : "border border-gray-600/50 bg-gray-700/80 text-gray-300 hover:border-gray-500/70 hover:bg-gray-600/90 hover:text-white",
            )}
          >
            <BarChart3 className="h-3 w-3" />
            <span>Stats</span>
          </button>
        )}
      </div>

      {/* Game Stats Dialog */}
      <GameStatsDialog
        open={showStatsDialog}
        onOpenChange={setShowStatsDialog}
        matchup={superBowl}
        liveResult={liveResult}
      />
    </div>
  );
}
