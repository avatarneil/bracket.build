export const METRICS = {
  points: "points scored",
  rushingYards: "rushing yards",
  netPassingYards: "net passing yards",
  totalYards: "total yards",
  interceptionsMade: "interceptions made",
  interceptionsThrown: "interceptions thrown",
  sacksMade: "sacks made",
  penalties: "penalties",
  penaltyYards: "penalty yards",
  fumblesLost: "fumbles lost",
  pointsAllowed: "points allowed",
  passingTouchdowns: "passing touchdowns",
  rushingTouchdowns: "rushing touchdowns",
  fieldGoals: "field goals made",
  punts: "punts",
  puntYards: "punt yards",
  passingAttempts: "passing attempts",
  completions: "completed passes",
  rushingAttempts: "rushing attempts",
  takeaways: "takeaways",
} as const;

export type Metric = keyof typeof METRICS;
export type Measurements = Record<Metric, number | null>;
export type Phase = "REG" | "POST";
export type Location = "home" | "away" | "neutral";

export interface TeamGame {
  gameId: string;
  eventId: string | null;
  season: number;
  date: string; // NFL schedule date in America/New_York, not the UTC date.
  phase: Phase;
  team: string; // Stable franchise abbreviation, including relocated teams.
  opponent: string;
  location: Location;
  metrics: Measurements;
}

export interface GameContext {
  eventId: string;
  status: "pre" | "live" | "final";
  fetchedAt: number;
  teams: [TeamGame, TeamGame];
}

export interface Receipt {
  gameId: string;
  eventId: string | null;
  date: string;
  opponent: string;
  location: Location;
  value: number;
}

export interface RidiculousFact {
  id: string;
  text: string;
  kind: "record" | "since" | "history";
  metric: Metric;
  metricLabel: string;
  value: number;
  team: string;
  filters: string[];
  sampleSize: number;
  coverageStart: string;
  cutoff: string;
  receipts: Receipt[];
}

export interface RidiculousResponse {
  eventId: string;
  fact: RidiculousFact | null;
  count: number;
  index: number;
  live: boolean;
  asOf: number;
  message?: string;
}

export function emptyMeasurements(): Measurements {
  return Object.fromEntries(Object.keys(METRICS).map((key) => [key, null])) as Measurements;
}

export function nflDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function displayDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00Z`));
}
