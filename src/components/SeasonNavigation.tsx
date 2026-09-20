"use client";

import { CalendarDays, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SeasonPhase } from "@/types";

interface SeasonNavigationProps {
  selectedPhase: SeasonPhase;
  currentPhase: SeasonPhase | null;
  phaseAvailability: Record<SeasonPhase, boolean>;
  onSelect: (phase: SeasonPhase) => void;
}

const PHASES: Array<{
  id: SeasonPhase;
  label: string;
  shortLabel: string;
  icon: typeof CalendarDays;
}> = [
  { id: "preseason", label: "Preseason", shortLabel: "Pre", icon: CalendarDays },
  { id: "regular", label: "Regular season", shortLabel: "Regular", icon: CalendarDays },
  { id: "postseason", label: "Postseason", shortLabel: "Playoffs", icon: Trophy },
];

export function SeasonNavigation({
  selectedPhase,
  currentPhase,
  phaseAvailability,
  onSelect,
}: SeasonNavigationProps) {
  return (
    <nav aria-label="NFL season" className="@container min-w-52 flex-1">
      <div className="grid grid-cols-3 rounded-xl bg-gray-900 p-1" data-testid="season-navigation">
        {PHASES.map(({ id, label, shortLabel, icon: Icon }) => {
          const isSelected = selectedPhase === id;
          const isCurrent = currentPhase === id;
          const isAvailable = phaseAvailability[id];

          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              disabled={!isAvailable}
              aria-describedby={
                id === "postseason" && !isAvailable ? "postseason-status" : undefined
              }
              aria-label={`${label}${isCurrent ? ", current season phase" : ""}${!isAvailable ? ", unavailable" : ""}`}
              aria-current={isSelected ? "page" : undefined}
              className={cn(
                "relative flex min-h-11 touch-manipulation items-center justify-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold transition-[background-color,color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black",
                isSelected
                  ? "bg-white text-black"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white disabled:cursor-not-allowed disabled:text-gray-600 disabled:hover:bg-transparent",
              )}
            >
              <Icon className="hidden h-4 w-4 @min-md:block" aria-hidden="true" />
              <span className="@min-md:hidden">{shortLabel}</span>
              <span className="hidden @min-md:inline">{label}</span>
              {isCurrent && !isSelected && (
                <span
                  className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-green-400"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
