"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useReducer,
} from "react";
import { AFC_SEEDS, NFC_SEEDS } from "@/data/teams";
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
}

const BracketContext = createContext<BracketContextType | null>(null);

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

    default:
      return state;
  }
}

export function BracketProvider({ children }: { children: ReactNode }) {
  const storedUser = getStoredUser();
  const storedBracket = getCurrentBracket();

  const initialState =
    storedBracket || createInitialBracket(storedUser?.name || "");

  const [bracket, dispatch] = useReducer(bracketReducer, initialState);

  // Auto-save to localStorage on changes
  useEffect(() => {
    if (bracket.userName) {
      saveCurrentBracket(bracket);
    }
  }, [bracket]);

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
