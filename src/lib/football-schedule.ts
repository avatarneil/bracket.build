import { isCompleteCollegeField, type CollegePlayoffTeam } from "@/lib/college-playoff";
import { footballTeamId, type FootballLeague } from "@/lib/football-league";
import type {
  ScheduleGame,
  ScheduleTeam,
  ScheduleWeek,
  SeasonPhase,
  SeasonSchedule,
} from "@/types";

const PHASE_TO_TYPE: Record<SeasonPhase, number> = {
  preseason: 1,
  regular: 2,
  postseason: 3,
};

const TYPE_TO_PHASE: Record<number, SeasonPhase> = {
  1: "preseason",
  2: "regular",
  3: "postseason",
};

interface ESPNCalendarEntry {
  label: string;
  value: string;
  startDate: string;
  endDate: string;
}

interface ESPNCalendar {
  label: string;
  value: string;
  startDate: string;
  endDate: string;
  entries?: ESPNCalendarEntry[];
}

interface ESPNTeam {
  id: string;
  abbreviation: string;
  location: string;
  name: string;
  displayName: string;
  color?: string;
  logo?: string;
}

interface ESPNCompetitor {
  curatedRank?: { current: number };
  id: string;
  homeAway: "home" | "away";
  score?: string;
  winner?: boolean;
  team: ESPNTeam;
  records?: Array<{ name: string; summary: string }>;
}

interface ESPNCompetition {
  notes?: Array<{ headline?: string }>;
  date: string;
  venue?: { fullName?: string };
  broadcasts?: Array<{ names?: string[] }>;
  competitors: ESPNCompetitor[];
  status: {
    displayClock: string;
    period: number;
    type: {
      state: "pre" | "in" | "post";
      completed: boolean;
      shortDetail?: string;
      description?: string;
    };
  };
  situation?: {
    lastPlay?: { team?: { id: string } };
    down?: number;
    isRedZone?: boolean;
  };
}

interface ESPNEvent {
  id: string;
  date: string;
  competitions: ESPNCompetition[];
}

interface ESPNScoreboardResponse {
  season?: { type: number; year: number };
  week?: { number: number };
  leagues?: Array<{ calendar?: ESPNCalendar[] }>;
  events?: ESPNEvent[];
}

function parseScore(score?: string): number | null {
  if (score === undefined || score === "") return null;
  const parsed = Number.parseInt(score, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseTeam(competitor: ESPNCompetitor, league: FootballLeague): ScheduleTeam {
  const team = competitor.team;
  const overallRecord = competitor.records?.find((record) => record.name === "overall");

  return {
    id: footballTeamId(team, league),
    abbreviation: team.abbreviation.toUpperCase(),
    location: team.location,
    name: team.name,
    displayName: team.displayName,
    logoUrl:
      league === "college-football" && (!team.id || Number(team.id) <= 0)
        ? "/team-tbd.svg"
        : team.logo ||
          (league === "nfl"
            ? `https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/${team.abbreviation.toLowerCase()}.png`
            : `https://a.espncdn.com/i/teamlogos/ncaa/500/${team.id}.png`),
    color: `#${team.color || "374151"}`,
    record: overallRecord?.summary ?? null,
  };
}

function parseGame(event: ESPNEvent, league: FootballLeague): ScheduleGame | null {
  const competition = event.competitions[0];
  if (!competition) return null;

  const home = competition.competitors.find((team) => team.homeAway === "home");
  const away = competition.competitors.find((team) => team.homeAway === "away");
  if (!home || !away) return null;

  const isInProgress = competition.status.type.state === "in";
  const isComplete = competition.status.type.completed;
  const activeDrive = (competition.situation?.down ?? -1) > 0;
  const possessionNumericId = competition.situation?.lastPlay?.team?.id;
  const possessionCompetitor = activeDrive
    ? competition.competitors.find((team) => team.id === possessionNumericId)
    : undefined;

  return {
    id: event.id,
    league,
    date: competition.date || event.date,
    venue: competition.venue?.fullName ?? null,
    broadcasts: [
      ...new Set(competition.broadcasts?.flatMap((broadcast) => broadcast.names ?? []) ?? []),
    ],
    homeTeam: parseTeam(home, league),
    awayTeam: parseTeam(away, league),
    homeScore: parseScore(home.score),
    awayScore: parseScore(away.score),
    winnerId: home.winner
      ? footballTeamId(home.team, league)
      : away.winner
        ? footballTeamId(away.team, league)
        : null,
    isComplete,
    isInProgress,
    statusText:
      competition.status.type.shortDetail ??
      competition.status.type.description ??
      (isComplete ? "Final" : isInProgress ? "Live" : "Scheduled"),
    quarter: isInProgress ? competition.status.period : null,
    timeRemaining: isInProgress ? competition.status.displayClock : null,
    possession: possessionCompetitor ? footballTeamId(possessionCompetitor.team, league) : null,
    isRedZone: competition.situation?.isRedZone ?? false,
  };
}

async function fetchScoreboard(
  league: FootballLeague,
  params = new URLSearchParams(),
): Promise<ESPNScoreboardResponse> {
  if (league === "college-football") {
    params.set("groups", "80"); // All FBS teams, rather than ESPN's default ranked teams.
    params.set("limit", "200"); // ESPN silently falls back to 25 for an oversized limit.
  }
  const url = `https://site.api.espn.com/apis/site/v2/sports/football/${league}/scoreboard?${params}`;
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`ESPN API error: ${response.status}`);
  }

  return response.json();
}

function scoreboardParams(seasonYear: number, phase: SeasonPhase, week: number) {
  return new URLSearchParams({
    dates: seasonYear.toString(),
    seasontype: PHASE_TO_TYPE[phase].toString(),
    week: week.toString(),
  });
}

function hasPostedMatchups(response: ESPNScoreboardResponse): boolean {
  return (response.events ?? []).some((event) => {
    const competitors = event.competitions[0]?.competitors ?? [];
    return (
      competitors.length === 2 &&
      competitors.every((competitor) => {
        const abbreviation = competitor.team.abbreviation.toUpperCase();
        return abbreviation !== "TBD" && competitor.team.displayName.toUpperCase() !== "TBD";
      })
    );
  });
}

function scheduleWeeks(calendar: ESPNCalendar): ScheduleWeek[] {
  return (calendar.entries ?? []).map((entry) => ({
    number: Number.parseInt(entry.value, 10),
    label: entry.label,
    startDate: entry.startDate,
    endDate: entry.endDate,
  }));
}

function defaultWeekForPhase(
  phase: SeasonPhase,
  currentPhase: SeasonPhase,
  currentWeek: number,
  weeks: ScheduleWeek[],
): number {
  if (phase === currentPhase && weeks.some((week) => week.number === currentWeek)) {
    return currentWeek;
  }

  const now = Date.now();
  const activeWeek = weeks.find(
    (week) => new Date(week.startDate).getTime() <= now && now <= new Date(week.endDate).getTime(),
  );
  if (activeWeek) return activeWeek.number;

  const phaseIsUpcoming = weeks[0] && now < new Date(weeks[0].startDate).getTime();
  return phaseIsUpcoming ? weeks[0].number : (weeks.at(-1)?.number ?? 1);
}

export async function fetchSeasonSchedule(
  requestedPhase?: SeasonPhase,
  requestedWeek?: number,
  requestedSeasonYear?: number,
  league: FootballLeague = "nfl",
): Promise<SeasonSchedule> {
  const currentResponse = await fetchScoreboard(league);
  const currentType = currentResponse.season?.type ?? (league === "nfl" ? 1 : 2);
  const currentPhase = TYPE_TO_PHASE[currentType] ?? (league === "nfl" ? "preseason" : "regular");
  const currentSeasonYear = currentResponse.season?.year ?? new Date().getFullYear();
  const seasonYear = requestedSeasonYear ?? currentSeasonYear;
  const seasonResponse =
    seasonYear === currentSeasonYear
      ? currentResponse
      : await fetchScoreboard(league, scoreboardParams(seasonYear, "regular", 1));
  const phase =
    league === "college-football" && requestedPhase === "preseason"
      ? "regular"
      : (requestedPhase ?? currentPhase);
  const calendar = seasonResponse.leagues?.[0]?.calendar?.find(
    (entry) => Number.parseInt(entry.value, 10) === PHASE_TO_TYPE[phase],
  );

  if (!calendar) {
    throw new Error(`No ${phase} schedule is available`);
  }

  const weeks = scheduleWeeks(calendar);
  const validRequestedWeek = weeks.some((week) => week.number === requestedWeek);
  const week = validRequestedWeek
    ? requestedWeek!
    : defaultWeekForPhase(phase, currentPhase, currentResponse.week?.number ?? 1, weeks);

  const canUseCurrentResponse =
    seasonYear === currentSeasonYear &&
    currentType === PHASE_TO_TYPE[phase] &&
    week === currentResponse.week?.number;
  const response = canUseCurrentResponse
    ? currentResponse
    : await fetchScoreboard(league, scoreboardParams(seasonYear, phase, week));

  const postseasonWeek =
    phase === "postseason" && week === 1
      ? response
      : await fetchScoreboard(league, scoreboardParams(seasonYear, "postseason", 1));
  const postseasonAvailable = hasPostedMatchups(postseasonWeek);

  let collegePlayoffTeams: CollegePlayoffTeam[] | null = null;
  if (league === "college-football" && phase === "postseason") {
    const playoff =
      week === 999
        ? response
        : await fetchScoreboard(league, scoreboardParams(seasonYear, "postseason", 999));
    collegePlayoffTeams = parseCollegeField(playoff);
  }
  const selectedWeek = weeks.find((entry) => entry.number === week);

  return {
    league,
    ...(league === "college-football" ? { collegePlayoffTeams } : {}),
    phase,
    currentPhase,
    currentSeasonYear,
    seasonYear,
    availableSeasons: [currentSeasonYear, currentSeasonYear - 1],
    phaseAvailability: {
      preseason: league === "nfl",
      regular: true,
      postseason: postseasonAvailable,
    },
    week,
    weekLabel: selectedWeek?.label ?? `Week ${week}`,
    weeks,
    games: (response.events ?? [])
      .map((event) => parseGame(event, league))
      .filter((game): game is ScheduleGame => game !== null)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    fetchedAt: Date.now(),
  };
}

// Only playoff-labeled events can establish a field; ordinary rankings and bowl
// participants must never unlock picks. Fail closed on partial or inconsistent feeds.
export function parseCollegeField(response: ESPNScoreboardResponse): CollegePlayoffTeam[] | null {
  const teams = new Map<string, CollegePlayoffTeam>();
  const firstRoundPairs: number[][] = [];
  for (const event of response.events ?? []) {
    const game = event.competitions[0];
    const headline = game?.notes?.map((note) => note.headline ?? "").join(" ") ?? "";
    if (!/College Football Playoff/i.test(headline)) continue;
    const seeds: number[] = [];
    for (const competitor of game.competitors) {
      const seed = competitor.curatedRank?.current;
      if (!seed || seed > 12 || competitor.team.abbreviation === "TBD") continue;
      const team = { ...parseTeam(competitor, "college-football"), seed };
      const previous = teams.get(team.id);
      if (previous && previous.seed !== seed) return null;
      teams.set(team.id, team);
      seeds.push(seed);
    }
    if (/First Round/i.test(headline)) firstRoundPairs.push(seeds.sort((a, b) => a - b));
  }
  const field = [...teams.values()].sort((a, b) => a.seed - b.seed);
  if (
    !isCompleteCollegeField(field) ||
    firstRoundPairs.length !== 4 ||
    ![5, 6, 7, 8].every((seed) =>
      firstRoundPairs.some(
        (pair) => pair.length === 2 && pair[0] === seed && pair[1] === 17 - seed,
      ),
    )
  )
    return null;
  return field;
}
