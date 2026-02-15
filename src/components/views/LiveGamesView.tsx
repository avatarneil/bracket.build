"use client";

import { useBracket } from "@/contexts/BracketContext";
import { useGameDialog } from "@/contexts/GameDialogContext";
import type { LiveGameInfo } from "@/types";
import { LiveGameCard } from "./LiveGameCard";

export function LiveGamesView() {
  const { getAllLiveGames, isLoadingLiveResults } = useBracket();
  const { openGameDialog } = useGameDialog();

  const games = getAllLiveGames();

  // Group games by status
  const liveGames = games.filter((g) => g.liveResult.isInProgress);
  const completedGames = games.filter((g) => g.liveResult.isComplete);
  const upcomingGames = games.filter((g) => !g.liveResult.isInProgress && !g.liveResult.isComplete);

  const handleGameTap = (game: LiveGameInfo) => {
    openGameDialog(game);
  };

  if (isLoadingLiveResults) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="text-gray-400">Loading games...</div>
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center px-4 text-center">
        <div className="mb-4 text-6xl">🏈</div>
        <h3 className="mb-2 text-xl font-semibold text-white">No Games Available</h3>
        <p className="max-w-sm text-gray-400">
          Check back during Wild Card weekend to see live game updates and scores.
        </p>
      </div>
    );
  }

  return (
    <div data-testid="live-games-view" className="w-full max-w-lg space-y-6 px-4">
      {/* Live Games */}
      {liveGames.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-yellow-500">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-yellow-500" />
            </span>
            Live Now
          </h2>
          <div className="space-y-3">
            {liveGames.map((game) => (
              <LiveGameCard key={game.matchup.id} game={game} onTap={() => handleGameTap(game)} />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming Games */}
      {upcomingGames.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
            Upcoming
          </h2>
          <div className="space-y-3">
            {upcomingGames.map((game) => (
              <LiveGameCard key={game.matchup.id} game={game} onTap={() => handleGameTap(game)} />
            ))}
          </div>
        </section>
      )}

      {/* Completed Games */}
      {completedGames.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
            Final
          </h2>
          <div className="space-y-3">
            {completedGames.map((game) => (
              <LiveGameCard key={game.matchup.id} game={game} onTap={() => handleGameTap(game)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
