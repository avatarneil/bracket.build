"use client";

import { Lock, LockOpen, RefreshCw } from "lucide-react";
import { useBracket } from "@/contexts/BracketContext";
import { hasCompletedGames, hasInProgressGames } from "@/lib/espn-api";
import { cn } from "@/lib/utils";
import type { RoundName } from "@/types";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";

const ROUND_LABELS: Record<RoundName, string> = {
  wildCard: "Wild Card",
  divisional: "Divisional",
  conference: "Championship",
  superBowl: "Super Bowl",
};

interface RoundLockToggleProps {
  round: RoundName;
  hasGames: boolean;
}

function RoundLockToggle({ round, hasGames }: RoundLockToggleProps) {
  const { bracket, toggleRoundLock } = useBracket();
  const isLocked = bracket.lockedRounds[round];

  if (!hasGames) {
    return (
      <div className="flex items-center gap-2 opacity-40">
        <Switch disabled checked={false} />
        <span className="text-xs text-gray-500">{ROUND_LABELS[round]}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={isLocked}
        onCheckedChange={() => toggleRoundLock(round)}
        aria-label={`Toggle ${ROUND_LABELS[round]} lock`}
      />
      <button
        type="button"
        onClick={() => toggleRoundLock(round)}
        className={cn(
          "flex items-center gap-1.5 text-xs transition-colors",
          isLocked
            ? "text-green-400 hover:text-green-300"
            : "text-gray-400 hover:text-gray-300",
        )}
      >
        {isLocked ? (
          <Lock className="h-3 w-3" />
        ) : (
          <LockOpen className="h-3 w-3" />
        )}
        <span>{ROUND_LABELS[round]}</span>
      </button>
    </div>
  );
}

export function RoundLockControl() {
  const { bracket, refreshLiveResults, isLoadingLiveResults } = useBracket();
  const { liveResults } = bracket;

  // Determine which rounds have games
  const roundsWithGames = {
    wildCard: hasCompletedGames(liveResults, "wildCard"),
    divisional: hasCompletedGames(liveResults, "divisional"),
    conference: hasCompletedGames(liveResults, "conference"),
    superBowl: hasCompletedGames(liveResults, "superBowl"),
  };

  const anyRoundsWithGames = Object.values(roundsWithGames).some(Boolean);
  const hasLiveGames = hasInProgressGames(liveResults);

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-3">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-white">Live Results</h3>
          {liveResults && (
            <span className="text-xs text-gray-500">
              Updated {new Date(liveResults.fetchedAt).toLocaleTimeString()}
            </span>
          )}
          {hasLiveGames && (
            <span className="flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-medium text-red-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
              </span>
              LIVE
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refreshLiveResults()}
          disabled={isLoadingLiveResults}
          className="h-7 px-2 text-gray-400 hover:text-white"
        >
          <RefreshCw
            className={cn("h-3.5 w-3.5", isLoadingLiveResults && "animate-spin")}
          />
          <span className="ml-1 text-xs">Refresh</span>
        </Button>
      </div>

      {!liveResults ? (
        <p className="text-xs text-gray-500">
          {isLoadingLiveResults
            ? "Loading live results..."
            : "No live results loaded. Click refresh to load."}
        </p>
      ) : !anyRoundsWithGames ? (
        <p className="text-xs text-gray-500">
          No completed games yet. Check back during the playoffs!
        </p>
      ) : (
        <>
          <p className="mb-2 text-xs text-gray-500">
            Toggle to use actual results (locked) or make your own predictions
          </p>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-4">
            <RoundLockToggle round="wildCard" hasGames={roundsWithGames.wildCard} />
            <RoundLockToggle round="divisional" hasGames={roundsWithGames.divisional} />
            <RoundLockToggle round="conference" hasGames={roundsWithGames.conference} />
            <RoundLockToggle round="superBowl" hasGames={roundsWithGames.superBowl} />
          </div>
        </>
      )}
    </div>
  );
}
