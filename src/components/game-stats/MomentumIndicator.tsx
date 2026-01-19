"use client";

import { cn } from "@/lib/utils";

/**
 * Ensure a color has sufficient brightness for visibility on dark backgrounds.
 * Lightens colors that are too dark.
 */
function ensureVisibleColor(hexColor: string): string {
  const hex = hexColor.replace("#", "");
  const r = Number.parseInt(hex.substring(0, 2), 16);
  const g = Number.parseInt(hex.substring(2, 4), 16);
  const b = Number.parseInt(hex.substring(4, 6), 16);

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  if (luminance < 0.3) {
    const factor = 0.4 / Math.max(luminance, 0.05);
    const newR = Math.min(255, Math.round(r * factor));
    const newG = Math.min(255, Math.round(g * factor));
    const newB = Math.min(255, Math.round(b * factor));
    return `#${newR.toString(16).padStart(2, "0")}${newG.toString(16).padStart(2, "0")}${newB.toString(16).padStart(2, "0")}`;
  }

  return hexColor;
}

interface MomentumIndicatorProps {
  homeWinPct: number;
  awayColor: string;
  homeColor: string;
  awayTeamName?: string;
  homeTeamName?: string;
  compact?: boolean;
}

export function MomentumIndicator({
  homeWinPct,
  awayColor,
  homeColor,
  awayTeamName,
  homeTeamName,
  compact = false,
}: MomentumIndicatorProps) {
  const awayWinPct = 100 - homeWinPct;
  const momentum = homeWinPct > 50 ? "home" : homeWinPct < 50 ? "away" : "even";

  // Ensure colors are visible on dark background
  const visibleAwayColor = ensureVisibleColor(awayColor);
  const visibleHomeColor = ensureVisibleColor(homeColor);

  return (
    <div className={cn("w-full", compact ? "space-y-1" : "space-y-2")}>
      {/* Labels - only show if not compact */}
      {!compact && (
        <div className="flex justify-between text-xs text-gray-400">
          <span>
            {awayTeamName} {awayWinPct.toFixed(0)}%
          </span>
          <span>Win Probability</span>
          <span>
            {homeWinPct.toFixed(0)}% {homeTeamName}
          </span>
        </div>
      )}

      {/* Bar */}
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-full bg-gray-700",
          compact ? "h-2" : "h-4",
        )}
      >
        {/* Away team side */}
        <div
          className={cn(
            "absolute left-0 top-0 h-full transition-all duration-500",
            momentum === "away" && "animate-pulse",
          )}
          style={{
            width: `${awayWinPct}%`,
            backgroundColor: visibleAwayColor,
          }}
        />

        {/* Home team side */}
        <div
          className={cn(
            "absolute right-0 top-0 h-full transition-all duration-500",
            momentum === "home" && "animate-pulse",
          )}
          style={{
            width: `${homeWinPct}%`,
            backgroundColor: visibleHomeColor,
          }}
        />

        {/* Center marker at 50% */}
        <div
          className={cn(
            "absolute left-1/2 top-0 -translate-x-1/2 bg-white/50",
            compact ? "h-2 w-px" : "h-4 w-0.5",
          )}
        />
      </div>

      {/* Compact labels below the bar */}
      {compact && (
        <div className="flex justify-between text-[10px] text-gray-500">
          <span>{awayWinPct.toFixed(0)}%</span>
          <span>{homeWinPct.toFixed(0)}%</span>
        </div>
      )}
    </div>
  );
}
