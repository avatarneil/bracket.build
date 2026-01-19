"use client";

import { BarChart3, Lock } from "lucide-react";
import { useBracket } from "@/contexts/BracketContext";
import { useGameDialog } from "@/contexts/GameDialogContext";
import { cn } from "@/lib/utils";
import type { LiveGameInfo, Matchup as MatchupType, SeededTeam } from "@/types";
import { TeamCard } from "./TeamCard";

type Size = "sm" | "md" | "lg";

interface MatchupProps {
  matchup: MatchupType;
  onSelectWinner: (matchupId: string, winner: SeededTeam) => void;
  onClearWinner?: (matchupId: string) => void;
  size?: Size;
  /** Size on mobile (< lg breakpoint). Takes precedence over size on mobile. */
  mobileSize?: Size;
  /** Size on desktop (>= lg breakpoint). Takes precedence over size on desktop. */
  desktopSize?: Size;
  showConnector?: boolean;
  connectorSide?: "left" | "right";
}

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

export function Matchup({
  matchup,
  onSelectWinner,
  onClearWinner,
  size = "md",
  mobileSize,
  desktopSize,
  showConnector = false,
  connectorSide = "right",
}: MatchupProps) {
  const { isMatchupLocked, getLiveResultForMatchup } = useBracket();
  const { openGameDialog } = useGameDialog();
  const { homeTeam, awayTeam, winner } = matchup;
  const isLocked = isMatchupLocked(matchup.id);
  const liveResult = getLiveResultForMatchup(matchup.id);
  const canSelect = homeTeam !== null && awayTeam !== null && !isLocked;

  // Show stats button for games with live data (in progress or completed)
  const hasGameData = liveResult && (liveResult.isInProgress || liveResult.isComplete);

  const handleSelect = (team: SeededTeam) => {
    if (!canSelect) return;

    // If clicking on the current winner, clear the selection
    if (winner?.id === team.id && onClearWinner) {
      onClearWinner(matchup.id);
    } else {
      onSelectWinner(matchup.id, team);
    }
  };

  const handleStatsClick = () => {
    if (!liveResult) return;

    // Determine conference and round from matchup ID
    let conference: LiveGameInfo["conference"] = "AFC";
    let round: LiveGameInfo["round"] = "wildCard";

    if (matchup.id.startsWith("nfc-")) {
      conference = "NFC";
    } else if (matchup.id === "super-bowl") {
      conference = "superBowl";
    }

    if (matchup.id.includes("-wc-")) {
      round = "wildCard";
    } else if (matchup.id.includes("-div-")) {
      round = "divisional";
    } else if (matchup.id.includes("-champ")) {
      round = "conference";
    } else if (matchup.id === "super-bowl") {
      round = "superBowl";
    }

    const gameInfo: LiveGameInfo = {
      matchup,
      liveResult,
      conference,
      round,
    };

    openGameDialog(gameInfo);
  };

  // Use responsive sizing if mobileSize/desktopSize are provided
  const effectiveSize = size;
  const effectiveMobileSize = mobileSize || size;
  const effectiveDesktopSize = desktopSize || size;

  // Get scores - map ESPN home/away to our matchup home/away
  const homeScore =
    liveResult?.homeTeamId === homeTeam?.id ? liveResult?.homeScore : liveResult?.awayScore;
  const awayScore =
    liveResult?.awayTeamId === awayTeam?.id ? liveResult?.awayScore : liveResult?.homeScore;

  // Show scores for in-progress or completed games (always visible for live updates)
  const showScores = liveResult && (liveResult.isInProgress || liveResult.isComplete);
  const isInProgress = liveResult?.isInProgress;

  // Get game clock info
  const quarter = liveResult?.quarter;
  const timeRemaining = liveResult?.timeRemaining;
  const isHalftime = liveResult?.isHalftime;
  const isRedZone = liveResult?.isRedZone;
  const possession = liveResult?.possession;

  // Format the game status text
  const getGameStatusText = () => {
    if (isHalftime) return "HALFTIME";
    if (liveResult?.isEndOfQuarter && quarter) return `END ${formatQuarter(quarter)}`;
    if (quarter && timeRemaining) return `${formatQuarter(quarter)} ${timeRemaining}`;
    if (quarter) return formatQuarter(quarter);
    return "LIVE";
  };

  return (
    <div
      data-testid={`matchup-${matchup.conference}-${matchup.round}-${matchup.gameNumber}`}
      className={cn(
        "relative flex flex-col gap-1",
        (effectiveMobileSize === "lg" || effectiveDesktopSize === "lg") && "lg:gap-2",
        // Add margin-bottom for stats button
        hasGameData && "mb-7",
      )}
    >
      {/* Lock indicator for locked matchups */}
      {isLocked && liveResult?.isComplete && (
        <div className="absolute -right-1 -top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-green-600 shadow-md">
          <Lock className="h-3 w-3 text-white" />
        </div>
      )}

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

      <TeamCard
        team={homeTeam}
        isWinner={winner?.id === homeTeam?.id}
        isLoser={winner !== null && winner?.id !== homeTeam?.id}
        onClick={() => homeTeam && handleSelect(homeTeam)}
        disabled={!canSelect}
        size={effectiveSize}
        mobileSize={effectiveMobileSize}
        desktopSize={effectiveDesktopSize}
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

      <TeamCard
        team={awayTeam}
        isWinner={winner?.id === awayTeam?.id}
        isLoser={winner !== null && winner?.id !== awayTeam?.id}
        onClick={() => awayTeam && handleSelect(awayTeam)}
        disabled={!canSelect}
        size={effectiveSize}
        mobileSize={effectiveMobileSize}
        desktopSize={effectiveDesktopSize}
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

      {/* Connector line to next round */}
      {showConnector && (
        <div
          className={cn(
            "absolute top-1/2 h-0.5 w-4 bg-gray-600",
            connectorSide === "right" ? "-right-4" : "-left-4",
          )}
        />
      )}

      {/* Stats button for games with data */}
      {hasGameData && (
        <button
          type="button"
          data-testid={`stats-btn-${matchup.id}`}
          onClick={handleStatsClick}
          className={cn(
            "absolute -bottom-6 left-1/2 -translate-x-1/2",
            "flex items-center gap-1.5 rounded-full px-3 py-2",
            "text-[10px] font-semibold transition-colors active:scale-95",
            liveResult?.isInProgress ? "animate-color-shimmer" : "text-gray-400 hover:text-white",
          )}
        >
          <BarChart3 className="h-3 w-3" />
          <span>Stats</span>
        </button>
      )}
    </div>
  );
}
