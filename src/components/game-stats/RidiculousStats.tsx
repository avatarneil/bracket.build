"use client";

import { LoaderCircle, Shuffle, Sparkles } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { displayDate, type RidiculousResponse } from "@/lib/ridiculous-stats/types";

const buttonClass =
  "min-h-11 touch-manipulation rounded-lg border border-violet-400/40 px-3 py-2 text-sm font-medium text-violet-100 transition-colors hover:border-violet-300 hover:bg-violet-400/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 disabled:cursor-wait disabled:opacity-60";

function readIndex(value: string | null, eventId: string): number | null {
  const match = value?.match(/^(\d{1,12}):(\d{1,5})$/);
  return match?.[1] === eventId ? Number(match[2]) : null;
}

export function RidiculousStats({ eventId }: { eventId: string }) {
  const params = useSearchParams();
  const index = readIndex(params.get("ridiculous"), eventId);
  const receiptPage = readIndex(params.get("receipts"), eventId);
  const [retry, setRetry] = useState(0);
  const [actionLabel, setActionLabel] = useState("Generate ridiculous stat");
  const [state, setState] = useState<{
    eventId: string;
    index: number | null;
    data: RidiculousResponse | null;
    loading: boolean;
    error: string | null;
  }>({ eventId, index: null, data: null, loading: false, error: null });
  const current = state.eventId === eventId && state.index === index ? state : null;
  // Keep the current game's snapshot visible while an explicit request loads.
  const data = state.eventId === eventId && index != null ? state.data : null;
  const fact = data?.fact;
  const loading = index != null && (!current || current.loading);

  // Live box-score polling must not replace an insight while it is being read.
  useEffect(() => {
    if (index == null) return;
    const controller = new AbortController();
    setState((previous) => ({
      eventId,
      index,
      data: previous.eventId === eventId ? previous.data : null,
      loading: true,
      error: null,
    }));
    void (async () => {
      try {
        const response = await fetch(`/api/ridiculous-stats/${eventId}?index=${index}`, {
          signal: controller.signal,
        });
        if (!response.ok)
          throw new Error("Historical stats are temporarily unavailable. Try again.");
        const result: RidiculousResponse = await response.json();
        if (result.eventId !== eventId)
          throw new Error("These stats belong to a different game. Try again.");
        if (!controller.signal.aborted)
          setActionLabel(result.fact ? "Another ridiculous stat" : "Try again");
        if (!controller.signal.aborted)
          setState({ eventId, index, data: result, loading: false, error: null });
      } catch (error) {
        if (!controller.signal.aborted) setActionLabel("Try again");
        if (!controller.signal.aborted)
          setState((previous) => ({
            eventId,
            index,
            data: previous.eventId === eventId ? previous.data : null,
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : "Unable to load historical stats. Try again.",
          }));
      }
    })();
    return () => controller.abort();
  }, [eventId, index, retry]);

  function updateQuery(updates: Record<string, string | null>) {
    const url = new URL(window.location.href);
    for (const [key, value] of Object.entries(updates)) {
      if (value == null) url.searchParams.delete(key);
      else url.searchParams.set(key, value);
    }
    window.history.replaceState(null, "", url);
  }

  function generate() {
    if (current?.error || (data && !fact)) setRetry((value) => value + 1);
    else {
      const nextIndex = fact ? (data!.index + 1) % data!.count : 0;
      updateQuery({
        ridiculous: `${eventId}:${nextIndex}`,
        receipts: null,
      });
      // A single-result game still needs a fresh snapshot on an explicit click.
      if (nextIndex === index) setRetry((value) => value + 1);
    }
  }

  const page = Math.min(receiptPage ?? 0, Math.max(0, Math.ceil((fact?.sampleSize ?? 0) / 10) - 1));
  const label =
    current?.error || (data && !fact)
      ? "Try again"
      : fact
        ? "Another ridiculous stat"
        : "Generate ridiculous stat";

  return (
    <section
      aria-label="Ridiculous stats"
      className="mt-6 min-w-0 rounded-xl border border-violet-400/25 bg-violet-950/30 p-4 text-gray-100 shadow-sm"
    >
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 shrink-0 text-violet-300" aria-hidden="true" />
        <h3 className="min-w-0 text-sm font-semibold text-violet-100">
          Absurdly specific. Actually true.
        </h3>
        <span className="shrink-0 rounded border border-violet-400/40 bg-violet-400/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-violet-200">
          BETA
        </span>
      </div>
      {index == null && (
        <p className="mb-4 text-sm leading-relaxed text-gray-300">
          What makes this game unusual? Compare its stats with real football history.
        </p>
      )}
      <div aria-live="polite" aria-atomic="true" aria-busy={loading}>
        {loading && !data && (
          <p className="mb-4 text-sm text-gray-300">Checking the history books…</p>
        )}
        {current?.error && <p className="mb-4 text-sm text-amber-200">{current.error}</p>}
        {data && !fact && <p className="mb-4 text-sm text-gray-300">{data.message}</p>}
        {fact && (
          <>
            <p className="mb-3 break-words text-base leading-relaxed text-white">{fact.text}</p>
            <p className="mb-4 text-xs leading-relaxed text-gray-300">
              {new Intl.NumberFormat("en-US").format(fact.sampleSize)} earlier games checked ·{" "}
              {data?.live ? "Live snapshot" : fact.kind === "since" ? "First since" : "Game record"}
              {data?.live && (
                <>
                  {" "}
                  · As of{" "}
                  {new Intl.DateTimeFormat(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                    second: "2-digit",
                  }).format(new Date(data.asOf))}
                  . Compared with completed games. Generate another for an updated snapshot.
                </>
              )}
            </p>
          </>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className={`${buttonClass} inline-flex items-center justify-center gap-2`}
        >
          {loading ? (
            <LoaderCircle
              className="h-4 w-4 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
          ) : (
            <Shuffle className="h-4 w-4" aria-hidden="true" />
          )}
          {loading ? actionLabel : label}
        </button>
        {fact && (
          <button
            type="button"
            className={buttonClass}
            aria-expanded={receiptPage != null}
            aria-controls={`receipts-${eventId}`}
            onClick={() => updateQuery({ receipts: receiptPage == null ? `${eventId}:0` : null })}
          >
            {receiptPage == null ? "Show the receipts" : "Hide the receipts"}
          </button>
        )}
      </div>
      {fact && receiptPage != null && (
        <div id={`receipts-${eventId}`} className="mt-4 min-w-0 border-t border-violet-400/25 pt-4">
          <p className="mb-2 text-sm font-medium text-white">
            {fact.metricLabel} · {fact.team}
          </p>
          <p className="mb-3 break-words text-xs leading-relaxed text-gray-300">
            {fact.filters.join(" · ")}. Archive from the {fact.coverageStart}; only games before{" "}
            {displayDate(fact.cutoff)}. Categories use nicknames at game time, counting letters
            only. Franchise history follows relocations.
          </p>
          <table className="w-full table-fixed text-left text-sm">
            <caption className="sr-only">Historical games supporting this comparison</caption>
            <thead>
              <tr className="text-xs text-gray-300">
                <th scope="col" className="pb-2 font-medium">
                  Earlier game
                </th>
                <th scope="col" className="w-20 pb-2 text-right font-medium">
                  Value
                </th>
              </tr>
            </thead>
            <tbody>
              {fact.receipts.slice(page * 10, (page + 1) * 10).map((receipt) => (
                <tr key={receipt.gameId} className="border-t border-white/10">
                  <td className="break-words py-2 pr-2">
                    {receipt.eventId ? (
                      <a
                        href={`https://www.espn.com/nfl/game/_/gameId/${receipt.eventId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-11 touch-manipulation flex-col justify-center rounded text-violet-200 underline decoration-violet-400/50 underline-offset-2 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
                      >
                        <span>{receipt.opponent}</span>
                        <span className="text-xs text-gray-300">
                          {displayDate(receipt.date)} · {receipt.location}
                        </span>
                      </a>
                    ) : (
                      <>
                        <span>{receipt.opponent}</span>
                        <span className="block text-xs text-gray-300">
                          {displayDate(receipt.date)} · {receipt.location}
                        </span>
                      </>
                    )}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {new Intl.NumberFormat("en-US").format(receipt.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              className={buttonClass}
              disabled={page === 0}
              onClick={() => updateQuery({ receipts: `${eventId}:${page - 1}` })}
            >
              Previous
            </button>
            <span className="text-xs tabular-nums text-gray-300">
              {page * 10 + 1}–{Math.min((page + 1) * 10, fact.sampleSize)} of{" "}
              {new Intl.NumberFormat("en-US").format(fact.sampleSize)}
            </span>
            <button
              type="button"
              className={buttonClass}
              disabled={(page + 1) * 10 >= fact.sampleSize}
              onClick={() => updateQuery({ receipts: `${eventId}:${page + 1}` })}
            >
              Next
            </button>
          </div>
          <a
            href="https://nflreadr.nflverse.com/reference/load_team_stats.html"
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex min-h-11 touch-manipulation items-center rounded text-xs text-violet-200 underline underline-offset-2 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
          >
            Historical data: nflverse · Current game: ESPN
          </a>
        </div>
      )}
    </section>
  );
}
