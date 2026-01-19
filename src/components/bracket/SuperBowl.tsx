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
    <div className="flex flex-col items-center gap-2 sm:gap-3 lg:gap-2">
      {/* Super Bowl Header */}
      <div className="flex flex-col items-center gap-1">
        <Trophy className="h-5 w-5 text-[#D4BE8C] sm:h-6 sm:w-6 lg:h-5 lg:w-5" />
        <div className="rounded-lg border border-white/20 bg-black px-3 py-1 text-center text-xs font-bold uppercase tracking-wider text-white shadow-lg sm:px-4 sm:py-1.5 sm:text-sm lg:px-3 lg:py-1 lg:text-xs">
          Super Bowl LX
        </div>
      </div>

      {/* Matchup */}
      <div
        data-testid="matchup-superBowl"
        className="flex flex-col items-center gap-2 rounded-xl border-2 border-[#D4BE8C]/30 bg-gray-800/50 p-3 sm:gap-3 sm:p-4 lg:gap-2 lg:p-3"
      >
        {/* AFC Champion */}
        <div className="w-48 sm:w-52 lg:w-48">
          <div className="mb-1 text-center text-[10px] font-semibold uppercase text-red-400 sm:text-xs lg:text-[10px]">
            AFC Champion
          </div>
          <TeamCard
            team={homeTeam}
            isWinner={winner?.id === homeTeam?.id}
            isLoser={winner !== null && winner?.id !== homeTeam?.id}
            onClick={() => homeTeam && handleSelect(homeTeam)}
            disabled={!canSelect}
            mobileSize="sm"
            desktopSize="sm"
          />
        </div>

        <div className="text-base font-bold text-gray-500 sm:text-lg lg:text-base">
          VS
        </div>

        {/* NFC Champion */}
        <div className="w-48 sm:w-52 lg:w-48">
          <div className="mb-1 text-center text-[10px] font-semibold uppercase text-blue-400 sm:text-xs lg:text-[10px]">
            NFC Champion
          </div>
          <TeamCard
            team={awayTeam}
            isWinner={winner?.id === awayTeam?.id}
            isLoser={winner !== null && winner?.id !== awayTeam?.id}
            onClick={() => awayTeam && handleSelect(awayTeam)}
            disabled={!canSelect}
            mobileSize="sm"
            desktopSize="sm"
          />
        </div>

        {/* Champion Display */}
        {winner && (
          <div className="mt-1 flex flex-col items-center gap-1.5 rounded-lg bg-[#D4BE8C]/15 px-3 py-2 sm:mt-2 sm:px-4 sm:py-3 lg:mt-1 lg:gap-1 lg:px-3 lg:py-2">
            <Trophy className="h-6 w-6 text-[#D4BE8C] sm:h-8 sm:w-8 lg:h-6 lg:w-6" />
            <div className="text-center">
              <div className="text-[10px] font-semibold uppercase text-[#D4BE8C] sm:text-xs lg:text-[10px]">
                Super Bowl Champion
              </div>
              <div className="text-sm font-bold text-white sm:text-base lg:text-sm">
                {winner.city} {winner.name}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
