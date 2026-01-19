"use client";

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
import { AFC_SEEDS, NFC_SEEDS } from "@/data/teams";
import { hasCompletedGames, hasInProgressGames } from "@/lib/espn-api";

// Fallback polling interval (only used if SSE disconnects)
const FALLBACK_REFRESH_INTERVAL = 5 * 1000;

import {
  calculateChampionshipMatchup,
  calculateDivisionalMatchups,
  createInitialBracket,
  isBracketComplete,
} from "@/lib/playoff-rules";
import {
  getCurrentBracket,
  getStoredUser,
  saveCurrentBracket,
} from "@/lib/storage";
import type {
  BracketAction,
  BracketState,
  Conference,
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
 * Find team by ID from seeds
 */
function findTeamById(teamId: string): SeededTeam | null {
  const afcTeam = AFC_SEEDS.find((t) => t.id === teamId);
  if (afcTeam) return afcTeam;
  const nfcTeam = NFC_SEEDS.find((t) => t.id === teamId);
  return nfcTeam || null;
}

/**
 * Apply live result winner to bracket matchups
 */
function applyLiveResultToMatchup(
  state: BracketState,
  liveResult: LiveMatchupResult,
  matchups: BracketState["afc"]["wildCard"],
): BracketState["afc"]["wildCard"] {
  return matchups.map((matchup) => {
    // Match by teams (not by ID since ESPN IDs differ)
    const matchesHome =
      matchup.homeTeam?.id === liveResult.homeTeamId ||
      matchup.homeTeam?.id === liveResult.awayTeamId;
    const matchesAway =
      matchup.awayTeam?.id === liveResult.homeTeamId ||
      matchup.awayTeam?.id === liveResult.awayTeamId;

    if (
      matchesHome &&
      matchesAway &&
      liveResult.isComplete &&
      liveResult.winnerId
    ) {
      const winner = findTeamById(liveResult.winnerId);
      if (winner) {
        return { ...matchup, winner };
      }
    }
    return matchup;
  });
}

function updateDivisionalRound(
  state: BracketState,
  conference: Conference,
): BracketState {
  const confState = conference === "AFC" ? state.afc : state.nfc;
  const wildCardWinners = confState.wildCard.map((m) => m.winner);

  const { matchup1, matchup2 } = calculateDivisionalMatchups(
    conference,
    wildCardWinners,
  );

  const updatedDivisional = [...confState.divisional];
  updatedDivisional[0] = {
    ...updatedDivisional[0],
    homeTeam: matchup1.home,
    awayTeam: matchup1.away,
    // Clear winner if teams changed
    winner:
      updatedDivisional[0].winner &&
      (updatedDivisional[0].winner.id === matchup1.home?.id ||
        updatedDivisional[0].winner.id === matchup1.away?.id)
        ? updatedDivisional[0].winner
        : null,
  };
  updatedDivisional[1] = {
    ...updatedDivisional[1],
    homeTeam: matchup2.home,
    awayTeam: matchup2.away,
    winner:
      updatedDivisional[1].winner &&
      (updatedDivisional[1].winner.id === matchup2.home?.id ||
        updatedDivisional[1].winner.id === matchup2.away?.id)
        ? updatedDivisional[1].winner
        : null,
  };

  if (conference === "AFC") {
    return { ...state, afc: { ...state.afc, divisional: updatedDivisional } };
  }
  return { ...state, nfc: { ...state.nfc, divisional: updatedDivisional } };
}

function updateChampionshipRound(
  state: BracketState,
  conference: Conference,
): BracketState {
  const confState = conference === "AFC" ? state.afc : state.nfc;
  const divisionalWinners = confState.divisional.map((m) => m.winner);

  const { home, away } = calculateChampionshipMatchup(divisionalWinners);

  const updatedChampionship = {
    ...confState.championship!,
    homeTeam: home,
    awayTeam: away,
    // Clear winner if teams changed
    winner:
      confState.championship?.winner &&
      (confState.championship.winner.id === home?.id ||
        confState.championship.winner.id === away?.id)
        ? confState.championship.winner
        : null,
  };

  if (conference === "AFC") {
    return {
      ...state,
      afc: { ...state.afc, championship: updatedChampionship },
    };
  }
  return { ...state, nfc: { ...state.nfc, championship: updatedChampionship } };
}

function updateSuperBowl(state: BracketState): BracketState {
  const afcChamp = state.afc.championship?.winner || null;
  const nfcChamp = state.nfc.championship?.winner || null;

  const updatedSuperBowl = {
    ...state.superBowl!,
    homeTeam: afcChamp,
    awayTeam: nfcChamp,
    // Clear winner if teams changed
    winner:
      state.superBowl?.winner &&
      (state.superBowl.winner.id === afcChamp?.id ||
        state.superBowl.winner.id === nfcChamp?.id)
        ? state.superBowl.winner
        : null,
  };

  return { ...state, superBowl: updatedSuperBowl };
}

/**
 * Apply all live results to a bracket based on locked rounds
 */
function applyAllLiveResults(state: BracketState): BracketState {
  const { liveResults, lockedRounds } = state;
  if (!liveResults) return state;

  let newState = { ...state };

  // Apply wild card results if locked
  if (lockedRounds.wildCard) {
    for (const result of liveResults.afc.wildCard) {
      if (result.isComplete && result.winnerId) {
        newState.afc = {
          ...newState.afc,
          wildCard: applyLiveResultToMatchup(
            newState,
            result,
            newState.afc.wildCard,
          ),
        };
      }
    }
    for (const result of liveResults.nfc.wildCard) {
      if (result.isComplete && result.winnerId) {
        newState.nfc = {
          ...newState.nfc,
          wildCard: applyLiveResultToMatchup(
            newState,
            result,
            newState.nfc.wildCard,
          ),
        };
      }
    }
    // Update subsequent rounds
    newState = updateDivisionalRound(newState, "AFC");
    newState = updateDivisionalRound(newState, "NFC");
    newState = updateChampionshipRound(newState, "AFC");
    newState = updateChampionshipRound(newState, "NFC");
    newState = updateSuperBowl(newState);
  }

  // Apply divisional results if locked
  if (lockedRounds.divisional) {
    for (const result of liveResults.afc.divisional) {
      if (result.isComplete && result.winnerId) {
        newState.afc = {
          ...newState.afc,
          divisional: applyLiveResultToMatchup(
            newState,
            result,
            newState.afc.divisional,
          ),
        };
      }
    }
    for (const result of liveResults.nfc.divisional) {
      if (result.isComplete && result.winnerId) {
        newState.nfc = {
          ...newState.nfc,
          divisional: applyLiveResultToMatchup(
            newState,
            result,
            newState.nfc.divisional,
          ),
        };
      }
    }
    newState = updateChampionshipRound(newState, "AFC");
    newState = updateChampionshipRound(newState, "NFC");
    newState = updateSuperBowl(newState);
  }

  // Apply conference championship results if locked
  if (lockedRounds.conference) {
    if (
      liveResults.afc.championship?.isComplete &&
      liveResults.afc.championship.winnerId
    ) {
      const winner = findTeamById(liveResults.afc.championship.winnerId);
      if (winner && newState.afc.championship) {
        newState.afc = {
          ...newState.afc,
          championship: { ...newState.afc.championship, winner },
        };
      }
    }
    if (
      liveResults.nfc.championship?.isComplete &&
      liveResults.nfc.championship.winnerId
    ) {
      const winner = findTeamById(liveResults.nfc.championship.winnerId);
      if (winner && newState.nfc.championship) {
        newState.nfc = {
          ...newState.nfc,
          championship: { ...newState.nfc.championship, winner },
        };
      }
    }
    newState = updateSuperBowl(newState);
  }

  // Apply Super Bowl result if locked
  if (
    lockedRounds.superBowl &&
    liveResults.superBowl?.isComplete &&
    liveResults.superBowl.winnerId
  ) {
    const winner = findTeamById(liveResults.superBowl.winnerId);
    if (winner && newState.superBowl) {
      newState.superBowl = { ...newState.superBowl, winner };
    }
  }

  newState.isComplete = isBracketComplete(newState);
  return newState;
}

function bracketReducer(
  state: BracketState,
  action: BracketAction,
): BracketState {
  switch (action.type) {
    case "SELECT_WINNER": {
      const { matchupId, winner } = action;
      let newState = { ...state };

      // Find and update the matchup
      const updateMatchupInArray = (
        matchups: typeof state.afc.wildCard,
      ): typeof state.afc.wildCard => {
        return matchups.map((m) => (m.id === matchupId ? { ...m, winner } : m));
      };

      // Check AFC wild card
      if (state.afc.wildCard.some((m) => m.id === matchupId)) {
        newState.afc = {
          ...newState.afc,
          wildCard: updateMatchupInArray(newState.afc.wildCard),
        };
        newState = updateDivisionalRound(newState, "AFC");
        newState = updateChampionshipRound(newState, "AFC");
        newState = updateSuperBowl(newState);
      }
      // Check AFC divisional
      else if (state.afc.divisional.some((m) => m.id === matchupId)) {
        newState.afc = {
          ...newState.afc,
          divisional: updateMatchupInArray(newState.afc.divisional),
        };
        newState = updateChampionshipRound(newState, "AFC");
        newState = updateSuperBowl(newState);
      }
      // Check AFC championship
      else if (state.afc.championship?.id === matchupId) {
        newState.afc = {
          ...newState.afc,
          championship: { ...newState.afc.championship!, winner },
        };
        newState = updateSuperBowl(newState);
      }
      // Check NFC wild card
      else if (state.nfc.wildCard.some((m) => m.id === matchupId)) {
        newState.nfc = {
          ...newState.nfc,
          wildCard: updateMatchupInArray(newState.nfc.wildCard),
        };
        newState = updateDivisionalRound(newState, "NFC");
        newState = updateChampionshipRound(newState, "NFC");
        newState = updateSuperBowl(newState);
      }
      // Check NFC divisional
      else if (state.nfc.divisional.some((m) => m.id === matchupId)) {
        newState.nfc = {
          ...newState.nfc,
          divisional: updateMatchupInArray(newState.nfc.divisional),
        };
        newState = updateChampionshipRound(newState, "NFC");
        newState = updateSuperBowl(newState);
      }
      // Check NFC championship
      else if (state.nfc.championship?.id === matchupId) {
        newState.nfc = {
          ...newState.nfc,
          championship: { ...newState.nfc.championship!, winner },
        };
        newState = updateSuperBowl(newState);
      }
      // Check Super Bowl
      else if (state.superBowl?.id === matchupId) {
        newState.superBowl = { ...newState.superBowl!, winner };
      }

      newState.isComplete = isBracketComplete(newState);
      newState.updatedAt = Date.now();
      return newState;
    }

    case "CLEAR_WINNER": {
      const { matchupId } = action;
      let newState = { ...state };

      // Helper to clear winner in matchup array
      const clearMatchupWinner = (
        matchups: typeof state.afc.wildCard,
      ): typeof state.afc.wildCard => {
        return matchups.map((m) =>
          m.id === matchupId ? { ...m, winner: null } : m,
        );
      };

      // Check AFC wild card
      if (state.afc.wildCard.some((m) => m.id === matchupId)) {
        newState.afc = {
          ...newState.afc,
          wildCard: clearMatchupWinner(newState.afc.wildCard),
        };
        newState = updateDivisionalRound(newState, "AFC");
        newState = updateChampionshipRound(newState, "AFC");
        newState = updateSuperBowl(newState);
      }
      // Check AFC divisional
      else if (state.afc.divisional.some((m) => m.id === matchupId)) {
        newState.afc = {
          ...newState.afc,
          divisional: clearMatchupWinner(newState.afc.divisional),
        };
        newState = updateChampionshipRound(newState, "AFC");
        newState = updateSuperBowl(newState);
      }
      // Check AFC championship
      else if (state.afc.championship?.id === matchupId) {
        newState.afc = {
          ...newState.afc,
          championship: { ...newState.afc.championship!, winner: null },
        };
        newState = updateSuperBowl(newState);
      }
      // Check NFC wild card
      else if (state.nfc.wildCard.some((m) => m.id === matchupId)) {
        newState.nfc = {
          ...newState.nfc,
          wildCard: clearMatchupWinner(newState.nfc.wildCard),
        };
        newState = updateDivisionalRound(newState, "NFC");
        newState = updateChampionshipRound(newState, "NFC");
        newState = updateSuperBowl(newState);
      }
      // Check NFC divisional
      else if (state.nfc.divisional.some((m) => m.id === matchupId)) {
        newState.nfc = {
          ...newState.nfc,
          divisional: clearMatchupWinner(newState.nfc.divisional),
        };
        newState = updateChampionshipRound(newState, "NFC");
        newState = updateSuperBowl(newState);
      }
      // Check NFC championship
      else if (state.nfc.championship?.id === matchupId) {
        newState.nfc = {
          ...newState.nfc,
          championship: { ...newState.nfc.championship!, winner: null },
        };
        newState = updateSuperBowl(newState);
      }
      // Check Super Bowl
      else if (state.superBowl?.id === matchupId) {
        newState.superBowl = { ...newState.superBowl!, winner: null };
      }

      newState.isComplete = isBracketComplete(newState);
      newState.updatedAt = Date.now();
      return newState;
    }

    case "RESET_BRACKET": {
      return createInitialBracket(state.userName);
    }

    case "LOAD_BRACKET": {
      return action.bracket;
    }

    case "SET_BRACKET_NAME": {
      return { ...state, name: action.name, updatedAt: Date.now() };
    }

    case "SET_USER_NAME": {
      return { ...state, userName: action.userName, updatedAt: Date.now() };
    }

    case "SET_SUBTITLE": {
      return { ...state, subtitle: action.subtitle, updatedAt: Date.now() };
    }

    case "TOGGLE_ROUND_LOCK": {
      const { round } = action;
      const newLockedRounds = {
        ...state.lockedRounds,
        [round]: !state.lockedRounds[round],
      };

      let newState = {
        ...state,
        lockedRounds: newLockedRounds,
        updatedAt: Date.now(),
      };

      // If we're locking a round, apply live results
      if (newLockedRounds[round]) {
        newState = applyAllLiveResults(newState);
      }

      return newState;
    }

    case "SET_LIVE_RESULTS": {
      return {
        ...state,
        liveResults: action.results,
        updatedAt: Date.now(),
      };
    }

    case "APPLY_LIVE_RESULTS": {
      return applyAllLiveResults(state);
    }

    default:
      return state;
  }
}

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

export function BracketProvider({ children }: { children: ReactNode }) {
  const storedUser = getStoredUser();
  const storedBracket = getCurrentBracket();

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

  const initialState =
    migratedBracket || createInitialBracket(storedUser?.name || "");

  const [bracket, dispatch] = useReducer(bracketReducer, initialState);
  const [isLoadingLiveResults, setIsLoadingLiveResults] = useState(false);

  // Auto-save to localStorage on changes
  useEffect(() => {
    if (bracket.userName) {
      saveCurrentBracket(bracket);
    }
  }, [bracket]);

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

      // Find the matchup in bracket to get teams
      let matchup = null;

      // Search through all matchups
      matchup = bracket.afc.wildCard.find((m) => m.id === matchupId);
      if (!matchup)
        matchup = bracket.nfc.wildCard.find((m) => m.id === matchupId);
      if (!matchup)
        matchup = bracket.afc.divisional.find((m) => m.id === matchupId);
      if (!matchup)
        matchup = bracket.nfc.divisional.find((m) => m.id === matchupId);
      if (!matchup && bracket.afc.championship?.id === matchupId)
        matchup = bracket.afc.championship;
      if (!matchup && bracket.nfc.championship?.id === matchupId)
        matchup = bracket.nfc.championship;
      if (!matchup && bracket.superBowl?.id === matchupId)
        matchup = bracket.superBowl;

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
          ((m.homeTeam.id === liveResult.homeTeamId &&
            m.awayTeam.id === liveResult.awayTeamId) ||
            (m.homeTeam.id === liveResult.awayTeamId &&
              m.awayTeam.id === liveResult.homeTeamId)),
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

    // AFC Championship
    if (liveResults.afc.championship && bracket.afc.championship) {
      const lr = liveResults.afc.championship;
      const matchup = bracket.afc.championship;
      if (
        matchup.homeTeam &&
        matchup.awayTeam &&
        ((matchup.homeTeam.id === lr.homeTeamId &&
          matchup.awayTeam.id === lr.awayTeamId) ||
          (matchup.homeTeam.id === lr.awayTeamId &&
            matchup.awayTeam.id === lr.homeTeamId))
      ) {
        games.push({
          matchup,
          liveResult: lr,
          conference: "AFC",
          round: "conference",
        });
      }
    }

    // NFC Championship
    if (liveResults.nfc.championship && bracket.nfc.championship) {
      const lr = liveResults.nfc.championship;
      const matchup = bracket.nfc.championship;
      if (
        matchup.homeTeam &&
        matchup.awayTeam &&
        ((matchup.homeTeam.id === lr.homeTeamId &&
          matchup.awayTeam.id === lr.awayTeamId) ||
          (matchup.homeTeam.id === lr.awayTeamId &&
            matchup.awayTeam.id === lr.homeTeamId))
      ) {
        games.push({
          matchup,
          liveResult: lr,
          conference: "NFC",
          round: "conference",
        });
      }
    }

    // Super Bowl
    if (liveResults.superBowl && bracket.superBowl) {
      const lr = liveResults.superBowl;
      const matchup = bracket.superBowl;
      if (
        matchup.homeTeam &&
        matchup.awayTeam &&
        ((matchup.homeTeam.id === lr.homeTeamId &&
          matchup.awayTeam.id === lr.awayTeamId) ||
          (matchup.homeTeam.id === lr.awayTeamId &&
            matchup.awayTeam.id === lr.homeTeamId))
      ) {
        games.push({
          matchup,
          liveResult: lr,
          conference: "superBowl",
          round: "superBowl",
        });
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
