import { nanoid } from "nanoid";
import { AFC_SEEDS, NFC_SEEDS } from "@/data/teams";
import type { BracketState, Conference, Matchup, SeededTeam } from "@/types";

/**
 * NFL Playoff Rules:
 * 1. Wild Card Round: #2 vs #7, #3 vs #6, #4 vs #5 (higher seed hosts)
 * 2. Divisional Round: #1 seed (BYE) plays lowest remaining seed, other two play each other
 * 3. Conference Championship: Winners from divisional, higher seed hosts
 * 4. Super Bowl: AFC champion vs NFC champion
 */

export function createWildCardMatchups(conference: Conference): Matchup[] {
  const seeds = conference === "AFC" ? AFC_SEEDS : NFC_SEEDS;

  // Get teams by seed
  const seed2 = seeds.find((t) => t.seed === 2)!;
  const seed3 = seeds.find((t) => t.seed === 3)!;
  const seed4 = seeds.find((t) => t.seed === 4)!;
  const seed5 = seeds.find((t) => t.seed === 5)!;
  const seed6 = seeds.find((t) => t.seed === 6)!;
  const seed7 = seeds.find((t) => t.seed === 7)!;

  return [
    {
      id: `${conference}-wc-1`,
      round: "wildCard",
      conference,
      homeTeam: seed2,
      awayTeam: seed7,
      winner: null,
      gameNumber: 1,
    },
    {
      id: `${conference}-wc-2`,
      round: "wildCard",
      conference,
      homeTeam: seed3,
      awayTeam: seed6,
      winner: null,
      gameNumber: 2,
    },
    {
      id: `${conference}-wc-3`,
      round: "wildCard",
      conference,
      homeTeam: seed4,
      awayTeam: seed5,
      winner: null,
      gameNumber: 3,
    },
  ];
}

export function createDivisionalMatchups(conference: Conference): Matchup[] {
  const seeds = conference === "AFC" ? AFC_SEEDS : NFC_SEEDS;
  const byeTeam = seeds.find((t) => t.seed === 1)!;

  return [
    {
      id: `${conference}-div-1`,
      round: "divisional",
      conference,
      // #1 seed has a BYE and is pre-filled, waiting for lowest remaining seed
      homeTeam: byeTeam,
      awayTeam: null,
      winner: null,
      gameNumber: 1,
    },
    {
      id: `${conference}-div-2`,
      round: "divisional",
      conference,
      // Other two wild card winners will play here
      homeTeam: null,
      awayTeam: null,
      winner: null,
      gameNumber: 2,
    },
  ];
}

export function createChampionshipMatchup(conference: Conference): Matchup {
  return {
    id: `${conference}-champ`,
    round: "conference",
    conference,
    homeTeam: null,
    awayTeam: null,
    winner: null,
    gameNumber: 1,
  };
}

export function createSuperBowlMatchup(): Matchup {
  return {
    id: "super-bowl",
    round: "superBowl",
    conference: "superBowl",
    homeTeam: null,
    awayTeam: null,
    winner: null,
    gameNumber: 1,
  };
}

/**
 * Calculate divisional round matchups based on wild card winners
 *
 * IMPORTANT: We can ONLY determine matchups when ALL 3 wild card games are complete.
 * This is because the #1 seed plays the LOWEST remaining seed, which we can't know
 * until all games are decided.
 *
 * Rules:
 * - #1 seed (BYE) plays the lowest remaining seed (highest seed number among winners)
 * - The other two winners play each other
 * - Higher seed always hosts
 */
export function calculateDivisionalMatchups(
  conference: Conference,
  wildCardWinners: (SeededTeam | null)[],
): {
  matchup1: { home: SeededTeam; away: SeededTeam | null };
  matchup2: { home: SeededTeam | null; away: SeededTeam | null };
} {
  const seeds = conference === "AFC" ? AFC_SEEDS : NFC_SEEDS;
  const byeTeam = seeds.find((t) => t.seed === 1)!;

  // Filter out null winners
  const winners = wildCardWinners.filter((w): w is SeededTeam => w !== null);

  // If not all 3 wild card games are decided, we can't determine matchups yet
  // #1 seed is always shown but opponent is TBD
  if (winners.length < 3) {
    return {
      matchup1: { home: byeTeam, away: null },
      matchup2: { home: null, away: null },
    };
  }

  // All 3 wild card games decided - now we can calculate proper matchups
  // Sort by seed (highest seed number = lowest seed = plays #1)
  const sorted = [...winners].sort((a, b) => b.seed - a.seed);
  const lowestSeed = sorted[0]; // Highest seed number - plays #1
  const middleSeed = sorted[1];
  const highestSeed = sorted[2]; // Lowest seed number - hosts other game

  // #1 plays lowest remaining seed
  // Other two play each other, higher seed (lower number) hosts
  return {
    matchup1: { home: byeTeam, away: lowestSeed },
    matchup2: { home: highestSeed, away: middleSeed },
  };
}

/**
 * Calculate conference championship matchup
 * Higher seed hosts
 */
export function calculateChampionshipMatchup(
  divisionalWinners: (SeededTeam | null)[],
): { home: SeededTeam | null; away: SeededTeam | null } {
  const winners = divisionalWinners.filter((w): w is SeededTeam => w !== null);

  if (winners.length < 2) {
    return { home: winners[0] || null, away: null };
  }

  // Sort by seed - lower seed number is higher seed
  const sorted = [...winners].sort((a, b) => a.seed - b.seed);
  return { home: sorted[0], away: sorted[1] };
}

/**
 * Create initial bracket state
 */
export function createInitialBracket(userName: string): BracketState {
  return {
    id: nanoid(),
    name: "",
    userName,
    afc: {
      wildCard: createWildCardMatchups("AFC"),
      divisional: createDivisionalMatchups("AFC"),
      championship: createChampionshipMatchup("AFC"),
    },
    nfc: {
      wildCard: createWildCardMatchups("NFC"),
      divisional: createDivisionalMatchups("NFC"),
      championship: createChampionshipMatchup("NFC"),
    },
    superBowl: createSuperBowlMatchup(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isComplete: false,
  };
}

/**
 * Check if bracket is complete (all winners selected)
 */
export function isBracketComplete(bracket: BracketState): boolean {
  const afcWildCardComplete = bracket.afc.wildCard.every(
    (m) => m.winner !== null,
  );
  const afcDivisionalComplete = bracket.afc.divisional.every(
    (m) => m.winner !== null,
  );
  const afcChampionshipComplete = bracket.afc.championship?.winner !== null;

  const nfcWildCardComplete = bracket.nfc.wildCard.every(
    (m) => m.winner !== null,
  );
  const nfcDivisionalComplete = bracket.nfc.divisional.every(
    (m) => m.winner !== null,
  );
  const nfcChampionshipComplete = bracket.nfc.championship?.winner !== null;

  const superBowlComplete = bracket.superBowl?.winner !== null;

  return (
    afcWildCardComplete &&
    afcDivisionalComplete &&
    afcChampionshipComplete &&
    nfcWildCardComplete &&
    nfcDivisionalComplete &&
    nfcChampionshipComplete &&
    superBowlComplete
  );
}
