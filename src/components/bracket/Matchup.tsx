"use client";

import { cn } from "@/lib/utils";
import type { Matchup as MatchupType, SeededTeam } from "@/types";
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
  const { homeTeam, awayTeam, winner } = matchup;
  const canSelect = homeTeam !== null && awayTeam !== null;

  const handleSelect = (team: SeededTeam) => {
    if (!canSelect) return;

    // If clicking on the current winner, clear the selection
    if (winner?.id === team.id && onClearWinner) {
      onClearWinner(matchup.id);
    } else {
      onSelectWinner(matchup.id, team);
    }
  };

  // Use responsive sizing if mobileSize/desktopSize are provided
  const effectiveSize = size;
  const effectiveMobileSize = mobileSize || size;
  const effectiveDesktopSize = desktopSize || size;

  return (
    <div
      className={cn(
        "relative flex flex-col gap-1",
        (effectiveMobileSize === "lg" || effectiveDesktopSize === "lg") &&
          "lg:gap-2",
      )}
    >
      <TeamCard
        team={homeTeam}
        isWinner={winner?.id === homeTeam?.id}
        isLoser={winner !== null && winner?.id !== homeTeam?.id}
        onClick={() => homeTeam && handleSelect(homeTeam)}
        disabled={!canSelect}
        size={effectiveSize}
        mobileSize={effectiveMobileSize}
        desktopSize={effectiveDesktopSize}
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
    </div>
  );
}
