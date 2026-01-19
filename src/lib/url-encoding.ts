import type { BracketState, Matchup } from "@/types";
import { createInitialBracket } from "./playoff-rules";

/**
 * URL Encoding for Bracket State
 *
 * Encoding scheme:
 * - 13 matchups × 2 bits each = 26 bits
 * - Values: 0 = no pick, 1 = home team wins, 2 = away team wins
 * - Packed into 4 bytes, base64url encoded (~6 chars)
 *
 * Matchup order:
 * 0-2:   AFC Wild Card (wc-1, wc-2, wc-3)
 * 3-5:   NFC Wild Card (wc-1, wc-2, wc-3)
 * 6-7:   AFC Divisional (div-1, div-2)
 * 8-9:   NFC Divisional (div-1, div-2)
 * 10:    AFC Championship
 * 11:    NFC Championship
 * 12:    Super Bowl
 */

type WinnerCode = 0 | 1 | 2;

/**
 * Get winner code for a matchup
 * 0 = no pick, 1 = home team, 2 = away team
 */
function getWinnerCode(matchup: Matchup | null): WinnerCode {
  if (!matchup || !matchup.winner) return 0;
  if (matchup.homeTeam && matchup.winner.id === matchup.homeTeam.id) return 1;
  if (matchup.awayTeam && matchup.winner.id === matchup.awayTeam.id) return 2;
  return 0;
}

/**
 * Get all matchups in consistent order for encoding
 */
function getAllMatchupsOrdered(bracket: BracketState): (Matchup | null)[] {
  return [
    // AFC Wild Card (indices 0-2)
    bracket.afc.wildCard[0],
    bracket.afc.wildCard[1],
    bracket.afc.wildCard[2],
    // NFC Wild Card (indices 3-5)
    bracket.nfc.wildCard[0],
    bracket.nfc.wildCard[1],
    bracket.nfc.wildCard[2],
    // AFC Divisional (indices 6-7)
    bracket.afc.divisional[0],
    bracket.afc.divisional[1],
    // NFC Divisional (indices 8-9)
    bracket.nfc.divisional[0],
    bracket.nfc.divisional[1],
    // Championships (indices 10-11)
    bracket.afc.championship,
    bracket.nfc.championship,
    // Super Bowl (index 12)
    bracket.superBowl,
  ];
}

/**
 * Encode bracket picks to a compact string
 * Returns base64url-encoded string (~6 chars)
 */
export function encodeBracketPicks(bracket: BracketState): string {
  const matchups = getAllMatchupsOrdered(bracket);
  const codes = matchups.map(getWinnerCode);

  // Pack 13 2-bit values into 4 bytes (26 bits, padded to 32)
  // Layout: [m0 m1 m2 m3] [m4 m5 m6 m7] [m8 m9 m10 m11] [m12 _ _ _]
  let packed = 0;
  for (let i = 0; i < codes.length; i++) {
    packed |= codes[i] << (i * 2);
  }

  // Convert to 4 bytes
  const bytes = new Uint8Array(4);
  bytes[0] = (packed >> 0) & 0xff;
  bytes[1] = (packed >> 8) & 0xff;
  bytes[2] = (packed >> 16) & 0xff;
  bytes[3] = (packed >> 24) & 0xff;

  // Base64url encode (URL-safe, no padding)
  const base64 = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return base64;
}

/**
 * Decode a base64url string back to winner codes
 * Returns array of 13 winner codes
 */
export function decodeBracketPicks(encoded: string): WinnerCode[] {
  // Restore base64 padding if needed
  let base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }

  // Decode base64 to bytes
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  // Unpack 4 bytes into 32-bit value
  const packed = bytes[0] | (bytes[1] << 8) | (bytes[2] << 16) | (bytes[3] << 24);

  // Extract 13 2-bit values
  const codes: WinnerCode[] = [];
  for (let i = 0; i < 13; i++) {
    const code = (packed >> (i * 2)) & 0x03;
    codes.push(code as WinnerCode);
  }

  return codes;
}

/**
 * Apply decoded picks to a fresh bracket
 * Returns a new BracketState with the picks applied
 */
export function applyPicksToFreshBracket(codes: WinnerCode[], userName: string): BracketState {
  const bracket = createInitialBracket(userName);

  // Helper to apply a winner code to a matchup
  const applyCode = (matchup: Matchup, code: WinnerCode): Matchup => {
    if (code === 0) return matchup;
    const winner = code === 1 ? matchup.homeTeam : matchup.awayTeam;
    return { ...matchup, winner };
  };

  // Apply wild card picks (these don't depend on prior rounds)
  bracket.afc.wildCard = [
    applyCode(bracket.afc.wildCard[0], codes[0]),
    applyCode(bracket.afc.wildCard[1], codes[1]),
    applyCode(bracket.afc.wildCard[2], codes[2]),
  ];
  bracket.nfc.wildCard = [
    applyCode(bracket.nfc.wildCard[0], codes[3]),
    applyCode(bracket.nfc.wildCard[1], codes[4]),
    applyCode(bracket.nfc.wildCard[2], codes[5]),
  ];

  // Calculate and apply divisional picks
  // For divisional, we need to calculate the matchups based on wild card winners
  // then apply the picks
  const afcWcWinners = bracket.afc.wildCard.map((m) => m.winner);
  const nfcWcWinners = bracket.nfc.wildCard.map((m) => m.winner);

  // Import the calculation function dynamically to avoid circular deps
  const { calculateDivisionalMatchups, calculateChampionshipMatchup } = require("./playoff-rules");

  // Update AFC divisional matchups
  const afcDiv = calculateDivisionalMatchups("AFC", afcWcWinners);
  bracket.afc.divisional[0] = {
    ...bracket.afc.divisional[0],
    homeTeam: afcDiv.matchup1.home,
    awayTeam: afcDiv.matchup1.away,
  };
  bracket.afc.divisional[1] = {
    ...bracket.afc.divisional[1],
    homeTeam: afcDiv.matchup2.home,
    awayTeam: afcDiv.matchup2.away,
  };

  // Apply AFC divisional picks
  bracket.afc.divisional = [
    applyCode(bracket.afc.divisional[0], codes[6]),
    applyCode(bracket.afc.divisional[1], codes[7]),
  ];

  // Update NFC divisional matchups
  const nfcDiv = calculateDivisionalMatchups("NFC", nfcWcWinners);
  bracket.nfc.divisional[0] = {
    ...bracket.nfc.divisional[0],
    homeTeam: nfcDiv.matchup1.home,
    awayTeam: nfcDiv.matchup1.away,
  };
  bracket.nfc.divisional[1] = {
    ...bracket.nfc.divisional[1],
    homeTeam: nfcDiv.matchup2.home,
    awayTeam: nfcDiv.matchup2.away,
  };

  // Apply NFC divisional picks
  bracket.nfc.divisional = [
    applyCode(bracket.nfc.divisional[0], codes[8]),
    applyCode(bracket.nfc.divisional[1], codes[9]),
  ];

  // Update and apply AFC championship
  const afcDivWinners = bracket.afc.divisional.map((m) => m.winner);
  const afcChamp = calculateChampionshipMatchup(afcDivWinners);
  bracket.afc.championship = {
    ...bracket.afc.championship!,
    homeTeam: afcChamp.home,
    awayTeam: afcChamp.away,
  };
  bracket.afc.championship = applyCode(bracket.afc.championship, codes[10]);

  // Update and apply NFC championship
  const nfcDivWinners = bracket.nfc.divisional.map((m) => m.winner);
  const nfcChamp = calculateChampionshipMatchup(nfcDivWinners);
  bracket.nfc.championship = {
    ...bracket.nfc.championship!,
    homeTeam: nfcChamp.home,
    awayTeam: nfcChamp.away,
  };
  bracket.nfc.championship = applyCode(bracket.nfc.championship, codes[11]);

  // Update and apply Super Bowl
  const afcChampWinner = bracket.afc.championship.winner;
  const nfcChampWinner = bracket.nfc.championship.winner;
  bracket.superBowl = {
    ...bracket.superBowl!,
    homeTeam: afcChampWinner,
    awayTeam: nfcChampWinner,
  };
  bracket.superBowl = applyCode(bracket.superBowl, codes[12]);

  // Update completion status
  const { isBracketComplete } = require("./playoff-rules");
  bracket.isComplete = isBracketComplete(bracket);

  return bracket;
}

/**
 * Generate a shareable URL for the current bracket
 */
export function generateShareableUrl(bracket: BracketState): string {
  const encoded = encodeBracketPicks(bracket);
  const params = new URLSearchParams();
  params.set("b", encoded);

  if (bracket.userName) {
    params.set("name", bracket.userName);
  }

  // Use current origin for full URL
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/?${params.toString()}`;
}

/**
 * Parse URL search params for bracket data
 */
export function parseUrlParams(searchParams: URLSearchParams): {
  encodedBracket: string | null;
  userName: string | null;
  viewMode: "bracket" | "live" | null;
} {
  return {
    encodedBracket: searchParams.get("b"),
    userName: searchParams.get("name"),
    viewMode: searchParams.get("view") === "live" ? "live" : null,
  };
}
