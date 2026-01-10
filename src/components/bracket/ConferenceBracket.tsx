"use client";

import { useBracket } from "@/contexts/BracketContext";
import { cn } from "@/lib/utils";
import type { Conference } from "@/types";
import { Matchup } from "./Matchup";

interface ConferenceBracketProps {
  conference: Conference;
}

export function ConferenceBracket({ conference }: ConferenceBracketProps) {
  const { bracket, selectWinner, clearWinner } = useBracket();
  const confState = conference === "AFC" ? bracket.afc : bracket.nfc;
  const isAFC = conference === "AFC";

  return (
    <div className="flex flex-col gap-2">
      {/* Conference Header */}
      <div
        className={cn(
          "rounded-lg px-4 py-2 text-center font-bold text-white",
          // On mobile: always left-aligned
          // On desktop: AFC left-aligned (above Wild Card on outer edge), NFC right-aligned (above Wild Card on outer edge)
          "self-start lg:self-auto",
          isAFC ? "lg:self-start" : "lg:self-end",
          isAFC ? "bg-red-700" : "bg-blue-700",
        )}
      >
        {conference}
      </div>

      {/* Bracket Rounds
          Mobile: Always left-to-right (flex-row) - Wild Card -> Divisional -> Championship
          Desktop: Outside-in layout where Wild Card is on the outer edges, Championship near Super Bowl
          - AFC (left side): Wild Card on far left, Championship on right (near Super Bowl)
          - NFC (right side): Championship on left (near Super Bowl), Wild Card on far right
      */}
      <div
        className={cn(
          "flex items-center gap-3 sm:gap-4 md:gap-6",
          // Mobile: always left to right (Wild Card -> Championship)
          "flex-row",
          // Desktop: AFC stays left-to-right (WC outer, Champ center), NFC reverses (Champ center, WC outer)
          isAFC ? "lg:flex-row" : "lg:flex-row-reverse",
        )}
      >
        {/* Wild Card Round - fixed width columns prevent layout shift */}
        <div className="flex w-44 flex-shrink-0 flex-col gap-3 sm:w-48 sm:gap-4 md:gap-6 lg:w-44 xl:w-48">
          <div className="text-center text-xs font-semibold uppercase text-gray-400">
            Wild Card
          </div>
          {confState.wildCard.map((matchup) => (
            <Matchup
              key={matchup.id}
              matchup={matchup}
              onSelectWinner={selectWinner}
              onClearWinner={clearWinner}
              size="md"
            />
          ))}
        </div>

        {/* Divisional Round - fixed width columns prevent layout shift */}
        <div className="flex w-44 flex-shrink-0 flex-col gap-6 sm:w-48 sm:gap-8 md:gap-16 lg:w-44 xl:w-48">
          <div className="text-center text-xs font-semibold uppercase text-gray-400">
            Divisional
          </div>
          {confState.divisional.map((matchup) => (
            <Matchup
              key={matchup.id}
              matchup={matchup}
              onSelectWinner={selectWinner}
              onClearWinner={clearWinner}
              size="md"
            />
          ))}
        </div>

        {/* Conference Championship - fixed width columns prevent layout shift */}
        <div className="flex w-44 flex-shrink-0 flex-col sm:w-48 lg:w-44 xl:w-48">
          <div className="text-center text-xs font-semibold uppercase text-gray-400">
            {conference} Champ
          </div>
          {confState.championship && (
            <Matchup
              matchup={confState.championship}
              onSelectWinner={selectWinner}
              onClearWinner={clearWinner}
              size="md"
            />
          )}
        </div>
      </div>
    </div>
  );
}
