"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { BracketControls } from "@/components/BracketControls";
import { Bracket } from "@/components/bracket/Bracket";
import { GameStatsDialog } from "@/components/dialogs/GameStatsDialog";
import { WelcomeDialog } from "@/components/dialogs/WelcomeDialog";
import { MobileActionBar } from "@/components/MobileActionBar";
import { RoundLockControl } from "@/components/RoundLockControl";
import { SeasonNavigation } from "@/components/SeasonNavigation";
import { SeasonSelector } from "@/components/SeasonSelector";
import { LiveGamesView } from "@/components/views/LiveGamesView";
import { LiveGamesDashboard } from "@/components/views/LiveGamesDashboard";
import { SeasonScheduleView } from "@/components/views/SeasonScheduleView";
import { ViewToggle } from "@/components/views/ViewToggle";
import { BracketProvider, useBracket } from "@/contexts/BracketContext";
import { GameDialogProvider, useGameDialog } from "@/contexts/GameDialogContext";
import { useView, ViewProvider } from "@/contexts/ViewContext";
import { PLAYOFF_SEASON_YEAR } from "@/data/teams";
import { useSeasonSchedule } from "@/hooks/useSeasonSchedule";
import { getStoredUser } from "@/lib/storage";
import { cn } from "@/lib/utils";

function BracketApp() {
  const { refreshLiveResults, bracket } = useBracket();
  const { viewMode } = useView();
  const { selectedGame, activeTab, closeGameDialog, setActiveTab } = useGameDialog();
  const {
    schedule,
    selectedPhase,
    isLoading: isLoadingSchedule,
    error: scheduleError,
    retry: retrySchedule,
    selectPhase,
    selectSeason,
    selectWeek,
  } = useSeasonSchedule();
  const [showWelcome, setShowWelcome] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isWideScheduleLayout, setIsWideScheduleLayout] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const welcomeCheckedRef = useRef(false);
  const isPostseason = selectedPhase === "postseason";
  const visibleSchedule = schedule?.phase === selectedPhase ? schedule : null;
  const seasonLabel = visibleSchedule
    ? `${visibleSchedule.seasonYear}–${String(visibleSchedule.seasonYear + 1).slice(-2)}`
    : "Selected season";
  const postseasonAvailable = visibleSchedule?.phaseAvailability.postseason ?? false;
  const showBracket =
    isPostseason && postseasonAvailable && visibleSchedule?.seasonYear === PLAYOFF_SEASON_YEAR;

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1280px)");
    const updateLayout = () => setIsWideScheduleLayout(mediaQuery.matches);
    updateLayout();
    mediaQuery.addEventListener("change", updateLayout);
    return () => mediaQuery.removeEventListener("change", updateLayout);
  }, []);

  useEffect(() => {
    if (!isHydrated || !showBracket || welcomeCheckedRef.current) return;
    welcomeCheckedRef.current = true;
    const user = getStoredUser();
    if (!user?.name) setShowWelcome(true);
  }, [isHydrated, showBracket]);

  useEffect(() => {
    if (!visibleSchedule) return;
    const phaseLabel =
      visibleSchedule.phase === "preseason"
        ? "NFL Preseason"
        : visibleSchedule.phase === "regular"
          ? "NFL Regular Season"
          : "NFL Playoffs";
    document.title = `${phaseLabel} ${visibleSchedule.seasonYear} | bracket.build`;
  }, [visibleSchedule]);

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
    if (isHydrated && showBracket && !bracket.liveResults) {
      refreshLiveResults();
    }
  }, [isHydrated, showBracket, bracket.liveResults, refreshLiveResults]);

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-white">Loading…</div>
      </div>
    );
  }

  return (
    <>
      <a
        href="#main-content"
        className="sr-only z-[70] rounded-md bg-white px-4 py-2 font-semibold text-black focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to content
      </a>
      {/* Main content with bottom padding for mobile/tablet action bar */}
      <main
        id="main-content"
        className={cn(
          "min-h-screen overflow-x-hidden bg-black px-3 pt-4 sm:px-4 sm:py-8 md:px-6 md:pt-6 lg:pb-8",
          showBracket && viewMode === "bracket" ? "pb-28 md:pb-32" : "pb-10 md:pb-12",
        )}
      >
        {/* Use inline-flex wrapper to let content determine its own width and center it */}
        <div
          className={cn(
            "flex w-full justify-center overflow-x-hidden",
            !isPostseason &&
              "xl:grid xl:grid-cols-[minmax(420px,500px)_minmax(0,1fr)] xl:items-start xl:gap-6 xl:overflow-visible",
          )}
        >
          <div
            data-testid={!isPostseason ? "schedule-sidebar" : undefined}
            className={cn(
              "max-w-full flex-col items-center overflow-x-hidden",
              showBracket ? "inline-flex" : "flex w-full",
              !isPostseason &&
                "xl:sticky xl:top-6 xl:h-[calc(100vh-3rem)] xl:overflow-hidden xl:rounded-2xl xl:border xl:border-gray-800 xl:bg-gray-950 xl:px-5 xl:pb-5 xl:pt-4",
            )}
          >
            {/* Header - scales with viewport, larger on tablets */}
            <header className="mb-4 text-center sm:mb-6 md:mb-8">
              <h1 className="font-mono text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
                bracket<span className="text-gray-500">.build</span>
              </h1>
              <p className="mt-1 text-sm text-gray-400 sm:mt-2 sm:text-lg md:text-xl">
                {visibleSchedule
                  ? `NFL ${visibleSchedule.seasonYear} · ${visibleSchedule.phase === "preseason" ? "Preseason" : visibleSchedule.phase === "regular" ? "Regular Season" : "Playoffs"}`
                  : "NFL schedules and playoff predictions"}
              </p>
            </header>

            {visibleSchedule && (
              <SeasonSelector
                seasonYear={visibleSchedule.seasonYear}
                availableSeasons={visibleSchedule.availableSeasons}
                onSelect={selectSeason}
              />
            )}

            {selectedPhase && visibleSchedule && (
              <SeasonNavigation
                selectedPhase={selectedPhase}
                currentPhase={visibleSchedule.currentPhase}
                phaseAvailability={visibleSchedule.phaseAvailability}
                seasonLabel={seasonLabel}
                onSelect={selectPhase}
              />
            )}

            {showBracket && (
              <p className="mt-4 text-sm font-medium text-gray-300">
                {seasonLabel} playoff seedings are shown beside each team.
              </p>
            )}

            {showBracket && <ViewToggle className="mb-4 mt-4 sm:mb-6" />}

            {/* Controls - only show in bracket view when not guest */}
            {showBracket && viewMode === "bracket" && !isGuestMode && (
              <div className="mb-4 w-full sm:mb-6 md:mb-8">
                <BracketControls onResetName={() => setShowWelcome(true)} />
              </div>
            )}

            {/* Live Results Control - only in bracket view */}
            {showBracket && viewMode === "bracket" && (
              <div className="mb-4 w-full max-w-2xl sm:mb-6">
                <RoundLockControl />
              </div>
            )}

            {/* Main Content */}
            {!isPostseason ? (
              <div className="mt-5 flex w-full justify-center sm:mt-6 xl:min-h-0 xl:flex-1 xl:items-stretch">
                <SeasonScheduleView
                  schedule={visibleSchedule}
                  isLoading={isLoadingSchedule}
                  error={scheduleError}
                  onRetry={retrySchedule}
                  onSelectWeek={selectWeek}
                />
              </div>
            ) : !postseasonAvailable ? (
              <div className="mt-6 flex min-h-64 w-full max-w-2xl flex-col items-center justify-center rounded-xl border border-gray-800 px-6 text-center">
                <h2 className="text-lg font-semibold text-white">Postseason schedule not posted</h2>
                <p className="mt-2 max-w-md text-sm text-gray-400">
                  {seasonLabel} playoff picks will become available after the NFL announces the
                  postseason matchups.
                </p>
              </div>
            ) : showBracket && viewMode === "bracket" ? (
              <>
                {/* Bracket */}
                <div className="pb-4 sm:pb-8 md:pb-10">
                  <Bracket />
                </div>

                {/* Instructions - hidden on mobile/tablet (they use the app naturally) */}
                <div className="mt-8 hidden text-center text-sm text-gray-500 lg:block">
                  <p>Click on a team to select them as the winner of each matchup.</p>
                  <p>Your progress is automatically saved.</p>
                </div>
              </>
            ) : showBracket ? (
              <LiveGamesView />
            ) : (
              <div className="mt-6 flex w-full justify-center">
                <SeasonScheduleView
                  schedule={visibleSchedule}
                  isLoading={isLoadingSchedule}
                  error={scheduleError}
                  onRetry={retrySchedule}
                  onSelectWeek={selectWeek}
                />
              </div>
            )}
          </div>

          {!isPostseason && (
            <aside
              data-testid="live-details-column"
              aria-label="Live games dashboard"
              className="hidden xl:block"
            >
              <LiveGamesDashboard schedule={visibleSchedule} />
            </aside>
          )}
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

        {/* Game Stats Dialog - centralized at page level */}
        {selectedGame && (isPostseason || !isWideScheduleLayout) && (
          <GameStatsDialog
            open={!!selectedGame}
            onOpenChange={(open) => {
              if (!open) closeGameDialog();
            }}
            matchup={selectedGame.matchup}
            liveResult={selectedGame.liveResult}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        )}
      </main>

      {/* Mobile/Tablet Action Bar - fixed to bottom on mobile and tablet */}
      {showBracket && <MobileActionBar />}
    </>
  );
}

function BracketAppWithProviders() {
  return (
    <BracketProvider>
      <ViewProvider>
        <GameDialogProvider>
          <BracketApp />
        </GameDialogProvider>
      </ViewProvider>
    </BracketProvider>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-black">
          <div className="text-white">Loading…</div>
        </div>
      }
    >
      <BracketAppWithProviders />
    </Suspense>
  );
}
