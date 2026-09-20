const NAMES: Record<string, string> = {
  ARI: "Arizona Cardinals",
  ATL: "Atlanta Falcons",
  BAL: "Baltimore Ravens",
  BUF: "Buffalo Bills",
  CAR: "Carolina Panthers",
  CHI: "Chicago Bears",
  CIN: "Cincinnati Bengals",
  CLE: "Cleveland Browns",
  DAL: "Dallas Cowboys",
  DEN: "Denver Broncos",
  DET: "Detroit Lions",
  GB: "Green Bay Packers",
  HOU: "Houston Texans",
  IND: "Indianapolis Colts",
  JAX: "Jacksonville Jaguars",
  KC: "Kansas City Chiefs",
  LV: "Las Vegas Raiders",
  LAC: "Los Angeles Chargers",
  LAR: "Los Angeles Rams",
  MIA: "Miami Dolphins",
  MIN: "Minnesota Vikings",
  NE: "New England Patriots",
  NO: "New Orleans Saints",
  NYG: "New York Giants",
  NYJ: "New York Jets",
  PHI: "Philadelphia Eagles",
  PIT: "Pittsburgh Steelers",
  SEA: "Seattle Seahawks",
  SF: "San Francisco 49ers",
  TB: "Tampa Bay Buccaneers",
  TEN: "Tennessee Titans",
  WAS: "Washington Commanders",
};

const ALIASES: Record<string, string> = {
  LA: "LAR",
  STL: "LAR",
  SD: "LAC",
  OAK: "LV",
  WSH: "WAS",
  JAC: "JAX",
};

export function franchise(abbreviation: string): string {
  const id = ALIASES[abbreviation] ?? abbreviation;
  if (!NAMES[id]) throw new Error(`Unknown NFL team: ${abbreviation}`);
  return id;
}

export function teamName(id: string, season: number): string {
  const team = franchise(id);
  if (team === "LAR" && season < 2016) return "St. Louis Rams";
  if (team === "LAC" && season < 2017) return "San Diego Chargers";
  if (team === "LV" && season < 2020) return "Oakland Raiders";
  if (team === "WAS" && season < 2020) return "Washington Redskins";
  if (team === "WAS" && season < 2022) return "Washington Football Team";
  return NAMES[team];
}

function nickname(id: string, season: number) {
  if (franchise(id) === "WAS" && season >= 2020 && season < 2022) return "Football Team";
  return teamName(id, season).split(" ").at(-1)!;
}

export const OPPONENT_GROUPS = [
  {
    id: "birds",
    label: "against bird-named opponents",
    matches: (id: string) => ["ARI", "ATL", "BAL", "PHI", "SEA"].includes(id),
  },
  {
    id: "cats",
    label: "against cat-named opponents",
    matches: (id: string) => ["CAR", "CIN", "DET", "JAX"].includes(id),
  },
  {
    id: "animals",
    label: "against animal-named opponents",
    matches: (id: string) =>
      [
        "ARI",
        "ATL",
        "BAL",
        "PHI",
        "SEA",
        "CAR",
        "CIN",
        "DET",
        "JAX",
        "CHI",
        "DEN",
        "IND",
        "LAR",
        "MIA",
      ].includes(id),
  },
  {
    id: "long-names",
    wordplay: true,
    label: "against opponents with nicknames of at least eight letters",
    matches: (id: string, season: number) =>
      nickname(id, season).replace(/[^a-z]/gi, "").length >= 8,
  },
  {
    id: "even-names",
    wordplay: true,
    label: "against opponents with an even number of letters in their nickname",
    matches: (id: string, season: number) =>
      nickname(id, season).replace(/[^a-z]/gi, "").length % 2 === 0,
  },
  {
    id: "odd-names",
    wordplay: true,
    label: "against opponents with an odd number of letters in their nickname",
    matches: (id: string, season: number) =>
      nickname(id, season).replace(/[^a-z]/gi, "").length % 2 === 1,
  },
] as const;
