"use client";

import { cn, getContrastSafeColor } from "@/lib/utils";
import type { ScoringPlay } from "@/types";

interface ScoringPlaysProps {
  plays: ScoringPlay[];
  homeTeamId: string;
  awayTeamId: string;
  homeColor: string;
  awayColor: string;
}

function formatQuarter(quarter: number): string {
  if (quarter === 1) return "1ST";
  if (quarter === 2) return "2ND";
  if (quarter === 3) return "3RD";
  if (quarter === 4) return "4TH";
  if (quarter >= 5) return `OT${quarter > 5 ? quarter - 4 : ""}`;
  return `Q${quarter}`;
}

function getPlayTypeIcon(type: string): string {
  const t = type.toUpperCase();
  if (t === "TD" || t.includes("TOUCHDOWN")) return "🏈";
  if (t === "FG" || t.includes("FIELD GOAL")) return "🥅";
  if (t.includes("SAFETY")) return "🛡️";
  if (t.includes("PAT") || t.includes("EXTRA POINT")) return "✓";
  if (t.includes("2PT") || t.includes("TWO-POINT")) return "2";
  return "•";
}

export function ScoringPlays({
  plays,
  homeTeamId,
  awayTeamId,
  homeColor,
  awayColor,
}: ScoringPlaysProps) {
  if (!plays || plays.length === 0) {
    return <div className="py-8 text-center text-gray-400">No scoring plays yet</div>;
  }

  // Group plays by quarter
  const playsByQuarter = plays.reduce(
    (acc, play) => {
      const q = play.quarter;
      if (!acc[q]) acc[q] = [];
      acc[q].push(play);
      return acc;
    },
    {} as Record<number, ScoringPlay[]>,
  );

  const quarters = Object.keys(playsByQuarter)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="space-y-4">
      {quarters.map((quarter) => (
        <div key={quarter}>
          {/* Quarter header */}
          <div className="mb-2 flex items-center gap-2">
            <div className="h-px flex-1 bg-gray-700" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              {formatQuarter(quarter)}
            </span>
            <div className="h-px flex-1 bg-gray-700" />
          </div>

          {/* Plays in this quarter */}
          <div className="space-y-2">
            {playsByQuarter[quarter].map((play) => {
              const isHomeTeam = play.teamAbbr === homeTeamId;
              const teamColor = getContrastSafeColor(isHomeTeam ? homeColor : awayColor);

              return (
                <div key={play.id} className="rounded-lg bg-gray-800/50 p-3">
                  <div className="flex items-start gap-3">
                    {/* Team logo */}
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm"
                      style={{ backgroundColor: `${teamColor}30` }}
                    >
                      {play.teamLogo ? (
                        <img
                          src={play.teamLogo}
                          alt={play.teamAbbr}
                          width={20}
                          height={20}
                          className="h-5 w-5"
                        />
                      ) : (
                        <span style={{ color: teamColor }}>{getPlayTypeIcon(play.type)}</span>
                      )}
                    </div>

                    {/* Play details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold" style={{ color: teamColor }}>
                          {play.teamAbbr}
                        </span>
                        <span className="text-[10px] text-gray-500">{play.clock}</span>
                      </div>
                      <p className="mt-0.5 text-xs leading-relaxed text-gray-300">{play.text}</p>
                    </div>

                    {/* Score after play */}
                    <div className="shrink-0 text-right">
                      <div className="text-xs font-mono font-bold text-white">
                        {play.awayScore} - {play.homeScore}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
