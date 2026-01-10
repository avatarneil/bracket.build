"use client";

import { useEffect, useRef, useState } from "react";
import { BracketControls } from "@/components/BracketControls";
import { MobileActionBar } from "@/components/MobileActionBar";
import { Bracket } from "@/components/bracket/Bracket";
import { WelcomeDialog } from "@/components/dialogs/WelcomeDialog";
import { BracketProvider, useBracket } from "@/contexts/BracketContext";
import { getStoredUser } from "@/lib/storage";

function BracketApp() {
  useBracket(); // Access context to ensure it's available
  const [showWelcome, setShowWelcome] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const bracketRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsHydrated(true);
    const user = getStoredUser();
    if (!user || !user.name) {
      setShowWelcome(true);
    }
  }, []);

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <>
      {/* Main content with bottom padding for mobile action bar */}
      <main className="min-h-screen overflow-x-hidden bg-gray-950 px-3 pb-28 pt-4 sm:px-4 sm:py-8 lg:pb-8">
        {/* Use inline-flex wrapper to let content determine its own width and center it */}
        <div className="flex justify-center overflow-x-hidden">
          <div className="inline-flex max-w-full flex-col items-center overflow-x-hidden">
            {/* Header - smaller on mobile */}
            <header className="mb-4 text-center sm:mb-8">
              <h1 className="bg-gradient-to-r from-red-500 via-white to-blue-500 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl md:text-5xl">
                NFL Playoff Bracket
              </h1>
              <p className="mt-1 text-sm text-gray-400 sm:mt-2 sm:text-lg">
                2025-26 Season
              </p>
            </header>

            {/* Controls */}
            <div className="mb-4 w-full sm:mb-6">
              <BracketControls bracketRef={bracketRef} />
            </div>

            {/* Bracket */}
            <div className="pb-4 sm:pb-8">
              <Bracket ref={bracketRef} />
            </div>

            {/* Instructions - hidden on mobile (they use the app naturally) */}
            <div className="mt-8 hidden text-center text-sm text-gray-500 lg:block">
              <p>
                Click on a team to select them as the winner of each matchup.
              </p>
              <p>Your progress is automatically saved.</p>
            </div>
          </div>
        </div>

        {/* Welcome Dialog */}
        <WelcomeDialog
          open={showWelcome}
          onComplete={() => setShowWelcome(false)}
        />
      </main>

      {/* Mobile Action Bar - fixed to bottom on mobile */}
      <MobileActionBar bracketRef={bracketRef} />
    </>
  );
}

export default function Home() {
  return (
    <BracketProvider>
      <BracketApp />
    </BracketProvider>
  );
}
