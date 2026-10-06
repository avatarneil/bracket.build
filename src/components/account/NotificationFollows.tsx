"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { followKey, type NotificationFollow } from "@/lib/notifications/types";
import type { SeasonSchedule } from "@/types";

const controlClass =
  "min-h-11 w-full min-w-0 touch-manipulation rounded-lg border border-gray-700 bg-gray-900 px-3 text-base text-white focus-visible:outline-2 focus-visible:outline-white";

export function FollowList({
  follows,
  disabled,
  save,
  remove,
}: {
  follows: NotificationFollow[];
  disabled: boolean;
  save: (follow: NotificationFollow) => void;
  remove: (follow: NotificationFollow) => void;
}) {
  const params = useSearchParams();
  const requestedPage = Number(params.get("followsPage") ?? 1);
  const page = Number.isInteger(requestedPage) ? Math.max(0, requestedPage - 1) : 0;
  const setPage = (next: number) => {
    const query = new URLSearchParams(window.location.search);
    query.set("followsPage", String(next + 1));
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}?${query}${window.location.hash}`,
    );
  };
  const current = Math.min(page, Math.floor((follows.length - 1) / 10));
  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {follows.slice(current * 10, current * 10 + 10).map((follow) => (
          <li key={followKey(follow)} className="rounded-lg border border-gray-800 p-4">
            <p className="break-words font-medium">{follow.label}</p>
            <p className="text-xs text-gray-400">
              {follow.league === "nfl" ? "NFL" : "College football"} · {follow.season} season ·{" "}
              {follow.kind === "team" ? "All team games" : "Single game"}
            </p>
            <div className="mt-2 flex flex-wrap gap-x-5">
              {(
                [
                  ["gameStart", "Kickoff"],
                  ["majorUpdates", "Major updates"],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="flex min-h-11 cursor-pointer items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    aria-label={`${label} for ${follow.label}, ${follow.season}`}
                    checked={follow[key]}
                    disabled={disabled}
                    onChange={(event) => save({ ...follow, [key]: event.target.checked })}
                    className="size-5 touch-manipulation accent-yellow-300 focus-visible:outline-2"
                  />
                  {label}
                </label>
              ))}
              <Button
                variant="link"
                className="min-h-11 px-0 text-gray-300 touch-manipulation"
                disabled={disabled}
                aria-label={`Unfollow ${follow.label}, ${follow.season}`}
                onClick={() => remove(follow)}
              >
                Unfollow
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {follows.length > 10 && (
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            className="min-h-11"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
          >
            Previous follows
          </Button>
          <span className="text-sm tabular-nums">
            {current + 1} / {Math.ceil(follows.length / 10)}
          </span>
          <Button
            variant="outline"
            className="min-h-11"
            disabled={(current + 1) * 10 >= follows.length}
            onClick={() => setPage(current + 1)}
          >
            Next follows
          </Button>
        </div>
      )}
    </div>
  );
}

export function FollowPicker({
  disabled,
  save,
}: {
  disabled: boolean;
  save: (follow: NotificationFollow) => void;
}) {
  const params = useSearchParams();
  const [league, setLeague] = useState<NotificationFollow["league"]>(
    params.get("league") === "college-football" ? "college-football" : "nfl",
  );
  const [season, setSeason] = useState(params.get("season") ?? "");
  const [phase, setPhase] = useState(params.get("phase") ?? "");
  const [week, setWeek] = useState(params.get("week") ?? "");
  const [kind, setKind] = useState<NotificationFollow["kind"]>(
    params.get("followKind") === "team" ? "team" : "game",
  );
  const [target, setTarget] = useState(
    params.get("followTarget") ?? params.get("followGame") ?? "",
  );
  const [schedule, setSchedule] = useState<SeasonSchedule | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    query.delete("followGame");
    for (const [key, value] of Object.entries({
      league,
      season,
      phase,
      week,
      followKind: kind,
      followTarget: target,
    })) {
      if (value) query.set(key, value);
      else query.delete(key);
    }
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}?${query}${window.location.hash}`,
    );
  }, [league, season, phase, week, kind, target]);
  useEffect(() => {
    const abort = new AbortController();
    const query = new URLSearchParams({ league });
    if (season) query.set("season", season);
    if (phase) query.set("phase", phase);
    if (week) query.set("week", week);
    setSchedule(null);
    setError("");
    void fetch(`/api/schedule?${query}`, { signal: abort.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load games. Try another season or retry.");
        const result: SeasonSchedule = await response.json();
        if (!abort.signal.aborted) setSchedule(result);
      })
      .catch((reason) => {
        if (!abort.signal.aborted) setError(reason.message);
      });
    return () => abort.abort();
  }, [league, season, phase, week, retry]);
  const games = schedule?.games.filter((game) => !game.isComplete) ?? [];
  const teams = [
    ...new Map(
      (schedule?.games ?? [])
        .flatMap((game) => [game.awayTeam, game.homeTeam])
        .map((team) => [team.id, team]),
    ).values(),
  ].sort((a, b) => a.displayName.localeCompare(b.displayName));
  const choices =
    kind === "game"
      ? games.map((game) => ({
          id: game.id,
          label: `${game.awayTeam.displayName} at ${game.homeTeam.displayName}`,
          option: `${game.awayTeam.abbreviation} at ${game.homeTeam.abbreviation} · ${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(game.date))}`,
        }))
      : teams.map((team) => ({ id: team.id, label: team.displayName, option: team.displayName }));
  const selected = choices.find((choice) => choice.id === target);
  return (
    <div className="space-y-3 rounded-lg bg-gray-900/50 p-4">
      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        <label className="min-w-0 space-y-1 text-sm">
          League
          <select
            name="notificationLeague"
            className={controlClass}
            value={league}
            onChange={(event) => {
              setLeague(event.target.value as NotificationFollow["league"]);
              setSeason("");
              setPhase("");
              setWeek("");
              setTarget("");
            }}
          >
            <option value="nfl">NFL</option>
            <option value="college-football">College football</option>
          </select>
        </label>
        <label className="min-w-0 space-y-1 text-sm">
          Season
          <select
            name="notificationSeason"
            className={controlClass}
            value={season || String(schedule?.seasonYear ?? "")}
            onChange={(event) => {
              setSeason(event.target.value);
              setWeek("");
              setTarget("");
            }}
          >
            <option value="">Current season</option>
            {[
              ...new Set([
                ...(schedule?.availableSeasons ?? []),
                ...(season ? [Number(season)] : []),
              ]),
            ].map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-0 space-y-1 text-sm">
          Phase
          <select
            name="notificationPhase"
            className={controlClass}
            value={phase || schedule?.phase || ""}
            onChange={(event) => {
              setPhase(event.target.value);
              setWeek("");
              setTarget("");
            }}
          >
            <option value="">Current phase</option>
            {league === "nfl" && <option value="preseason">Preseason</option>}
            <option value="regular">Regular season</option>
            <option value="postseason">Postseason</option>
          </select>
        </label>
        <label className="min-w-0 space-y-1 text-sm">
          Schedule week
          <select
            name="notificationWeek"
            className={controlClass}
            value={week || String(schedule?.week ?? "")}
            onChange={(event) => {
              setWeek(event.target.value);
              setPhase(schedule?.phase ?? "");
              setTarget("");
            }}
            disabled={!schedule}
          >
            <option value="">Current week</option>
            {schedule?.weeks.map((item) => (
              <option key={item.number} value={item.number}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-0 space-y-1 text-sm">
          Follow
          <select
            name="notificationFollowKind"
            className={controlClass}
            value={kind}
            onChange={(event) => {
              setKind(event.target.value as NotificationFollow["kind"]);
              setTarget("");
            }}
          >
            <option value="game">One game</option>
            <option value="team">A team for the season</option>
          </select>
        </label>
        <label className="min-w-0 space-y-1 text-sm">
          {kind === "game" ? "Game" : "Team"}
          <select
            name="notificationTarget"
            className={controlClass}
            value={selected?.id ?? ""}
            onChange={(event) => setTarget(event.target.value)}
            disabled={!schedule}
          >
            <option value="">{schedule ? "Choose…" : "Loading…"}</option>
            {choices.map((choice) => (
              <option key={choice.id} value={choice.id}>
                {choice.option}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && (
        <div aria-live="polite">
          <p className="text-sm text-amber-200">{error}</p>
          <Button
            variant="outline"
            className="mt-2 min-h-11"
            onClick={() => setRetry((value) => value + 1)}
          >
            Retry games
          </Button>
        </div>
      )}
      {schedule && !choices.length && (
        <p className="text-sm text-gray-400">
          No {kind === "game" ? "upcoming or live games" : "teams"} in this week. Choose another
          week.
        </p>
      )}
      <Button
        className="min-h-11 touch-manipulation"
        disabled={disabled || !selected || !schedule}
        onClick={() => {
          if (selected && schedule)
            save({
              league,
              season: schedule.seasonYear,
              kind,
              targetId: selected.id,
              label: selected.label,
              gameStart: true,
              majorUpdates: true,
            });
        }}
      >
        Add follow
      </Button>
    </div>
  );
}
