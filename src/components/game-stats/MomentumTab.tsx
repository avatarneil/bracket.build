"use client";

import { KeyMomentsTimeline } from "./KeyMomentsTimeline";
import { MomentumIndicator } from "./MomentumIndicator";
import { WinProbabilityChart } from "./WinProbabilityChart";
import type { MomentumData } from "@/types";

interface MomentumTabProps {
  momentum: MomentumData | null;
  homeColor: string;
  awayColor: string;
  homeTeamName: string;
  awayTeamName: string;
}

export function MomentumTab({
  momentum,
  homeColor,
  awayColor,
  homeTeamName,
  awayTeamName,
}: MomentumTabProps) {
  if (!momentum) {
    return (
      <div className="py-8 text-center">
        <p className="text-gray-400">Win probability data not available for this game</p>
        <p className="mt-1 text-xs text-gray-500">
          Data typically becomes available once the game starts
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Win Probability Bar */}
      <div>
        <MomentumIndicator
          homeWinPct={momentum.currentHomeWinPct}
          awayColor={awayColor}
          homeColor={homeColor}
          awayTeamName={awayTeamName}
          homeTeamName={homeTeamName}
        />
      </div>

      {/* Win Probability Chart */}
      <div>
        <h4 className="mb-3 text-sm font-medium text-gray-400">Win Probability Over Time</h4>
        <WinProbabilityChart
          data={momentum.winProbability}
          homeColor={homeColor}
          awayColor={awayColor}
          homeTeamName={homeTeamName}
          awayTeamName={awayTeamName}
        />
      </div>

      {/* Key Moments Timeline */}
      <KeyMomentsTimeline
        moments={momentum.keyMoments}
        homeColor={homeColor}
        awayColor={awayColor}
        homeTeamName={homeTeamName}
        awayTeamName={awayTeamName}
      />
    </div>
  );
}
