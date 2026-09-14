import { z } from "zod";
import { PLAYOFF_SEASON_YEAR } from "@/data/teams";
import { bracketReducer } from "@/lib/bracket-reducer";
import { createInitialBracket } from "@/lib/playoff-rules";
import type { BracketState, Matchup } from "@/types";

export const bracketId = z.string().regex(/^[A-Za-z0-9_-]{1,80}$/);
const pickedTeam = z.object({ id: z.string().max(80) }).nullable();
const matchup = z.object({ id: z.string().max(80), winner: pickedTeam });
const conference = z.object({
  wildCard: z.array(matchup).length(3),
  divisional: z.array(matchup).length(2),
  championship: matchup,
});
export const documentInput = z.object({
  seasonYear: z.literal(PLAYOFF_SEASON_YEAR),
  state: z.object({
    id: bracketId,
    name: z.string().trim().max(100),
    subtitle: z.string().trim().max(200).nullable(),
    userName: z.string().trim().max(80),
    afc: conference,
    nfc: conference,
    superBowl: matchup,
  }),
});

export interface BracketDocument {
  seasonYear: number;
  state: BracketState;
}

export interface AccountBracket extends BracketDocument {
  id: string;
  revision: number;
  shareToken: string | null;
  sharedAt: string | null;
  updatedAt: string;
}

export function allMatchups(state: BracketState): Matchup[] {
  return [
    ...state.afc.wildCard,
    ...state.nfc.wildCard,
    ...state.afc.divisional,
    ...state.nfc.divisional,
    ...(state.afc.championship ? [state.afc.championship] : []),
    ...(state.nfc.championship ? [state.nfc.championship] : []),
    ...(state.superBowl ? [state.superBowl] : []),
  ];
}

// Persist canonical team data and legal picks only. Never trust supplied URLs, scores,
// locks, timestamps, or downstream participants from a browser or imported save.
export function parseBracketDocument(input: unknown): BracketDocument {
  const parsed = documentInput.parse(input);
  const source = parsed.state;
  let state = createInitialBracket(source.userName);
  const picks = [
    ...source.afc.wildCard,
    ...source.nfc.wildCard,
    ...source.afc.divisional,
    ...source.nfc.divisional,
    source.afc.championship,
    source.nfc.championship,
    source.superBowl,
  ];
  const expectedIds = allMatchups(state).map((game) => game.id);
  for (const [index, pick] of picks.entries()) {
    if (pick.id !== expectedIds[index]) throw new Error("Invalid matchup order.");
    if (!pick.winner) continue;
    const game = allMatchups(state).find((candidate) => candidate.id === pick.id)!;
    const winner = [game.homeTeam, game.awayTeam].find((team) => team?.id === pick.winner?.id);
    if (!game.homeTeam || !game.awayTeam || !winner)
      throw new Error("A pick is not valid for its matchup.");
    state = bracketReducer(state, { type: "SELECT_WINNER", matchupId: game.id, winner });
  }
  return {
    seasonYear: parsed.seasonYear,
    state: {
      ...state,
      id: source.id,
      name: source.name,
      subtitle: source.subtitle,
      userName: source.userName,
    },
  };
}
