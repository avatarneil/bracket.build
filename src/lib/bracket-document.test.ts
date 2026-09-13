import assert from "node:assert/strict";
import { test } from "node:test";
import { PLAYOFF_SEASON_YEAR } from "@/data/teams";
import { allMatchups, parseBracketDocument } from "./bracket-document";
import { createInitialBracket } from "./playoff-rules";

test("browser saves are canonicalized without scores, locks, or supplied team URLs", () => {
  const state = createInitialBracket("Fan");
  const game = state.afc.wildCard[0];
  game.winner = { ...game.homeTeam!, logoUrl: "https://attacker.invalid/track" };
  state.lockedRounds.wildCard = true;
  const saved = parseBracketDocument({ seasonYear: PLAYOFF_SEASON_YEAR, state });
  assert.equal(saved.state.afc.wildCard[0].winner?.id, game.homeTeam!.id);
  assert.notEqual(saved.state.afc.wildCard[0].winner?.logoUrl, game.winner.logoUrl);
  assert.equal(saved.state.lockedRounds.wildCard, false);
  assert.equal(saved.state.liveResults, null);
});

test("rejects impossible advancement, duplicate slots, and unsupported seasons", () => {
  const state = createInitialBracket("Fan");
  state.superBowl!.winner = state.afc.wildCard[0].homeTeam;
  assert.throws(() => parseBracketDocument({ seasonYear: PLAYOFF_SEASON_YEAR, state }));
  state.superBowl!.winner = null;
  state.afc.wildCard[1].id = state.afc.wildCard[0].id;
  assert.throws(() => parseBracketDocument({ seasonYear: PLAYOFF_SEASON_YEAR, state }));
  assert.throws(() =>
    parseBracketDocument({
      seasonYear: PLAYOFF_SEASON_YEAR + 1,
      state: createInitialBracket("Fan"),
    }),
  );
});

test("an empty bracket has thirteen known matchups", () => {
  assert.equal(
    allMatchups(
      parseBracketDocument({ seasonYear: PLAYOFF_SEASON_YEAR, state: createInitialBracket("Fan") })
        .state,
    ).length,
    13,
  );
});
