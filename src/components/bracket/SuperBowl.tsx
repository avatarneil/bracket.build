"use client";

import { Trophy } from "lucide-react";
import { useBracket } from "@/contexts/BracketContext";
import type { SeededTeam } from "@/types";
import { TeamCard } from "./TeamCard";

export function SuperBowl() {
  const { bracket, selectWinner, clearWinner } = useBracket();
  const { superBowl } = bracket;

  if (!superBowl) return null;

  const { homeTeam, awayTeam, winner } = superBowl;
  const canSelect = homeTeam !== null && awayTeam !== null;

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
    <div className="flex flex-col items-center gap-3 sm:gap-4 md:gap-5">
      {/* Super Bowl Header */}
      <div className="flex flex-col items-center gap-1 sm:gap-2">
        <Trophy className="h-6 w-6 text-[#D4BE8C] sm:h-8 sm:w-8 md:h-10 md:w-10" />
        <div className="rounded-lg border border-white/20 bg-black px-4 py-1.5 text-center text-sm font-bold uppercase tracking-wider text-white shadow-lg sm:px-6 sm:py-2 sm:text-base md:px-8 md:py-2.5 md:text-lg">
          Super Bowl LX
        </div>
      </div>

      {/* Matchup */}
      <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-[#D4BE8C]/30 bg-gray-800/50 p-4 sm:gap-4 sm:p-6 md:gap-5 md:p-8">
        {/* AFC Champion */}
        <div className="w-44 sm:w-48 md:w-56">
          <div className="mb-1 text-center text-xs font-semibold uppercase text-red-400 md:mb-2 md:text-sm">
            AFC Champion
          </div>
          <TeamCard
            team={homeTeam}
            isWinner={winner?.id === homeTeam?.id}
            isLoser={winner !== null && winner?.id !== homeTeam?.id}
            onClick={() => homeTeam && handleSelect(homeTeam)}
            disabled={!canSelect}
            mobileSize="md"
            desktopSize="lg"
          />
        </div>

        <div className="text-xl font-bold text-gray-500 sm:text-2xl md:text-3xl">
          VS
        </div>

        {/* NFC Champion */}
        <div className="w-44 sm:w-48 md:w-56">
          <div className="mb-1 text-center text-xs font-semibold uppercase text-blue-400 md:mb-2 md:text-sm">
            NFC Champion
          </div>
          <TeamCard
            team={awayTeam}
            isWinner={winner?.id === awayTeam?.id}
            isLoser={winner !== null && winner?.id !== awayTeam?.id}
            onClick={() => awayTeam && handleSelect(awayTeam)}
            disabled={!canSelect}
            mobileSize="md"
            desktopSize="lg"
          />
        </div>

        {/* Champion Display */}
        {winner && (
          <div className="mt-2 flex flex-col items-center gap-2 rounded-lg bg-[#D4BE8C]/15 px-4 py-3 sm:mt-4 sm:px-6 sm:py-4 md:mt-5 md:gap-3 md:px-8 md:py-5">
            <Trophy className="h-8 w-8 text-[#D4BE8C] sm:h-10 sm:w-10 md:h-12 md:w-12" />
            <div className="text-center">
              <div className="text-xs font-semibold uppercase text-[#D4BE8C] sm:text-sm md:text-base">
                Super Bowl Champion
              </div>
              <div className="text-lg font-bold text-white sm:text-xl md:text-2xl">
                {winner.city} {winner.name}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
