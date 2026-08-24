import type {
  ScheduleGame,
  ScheduleTeam,
  ScheduleWeek,
  SeasonPhase,
  SeasonSchedule,
} from "@/types";

const ESPN_SCOREBOARD_URL = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";

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
  id: string;
  homeAway: "home" | "away";
  score?: string;
  winner?: boolean;
  team: ESPNTeam;
  records?: Array<{ name: string; summary: string }>;
}

interface ESPNCompetition {
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

function parseTeam(competitor: ESPNCompetitor): ScheduleTeam {
  const team = competitor.team;
  const overallRecord = competitor.records?.find((record) => record.name === "overall");

  return {
    id: team.abbreviation.toUpperCase(),
    abbreviation: team.abbreviation.toUpperCase(),
    location: team.location,
    name: team.name,
    displayName: team.displayName,
    logoUrl:
      team.logo ??
      `https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/${team.abbreviation.toLowerCase()}.png`,
    color: `#${team.color || "374151"}`,
    record: overallRecord?.summary ?? null,
  };
}

function parseGame(event: ESPNEvent): ScheduleGame | null {
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
    date: competition.date || event.date,
    venue: competition.venue?.fullName ?? null,
    broadcasts: [
      ...new Set(competition.broadcasts?.flatMap((broadcast) => broadcast.names ?? []) ?? []),
    ],
    homeTeam: parseTeam(home),
    awayTeam: parseTeam(away),
    homeScore: parseScore(home.score),
    awayScore: parseScore(away.score),
    winnerId: home.winner ? home.team.abbreviation : away.winner ? away.team.abbreviation : null,
    isComplete,
    isInProgress,
    statusText:
      competition.status.type.shortDetail ??
      competition.status.type.description ??
      (isComplete ? "Final" : isInProgress ? "Live" : "Scheduled"),
    quarter: isInProgress ? competition.status.period : null,
    timeRemaining: isInProgress ? competition.status.displayClock : null,
    possession: possessionCompetitor?.team.abbreviation.toUpperCase() ?? null,
    isRedZone: competition.situation?.isRedZone ?? false,
  };
}

async function fetchScoreboard(params?: URLSearchParams): Promise<ESPNScoreboardResponse> {
  const url = params?.size ? `${ESPN_SCOREBOARD_URL}?${params.toString()}` : ESPN_SCOREBOARD_URL;
  const response = await fetch(url, { next: { revalidate: 30 } });

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
): Promise<SeasonSchedule> {
  const currentResponse = await fetchScoreboard();
  const currentType = currentResponse.season?.type ?? 1;
  const currentPhase = TYPE_TO_PHASE[currentType] ?? "preseason";
  const currentSeasonYear = currentResponse.season?.year ?? new Date().getFullYear();
  const seasonYear = requestedSeasonYear ?? currentSeasonYear;
  const seasonResponse =
    seasonYear === currentSeasonYear
      ? currentResponse
      : await fetchScoreboard(scoreboardParams(seasonYear, "regular", 1));
  const phase = requestedPhase ?? currentPhase;
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
    : await fetchScoreboard(scoreboardParams(seasonYear, phase, week));

  const postseasonWeek =
    phase === "postseason" && week === 1
      ? response
      : await fetchScoreboard(scoreboardParams(seasonYear, "postseason", 1));
  const postseasonAvailable = hasPostedMatchups(postseasonWeek);

  const selectedWeek = weeks.find((entry) => entry.number === week);

  return {
    phase,
    currentPhase,
    currentSeasonYear,
    seasonYear,
    availableSeasons: [currentSeasonYear, currentSeasonYear - 1],
    phaseAvailability: {
      preseason: true,
      regular: true,
      postseason: postseasonAvailable,
    },
    week,
    weekLabel: selectedWeek?.label ?? `Week ${week}`,
    weeks,
    games: (response.events ?? [])
      .map(parseGame)
      .filter((game): game is ScheduleGame => game !== null)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    fetchedAt: Date.now(),
  };
}
