import type { LiveMatchupResult, LiveResults, RoundName } from "@/types";

// ESPN API endpoint for NFL playoff scoreboard
const ESPN_SCOREBOARD_URL =
  "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";

// Map ESPN team abbreviations to our team IDs
// ESPN uses mostly the same abbreviations, but some differ
const ESPN_TO_TEAM_ID: Record<string, string> = {
  DEN: "DEN",
  NE: "NE",
  JAX: "JAX",
  PIT: "PIT",
  HOU: "HOU",
  BUF: "BUF",
  LAC: "LAC",
  SEA: "SEA",
  CHI: "CHI",
  PHI: "PHI",
  CAR: "CAR",
  LA: "LAR", // ESPN uses "LA" for Rams
  LAR: "LAR",
  SF: "SF",
  GB: "GB",
  // Additional NFL teams that might appear
  KC: "KC",
  BAL: "BAL",
  CIN: "CIN",
  MIA: "MIA",
  CLE: "CLE",
  LV: "LV",
  TEN: "TEN",
  IND: "IND",
  NYJ: "NYJ",
  DAL: "DAL",
  DET: "DET",
  MIN: "MIN",
  TB: "TB",
  NO: "NO",
  ATL: "ATL",
  ARI: "ARI",
  WAS: "WAS",
  NYG: "NYG",
};

// ESPN playoff week to round name mapping
// Wild Card = week 1 of playoffs (seasontype=3)
// Divisional = week 2
// Conference = week 3
// Super Bowl = week 4
function getPlayoffRound(week: number): RoundName | null {
  switch (week) {
    case 1:
      return "wildCard";
    case 2:
      return "divisional";
    case 3:
      return "conference";
    case 4:
    case 5: // Super Bowl can be week 4 or 5 depending on year
      return "superBowl";
    default:
      return null;
  }
}

// ESPN API response types (simplified, only what we need)
interface ESPNTeam {
  id: string;
  abbreviation: string;
  displayName: string;
  shortDisplayName: string;
}

interface ESPNCompetitor {
  id: string;
  homeAway: "home" | "away";
  score: string;
  winner?: boolean;
  team: ESPNTeam;
}

interface ESPNCompetition {
  id: string;
  date: string;
  competitors: ESPNCompetitor[];
  status: {
    clock: number; // Seconds remaining in the period
    displayClock: string; // Formatted time (e.g., "5:23")
    period: number; // Quarter (1-4, or 5+ for OT)
    type: {
      id: string;
      name: string;
      state: "pre" | "in" | "post";
      completed: boolean;
      description?: string; // e.g., "Halftime", "End of 1st Quarter"
      detail?: string; // e.g., "3rd - 5:23"
      shortDetail?: string; // e.g., "3rd - 5:23"
    };
  };
  situation?: {
    possession?: string; // Team ID with possession
    isRedZone?: boolean;
    downDistanceText?: string; // e.g., "1st & 10"
  };
  conferenceCompetition?: boolean;
}

interface ESPNEvent {
  id: string;
  name: string;
  shortName: string;
  date: string;
  week: {
    number: number;
  };
  competitions: ESPNCompetition[];
}

interface ESPNScoreboardResponse {
  events: ESPNEvent[];
  week?: {
    number: number;
  };
}

function mapTeamAbbreviation(espnAbbr: string): string {
  return ESPN_TO_TEAM_ID[espnAbbr.toUpperCase()] || espnAbbr.toUpperCase();
}

function determineConference(
  homeTeamId: string,
  awayTeamId: string,
): "AFC" | "NFC" | "superBowl" {
  // AFC teams in our current data
  const afcTeams = ["DEN", "NE", "JAX", "PIT", "HOU", "BUF", "LAC", "KC", "BAL", "CIN", "MIA", "CLE", "LV", "TEN", "IND", "NYJ"];
  // NFC teams in our current data
  const nfcTeams = ["SEA", "CHI", "PHI", "CAR", "LAR", "SF", "GB", "DAL", "DET", "MIN", "TB", "NO", "ATL", "ARI", "WAS", "NYG"];

  const homeIsAFC = afcTeams.includes(homeTeamId);
  const awayIsAFC = afcTeams.includes(awayTeamId);
  const homeIsNFC = nfcTeams.includes(homeTeamId);
  const awayIsNFC = nfcTeams.includes(awayTeamId);

  // Super Bowl: one team from each conference
  if ((homeIsAFC && awayIsNFC) || (homeIsNFC && awayIsAFC)) {
    return "superBowl";
  }

  // Both teams from same conference
  if (homeIsAFC || awayIsAFC) {
    return "AFC";
  }

  return "NFC";
}

function parseESPNEvent(event: ESPNEvent): LiveMatchupResult | null {
  const competition = event.competitions[0];
  if (!competition) return null;

  const homeCompetitor = competition.competitors.find(
    (c) => c.homeAway === "home",
  );
  const awayCompetitor = competition.competitors.find(
    (c) => c.homeAway === "away",
  );

  if (!homeCompetitor || !awayCompetitor) return null;

  const homeTeamId = mapTeamAbbreviation(homeCompetitor.team.abbreviation);
  const awayTeamId = mapTeamAbbreviation(awayCompetitor.team.abbreviation);
  const homeScore = Number.parseInt(homeCompetitor.score, 10) || null;
  const awayScore = Number.parseInt(awayCompetitor.score, 10) || null;

  const status = competition.status;
  const statusType = status.type;
  const isComplete = statusType.completed;
  const isInProgress = statusType.state === "in";

  // Determine winner
  let winnerId: string | null = null;
  if (isComplete) {
    if (homeCompetitor.winner) {
      winnerId = homeTeamId;
    } else if (awayCompetitor.winner) {
      winnerId = awayTeamId;
    } else if (homeScore !== null && awayScore !== null) {
      // Fallback: determine winner by score
      winnerId = homeScore > awayScore ? homeTeamId : awayTeamId;
    }
  }

  // Create matchup ID based on conference and round
  const round = getPlayoffRound(event.week.number);
  const conference = determineConference(homeTeamId, awayTeamId);

  // Generate a consistent matchup ID
  // This needs to match the format used in playoff-rules.ts
  const matchupId = `${conference.toLowerCase()}-${round}-${event.id}`;

  // Extract game clock information for in-progress games
  const quarter = isInProgress ? status.period : null;
  const timeRemaining = isInProgress ? status.displayClock : null;
  
  // Check for special game states
  const description = statusType.description?.toLowerCase() || "";
  const isHalftime = description.includes("halftime");
  const isEndOfQuarter = description.includes("end of");
  
  // Get possession info
  const possessionTeamId = competition.situation?.possession 
    ? mapTeamAbbreviation(competition.situation.possession)
    : null;
  const isRedZone = competition.situation?.isRedZone ?? false;

  return {
    matchupId,
    homeTeamId,
    awayTeamId,
    homeScore,
    awayScore,
    winnerId,
    isComplete,
    isInProgress,
    gameDate: competition.date,
    quarter,
    timeRemaining,
    possession: possessionTeamId,
    isRedZone,
    isHalftime,
    isEndOfQuarter,
  };
}

export async function fetchPlayoffScoreboard(
  week?: number,
): Promise<ESPNScoreboardResponse> {
  const params = new URLSearchParams({
    seasontype: "3", // Playoffs
  });

  if (week) {
    params.set("week", week.toString());
  }

  const response = await fetch(`${ESPN_SCOREBOARD_URL}?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`ESPN API error: ${response.status}`);
  }

  return response.json();
}

export async function fetchAllPlayoffWeeks(): Promise<ESPNScoreboardResponse[]> {
  // Fetch all playoff weeks (1-4)
  const weeks = [1, 2, 3, 4];
  const results = await Promise.all(
    weeks.map((week) => fetchPlayoffScoreboard(week).catch(() => null)),
  );
  return results.filter((r): r is ESPNScoreboardResponse => r !== null);
}

export function parsePlayoffResults(
  responses: ESPNScoreboardResponse[],
): LiveResults {
  const results: LiveResults = {
    afc: {
      wildCard: [],
      divisional: [],
      championship: null,
    },
    nfc: {
      wildCard: [],
      divisional: [],
      championship: null,
    },
    superBowl: null,
    fetchedAt: Date.now(),
  };

  for (const response of responses) {
    for (const event of response.events) {
      const matchup = parseESPNEvent(event);
      if (!matchup) continue;

      const round = getPlayoffRound(event.week.number);
      if (!round) continue;

      const conference = determineConference(matchup.homeTeamId, matchup.awayTeamId);

      if (round === "wildCard") {
        if (conference === "AFC") {
          results.afc.wildCard.push(matchup);
        } else if (conference === "NFC") {
          results.nfc.wildCard.push(matchup);
        }
      } else if (round === "divisional") {
        if (conference === "AFC") {
          results.afc.divisional.push(matchup);
        } else if (conference === "NFC") {
          results.nfc.divisional.push(matchup);
        }
      } else if (round === "conference") {
        if (conference === "AFC") {
          results.afc.championship = matchup;
        } else if (conference === "NFC") {
          results.nfc.championship = matchup;
        }
      } else if (round === "superBowl") {
        results.superBowl = matchup;
      }
    }
  }

  return results;
}

export async function fetchLiveResults(): Promise<LiveResults> {
  const responses = await fetchAllPlayoffWeeks();
  return parsePlayoffResults(responses);
}

/**
 * Check if there are any in-progress games
 */
export function hasInProgressGames(liveResults: LiveResults | null): boolean {
  if (!liveResults) return false;

  const allMatchups = [
    ...liveResults.afc.wildCard,
    ...liveResults.nfc.wildCard,
    ...liveResults.afc.divisional,
    ...liveResults.nfc.divisional,
    liveResults.afc.championship,
    liveResults.nfc.championship,
    liveResults.superBowl,
  ].filter(Boolean) as LiveMatchupResult[];

  return allMatchups.some((m) => m.isInProgress);
}

/**
 * Check if a specific round has any completed games
 */
export function hasCompletedGames(
  liveResults: LiveResults | null,
  round: RoundName,
): boolean {
  if (!liveResults) return false;

  switch (round) {
    case "wildCard":
      return (
        liveResults.afc.wildCard.some((m) => m.isComplete) ||
        liveResults.nfc.wildCard.some((m) => m.isComplete)
      );
    case "divisional":
      return (
        liveResults.afc.divisional.some((m) => m.isComplete) ||
        liveResults.nfc.divisional.some((m) => m.isComplete)
      );
    case "conference":
      return (
        (liveResults.afc.championship?.isComplete ?? false) ||
        (liveResults.nfc.championship?.isComplete ?? false)
      );
    case "superBowl":
      return liveResults.superBowl?.isComplete ?? false;
  }
}

/**
 * Check if all games in a round are complete
 */
export function isRoundComplete(
  liveResults: LiveResults | null,
  round: RoundName,
): boolean {
  if (!liveResults) return false;

  switch (round) {
    case "wildCard":
      // 6 wild card games total (3 per conference)
      const wcGames = [
        ...liveResults.afc.wildCard,
        ...liveResults.nfc.wildCard,
      ];
      return wcGames.length >= 6 && wcGames.every((m) => m.isComplete);
    case "divisional":
      // 4 divisional games total (2 per conference)
      const divGames = [
        ...liveResults.afc.divisional,
        ...liveResults.nfc.divisional,
      ];
      return divGames.length >= 4 && divGames.every((m) => m.isComplete);
    case "conference":
      return (
        (liveResults.afc.championship?.isComplete ?? false) &&
        (liveResults.nfc.championship?.isComplete ?? false)
      );
    case "superBowl":
      return liveResults.superBowl?.isComplete ?? false;
  }
}

/**
 * Get the live result for a specific matchup by matching teams
 */
export function findLiveResultForMatchup(
  liveResults: LiveResults | null,
  homeTeamId: string | null,
  awayTeamId: string | null,
  round: RoundName,
  conference: "AFC" | "NFC" | "superBowl",
): LiveMatchupResult | null {
  if (!liveResults || !homeTeamId || !awayTeamId) return null;

  let searchResults: LiveMatchupResult[] = [];

  if (round === "superBowl" && liveResults.superBowl) {
    searchResults = [liveResults.superBowl];
  } else if (round === "conference") {
    const champ =
      conference === "AFC"
        ? liveResults.afc.championship
        : liveResults.nfc.championship;
    if (champ) searchResults = [champ];
  } else if (round === "divisional") {
    searchResults =
      conference === "AFC"
        ? liveResults.afc.divisional
        : liveResults.nfc.divisional;
  } else if (round === "wildCard") {
    searchResults =
      conference === "AFC"
        ? liveResults.afc.wildCard
        : liveResults.nfc.wildCard;
  }

  // Find by matching both teams (order might differ)
  return (
    searchResults.find(
      (r) =>
        (r.homeTeamId === homeTeamId && r.awayTeamId === awayTeamId) ||
        (r.homeTeamId === awayTeamId && r.awayTeamId === homeTeamId),
    ) ?? null
  );
}
