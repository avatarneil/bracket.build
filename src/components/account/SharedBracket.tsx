"use client";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { accountRequest } from "@/lib/account-client";
import { allMatchups, type AccountBracket, type BracketDocument } from "@/lib/bracket-document";
import { compareBrackets, countCorrectPicks } from "@/lib/bracket-comparison";
import { PLAYOFF_SEASON_YEAR } from "@/data/teams";
import type { LiveResults } from "@/types";

export function SharedBracket({ token }: { token: string }) {
  const { userId } = useAuth();
  return <SharedView key={`${token}:${userId ?? "guest"}`} token={token} />;
}

function SharedView({ token }: { token: string }) {
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const compareId = params.get("compare");
  const [shared, setShared] = useState<(BracketDocument & { sharedAt: string }) | null>(null);
  const [mine, setMine] = useState<AccountBracket | null>(null);
  const [list, setList] = useState<AccountBracket[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const [compareError, setCompareError] = useState("");
  const [retry, setRetry] = useState(0);
  const [results, setResults] = useState<LiveResults | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    setShared(null);
    accountRequest<BracketDocument & { sharedAt: string }>(
      `/api/shared-brackets/${token}`,
      "GET",
      undefined,
      controller.signal,
    )
      .then(setShared)
      .catch((reason) => {
        if (!controller.signal.aborted) setError(reason.message);
      });
    return () => controller.abort();
  }, [token, retry]);
  useEffect(() => {
    if (!isSignedIn) return;
    const controller = new AbortController();
    setCompareError("");
    setList([]);
    accountRequest<{ brackets: AccountBracket[]; hasMore: boolean }>(
      `/api/brackets?page=${page}`,
      "GET",
      undefined,
      controller.signal,
    )
      .then((data) => {
        setList(data.brackets);
        setHasMore(data.hasMore);
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setCompareError(reason.message);
      });
    return () => controller.abort();
  }, [isSignedIn, page, retry]);
  useEffect(() => {
    setMine(null);
    if (!isSignedIn || !compareId) return;
    const controller = new AbortController();
    setCompareError("");
    accountRequest<AccountBracket>(
      `/api/brackets/${encodeURIComponent(compareId)}`,
      "GET",
      undefined,
      controller.signal,
    )
      .then(setMine)
      .catch((reason) => {
        if (!controller.signal.aborted) setCompareError(reason.message);
      });
    return () => controller.abort();
  }, [compareId, isSignedIn, retry]);
  useEffect(() => {
    if (!shared || shared.seasonYear !== PLAYOFF_SEASON_YEAR) return;
    const controller = new AbortController();
    fetch("/api/standings", { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then(setResults)
      .catch(() => {});
    return () => controller.abort();
  }, [shared]);
  if (error)
    return (
      <div role="alert">
        <h1 className="text-2xl font-bold">Bracket unavailable</h1>
        <p className="my-4">{error}</p>
        <Button className="min-h-11" onClick={() => setRetry((value) => value + 1)}>
          Retry
        </Button>
        <Link href="/" className="ml-4 underline">
          Back to games
        </Link>
      </div>
    );
  if (!shared) return <p role="status">Loading shared bracket…</p>;
  const groups = compareBrackets(shared, shared);
  const comparison = mine?.seasonYear === shared.seasonYear ? compareBrackets(shared, mine) : null;
  const completedGames = results
    ? [
        ...results.afc.wildCard,
        ...results.nfc.wildCard,
        ...results.afc.divisional,
        ...results.nfc.divisional,
        results.afc.championship,
        results.nfc.championship,
        results.superBowl,
      ].filter((game) => game?.isComplete).length
    : 0;
  return (
    <>
      <header className="mb-8">
        <p className="text-sm text-gray-400">{shared.seasonYear} playoffs · Shared snapshot</p>
        <h1 className="mt-2 break-words text-3xl font-bold sm:text-4xl">
          {shared.state.name || "Playoff predictions"}
        </h1>
        <p className="mt-2 break-words text-gray-300">
          By {shared.state.userName || "Football fan"}
        </p>
        {shared.state.subtitle && (
          <p className="mt-3 break-words text-gray-400">{shared.state.subtitle}</p>
        )}
        <p className="mt-2 text-xs text-gray-400">
          Published{" "}
          {new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
            new Date(shared.sharedAt),
          )}
        </p>
      </header>
      <section className="mb-8 rounded-xl border border-gray-700 bg-gray-950 p-6">
        <h2 className="text-sm uppercase tracking-wider text-gray-400">Super Bowl pick</h2>
        <p className="mt-2 text-2xl font-bold">
          {shared.state.superBowl?.winner
            ? `${shared.state.superBowl.winner.city} ${shared.state.superBowl.winner.name}`
            : "Still deciding"}
        </p>
        <p className="mt-2 text-sm text-gray-400">
          {allMatchups(shared.state).filter((game) => game.winner).length} of 13 picks made
        </p>
        <Button asChild className="mt-4 min-h-11">
          <Link href="/brackets/new">Make my own bracket</Link>
        </Button>
      </section>
      <section
        aria-labelledby="compare-heading"
        className="mb-8 rounded-xl border border-gray-800 p-5"
      >
        <h2 id="compare-heading" className="text-xl font-semibold">
          Compare with mine
        </h2>
        {!isSignedIn ? (
          <p className="mt-3">
            <Link
              className="underline"
              href={`/sign-in?redirect_url=${encodeURIComponent(`/s/${token}`)}`}
            >
              Sign in
            </Link>{" "}
            to compare your saved picks.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            <label htmlFor="compare-bracket" className="block text-sm text-gray-300">
              Your bracket
            </label>
            <select
              id="compare-bracket"
              value={compareId ?? ""}
              onChange={(event) =>
                router.push(
                  `/s/${token}${event.target.value ? `?compare=${encodeURIComponent(event.target.value)}` : ""}`,
                  { scroll: false },
                )
              }
              className="min-h-11 w-full rounded-md border border-gray-600 bg-gray-900 px-3 text-base text-white"
            >
              <option value="">Choose a saved bracket…</option>
              {mine && !list.some((saved) => saved.id === mine.id) && (
                <option value={mine.id}>{mine.state.name || "Untitled bracket"}</option>
              )}
              {list
                .filter((saved) => saved.seasonYear === shared.seasonYear)
                .map((saved) => (
                  <option key={saved.id} value={saved.id}>
                    {saved.state.name || "Untitled bracket"}
                  </option>
                ))}
            </select>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                className="min-h-11"
                disabled={!page}
                onClick={() => setPage((value) => value - 1)}
              >
                Previous saves
              </Button>
              <Button
                variant="outline"
                className="min-h-11"
                disabled={!hasMore}
                onClick={() => setPage((value) => value + 1)}
              >
                More saves
              </Button>
              <Link className="underline" href="/brackets">
                Manage or import brackets
              </Link>
            </div>
            {compareError && (
              <p role="alert" className="text-red-300">
                {compareError}{" "}
                <button
                  className="min-h-11 underline"
                  onClick={() => setRetry((value) => value + 1)}
                >
                  Retry
                </button>
              </p>
            )}
            {mine && !comparison && (
              <p role="alert">Choose a bracket from the {shared.seasonYear} season.</p>
            )}
          </div>
        )}
        {comparison && (
          <div className="mt-5 space-y-2" role="status">
            <p className="font-semibold tabular-nums">
              {comparison.reduce((sum, group) => sum + group.agreed.length, 0)} matching picks
            </p>
            <p className="text-sm text-gray-400">
              Comparing teams advancing in each round, including reseeded matchups. Unpicked teams
              are shown as incomplete, not losses. This is a friendly comparison: picks can be
              edited after games finish.
            </p>
            {completedGames > 0 && mine && results && (
              <p className="tabular-nums">
                Correct picks: {shared.state.userName || "Shared bracket"}{" "}
                {countCorrectPicks(shared, results)} · You {countCorrectPicks(mine, results)}{" "}
                <span className="text-gray-400">({completedGames} final games)</span>
              </p>
            )}
          </div>
        )}
      </section>
      <div className="grid gap-4 md:grid-cols-2">
        {(comparison ?? groups).map((group) => (
          <section
            key={group.key}
            className="min-w-0 rounded-xl border border-gray-800 bg-gray-950 p-5"
          >
            <h2 className="font-semibold">{group.label}</h2>
            <div className={comparison ? "mt-4 grid grid-cols-2 gap-4" : "mt-4"}>
              {[group.left, ...(comparison ? [group.right] : [])].map((teams, index) => (
                <div key={index} className="min-w-0">
                  {comparison && (
                    <h3 className="mb-2 break-words text-sm text-gray-400">
                      {index === 0 ? shared.state.userName || "Shared bracket" : "You"}
                    </h3>
                  )}
                  {teams.length ? (
                    <ul className="space-y-2">
                      {teams.map((team) => (
                        <li key={team.id} className="break-words">
                          <span className="font-medium">
                            {team.city} {team.name}
                          </span>
                          {comparison && (
                            <span
                              className={`ml-2 text-xs ${group.agreed.some((match) => match.id === team.id) ? "text-green-300" : "text-amber-200"}`}
                            >
                              {group.agreed.some((match) => match.id === team.id)
                                ? "Match"
                                : "Different pick"}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500">No picks yet</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
