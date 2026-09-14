"use client";

import { useAuth } from "@clerk/nextjs";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { bracketReducer, applyAllLiveResults, findTeamById } from "@/lib/bracket-reducer";
import { hasCompletedGames, hasInProgressGames } from "@/lib/espn-api";

// Fallback polling interval (only used if SSE disconnects)
const FALLBACK_REFRESH_INTERVAL = 5 * 1000;

import { createInitialBracket } from "@/lib/playoff-rules";
import { getCurrentBracket, getStoredUser, saveCurrentBracket } from "@/lib/storage";
import type {
  BracketAction,
  BracketState,
  LiveGameInfo,
  LiveMatchupResult,
  LiveResults,
  RoundName,
  SeededTeam,
} from "@/types";

interface BracketContextType {
  bracket: BracketState;
  dispatch: React.Dispatch<BracketAction>;
  selectWinner: (matchupId: string, winner: SeededTeam) => void;
  clearWinner: (matchupId: string) => void;
  resetBracket: () => void;
  loadBracket: (bracket: BracketState) => void;
  setBracketName: (name: string) => void;
  setUserName: (userName: string) => void;
  setSubtitle: (subtitle: string | null) => void;
  toggleRoundLock: (round: RoundName) => void;
  setLiveResults: (results: LiveResults) => void;
  applyLiveResults: () => void;
  refreshLiveResults: () => Promise<void>;
  isLoadingLiveResults: boolean;
  isMatchupLocked: (matchupId: string) => boolean;
  getLiveResultForMatchup: (matchupId: string) => LiveMatchupResult | null;
  getAllLiveGames: () => LiveGameInfo[];
}

const BracketContext = createContext<BracketContextType | null>(null);

/**
 * Get matchup round from matchup ID
 */
function getMatchupRound(matchupId: string): RoundName | null {
  if (matchupId.includes("-wc-")) return "wildCard";
  if (matchupId.includes("-div-")) return "divisional";
  if (matchupId.includes("-champ")) return "conference";
  if (matchupId === "super-bowl") return "superBowl";
  return null;
}

type ProviderProps = { children: ReactNode; initialBracket?: BracketState; persist?: boolean };
export function BracketProvider(props: ProviderProps) {
  const { userId, isLoaded } = useAuth();
  // Mount editable state only after account identity is known. Remounting a
  // temporary guest tree when Clerk loads can otherwise discard typed input.
  if (!isLoaded)
    return (
      <p role="status" className="p-6 text-gray-400">
        Loading bracket…
      </p>
    );
  return (
    <BracketProviderState
      key={userId ?? "guest"}
      {...props}
      persist={isLoaded && props.persist !== false}
      ownerId={userId ?? undefined}
    />
  );
}

function BracketProviderState({
  children,
  initialBracket,
  persist,
  ownerId,
}: ProviderProps & { ownerId?: string }) {
  const storedUser = ownerId ? null : getStoredUser();
  const storedBracket = initialBracket ?? (persist ? getCurrentBracket(ownerId) : null);

  // Migrate old brackets that don't have lockedRounds
  const migratedBracket = storedBracket
    ? {
        ...storedBracket,
        lockedRounds: storedBracket.lockedRounds || {
          wildCard: false,
          divisional: false,
          conference: false,
          superBowl: false,
        },
        liveResults: storedBracket.liveResults || null,
      }
    : null;

  const initialState = migratedBracket || createInitialBracket(storedUser?.name || "");

  const [bracket, dispatch] = useReducer(bracketReducer, initialState);
  const [isLoadingLiveResults, setIsLoadingLiveResults] = useState(false);

  // Auto-save to localStorage on changes
  useEffect(() => {
    if (persist && bracket.userName) {
      saveCurrentBracket(bracket, ownerId);
    }
  }, [bracket, persist, ownerId]);

  // Track if we have live games for SSE subscription
  const hasLiveGames = hasInProgressGames(bracket.liveResults);
  const eventSourceRef = useRef<EventSource | null>(null);
  const fallbackIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Subscribe to SSE stream when games are in progress
  useEffect(() => {
    // Clean up any existing connections
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (fallbackIntervalRef.current) {
      clearInterval(fallbackIntervalRef.current);
      fallbackIntervalRef.current = null;
    }

    // Only subscribe when there are live games
    if (!hasLiveGames) return;

    // Create SSE connection
    const eventSource = new EventSource("/api/standings/stream");
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const results: LiveResults = JSON.parse(event.data);
        dispatch({ type: "SET_LIVE_RESULTS", results });
      } catch (err) {
        console.error("Failed to parse SSE data:", err);
      }
    };

    eventSource.onerror = () => {
      console.warn("SSE connection error, falling back to polling");
      eventSource.close();
      eventSourceRef.current = null;

      // Fall back to polling if SSE fails
      if (!fallbackIntervalRef.current) {
        fallbackIntervalRef.current = setInterval(() => {
          fetch("/api/standings")
            .then((res) => res.json())
            .then((results: LiveResults) => {
              dispatch({ type: "SET_LIVE_RESULTS", results });
            })
            .catch((err) => console.error("Fallback refresh failed:", err));
        }, FALLBACK_REFRESH_INTERVAL);
      }
    };

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
        fallbackIntervalRef.current = null;
      }
    };
  }, [hasLiveGames]);

  const selectWinner = (matchupId: string, winner: SeededTeam) => {
    dispatch({ type: "SELECT_WINNER", matchupId, winner });
  };

  const clearWinner = (matchupId: string) => {
    dispatch({ type: "CLEAR_WINNER", matchupId });
  };

  const resetBracket = () => {
    dispatch({ type: "RESET_BRACKET" });
  };

  const loadBracket = (newBracket: BracketState) => {
    dispatch({ type: "LOAD_BRACKET", bracket: newBracket });
  };

  const setBracketName = (name: string) => {
    dispatch({ type: "SET_BRACKET_NAME", name });
  };

  const setUserName = (userName: string) => {
    dispatch({ type: "SET_USER_NAME", userName });
  };

  const setSubtitle = (subtitle: string | null) => {
    dispatch({ type: "SET_SUBTITLE", subtitle });
  };

  const toggleRoundLock = (round: RoundName) => {
    dispatch({ type: "TOGGLE_ROUND_LOCK", round });
  };

  const setLiveResults = (results: LiveResults) => {
    dispatch({ type: "SET_LIVE_RESULTS", results });
  };

  const applyLiveResults = () => {
    dispatch({ type: "APPLY_LIVE_RESULTS" });
  };

  const refreshLiveResults = useCallback(async () => {
    setIsLoadingLiveResults(true);
    try {
      const response = await fetch("/api/standings");
      if (response.ok) {
        const results: LiveResults = await response.json();
        dispatch({ type: "SET_LIVE_RESULTS", results });

        // Auto-lock rounds that have completed games (only for new brackets)
        if (!bracket.liveResults) {
          const newLockedRounds = { ...bracket.lockedRounds };
          if (hasCompletedGames(results, "wildCard")) {
            newLockedRounds.wildCard = true;
          }
          if (hasCompletedGames(results, "divisional")) {
            newLockedRounds.divisional = true;
          }
          if (hasCompletedGames(results, "conference")) {
            newLockedRounds.conference = true;
          }
          if (hasCompletedGames(results, "superBowl")) {
            newLockedRounds.superBowl = true;
          }

          // Apply locked rounds and live results
          dispatch({
            type: "LOAD_BRACKET",
            bracket: applyAllLiveResults({
              ...bracket,
              liveResults: results,
              lockedRounds: newLockedRounds,
            }),
          });
        }
      }
    } catch (error) {
      console.error("Failed to fetch live results:", error);
    } finally {
      setIsLoadingLiveResults(false);
    }
  }, [bracket]);

  /**
   * Check if a specific matchup is locked (using actual results)
   */
  const isMatchupLocked = useCallback(
    (matchupId: string): boolean => {
      const round = getMatchupRound(matchupId);
      if (!round) return false;
      return bracket.lockedRounds[round];
    },
    [bracket.lockedRounds],
  );

  /**
   * Get live result for a specific matchup
   */
  const getLiveResultForMatchup = useCallback(
    (matchupId: string): LiveMatchupResult | null => {
      const { liveResults } = bracket;
      if (!liveResults) return null;

      // For Super Bowl and championship games, return the live result directly
      // even if bracket teams haven't been filled in or don't match
      if (matchupId === "super-bowl") {
        return liveResults.superBowl ?? null;
      }
      if (matchupId === "AFC-champ") {
        return liveResults.afc.championship ?? null;
      }
      if (matchupId === "NFC-champ") {
        return liveResults.nfc.championship ?? null;
      }

      // Find the matchup in bracket to get teams
      let matchup = null;

      // Search through all matchups
      matchup = bracket.afc.wildCard.find((m) => m.id === matchupId);
      if (!matchup) matchup = bracket.nfc.wildCard.find((m) => m.id === matchupId);
      if (!matchup) matchup = bracket.afc.divisional.find((m) => m.id === matchupId);
      if (!matchup) matchup = bracket.nfc.divisional.find((m) => m.id === matchupId);
      if (!matchup && bracket.afc.championship?.id === matchupId)
        matchup = bracket.afc.championship;
      if (!matchup && bracket.nfc.championship?.id === matchupId)
        matchup = bracket.nfc.championship;
      if (!matchup && bracket.superBowl?.id === matchupId) matchup = bracket.superBowl;

      if (!matchup) return null;

      const homeTeamId = matchup.homeTeam?.id;
      const awayTeamId = matchup.awayTeam?.id;
      if (!homeTeamId || !awayTeamId) return null;

      // Find matching live result
      const allResults = [
        ...liveResults.afc.wildCard,
        ...liveResults.nfc.wildCard,
        ...liveResults.afc.divisional,
        ...liveResults.nfc.divisional,
        ...(liveResults.afc.championship ? [liveResults.afc.championship] : []),
        ...(liveResults.nfc.championship ? [liveResults.nfc.championship] : []),
        ...(liveResults.superBowl ? [liveResults.superBowl] : []),
      ];

      return (
        allResults.find(
          (r) =>
            (r.homeTeamId === homeTeamId && r.awayTeamId === awayTeamId) ||
            (r.homeTeamId === awayTeamId && r.awayTeamId === homeTeamId),
        ) ?? null
      );
    },
    [bracket],
  );

  /**
   * Get all games with live data for Live Games view
   */
  const getAllLiveGames = useCallback((): LiveGameInfo[] => {
    const { liveResults } = bracket;
    if (!liveResults) return [];

    const games: LiveGameInfo[] = [];

    // Helper to find matchup by teams
    const findMatchupByTeams = (
      matchups: typeof bracket.afc.wildCard,
      liveResult: LiveMatchupResult,
    ) => {
      return matchups.find(
        (m) =>
          m.homeTeam &&
          m.awayTeam &&
          ((m.homeTeam.id === liveResult.homeTeamId && m.awayTeam.id === liveResult.awayTeamId) ||
            (m.homeTeam.id === liveResult.awayTeamId && m.awayTeam.id === liveResult.homeTeamId)),
      );
    };

    // AFC Wild Card
    for (const lr of liveResults.afc.wildCard) {
      const matchup = findMatchupByTeams(bracket.afc.wildCard, lr);
      if (matchup) {
        games.push({
          matchup,
          liveResult: lr,
          conference: "AFC",
          round: "wildCard",
        });
      }
    }

    // NFC Wild Card
    for (const lr of liveResults.nfc.wildCard) {
      const matchup = findMatchupByTeams(bracket.nfc.wildCard, lr);
      if (matchup) {
        games.push({
          matchup,
          liveResult: lr,
          conference: "NFC",
          round: "wildCard",
        });
      }
    }

    // AFC Divisional
    for (const lr of liveResults.afc.divisional) {
      const matchup = findMatchupByTeams(bracket.afc.divisional, lr);
      if (matchup) {
        games.push({
          matchup,
          liveResult: lr,
          conference: "AFC",
          round: "divisional",
        });
      }
    }

    // NFC Divisional
    for (const lr of liveResults.nfc.divisional) {
      const matchup = findMatchupByTeams(bracket.nfc.divisional, lr);
      if (matchup) {
        games.push({
          matchup,
          liveResult: lr,
          conference: "NFC",
          round: "divisional",
        });
      }
    }

    // AFC Championship - show even if bracket teams don't match
    if (liveResults.afc.championship && bracket.afc.championship) {
      const lr = liveResults.afc.championship;
      const matchup = bracket.afc.championship;
      const teamsMatch =
        matchup.homeTeam &&
        matchup.awayTeam &&
        ((matchup.homeTeam.id === lr.homeTeamId && matchup.awayTeam.id === lr.awayTeamId) ||
          (matchup.homeTeam.id === lr.awayTeamId && matchup.awayTeam.id === lr.homeTeamId));

      if (teamsMatch) {
        games.push({
          matchup,
          liveResult: lr,
          conference: "AFC",
          round: "conference",
        });
      } else {
        const homeTeam = findTeamById(lr.homeTeamId);
        const awayTeam = findTeamById(lr.awayTeamId);
        if (homeTeam && awayTeam) {
          games.push({
            matchup: { ...matchup, homeTeam, awayTeam },
            liveResult: lr,
            conference: "AFC",
            round: "conference",
          });
        }
      }
    }

    // NFC Championship - show even if bracket teams don't match
    if (liveResults.nfc.championship && bracket.nfc.championship) {
      const lr = liveResults.nfc.championship;
      const matchup = bracket.nfc.championship;
      const teamsMatch =
        matchup.homeTeam &&
        matchup.awayTeam &&
        ((matchup.homeTeam.id === lr.homeTeamId && matchup.awayTeam.id === lr.awayTeamId) ||
          (matchup.homeTeam.id === lr.awayTeamId && matchup.awayTeam.id === lr.homeTeamId));

      if (teamsMatch) {
        games.push({
          matchup,
          liveResult: lr,
          conference: "NFC",
          round: "conference",
        });
      } else {
        const homeTeam = findTeamById(lr.homeTeamId);
        const awayTeam = findTeamById(lr.awayTeamId);
        if (homeTeam && awayTeam) {
          games.push({
            matchup: { ...matchup, homeTeam, awayTeam },
            liveResult: lr,
            conference: "NFC",
            round: "conference",
          });
        }
      }
    }

    // Super Bowl - always show if live data exists, even if bracket teams don't match
    if (liveResults.superBowl && bracket.superBowl) {
      const lr = liveResults.superBowl;
      const matchup = bracket.superBowl;
      const teamsMatch =
        matchup.homeTeam &&
        matchup.awayTeam &&
        ((matchup.homeTeam.id === lr.homeTeamId && matchup.awayTeam.id === lr.awayTeamId) ||
          (matchup.homeTeam.id === lr.awayTeamId && matchup.awayTeam.id === lr.homeTeamId));

      if (teamsMatch) {
        games.push({
          matchup,
          liveResult: lr,
          conference: "superBowl",
          round: "superBowl",
        });
      } else {
        // Bracket teams don't match or are null - populate from live data
        const homeTeam = findTeamById(lr.homeTeamId);
        const awayTeam = findTeamById(lr.awayTeamId);
        if (homeTeam && awayTeam) {
          games.push({
            matchup: {
              ...matchup,
              homeTeam,
              awayTeam,
            },
            liveResult: lr,
            conference: "superBowl",
            round: "superBowl",
          });
        }
      }
    }

    // Sort: in-progress first, then completed, then by round
    const roundOrder: Record<string, number> = {
      superBowl: 0,
      conference: 1,
      divisional: 2,
      wildCard: 3,
    };

    return games.sort((a, b) => {
      // In-progress games first
      if (a.liveResult.isInProgress && !b.liveResult.isInProgress) return -1;
      if (!a.liveResult.isInProgress && b.liveResult.isInProgress) return 1;
      // Then by round (higher rounds first)
      return roundOrder[a.round] - roundOrder[b.round];
    });
  }, [bracket]);

  return (
    <BracketContext.Provider
      value={{
        bracket,
        dispatch,
        selectWinner,
        clearWinner,
        resetBracket,
        loadBracket,
        setBracketName,
        setUserName,
        setSubtitle,
        toggleRoundLock,
        setLiveResults,
        applyLiveResults,
        refreshLiveResults,
        isLoadingLiveResults,
        isMatchupLocked,
        getLiveResultForMatchup,
        getAllLiveGames,
      }}
    >
      {children}
    </BracketContext.Provider>
  );
}

export function useBracket() {
  const context = useContext(BracketContext);
  if (!context) {
    throw new Error("useBracket must be used within a BracketProvider");
  }
  return context;
}
