"use client";

import type { TeamGameStats } from "@/types";
import { StatBar } from "./StatBar";

interface TeamStatsComparisonProps {
  awayStats: TeamGameStats;
  homeStats: TeamGameStats;
  awayColor: string;
  homeColor: string;
}

export function TeamStatsComparison({
  awayStats,
  homeStats,
  awayColor,
  homeColor,
}: TeamStatsComparisonProps) {
  return (
    <div className="space-y-4">
      <StatBar
        label="Total Yards"
        awayValue={awayStats.totalYards}
        homeValue={homeStats.totalYards}
        awayColor={awayColor}
        homeColor={homeColor}
      />

      <StatBar
        label="Passing Yards"
        awayValue={awayStats.passingYards}
        homeValue={homeStats.passingYards}
        awayColor={awayColor}
        homeColor={homeColor}
      />

      <StatBar
        label="Rushing Yards"
        awayValue={awayStats.rushingYards}
        homeValue={homeStats.rushingYards}
        awayColor={awayColor}
        homeColor={homeColor}
      />

      <StatBar
        label="First Downs"
        awayValue={awayStats.firstDowns}
        homeValue={homeStats.firstDowns}
        awayColor={awayColor}
        homeColor={homeColor}
      />

      <StatBar
        label="3rd Down"
        awayValue={awayStats.thirdDownEfficiency}
        homeValue={homeStats.thirdDownEfficiency}
        awayColor={awayColor}
        homeColor={homeColor}
        format="efficiency"
      />

      <StatBar
        label="Time of Poss."
        awayValue={awayStats.timeOfPossession}
        homeValue={homeStats.timeOfPossession}
        awayColor={awayColor}
        homeColor={homeColor}
        format="time"
      />

      <StatBar
        label="Turnovers"
        awayValue={awayStats.turnovers}
        homeValue={homeStats.turnovers}
        awayColor={awayColor}
        homeColor={homeColor}
        reversed={true}
      />

      <StatBar
        label="Penalties"
        awayValue={`${awayStats.penalties}-${awayStats.penaltyYards}`}
        homeValue={`${homeStats.penalties}-${homeStats.penaltyYards}`}
        awayColor={awayColor}
        homeColor={homeColor}
        reversed={true}
      />
    </div>
  );
}
