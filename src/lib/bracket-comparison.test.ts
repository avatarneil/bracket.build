import assert from "node:assert/strict";
import { test } from "node:test";
import { compareBrackets, countCorrectPicks } from "./bracket-comparison";
import { createInitialBracket } from "./playoff-rules";
import { PLAYOFF_SEASON_YEAR } from "@/data/teams";
import type { LiveResults } from "@/types";

const document = () => ({ seasonYear: PLAYOFF_SEASON_YEAR, state: createInitialBracket("Fan") });

test("comparisons match advancing teams even when reseeding changes slots", () => {
  const left = document();
  const right = document();
  const a = left.state.afc.wildCard[0].homeTeam!;
  const b = left.state.afc.wildCard[1].homeTeam!;
  left.state.afc.divisional[0].winner = a;
  left.state.afc.divisional[1].winner = b;
  right.state.afc.divisional[0].winner = b;
  right.state.afc.divisional[1].winner = a;
  const round = compareBrackets(left, right).find((group) => group.key === "AFC-divisional")!;
  assert.equal(round.agreed.length, 2);
  assert.equal(round.different, 0);
  right.state.afc.divisional[1].winner = null;
  assert.equal(
    compareBrackets(left, right).find((group) => group.key === round.key)!.agreed.length,
    1,
  );
});

test("empty picks are not agreements and seasons cannot be mixed", () => {
  assert.equal(compareBrackets(document(), document()).flatMap((group) => group.agreed).length, 0);
  assert.throws(() => compareBrackets(document(), { ...document(), seasonYear: 2000 }));
});

test("correct picks count only completed results in the same conference and round", () => {
  const picks = document();
  const winner = picks.state.afc.wildCard[0].homeTeam!;
  picks.state.afc.divisional[0].winner = winner;
  const results: LiveResults = {
    afc: { wildCard: [], divisional: [], championship: null },
    nfc: { wildCard: [], divisional: [], championship: null },
    superBowl: null,
    fetchedAt: Date.now(),
  };
  const result = {
    winnerId: winner.id,
    isComplete: true,
  } as LiveResults["afc"]["divisional"][number];
  results.afc.wildCard.push(result);
  assert.equal(countCorrectPicks(picks, results), 0);
  results.afc.divisional.push({ ...result, isComplete: false });
  assert.equal(countCorrectPicks(picks, results), 0);
  results.afc.divisional[0].isComplete = true;
  assert.equal(countCorrectPicks(picks, results), 1);
});
