"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KeyMoment } from "@/types";

/**
 * Ensure a color has sufficient brightness for visibility on dark backgrounds.
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

interface KeyMomentsTimelineProps {
  moments: KeyMoment[];
  homeColor: string;
  awayColor: string;
  homeTeamName: string;
  awayTeamName: string;
}

function formatQuarter(quarter: number): string {
  if (quarter === 1) return "Q1";
  if (quarter === 2) return "Q2";
  if (quarter === 3) return "Q3";
  if (quarter === 4) return "Q4";
  if (quarter >= 5) return `OT${quarter > 5 ? quarter - 4 : ""}`;
  return `Q${quarter}`;
}

export function KeyMomentsTimeline({
  moments,
  homeColor,
  awayColor,
  homeTeamName,
  awayTeamName,
}: KeyMomentsTimelineProps) {
  // Ensure colors are visible on dark background
  const visibleHomeColor = ensureVisibleColor(homeColor);
  const visibleAwayColor = ensureVisibleColor(awayColor);

  if (!moments || moments.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-gray-500">
        No significant momentum shifts yet (plays with &gt;10% win probability change)
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-gray-400">Key Momentum Shifts</h4>
      <div className="space-y-2">
        {moments.map((moment, index) => {
          const isHomeBenefit = moment.benefitingTeamId === "home";
          const teamColor = isHomeBenefit ? visibleHomeColor : visibleAwayColor;
          const teamName = isHomeBenefit ? homeTeamName : awayTeamName;

          return (
            <div
              key={`${moment.playId}-${index}`}
              className="rounded-lg border border-gray-700 bg-gray-800/50 p-3"
            >
              {/* Header: Time, Team, Swing */}
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-gray-700 px-1.5 py-0.5 text-xs font-medium text-gray-300">
                    {formatQuarter(moment.quarter)} {moment.clock}
                  </span>
                  <div
                    className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold"
                    style={{ backgroundColor: `${teamColor}30`, color: teamColor }}
                  >
                    {isHomeBenefit ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {teamName}
                  </div>
                </div>
                <div
                  className={cn(
                    "text-sm font-bold",
                    moment.swing >= 20 ? "text-yellow-400" : "text-gray-300",
                  )}
                >
                  +{moment.swing.toFixed(0)}%
                </div>
              </div>

              {/* Play description */}
              {moment.playText && (
                <p className="mb-2 text-xs leading-relaxed text-gray-400">{moment.playText}</p>
              )}

              {/* Win probability change visualization */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-500">{moment.winProbBefore.toFixed(0)}%</span>
                <div className="flex-1">
                  <div className="h-1.5 overflow-hidden rounded-full bg-gray-700">
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${moment.winProbAfter}%`,
                        backgroundColor: visibleHomeColor,
                      }}
                    />
                  </div>
                </div>
                <span className="font-medium text-gray-300">{moment.winProbAfter.toFixed(0)}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
