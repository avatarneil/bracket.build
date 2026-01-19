"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { type TabId, useDeepLink } from "@/hooks/useDeepLink";
import type { LiveGameInfo, Matchup } from "@/types";
import { useBracket } from "./BracketContext";

interface GameDialogContextType {
  /** Currently selected game (null if no dialog open) */
  selectedGame: LiveGameInfo | null;
  /** Active tab in the dialog */
  activeTab: TabId;
  /** Open a game dialog, optionally specifying a tab */
  openGameDialog: (game: LiveGameInfo, tab?: TabId) => void;
  /** Open a game dialog by matchup ID, optionally specifying a tab */
  openGameDialogById: (matchupId: string, tab?: TabId) => void;
  /** Close the game dialog */
  closeGameDialog: () => void;
  /** Set the active tab */
  setActiveTab: (tab: TabId) => void;
  /** Whether the URL has been processed on initial load */
  isInitialized: boolean;
}

const GameDialogContext = createContext<GameDialogContextType | null>(null);

/**
 * Convert a matchup ID to a URL-friendly game ID
 * e.g., "afc-wc-1" stays the same, "super-bowl" stays the same
 */
function matchupIdToGameId(matchupId: string): string {
  return matchupId;
}

/**
 * Convert a URL game ID back to matchup ID
 * For now these are the same, but this allows for flexibility
 */
function gameIdToMatchupId(gameId: string): string {
  return gameId;
}

export function GameDialogProvider({ children }: { children: ReactNode }) {
  const { state: urlState, openGame, closeGame, setTab, isHydrated } = useDeepLink();
  const { getAllLiveGames, getLiveResultForMatchup, bracket } = useBracket();

  const [selectedGame, setSelectedGame] = useState<LiveGameInfo | null>(null);
  const [activeTab, setActiveTabState] = useState<TabId>("stats");
  const [isInitialized, setIsInitialized] = useState(false);

  /**
   * Find a game by matchup ID from available live games or bracket
   */
  const findGameByMatchupId = useCallback(
    (matchupId: string): LiveGameInfo | null => {
      // First try to find in live games
      const liveGames = getAllLiveGames();
      const liveGame = liveGames.find((g) => g.matchup.id === matchupId);
      if (liveGame) return liveGame;

      // If not found in live games, try to build from bracket
      // Search through all matchups
      let matchup: Matchup | null | undefined = null;
      let conference: LiveGameInfo["conference"] = "AFC";
      let round: LiveGameInfo["round"] = "wildCard";

      // AFC Wild Card
      matchup = bracket.afc.wildCard.find((m) => m.id === matchupId);
      if (matchup) {
        conference = "AFC";
        round = "wildCard";
      }

      // NFC Wild Card
      if (!matchup) {
        matchup = bracket.nfc.wildCard.find((m) => m.id === matchupId);
        if (matchup) {
          conference = "NFC";
          round = "wildCard";
        }
      }

      // AFC Divisional
      if (!matchup) {
        matchup = bracket.afc.divisional.find((m) => m.id === matchupId);
        if (matchup) {
          conference = "AFC";
          round = "divisional";
        }
      }

      // NFC Divisional
      if (!matchup) {
        matchup = bracket.nfc.divisional.find((m) => m.id === matchupId);
        if (matchup) {
          conference = "NFC";
          round = "divisional";
        }
      }

      // AFC Championship
      if (!matchup && bracket.afc.championship?.id === matchupId) {
        matchup = bracket.afc.championship;
        conference = "AFC";
        round = "conference";
      }

      // NFC Championship
      if (!matchup && bracket.nfc.championship?.id === matchupId) {
        matchup = bracket.nfc.championship;
        conference = "NFC";
        round = "conference";
      }

      // Super Bowl
      if (!matchup && bracket.superBowl?.id === matchupId) {
        matchup = bracket.superBowl;
        conference = "superBowl";
        round = "superBowl";
      }

      if (!matchup) return null;

      // Get live result for this matchup
      const liveResult = getLiveResultForMatchup(matchupId);
      if (!liveResult) return null;

      return {
        matchup,
        liveResult,
        conference,
        round,
      };
    },
    [getAllLiveGames, getLiveResultForMatchup, bracket],
  );

  // Sync state from URL on initial load (deep linking)
  // This effect handles:
  // 1. Initial page load with URL params (deep linking)
  // 2. Browser back/forward navigation
  // It does NOT re-verify games that are already open (to avoid race conditions)
  useEffect(() => {
    if (!isHydrated) return;

    // Handle game ID from URL
    if (urlState.gameId) {
      const matchupId = gameIdToMatchupId(urlState.gameId);

      // Only look up game if we don't already have one selected with this ID
      // This prevents race conditions when opening a dialog programmatically
      if (!selectedGame || selectedGame.matchup.id !== matchupId) {
        const game = findGameByMatchupId(matchupId);
        if (game) {
          setSelectedGame(game);
          setActiveTabState(urlState.tab);
        } else {
          // Invalid game ID - clear URL
          closeGame();
          setSelectedGame(null);
          setActiveTabState("stats");
        }
      } else {
        // Game is already selected, just sync the tab
        setActiveTabState(urlState.tab);
      }
    } else if (selectedGame) {
      // URL has no game but we have one selected - close it
      // This handles browser back navigation
      setSelectedGame(null);
      setActiveTabState("stats");
    }

    setIsInitialized(true);
  }, [isHydrated, urlState.gameId, urlState.tab, findGameByMatchupId, closeGame, selectedGame]);

  /**
   * Open a game dialog
   */
  const openGameDialog = useCallback(
    (game: LiveGameInfo, tab?: TabId) => {
      const gameId = matchupIdToGameId(game.matchup.id);
      setSelectedGame(game);
      setActiveTabState(tab || "stats");
      openGame(gameId, tab);
    },
    [openGame],
  );

  /**
   * Open a game dialog by matchup ID
   */
  const openGameDialogById = useCallback(
    (matchupId: string, tab?: TabId) => {
      const game = findGameByMatchupId(matchupId);
      if (game) {
        openGameDialog(game, tab);
      }
    },
    [findGameByMatchupId, openGameDialog],
  );

  /**
   * Close the game dialog
   */
  const closeGameDialog = useCallback(() => {
    setSelectedGame(null);
    setActiveTabState("stats");
    closeGame();
  }, [closeGame]);

  /**
   * Set the active tab
   */
  const setActiveTab = useCallback(
    (tab: TabId) => {
      setActiveTabState(tab);
      if (selectedGame) {
        setTab(tab);
      }
    },
    [selectedGame, setTab],
  );

  return (
    <GameDialogContext.Provider
      value={{
        selectedGame,
        activeTab,
        openGameDialog,
        openGameDialogById,
        closeGameDialog,
        setActiveTab,
        isInitialized,
      }}
    >
      {children}
    </GameDialogContext.Provider>
  );
}

export function useGameDialog() {
  const context = useContext(GameDialogContext);
  if (!context) {
    throw new Error("useGameDialog must be used within a GameDialogProvider");
  }
  return context;
}
