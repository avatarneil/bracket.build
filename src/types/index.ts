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
  | { type: "SET_SUBTITLE"; subtitle: string | null };
