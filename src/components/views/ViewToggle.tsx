"use client";

import { Trophy, Tv } from "lucide-react";
import { useView } from "@/contexts/ViewContext";
import { useBracket } from "@/contexts/BracketContext";
import { hasInProgressGames } from "@/lib/espn-api";
import { cn } from "@/lib/utils";
import type { ViewMode } from "@/types";

interface ViewToggleProps {
  className?: string;
}

export function ViewToggle({ className }: ViewToggleProps) {
  const { viewMode, setViewMode } = useView();
  const { bracket } = useBracket();

  const hasLiveGames = hasInProgressGames(bracket.liveResults);

  const options: { mode: ViewMode; label: string; icon: typeof Trophy }[] = [
    { mode: "bracket", label: "Bracket", icon: Trophy },
    { mode: "live-games", label: "Live Games", icon: Tv },
  ];

  return (
    <div className={cn("flex justify-center", className)}>
      <div className="inline-flex rounded-full bg-gray-800 p-1">
        {options.map(({ mode, label, icon: Icon }) => {
          const isActive = viewMode === mode;
          const showLiveIndicator = mode === "live-games" && hasLiveGames;

          return (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={cn(
                "relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all",
                isActive
                  ? "bg-gradient-to-r from-red-600 to-blue-600 text-white shadow-lg"
                  : "text-gray-400 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
              {showLiveIndicator && (
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
