import { AFC_SEEDS, NFC_SEEDS } from "@/data/teams";
import {
  calculateChampionshipMatchup,
  calculateDivisionalMatchups,
  createInitialBracket,
  isBracketComplete,
} from "@/lib/playoff-rules";
import type {
  BracketAction,
  BracketState,
  Conference,
  LiveMatchupResult,
  SeededTeam,
} from "@/types";

/**
 * Find team by ID from seeds
 */
export function findTeamById(teamId: string): SeededTeam | null {
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

    if (matchesHome && matchesAway && liveResult.isComplete && liveResult.winnerId) {
      const winner = findTeamById(liveResult.winnerId);
      if (winner) {
        return { ...matchup, winner };
      }
    }
    return matchup;
  });
}

function updateDivisionalRound(state: BracketState, conference: Conference): BracketState {
  const confState = conference === "AFC" ? state.afc : state.nfc;
  const wildCardWinners = confState.wildCard.map((m) => m.winner);

  const { matchup1, matchup2 } = calculateDivisionalMatchups(conference, wildCardWinners);

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

function updateChampionshipRound(state: BracketState, conference: Conference): BracketState {
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
      (state.superBowl.winner.id === afcChamp?.id || state.superBowl.winner.id === nfcChamp?.id)
        ? state.superBowl.winner
        : null,
  };

  return { ...state, superBowl: updatedSuperBowl };
}

/**
 * Apply all live results to a bracket based on locked rounds
 */
export function applyAllLiveResults(state: BracketState): BracketState {
  const { liveResults, lockedRounds } = state;
  if (!liveResults) return state;

  let newState = { ...state };

  // Apply wild card results if locked
  if (lockedRounds.wildCard) {
    for (const result of liveResults.afc.wildCard) {
      if (result.isComplete && result.winnerId) {
        newState.afc = {
          ...newState.afc,
          wildCard: applyLiveResultToMatchup(newState, result, newState.afc.wildCard),
        };
      }
    }
    for (const result of liveResults.nfc.wildCard) {
      if (result.isComplete && result.winnerId) {
        newState.nfc = {
          ...newState.nfc,
          wildCard: applyLiveResultToMatchup(newState, result, newState.nfc.wildCard),
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
          divisional: applyLiveResultToMatchup(newState, result, newState.afc.divisional),
        };
      }
    }
    for (const result of liveResults.nfc.divisional) {
      if (result.isComplete && result.winnerId) {
        newState.nfc = {
          ...newState.nfc,
          divisional: applyLiveResultToMatchup(newState, result, newState.nfc.divisional),
        };
      }
    }
    newState = updateChampionshipRound(newState, "AFC");
    newState = updateChampionshipRound(newState, "NFC");
    newState = updateSuperBowl(newState);
  }

  // Apply conference championship results if locked
  if (lockedRounds.conference) {
    if (liveResults.afc.championship?.isComplete && liveResults.afc.championship.winnerId) {
      const winner = findTeamById(liveResults.afc.championship.winnerId);
      if (winner && newState.afc.championship) {
        newState.afc = {
          ...newState.afc,
          championship: { ...newState.afc.championship, winner },
        };
      }
    }
    if (liveResults.nfc.championship?.isComplete && liveResults.nfc.championship.winnerId) {
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

export function bracketReducer(state: BracketState, action: BracketAction): BracketState {
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
        return matchups.map((m) => (m.id === matchupId ? { ...m, winner: null } : m));
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
