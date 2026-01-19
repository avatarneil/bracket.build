"use client";

import { RefreshCw, X } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { useGameStats } from "@/hooks/useGameStats";
import { extractEventId } from "@/lib/espn-boxscore";
import { cn } from "@/lib/utils";
import { getTeamById } from "@/data/teams";
import type { Matchup, LiveMatchupResult, Team } from "@/types";
import { TeamStatsComparison } from "@/components/game-stats/TeamStatsComparison";
import { PlayerLeadersCard } from "@/components/game-stats/PlayerLeadersCard";
import { ExpandableDrives } from "@/components/game-stats/ExpandableDrives";
import { ScoringPlays } from "@/components/game-stats/ScoringPlays";
import { GameStatsLoading } from "@/components/game-stats/GameStatsLoading";

interface GameStatsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchup: Matchup;
  liveResult: LiveMatchupResult | null;
}

type TabId = "stats" | "leaders" | "plays";

function formatQuarter(quarter: number): string {
  if (quarter === 1) return "1st";
  if (quarter === 2) return "2nd";
  if (quarter === 3) return "3rd";
  if (quarter === 4) return "4th";
  if (quarter >= 5) return `OT${quarter > 5 ? quarter - 4 : ""}`;
  return `Q${quarter}`;
}

export function GameStatsDialog({
  open,
  onOpenChange,
  matchup,
  liveResult,
}: GameStatsDialogProps) {
  const [activeTab, setActiveTab] = useState<TabId>("stats");

  // Extract ESPN event ID from the matchup ID
  const eventId = liveResult?.matchupId
    ? extractEventId(liveResult.matchupId)
    : null;

  const { stats, isLoading, error, refetch, lastUpdated } = useGameStats(
    eventId,
    open,
  );

  // Lock body scroll when dialog is open to prevent background scrolling
  useEffect(() => {
    if (open) {
      // Lock both html and body to prevent all background scrolling
      const html = document.documentElement;
      const body = document.body;

      const originalHtmlOverflow = html.style.overflow;
      const originalBodyOverflow = body.style.overflow;

      html.style.overflow = "hidden";
      body.style.overflow = "hidden";

      // Block touch events on everything except the dialog content
      const handleTouchMove = (e: TouchEvent) => {
        // Find the dialog content element
        const dialogContent = document.querySelector('[data-slot="dialog-content"]');
        if (dialogContent && dialogContent.contains(e.target as Node)) {
          // Allow scrolling within the dialog
          return;
        }
        // Block scrolling outside the dialog
        e.preventDefault();
      };

      document.addEventListener("touchmove", handleTouchMove, { passive: false });

      return () => {
        html.style.overflow = originalHtmlOverflow;
        body.style.overflow = originalBodyOverflow;
        document.removeEventListener("touchmove", handleTouchMove);
      };
    }
  }, [open]);

  // Get team data
  const homeTeam = matchup.homeTeam ? getTeamById(matchup.homeTeam.id) : null;
  const awayTeam = matchup.awayTeam ? getTeamById(matchup.awayTeam.id) : null;

  // Map scores from liveResult (handles ESPN home/away vs bracket home/away)
  const homeScore = liveResult?.homeTeamId === matchup.homeTeam?.id
    ? liveResult?.homeScore
    : liveResult?.awayScore;
  const awayScore = liveResult?.awayTeamId === matchup.awayTeam?.id
    ? liveResult?.awayScore
    : liveResult?.homeScore;

  // Get game status text
  const getStatusText = () => {
    if (liveResult?.isComplete) return "FINAL";
    if (liveResult?.isHalftime) return "HALFTIME";
    if (liveResult?.isEndOfQuarter && liveResult.quarter) {
      return `END ${formatQuarter(liveResult.quarter)}`;
    }
    if (liveResult?.quarter && liveResult.timeRemaining) {
      return `${formatQuarter(liveResult.quarter)} ${liveResult.timeRemaining}`;
    }
    if (liveResult?.isInProgress) return "LIVE";
    return "";
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: "stats", label: "Stats" },
    { id: "leaders", label: "Leaders" },
    { id: "plays", label: "Plays" },
  ];

  const handleTabKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    let newIndex: number | null = null;

    switch (e.key) {
      case "ArrowLeft":
        newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
        break;
      case "ArrowRight":
        newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
        break;
      case "Home":
        newIndex = 0;
        break;
      case "End":
        newIndex = tabs.length - 1;
        break;
    }

    if (newIndex !== null) {
      e.preventDefault();
      setActiveTab(tabs[newIndex].id);
      // Focus the newly selected tab
      document.getElementById(`tab-${tabs[newIndex].id}`)?.focus();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] overflow-hidden border-gray-700 bg-gray-900 p-0 text-white sm:max-w-md md:max-w-lg lg:max-w-xl"
        showCloseButton={false}
      >
        {/* Custom header with team info */}
        <div className="border-b border-gray-700 px-4 py-4 md:px-6">
          {/* Close button */}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close dialog"
            className="absolute right-3 top-3 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Team matchup header */}
          <div className="flex items-center justify-between gap-2">
            {/* Away team */}
            <div className="flex flex-1 items-center gap-2 md:gap-3">
              {awayTeam && (
                <img
                  src={awayTeam.logoUrl}
                  alt={awayTeam.name}
                  className="h-10 w-10 md:h-12 md:w-12"
                />
              )}
              <div className="min-w-0">
                <div className="truncate text-xs font-medium text-gray-400 md:text-sm">
                  {awayTeam?.city}
                </div>
                <div className="truncate text-sm font-bold text-white md:text-base">
                  {awayTeam?.name}
                </div>
              </div>
            </div>

            {/* Scores and status */}
            <div className="flex flex-col items-center px-2">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "text-2xl font-bold tabular-nums md:text-3xl",
                    liveResult?.isInProgress
                      ? "text-yellow-400"
                      : liveResult?.winnerId === matchup.awayTeam?.id
                        ? "text-green-400"
                        : "text-white",
                  )}
                >
                  {awayScore ?? "-"}
                </span>
                <span className="text-gray-500">-</span>
                <span
                  className={cn(
                    "text-2xl font-bold tabular-nums md:text-3xl",
                    liveResult?.isInProgress
                      ? "text-yellow-400"
                      : liveResult?.winnerId === matchup.homeTeam?.id
                        ? "text-green-400"
                        : "text-white",
                  )}
                >
                  {homeScore ?? "-"}
                </span>
              </div>
              <div
                className={cn(
                  "mt-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                  liveResult?.isInProgress
                    ? "bg-yellow-500/20 text-yellow-400"
                    : liveResult?.isComplete
                      ? "bg-gray-700 text-gray-300"
                      : "bg-gray-800 text-gray-400",
                )}
              >
                {getStatusText()}
              </div>
            </div>

            {/* Home team */}
            <div className="flex flex-1 flex-row-reverse items-center gap-2 md:gap-3">
              {homeTeam && (
                <img
                  src={homeTeam.logoUrl}
                  alt={homeTeam.name}
                  className="h-10 w-10 md:h-12 md:w-12"
                />
              )}
              <div className="min-w-0 text-right">
                <div className="truncate text-xs font-medium text-gray-400 md:text-sm">
                  {homeTeam?.city}
                </div>
                <div className="truncate text-sm font-bold text-white md:text-base">
                  {homeTeam?.name}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab navigation */}
        <div role="tablist" className="flex gap-1 border-b border-gray-700 px-4 md:px-6">
          {tabs.map((tab, index) => (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`tabpanel-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(e) => handleTabKeyDown(e, index)}
              className={cn(
                "relative px-4 py-2.5 text-sm font-medium transition-colors md:py-3 md:text-base",
                activeTab === tab.id
                  ? "text-white"
                  : "text-gray-400 hover:text-gray-200",
              )}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-500 to-blue-500" />
              )}
            </button>
          ))}

          {/* Refresh button */}
          {liveResult?.isInProgress && (
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isLoading}
              className="ml-auto flex items-center gap-1.5 px-2 py-2 text-xs text-gray-400 hover:text-white disabled:opacity-50"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          )}
        </div>

        {/* Content area */}
        <div
          role="tabpanel"
          id={`tabpanel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
          className="max-h-[calc(90vh-180px)] overflow-y-auto overscroll-contain px-4 py-4 md:px-6 md:py-5"
        >
          {isLoading && !stats ? (
            <GameStatsLoading />
          ) : error ? (
            <div className="py-8 text-center">
              <p className="text-gray-400">Failed to load game stats</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="mt-3 border-gray-600 text-gray-300"
              >
                Try Again
              </Button>
            </div>
          ) : stats && homeTeam && awayTeam ? (
            <>
              {activeTab === "stats" && (
                <TeamStatsComparison
                  awayStats={stats.teamStats.away}
                  homeStats={stats.teamStats.home}
                  awayColor={awayTeam.primaryColor}
                  homeColor={homeTeam.primaryColor}
                />
              )}
              {activeTab === "leaders" && (
                <PlayerLeadersCard
                  awayLeaders={stats.playerLeaders.away}
                  homeLeaders={stats.playerLeaders.home}
                  awayTeamName={awayTeam.name}
                  homeTeamName={homeTeam.name}
                  awayColor={awayTeam.primaryColor}
                  homeColor={homeTeam.primaryColor}
                />
              )}
              {activeTab === "plays" && (
                stats.drives && stats.drives.length > 0 ? (
                  <ExpandableDrives
                    drives={stats.drives}
                    homeTeamId={stats.homeTeamId}
                    awayTeamId={stats.awayTeamId}
                    homeColor={homeTeam.primaryColor}
                    awayColor={awayTeam.primaryColor}
                  />
                ) : (
                  <ScoringPlays
                    plays={stats.scoringPlays}
                    homeTeamId={stats.homeTeamId}
                    awayTeamId={stats.awayTeamId}
                    homeColor={homeTeam.primaryColor}
                    awayColor={awayTeam.primaryColor}
                  />
                )
              )}
            </>
          ) : (
            <div className="py-8 text-center text-gray-400">
              No stats available
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-700 px-4 py-3 md:px-6">
          <div className="flex items-center justify-between text-[10px] text-gray-500">
            <span>Data from ESPN</span>
            {lastUpdated && (
              <span>
                Updated {lastUpdated.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
              </span>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
