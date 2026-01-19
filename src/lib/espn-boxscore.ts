import type {
  Drive,
  GameBoxscore,
  Play,
  PlayerLeaders,
  PlayerStatLine,
  ScoringPlay,
  TeamGameStats,
} from "@/types";

// ESPN Summary API endpoint
const ESPN_SUMMARY_URL = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary";

// Map ESPN team abbreviations to our team IDs
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
  LA: "LAR",
  LAR: "LAR",
  SF: "SF",
  GB: "GB",
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
  WSH: "WAS",
  NYG: "NYG",
};

function mapTeamAbbreviation(espnAbbr: string): string {
  return ESPN_TO_TEAM_ID[espnAbbr.toUpperCase()] || espnAbbr.toUpperCase();
}

// ESPN API response types for summary endpoint
interface ESPNSummaryResponse {
  boxscore?: {
    teams?: ESPNBoxscoreTeam[];
    players?: ESPNBoxscorePlayers[];
  };
  header?: {
    competitions?: ESPNCompetitionHeader[];
  };
  drives?: {
    current?: {
      description?: string;
    };
    previous?: ESPNDrive[];
  };
  leaders?: ESPNTeamLeaders[];
  scoringPlays?: ESPNScoringPlay[];
}

// ESPN drive and play types
interface ESPNDrive {
  id: string;
  description: string;
  team: {
    id: string;
    abbreviation: string;
    displayName: string;
    logo: string;
  };
  start: {
    period: {
      number: number;
    };
    clock: {
      displayValue: string;
    };
    yardLine: number;
    text: string;
  };
  end?: {
    period?: {
      number: number;
    };
    clock?: {
      displayValue: string;
    };
    yardLine?: number;
    text?: string;
  };
  timeElapsed: {
    displayValue: string;
  };
  yards: number;
  isScore: boolean;
  offensivePlays: number;
  result: string;
  shortDisplayResult: string;
  displayResult: string;
  plays: ESPNPlay[];
}

interface ESPNPlay {
  id: string;
  type: {
    id: string;
    text: string;
    abbreviation?: string;
  };
  text: string;
  awayScore: number;
  homeScore: number;
  period: {
    number: number;
  };
  clock: {
    displayValue: string;
  };
  scoringPlay: boolean;
  start: {
    down: number;
    distance: number;
    yardLine: number;
    yardsToEndzone: number;
    team?: {
      id: string;
    };
  };
  end?: {
    down: number;
    distance: number;
    yardLine: number;
    yardsToEndzone: number;
  };
  statYardage?: number;
}

interface ESPNScoringPlay {
  id: string;
  type: {
    text: string;
    abbreviation: string;
  };
  text: string;
  awayScore: number;
  homeScore: number;
  period: {
    number: number;
  };
  clock: {
    displayValue: string;
  };
  team: {
    id: string;
    abbreviation: string;
    displayName: string;
    logo: string;
  };
}

interface ESPNBoxscoreTeam {
  team: {
    id: string;
    abbreviation: string;
    displayName: string;
  };
  statistics: ESPNStatistic[];
  homeAway: "home" | "away";
}

interface ESPNStatistic {
  name: string;
  displayValue: string;
  label?: string;
}

interface ESPNBoxscorePlayers {
  team: {
    id: string;
    abbreviation: string;
  };
  statistics: ESPNPlayerStatCategory[];
}

interface ESPNPlayerStatCategory {
  name: string;
  keys: string[];
  labels: string[];
  descriptions: string[];
  athletes: ESPNAthlete[];
}

interface ESPNAthlete {
  athlete: {
    id: string;
    displayName: string;
    shortName: string;
    headshot?: {
      href: string;
    };
    position?: {
      abbreviation: string;
    };
  };
  stats: string[];
}

interface ESPNCompetitionHeader {
  competitors: ESPNCompetitorHeader[];
  status: {
    type: {
      state: "pre" | "in" | "post";
      completed: boolean;
    };
    period: number;
    displayClock: string;
  };
}

interface ESPNCompetitorHeader {
  id: string;
  homeAway: "home" | "away";
  team: {
    abbreviation: string;
  };
  score: string;
}

// ESPN leaders structure: array of team leader objects
interface ESPNTeamLeaders {
  team: {
    id: string;
    abbreviation: string;
    displayName: string;
  };
  leaders: ESPNLeaderCategory[];
}

interface ESPNLeaderCategory {
  name: string;
  displayName: string;
  leaders: ESPNLeaderEntry[];
}

interface ESPNLeaderEntry {
  displayValue: string;
  athlete: {
    displayName: string;
    shortName: string;
    headshot?: {
      href: string;
    };
    position?: {
      abbreviation: string;
    };
  };
}

function parseTeamStats(team: ESPNBoxscoreTeam): TeamGameStats {
  const stats = team.statistics;
  const getStat = (name: string): string => {
    const stat = stats.find((s) => s.name === name);
    return stat?.displayValue || "0";
  };

  // Parse yards (format: "XXX-YYY" for attempts-yards, or just "YYY")
  const parseYards = (value: string): number => {
    if (value.includes("-")) {
      const parts = value.split("-");
      return Number.parseInt(parts[1], 10) || 0;
    }
    return Number.parseInt(value, 10) || 0;
  };

  // Parse time of possession (format: "MM:SS")
  const timeOfPossession = getStat("possessionTime") || "0:00";

  // Parse third down efficiency
  const thirdDowns = getStat("thirdDownEff") || "0-0";

  return {
    teamId: mapTeamAbbreviation(team.team.abbreviation),
    totalYards: Number.parseInt(getStat("totalYards"), 10) || 0,
    passingYards: parseYards(getStat("netPassingYards") || getStat("passingYards")),
    rushingYards: parseYards(getStat("rushingYards")),
    turnovers: Number.parseInt(getStat("turnovers"), 10) || 0,
    timeOfPossession,
    firstDowns: Number.parseInt(getStat("firstDowns"), 10) || 0,
    thirdDownEfficiency: thirdDowns,
    penalties: Number.parseInt(getStat("totalPenaltiesYards")?.split("-")[0] || "0", 10),
    penaltyYards: Number.parseInt(getStat("totalPenaltiesYards")?.split("-")[1] || "0", 10),
    sacks: Number.parseInt(getStat("sacks")?.split("-")[0] || "0", 10),
    interceptions: Number.parseInt(getStat("interceptions"), 10) || 0,
    fumbles: Number.parseInt(getStat("fumblesLost"), 10) || 0,
  };
}

function parsePlayerLeaders(
  leaders: ESPNTeamLeaders[] | undefined,
  teamAbbr: string,
): PlayerLeaders {
  const result: PlayerLeaders = {
    passer: null,
    rusher: null,
    receiver: null,
  };

  if (!leaders || !Array.isArray(leaders)) return result;

  const mappedTeamId = mapTeamAbbreviation(teamAbbr);

  // Find the team's leaders object
  const teamLeaders = leaders.find(
    (tl) => tl.team?.abbreviation && mapTeamAbbreviation(tl.team.abbreviation) === mappedTeamId,
  );

  if (!teamLeaders || !teamLeaders.leaders) return result;

  // Iterate through leader categories for this team
  for (const category of teamLeaders.leaders) {
    if (!category.leaders || category.leaders.length === 0) continue;

    const topLeader = category.leaders[0];
    if (!topLeader || !topLeader.athlete) continue;

    const statLine: PlayerStatLine = {
      name: topLeader.athlete.shortName || topLeader.athlete.displayName || "Unknown",
      position: topLeader.athlete.position?.abbreviation || "",
      headshot: topLeader.athlete.headshot?.href,
      stats: topLeader.displayValue || "",
    };

    if (category.name === "passingYards" || category.name === "passingLeader") {
      result.passer = statLine;
    } else if (category.name === "rushingYards" || category.name === "rushingLeader") {
      result.rusher = statLine;
    } else if (category.name === "receivingYards" || category.name === "receivingLeader") {
      result.receiver = statLine;
    }
  }

  return result;
}

function parseScoringPlays(plays: ESPNScoringPlay[] | undefined): ScoringPlay[] {
  if (!plays || !Array.isArray(plays)) return [];

  return plays.map((play) => ({
    id: play.id || "",
    text: play.text || "",
    awayScore: play.awayScore || 0,
    homeScore: play.homeScore || 0,
    quarter: play.period?.number || 0,
    clock: play.clock?.displayValue || "",
    teamId: play.team?.id || "",
    teamAbbr: play.team?.abbreviation ? mapTeamAbbreviation(play.team.abbreviation) : "",
    teamLogo: play.team?.logo || "",
    type: play.type?.abbreviation || play.type?.text || "",
  }));
}

function parseDrives(drives: ESPNDrive[] | undefined): Drive[] {
  if (!drives || !Array.isArray(drives)) return [];

  return drives.map((drive) => ({
    id: drive.id || "",
    teamId: drive.team?.id || "",
    teamAbbr: drive.team?.abbreviation ? mapTeamAbbreviation(drive.team.abbreviation) : "",
    teamLogo: drive.team?.logo || "",
    result: drive.displayResult || drive.result || "",
    description: drive.description || "",
    startQuarter: drive.start?.period?.number || 0,
    startClock: drive.start?.clock?.displayValue || "",
    startYardLine: drive.start?.text || "",
    endYardLine: drive.end?.text || "",
    plays: parsePlays(drive.plays),
    isScoring: drive.isScore || false,
    yards: drive.yards || 0,
    timeElapsed: drive.timeElapsed?.displayValue || "",
  }));
}

function parsePlays(plays: ESPNPlay[] | undefined): Play[] {
  if (!plays || !Array.isArray(plays)) return [];

  return plays.map((play) => ({
    id: play.id || "",
    text: play.text || "",
    quarter: play.period?.number || 0,
    clock: play.clock?.displayValue || "",
    down: play.start?.down || null,
    distance: play.start?.distance || null,
    yardLine: play.start?.yardLine?.toString() || "",
    yardsGained: play.statYardage || 0,
    isScoring: play.scoringPlay || false,
    scoreAfter: play.scoringPlay ? { away: play.awayScore || 0, home: play.homeScore || 0 } : null,
  }));
}

export async function fetchGameBoxscore(eventId: string): Promise<GameBoxscore> {
  const response = await fetch(`${ESPN_SUMMARY_URL}?event=${eventId}`);

  if (!response.ok) {
    throw new Error(`ESPN API error: ${response.status}`);
  }

  const data: ESPNSummaryResponse = await response.json();

  // Get competition header for scores and status
  const competition = data.header?.competitions?.[0];
  if (!competition) {
    throw new Error("No competition data found");
  }

  const homeCompetitor = competition.competitors.find((c) => c.homeAway === "home");
  const awayCompetitor = competition.competitors.find((c) => c.homeAway === "away");

  if (!homeCompetitor || !awayCompetitor) {
    throw new Error("Missing competitor data");
  }

  // Get boxscore team stats
  const boxscoreTeams = data.boxscore?.teams || [];
  const homeBoxscore = boxscoreTeams.find((t) => t.homeAway === "home");
  const awayBoxscore = boxscoreTeams.find((t) => t.homeAway === "away");

  const homeTeamId = mapTeamAbbreviation(homeCompetitor.team.abbreviation);
  const awayTeamId = mapTeamAbbreviation(awayCompetitor.team.abbreviation);

  // Default empty stats if boxscore not available (pre-game)
  const emptyStats: TeamGameStats = {
    teamId: "",
    totalYards: 0,
    passingYards: 0,
    rushingYards: 0,
    turnovers: 0,
    timeOfPossession: "0:00",
    firstDowns: 0,
    thirdDownEfficiency: "0-0",
    penalties: 0,
    penaltyYards: 0,
    sacks: 0,
    interceptions: 0,
    fumbles: 0,
  };

  return {
    eventId,
    homeTeamId,
    awayTeamId,
    homeScore: Number.parseInt(homeCompetitor.score, 10) || 0,
    awayScore: Number.parseInt(awayCompetitor.score, 10) || 0,
    isComplete: competition.status.type.completed,
    isInProgress: competition.status.type.state === "in",
    quarter: competition.status.period || null,
    timeRemaining: competition.status.displayClock || null,
    teamStats: {
      home: homeBoxscore ? parseTeamStats(homeBoxscore) : { ...emptyStats, teamId: homeTeamId },
      away: awayBoxscore ? parseTeamStats(awayBoxscore) : { ...emptyStats, teamId: awayTeamId },
    },
    playerLeaders: {
      home: parsePlayerLeaders(data.leaders, homeCompetitor.team.abbreviation),
      away: parsePlayerLeaders(data.leaders, awayCompetitor.team.abbreviation),
    },
    scoringPlays: parseScoringPlays(data.scoringPlays),
    drives: parseDrives(data.drives?.previous),
    lastPlay: data.drives?.current?.description || null,
    fetchedAt: Date.now(),
  };
}

/**
 * Extract ESPN event ID from our matchup ID format
 * Our format: "afc-wildcard-401547630" -> "401547630"
 */
export function extractEventId(matchupId: string): string | null {
  const parts = matchupId.split("-");
  // Event ID is the last part and should be numeric
  const eventId = parts[parts.length - 1];
  if (/^\d+$/.test(eventId)) {
    return eventId;
  }
  return null;
}
