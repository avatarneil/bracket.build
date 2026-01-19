import type { SeededTeam, Team } from "@/types";

// ESPN CDN base URL for team logos
const LOGO_BASE = "https://a.espncdn.com/i/teamlogos/nfl/500";

export const NFL_TEAMS: Record<string, Team> = {
  // AFC Teams
  DEN: {
    id: "DEN",
    name: "Broncos",
    city: "Denver",
    conference: "AFC",
    primaryColor: "#FB4F14",
    secondaryColor: "#002244",
    logoUrl: `${LOGO_BASE}/den.png`,
  },
  NE: {
    id: "NE",
    name: "Patriots",
    city: "New England",
    conference: "AFC",
    primaryColor: "#002244",
    secondaryColor: "#C60C30",
    logoUrl: `${LOGO_BASE}/ne.png`,
  },
  JAX: {
    id: "JAX",
    name: "Jaguars",
    city: "Jacksonville",
    conference: "AFC",
    primaryColor: "#006778",
    secondaryColor: "#D7A22A",
    logoUrl: `${LOGO_BASE}/jax.png`,
  },
  PIT: {
    id: "PIT",
    name: "Steelers",
    city: "Pittsburgh",
    conference: "AFC",
    primaryColor: "#FFB612",
    secondaryColor: "#101820",
    logoUrl: `${LOGO_BASE}/pit.png`,
  },
  HOU: {
    id: "HOU",
    name: "Texans",
    city: "Houston",
    conference: "AFC",
    primaryColor: "#03202F",
    secondaryColor: "#A71930",
    logoUrl: `${LOGO_BASE}/hou.png`,
  },
  BUF: {
    id: "BUF",
    name: "Bills",
    city: "Buffalo",
    conference: "AFC",
    primaryColor: "#00338D",
    secondaryColor: "#C60C30",
    logoUrl: `${LOGO_BASE}/buf.png`,
  },
  LAC: {
    id: "LAC",
    name: "Chargers",
    city: "Los Angeles",
    conference: "AFC",
    primaryColor: "#0080C6",
    secondaryColor: "#FFC20E",
    logoUrl: `${LOGO_BASE}/lac.png`,
  },

  // NFC Teams
  SEA: {
    id: "SEA",
    name: "Seahawks",
    city: "Seattle",
    conference: "NFC",
    primaryColor: "#002244",
    secondaryColor: "#69BE28",
    logoUrl: `${LOGO_BASE}/sea.png`,
  },
  CHI: {
    id: "CHI",
    name: "Bears",
    city: "Chicago",
    conference: "NFC",
    primaryColor: "#0B162A",
    secondaryColor: "#C83803",
    logoUrl: `${LOGO_BASE}/chi.png`,
  },
  PHI: {
    id: "PHI",
    name: "Eagles",
    city: "Philadelphia",
    conference: "NFC",
    primaryColor: "#004C54",
    secondaryColor: "#A5ACAF",
    logoUrl: `${LOGO_BASE}/phi.png`,
  },
  CAR: {
    id: "CAR",
    name: "Panthers",
    city: "Carolina",
    conference: "NFC",
    primaryColor: "#0085CA",
    secondaryColor: "#101820",
    logoUrl: `${LOGO_BASE}/car.png`,
  },
  LAR: {
    id: "LAR",
    name: "Rams",
    city: "Los Angeles",
    conference: "NFC",
    primaryColor: "#003594",
    secondaryColor: "#FFA300",
    logoUrl: `${LOGO_BASE}/lar.png`,
  },
  SF: {
    id: "SF",
    name: "49ers",
    city: "San Francisco",
    conference: "NFC",
    primaryColor: "#AA0000",
    secondaryColor: "#B3995D",
    logoUrl: `${LOGO_BASE}/sf.png`,
  },
  GB: {
    id: "GB",
    name: "Packers",
    city: "Green Bay",
    conference: "NFC",
    primaryColor: "#203731",
    secondaryColor: "#FFB612",
    logoUrl: `${LOGO_BASE}/gb.png`,
  },
};

// 2025-26 NFL Playoff Seedings
export const AFC_SEEDS: SeededTeam[] = [
  { ...NFL_TEAMS.DEN, seed: 1 }, // Denver Broncos (14-3) - BYE
  { ...NFL_TEAMS.NE, seed: 2 }, // New England Patriots
  { ...NFL_TEAMS.JAX, seed: 3 }, // Jacksonville Jaguars
  { ...NFL_TEAMS.PIT, seed: 4 }, // Pittsburgh Steelers
  { ...NFL_TEAMS.HOU, seed: 5 }, // Houston Texans
  { ...NFL_TEAMS.BUF, seed: 6 }, // Buffalo Bills
  { ...NFL_TEAMS.LAC, seed: 7 }, // Los Angeles Chargers
];

export const NFC_SEEDS: SeededTeam[] = [
  { ...NFL_TEAMS.SEA, seed: 1 }, // Seattle Seahawks (14-3) - BYE
  { ...NFL_TEAMS.CHI, seed: 2 }, // Chicago Bears
  { ...NFL_TEAMS.PHI, seed: 3 }, // Philadelphia Eagles
  { ...NFL_TEAMS.CAR, seed: 4 }, // Carolina Panthers
  { ...NFL_TEAMS.LAR, seed: 5 }, // Los Angeles Rams
  { ...NFL_TEAMS.SF, seed: 6 }, // San Francisco 49ers
  { ...NFL_TEAMS.GB, seed: 7 }, // Green Bay Packers
];

export function getTeamById(id: string): Team | undefined {
  return NFL_TEAMS[id];
}

export function getSeededTeam(conference: "AFC" | "NFC", seed: number): SeededTeam | undefined {
  const seeds = conference === "AFC" ? AFC_SEEDS : NFC_SEEDS;
  return seeds.find((t) => t.seed === seed);
}
