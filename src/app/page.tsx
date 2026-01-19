"use client";

import { useEffect, useState } from "react";
import { BracketControls } from "@/components/BracketControls";
import { Bracket } from "@/components/bracket/Bracket";
import { GameStatsDialog } from "@/components/dialogs/GameStatsDialog";
import { WelcomeDialog } from "@/components/dialogs/WelcomeDialog";
import { MobileActionBar } from "@/components/MobileActionBar";
import { RoundLockControl } from "@/components/RoundLockControl";
import { LiveGamesView } from "@/components/views/LiveGamesView";
import { ViewToggle } from "@/components/views/ViewToggle";
import { BracketProvider, useBracket } from "@/contexts/BracketContext";
import { useView, ViewProvider } from "@/contexts/ViewContext";
import { getStoredUser } from "@/lib/storage";
import type { LiveGameInfo } from "@/types";

function BracketApp() {
  const { refreshLiveResults, bracket } = useBracket();
  const { viewMode } = useView();
  const [showWelcome, setShowWelcome] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [selectedGame, setSelectedGame] = useState<LiveGameInfo | null>(null);

  useEffect(() => {
    setIsHydrated(true);
    const user = getStoredUser();
    if (!user || !user.name) {
      setShowWelcome(true);
    }
  }, []);

  // Global wheel handler to ensure vertical scrolling works in WebViews
  // Some WebViews (like ChatGPT Atlas) capture wheel events incorrectly
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // If scrolling is mostly vertical, manually scroll the window
      // This bypasses any containers that might incorrectly capture the event
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        window.scrollBy(0, e.deltaY);
        e.preventDefault();
      }
    };

    document.addEventListener("wheel", handleWheel, { passive: false });
    return () => document.removeEventListener("wheel", handleWheel);
  }, []);

  // Auto-fetch live results on initial load
  useEffect(() => {
    if (isHydrated && !bracket.liveResults) {
      refreshLiveResults();
    }
  }, [isHydrated, bracket.liveResults, refreshLiveResults]);

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <>
      {/* Main content with bottom padding for mobile/tablet action bar */}
      <main className="min-h-screen overflow-x-hidden bg-black px-3 pb-28 pt-4 sm:px-4 sm:py-8 md:px-6 md:pb-32 md:pt-6 lg:pb-8">
        {/* Use inline-flex wrapper to let content determine its own width and center it */}
        <div className="flex justify-center overflow-x-hidden">
          <div className="inline-flex max-w-full flex-col items-center overflow-x-hidden">
            {/* Header - scales with viewport, larger on tablets */}
            <header className="mb-4 text-center sm:mb-6 md:mb-8">
              <h1 className="font-mono bg-gradient-to-r from-red-500 via-white to-blue-500 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl md:text-5xl lg:text-5xl">
                bracket.build
              </h1>
              <p className="mt-1 text-sm text-gray-400 sm:mt-2 sm:text-lg md:text-xl">
                NFL Playoff Predictions • 2025-26
              </p>
            </header>

            {/* View Toggle */}
            <ViewToggle className="mb-4 sm:mb-6" />

            {/* Controls - only show in bracket view when not guest */}
            {viewMode === "bracket" && !isGuestMode && (
              <div className="mb-4 w-full sm:mb-6 md:mb-8">
                <BracketControls onResetName={() => setShowWelcome(true)} />
              </div>
            )}

            {/* Live Results Control - only in bracket view */}
            {viewMode === "bracket" && (
              <div className="mb-4 w-full max-w-2xl sm:mb-6">
                <RoundLockControl />
              </div>
            )}

            {/* Main Content */}
            {viewMode === "bracket" ? (
              <>
                {/* Bracket */}
                <div className="pb-4 sm:pb-8 md:pb-10">
                  <Bracket />
                </div>

                {/* Instructions - hidden on mobile/tablet (they use the app naturally) */}
                <div className="mt-8 hidden text-center text-sm text-gray-500 lg:block">
                  <p>
                    Click on a team to select them as the winner of each
                    matchup.
                  </p>
                  <p>Your progress is automatically saved.</p>
                </div>
              </>
            ) : (
              <LiveGamesView onGameTap={(game) => setSelectedGame(game)} />
            )}
          </div>
        </div>

        {/* Welcome Dialog */}
        <WelcomeDialog
          open={showWelcome}
          onComplete={() => setShowWelcome(false)}
          onSkip={() => {
            setIsGuestMode(true);
            setShowWelcome(false);
          }}
        />

        {/* Game Stats Dialog for Live Games view */}
        {selectedGame && (
          <GameStatsDialog
            open={!!selectedGame}
            onOpenChange={(open) => {
              if (!open) setSelectedGame(null);
            }}
            matchup={selectedGame.matchup}
            liveResult={selectedGame.liveResult}
          />
        )}
      </main>

      {/* Mobile/Tablet Action Bar - fixed to bottom on mobile and tablet */}
      <MobileActionBar />
    </>
  );
}

export default function Home() {
  return (
    <BracketProvider>
      <ViewProvider>
        <BracketApp />
      </ViewProvider>
    </BracketProvider>
  );
}
