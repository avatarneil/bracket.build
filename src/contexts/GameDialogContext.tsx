"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
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
 * Normalizes to lowercase since matchup IDs are lowercase
 */
function gameIdToMatchupId(gameId: string): string {
  return gameId.toLowerCase();
}

export function GameDialogProvider({ children }: { children: ReactNode }) {
  const { state: urlState, openGame, closeGame, setTab, isHydrated } = useDeepLink();
  const { getAllLiveGames, getLiveResultForMatchup, bracket, isLoadingLiveResults } = useBracket();

  // Track if we have live results loaded (needed for deep linking)
  const hasLiveResults = bracket.liveResults !== null;

  const [selectedGame, setSelectedGame] = useState<LiveGameInfo | null>(null);
  const [activeTab, setActiveTabState] = useState<TabId>("stats");
  const [isInitialized, setIsInitialized] = useState(false);

  // Track previous URL game ID to detect browser back/forward navigation
  const prevUrlGameIdRef = useRef<string | null>(null);

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

  // Handle deep linking on initial load only
  // This effect runs once when live results are available and checks if URL has a game
  useEffect(() => {
    // Skip if already initialized or not hydrated
    if (isInitialized || !isHydrated) return;

    // Wait for live results to load before trying to open from URL
    if (!hasLiveResults || isLoadingLiveResults) return;

    const currentUrlGameId = urlState.gameId;
    prevUrlGameIdRef.current = currentUrlGameId;

    if (currentUrlGameId) {
      const matchupId = gameIdToMatchupId(currentUrlGameId);
      const game = findGameByMatchupId(matchupId);
      if (game) {
        setSelectedGame(game);
        setActiveTabState(urlState.tab);
      } else {
        // Invalid game ID - clear from URL
        closeGame();
      }
    }

    setIsInitialized(true);
  }, [isHydrated, isInitialized, hasLiveResults, isLoadingLiveResults, urlState.gameId, urlState.tab, findGameByMatchupId, closeGame]);

  // Handle browser back/forward navigation by watching for URL game ID changes
  useEffect(() => {
    if (!isInitialized || !isHydrated) return;

    const currentUrlGameId = urlState.gameId;
    const prevUrlGameId = prevUrlGameIdRef.current;

    // Only act if URL game ID actually changed (browser navigation)
    if (currentUrlGameId === prevUrlGameId) return;

    const prevWasEmpty = !prevUrlGameId;
    const currentIsEmpty = !currentUrlGameId;

    // Update ref
    prevUrlGameIdRef.current = currentUrlGameId;

    // If URL went from having a game to not having one, close the dialog (browser back)
    if (!prevWasEmpty && currentIsEmpty && selectedGame) {
      setSelectedGame(null);
      setActiveTabState("stats");
      return;
    }

    // If URL went from no game to having a game (browser forward), open it
    if (prevWasEmpty && !currentIsEmpty) {
      const matchupId = gameIdToMatchupId(currentUrlGameId);
      const game = findGameByMatchupId(matchupId);
      if (game) {
        setSelectedGame(game);
        setActiveTabState(urlState.tab);
      }
    }
  }, [isHydrated, isInitialized, urlState.gameId, urlState.tab, selectedGame, findGameByMatchupId]);

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
