"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { cn, getContrastSafeColor } from "@/lib/utils";
import type { Drive } from "@/types";

interface ExpandableDrivesProps {
  drives: Drive[];
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

function getResultIcon(result: string): string {
  const r = result.toUpperCase();
  if (r.includes("TOUCHDOWN")) return "TD";
  if (r.includes("FIELD GOAL")) return "FG";
  if (r.includes("PUNT")) return "PUNT";
  if (r.includes("FUMBLE")) return "FUM";
  if (r.includes("INTERCEPTION") || r.includes("INT")) return "INT";
  if (r.includes("DOWNS")) return "TOD";
  if (r.includes("END OF HALF") || r.includes("END OF GAME")) return "END";
  if (r.includes("SAFETY")) return "SAF";
  if (r.includes("MISSED FG")) return "MISS";
  return "";
}

function getResultColor(result: string): string {
  const r = result.toUpperCase();
  if (r.includes("TOUCHDOWN")) return "text-green-400";
  if (r.includes("FIELD GOAL")) return "text-green-400";
  if (r.includes("FUMBLE") || r.includes("INTERCEPTION") || r.includes("INT"))
    return "text-red-400";
  if (r.includes("SAFETY")) return "text-orange-400";
  return "text-gray-400";
}

function formatDown(down: number | null, distance: number | null): string {
  if (down === null) return "";
  const ordinal = down === 1 ? "1st" : down === 2 ? "2nd" : down === 3 ? "3rd" : "4th";
  return distance ? `${ordinal} & ${distance}` : ordinal;
}

export function ExpandableDrives({
  drives,
  homeTeamId,
  awayTeamId,
  homeColor,
  awayColor,
}: ExpandableDrivesProps) {
  const [expandedDrives, setExpandedDrives] = useState<Set<string>>(new Set());

  if (!drives || drives.length === 0) {
    return <div className="py-8 text-center text-gray-400">No drives available yet</div>;
  }

  const toggleDrive = (driveId: string) => {
    setExpandedDrives((prev) => {
      const next = new Set(prev);
      if (next.has(driveId)) {
        next.delete(driveId);
      } else {
        next.add(driveId);
      }
      return next;
    });
  };

  // Group drives by quarter
  const drivesByQuarter = drives.reduce(
    (acc, drive) => {
      const q = drive.startQuarter;
      if (!acc[q]) acc[q] = [];
      acc[q].push(drive);
      return acc;
    },
    {} as Record<number, Drive[]>,
  );

  const quarters = Object.keys(drivesByQuarter)
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

          {/* Drives in this quarter */}
          <div className="space-y-2">
            {drivesByQuarter[quarter].map((drive) => {
              const isExpanded = expandedDrives.has(drive.id);
              const isHomeTeam = drive.teamAbbr === homeTeamId;
              const teamColor = getContrastSafeColor(isHomeTeam ? homeColor : awayColor);
              const resultIcon = getResultIcon(drive.result);
              const resultColorClass = getResultColor(drive.result);

              return (
                <div key={drive.id} className="overflow-hidden rounded-lg bg-gray-800/50">
                  {/* Drive header (clickable) */}
                  <button
                    type="button"
                    onClick={() => toggleDrive(drive.id)}
                    className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-gray-700/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                  >
                    {/* Team logo */}
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: `${teamColor}30` }}
                    >
                      {drive.teamLogo ? (
                        <img
                          src={drive.teamLogo}
                          alt={drive.teamAbbr}
                          width={20}
                          height={20}
                          className="h-5 w-5"
                        />
                      ) : (
                        <span className="text-xs font-bold" style={{ color: teamColor }}>
                          {drive.teamAbbr}
                        </span>
                      )}
                    </div>

                    {/* Drive info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold" style={{ color: teamColor }}>
                          {drive.teamAbbr}
                        </span>
                        <span className="text-[10px] text-gray-500">{drive.startClock}</span>
                        {resultIcon && (
                          <span
                            className={cn(
                              "rounded px-1.5 py-0.5 text-[9px] font-bold",
                              resultColorClass,
                              drive.isScoring ? "bg-green-900/30" : "bg-gray-700/50",
                            )}
                          >
                            {resultIcon}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-gray-400">
                        {drive.description}
                      </p>
                    </div>

                    {/* Expand/collapse icon */}
                    <div className="shrink-0 text-gray-500">
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </button>

                  {/* Expanded plays */}
                  {isExpanded && drive.plays.length > 0 && (
                    <div className="border-t border-gray-700/50 bg-gray-900/30 px-3 py-2">
                      <div className="space-y-1.5">
                        {drive.plays.map((play, idx) => (
                          <div
                            key={play.id || idx}
                            className={cn(
                              "flex items-start gap-2 rounded px-2 py-1.5 text-[11px]",
                              play.isScoring
                                ? "bg-green-900/20 border-l-2 border-green-500"
                                : "bg-gray-800/30",
                            )}
                          >
                            {/* Play number */}
                            <span className="shrink-0 w-4 text-center text-gray-600 font-mono">
                              {idx + 1}
                            </span>

                            {/* Down and distance */}
                            <span className="shrink-0 w-16 text-gray-500">
                              {formatDown(play.down, play.distance)}
                            </span>

                            {/* Play text */}
                            <span className="flex-1 text-gray-300 leading-relaxed">
                              {play.text}
                            </span>

                            {/* Yards gained */}
                            {play.yardsGained !== 0 && (
                              <span
                                className={cn(
                                  "shrink-0 font-mono text-[10px]",
                                  play.yardsGained > 0 ? "text-green-400" : "text-red-400",
                                )}
                              >
                                {play.yardsGained > 0 ? "+" : ""}
                                {play.yardsGained}
                              </span>
                            )}

                            {/* Score after scoring play */}
                            {play.scoreAfter && (
                              <span className="shrink-0 rounded bg-gray-700 px-1.5 py-0.5 font-mono text-[10px] text-white">
                                {play.scoreAfter.away}-{play.scoreAfter.home}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty plays message */}
                  {isExpanded && drive.plays.length === 0 && (
                    <div className="border-t border-gray-700/50 bg-gray-900/30 px-3 py-4 text-center text-[11px] text-gray-500">
                      No play details available
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
