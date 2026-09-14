import { allMatchups, type BracketDocument } from "./bracket-document";
import type { Matchup, RoundName, LiveResults } from "@/types";

const labels: Record<RoundName, string> = {
  wildCard: "Wild Card",
  divisional: "Divisional",
  conference: "Conference championship",
  superBowl: "Super Bowl",
};

export function compareBrackets(left: BracketDocument, right: BracketDocument) {
  if (left.seasonYear !== right.seasonYear)
    throw new Error("Choose a bracket from the same season.");
  const leftGames = allMatchups(left.state);
  const rightGames = allMatchups(right.state);
  // Divisional pairings are reseeded independently in each prediction. Compare the
  // teams advancing in each conference/round rather than matching arbitrary slots.
  return (["wildCard", "divisional", "conference", "superBowl"] as RoundName[]).flatMap((round) => {
    const conferences = round === "superBowl" ? ["superBowl"] : ["AFC", "NFC"];
    return conferences.map((conference) => {
      const select = (games: Matchup[]) =>
        games
          .filter((game) => game.round === round && game.conference === conference)
          .flatMap((game) => (game.winner ? [game.winner] : []));
      const a = select(leftGames),
        b = select(rightGames);
      const agreed = a.filter((team) => b.some((other) => other.id === team.id));
      return {
        key: `${conference}-${round}`,
        label: `${conference === "superBowl" ? "" : conference + " · "}${labels[round]}`,
        left: a,
        right: b,
        agreed,
        different:
          a.filter((team) => !b.some((other) => other.id === team.id)).length +
          b.filter((team) => !a.some((other) => other.id === team.id)).length,
      };
    });
  });
}

export function countCorrectPicks(document: BracketDocument, results: LiveResults) {
  let correct = 0;
  for (const game of allMatchups(document.state)) {
    const conf = game.conference === "AFC" ? results.afc : results.nfc;
    const actual =
      game.round === "superBowl"
        ? [results.superBowl]
        : game.round === "conference"
          ? [conf.championship]
          : conf[game.round];
    if (
      game.winner &&
      actual.some((result) => result?.isComplete && result.winnerId === game.winner?.id)
    )
      correct++;
  }
  return correct;
}
