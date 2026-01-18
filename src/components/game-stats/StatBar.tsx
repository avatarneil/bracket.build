"use client";

import { cn } from "@/lib/utils";

interface StatBarProps {
  label: string;
  awayValue: number | string;
  homeValue: number | string;
  awayColor: string;
  homeColor: string;
  /** If true, lower value is better (e.g., turnovers) */
  reversed?: boolean;
  /** Format for display (e.g., "yards", "time") */
  format?: "number" | "time" | "efficiency";
}

export function StatBar({
  label,
  awayValue,
  homeValue,
  awayColor,
  homeColor,
  reversed = false,
  format = "number",
}: StatBarProps) {
  // Parse values for comparison
  const parseValue = (val: number | string): number => {
    if (typeof val === "number") return val;
    // Handle time format "MM:SS"
    if (format === "time" && val.includes(":")) {
      const [mins, secs] = val.split(":").map(Number);
      return mins * 60 + secs;
    }
    // Handle efficiency format "X-Y" -> percentage
    if (format === "efficiency" && val.includes("-")) {
      const [made, total] = val.split("-").map(Number);
      return total > 0 ? (made / total) * 100 : 0;
    }
    return Number.parseInt(String(val), 10) || 0;
  };

  const awayNum = parseValue(awayValue);
  const homeNum = parseValue(homeValue);
  const total = awayNum + homeNum;

  // Calculate percentages for the bar
  const awayPercent = total > 0 ? (awayNum / total) * 100 : 50;
  const homePercent = total > 0 ? (homeNum / total) * 100 : 50;

  // Determine which side is "winning" this stat
  const awayWinning = reversed ? awayNum < homeNum : awayNum > homeNum;
  const homeWinning = reversed ? homeNum < awayNum : homeNum > awayNum;
  const isTied = awayNum === homeNum;

  return (
    <div className="space-y-1.5">
      {/* Label and values */}
      <div className="flex items-center justify-between text-xs">
        <span
          className={cn(
            "font-mono tabular-nums",
            awayWinning && !isTied ? "font-bold text-white" : "text-gray-400",
          )}
        >
          {awayValue}
        </span>
        <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
          {label}
        </span>
        <span
          className={cn(
            "font-mono tabular-nums",
            homeWinning && !isTied ? "font-bold text-white" : "text-gray-400",
          )}
        >
          {homeValue}
        </span>
      </div>

      {/* Bar visualization */}
      <div className="flex h-2 overflow-hidden rounded-full bg-gray-800">
        {/* Away team bar (left side) */}
        <div
          className={cn(
            "transition-all duration-500 ease-out",
            isTied ? "opacity-60" : awayWinning ? "opacity-100" : "opacity-40",
          )}
          style={{
            width: `${awayPercent}%`,
            backgroundColor: awayColor,
          }}
        />
        {/* Home team bar (right side) */}
        <div
          className={cn(
            "transition-all duration-500 ease-out",
            isTied ? "opacity-60" : homeWinning ? "opacity-100" : "opacity-40",
          )}
          style={{
            width: `${homePercent}%`,
            backgroundColor: homeColor,
          }}
        />
      </div>
    </div>
  );
}
