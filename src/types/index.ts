export type Conference = "AFC" | "NFC";

export type RoundName = "wildCard" | "divisional" | "conference" | "superBowl";

export interface Team {
  id: string;
  name: string;
  city: string;
  conference: Conference;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
}

export interface SeededTeam extends Team {
  seed: number;
}

export interface Matchup {
  id: string;
  round: RoundName;
  conference: Conference | "superBowl";
  homeTeam: SeededTeam | null;
  awayTeam: SeededTeam | null;
  winner: SeededTeam | null;
  gameNumber: number;
}

export interface BracketState {
  id: string;
  name: string;
  subtitle: string | null;
  userName: string;
  afc: {
    wildCard: Matchup[];
    divisional: Matchup[];
    championship: Matchup | null;
  };
  nfc: {
    wildCard: Matchup[];
    divisional: Matchup[];
    championship: Matchup | null;
  };
  superBowl: Matchup | null;
  createdAt: number;
  updatedAt: number;
  isComplete: boolean;
  // Lock preferences for using live results vs predictions per round
  lockedRounds: RoundLockState;
  // Cached live results from ESPN
  liveResults: LiveResults | null;
}

export interface SavedBracket {
  id: string;
  name: string;
  userName: string;
  createdAt: number;
  updatedAt: number;
  state: BracketState;
}

export type BracketAction =
  | { type: "SELECT_WINNER"; matchupId: string; winner: SeededTeam }
  | { type: "CLEAR_WINNER"; matchupId: string }
  | { type: "RESET_BRACKET" }
  | { type: "LOAD_BRACKET"; bracket: BracketState }
  | { type: "SET_BRACKET_NAME"; name: string }
  | { type: "SET_USER_NAME"; userName: string }
  | { type: "SET_SUBTITLE"; subtitle: string | null }
  | { type: "TOGGLE_ROUND_LOCK"; round: RoundName }
  | { type: "SET_LIVE_RESULTS"; results: LiveResults }
  | { type: "APPLY_LIVE_RESULTS" };

// Live standings types for fetching real NFL playoff results
export interface LiveMatchupResult {
  matchupId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  winnerId: string | null;
  isComplete: boolean;
  isInProgress: boolean;
  gameDate: string | null;
  // Game clock info for in-progress games
  quarter: number | null;
  timeRemaining: string | null;
  possession: string | null; // Team ID with possession
  isRedZone: boolean;
  isHalftime: boolean;
  isEndOfQuarter: boolean;
}

export interface LiveResults {
  afc: {
    wildCard: LiveMatchupResult[];
    divisional: LiveMatchupResult[];
    championship: LiveMatchupResult | null;
  };
  nfc: {
    wildCard: LiveMatchupResult[];
    divisional: LiveMatchupResult[];
    championship: LiveMatchupResult | null;
  };
  superBowl: LiveMatchupResult | null;
  fetchedAt: number;
}

export interface RoundLockState {
  wildCard: boolean;
  divisional: boolean;
  conference: boolean;
  superBowl: boolean;
}

// Game boxscore types for detailed stats popup
export interface GameBoxscore {
  eventId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  isComplete: boolean;
  isInProgress: boolean;
  quarter: number | null;
  timeRemaining: string | null;
  teamStats: {
    home: TeamGameStats;
    away: TeamGameStats;
  };
  playerLeaders: {
    home: PlayerLeaders;
    away: PlayerLeaders;
  };
  scoringPlays: ScoringPlay[];
  drives: Drive[];
  lastPlay: string | null;
  fetchedAt: number;
}

export interface TeamGameStats {
  teamId: string;
  totalYards: number;
  passingYards: number;
  rushingYards: number;
  turnovers: number;
  timeOfPossession: string;
  firstDowns: number;
  thirdDownEfficiency: string;
  penalties: number;
  penaltyYards: number;
  sacks: number;
  interceptions: number;
  fumbles: number;
}

export interface PlayerLeaders {
  passer: PlayerStatLine | null;
  rusher: PlayerStatLine | null;
  receiver: PlayerStatLine | null;
}

export interface PlayerStatLine {
  name: string;
  position: string;
  headshot?: string;
  stats: string;
}

// Play-by-play types
export interface ScoringPlay {
  id: string;
  text: string;
  awayScore: number;
  homeScore: number;
  quarter: number;
  clock: string;
  teamId: string;
  teamAbbr: string;
  teamLogo: string;
  type: string;
}

// Drive types for expandable play-by-play
export interface Drive {
  id: string;
  teamId: string;
  teamAbbr: string;
  teamLogo: string;
  result: string; // "Touchdown", "Field Goal", "Punt", "Fumble", "Interception", "Downs", "End of Half", etc.
  description: string; // e.g., "10 plays, 75 yards, 5:23"
  startQuarter: number;
  startClock: string;
  startYardLine: string;
  endYardLine: string;
  plays: Play[];
  isScoring: boolean;
  yards: number;
  timeElapsed: string;
}

export interface Play {
  id: string;
  text: string;
  quarter: number;
  clock: string;
  down: number | null;
  distance: number | null;
  yardLine: string;
  yardsGained: number;
  isScoring: boolean;
  scoreAfter: {
    away: number;
    home: number;
  } | null;
}
