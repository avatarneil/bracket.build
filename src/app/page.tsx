"use client";

import { useEffect, useRef, useState } from "react";
import { BracketControls } from "@/components/BracketControls";
import { Bracket } from "@/components/bracket/Bracket";
import { WelcomeDialog } from "@/components/dialogs/WelcomeDialog";
import { MobileActionBar } from "@/components/MobileActionBar";
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

  // Note: bracketRef is still used for the Bracket component's forwardRef

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
            <header className="mb-4 text-center sm:mb-8 md:mb-10">
              <h1 className="font-mono bg-gradient-to-r from-red-500 via-white to-blue-500 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl md:text-5xl lg:text-5xl">
                bracket.build
              </h1>
              <p className="mt-1 text-sm text-gray-400 sm:mt-2 sm:text-lg md:text-xl">
                NFL Playoff Predictions • 2025-26
              </p>
            </header>

            {/* Controls */}
            <div className="mb-4 w-full sm:mb-6 md:mb-8">
              <BracketControls onResetName={() => setShowWelcome(true)} />
            </div>

            {/* Bracket */}
            <div className="pb-4 sm:pb-8 md:pb-10">
              <Bracket ref={bracketRef} />
            </div>

            {/* Instructions - hidden on mobile/tablet (they use the app naturally) */}
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

      {/* Mobile/Tablet Action Bar - fixed to bottom on mobile and tablet */}
      <MobileActionBar />
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
