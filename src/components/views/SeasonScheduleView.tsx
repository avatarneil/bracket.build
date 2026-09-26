"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGameDialog } from "@/contexts/GameDialogContext";
import type { SeasonSchedule } from "@/types";
import { ScheduleGameRow } from "./ScheduleGameRow";

interface SeasonScheduleViewProps {
  schedule: SeasonSchedule | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onSelectWeek: (week: number) => void;
  isSidebar?: boolean;
}

function formatWeekDate(date: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
}

function ScheduleSkeleton() {
  return (
    <div className="w-full max-w-2xl animate-pulse" aria-label="Loading schedule">
      <div className="mb-4 h-11 rounded-lg bg-gray-900" />
      <div className="overflow-hidden rounded-xl bg-gray-900">
        {[0, 1, 2].map((item) => (
          <div key={item} className="space-y-3 border-b border-gray-800 p-5 last:border-0">
            <div className="h-10 rounded-lg bg-gray-800" />
            <div className="h-10 rounded-lg bg-gray-800" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SeasonScheduleView({
  schedule,
  isLoading,
  error,
  onRetry,
  onSelectWeek,
  isSidebar = false,
}: SeasonScheduleViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { selectedGame } = useGameDialog();
  const listRef = useRef<HTMLUListElement>(null);
  const previousSelectedRowRef = useRef<Element | null>(null);
  const selectedGameId = selectedGame?.matchup.id;
  const absoluteSelectedIndex =
    schedule?.games.findIndex((game) => `schedule-${game.id}` === selectedGameId) ?? -1;

  // Keep the rendered schedule bounded on busy college weekends.
  const pageSize = 25;
  const pageCount = Math.max(1, Math.ceil((schedule?.games.length ?? 0) / pageSize));
  const requestedPage = Number(searchParams.get("gamesPage") ?? 1);
  const page =
    absoluteSelectedIndex >= 0
      ? Math.floor(absoluteSelectedIndex / pageSize) + 1
      : Math.max(1, Math.min(pageCount, Number.isInteger(requestedPage) ? requestedPage : 1));
  const selectedIndex = absoluteSelectedIndex < 0 ? -1 : absoluteSelectedIndex % pageSize;
  const visibleGames = schedule?.games.slice((page - 1) * pageSize, page * pageSize) ?? [];
  const changePage = (next: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("gamesPage", String(next));
    params.delete("game");
    params.delete("tab");
    router.push(`${pathname}?${params}`, { scroll: false });
    listRef.current?.scrollTo({ top: 0, behavior: "instant" });
  };

  useEffect(() => {
    if (!isSidebar) return;
    const list = listRef.current;
    const row = list?.children.item(selectedIndex) ?? null;
    const previousRow = previousSelectedRowRef.current;
    previousSelectedRowRef.current = row;
    const activeElement = document.activeElement;
    const needsFocus =
      activeElement === document.body || activeElement?.getClientRects().length === 0;

    if (list && row) {
      const listBox = list.getBoundingClientRect();
      const rowBox = row.getBoundingClientRect();
      // Scroll only the schedule, without moving the page or the game details.
      list.scrollTo({
        top: list.scrollTop + rowBox.top - listBox.top - (list.clientHeight - rowBox.height) / 2,
        behavior: "instant",
      });
    }

    // Keep keyboard focus usable when the active card hides or the details panel closes.
    if (needsFocus) {
      (row ?? previousRow)?.querySelector("button")?.focus({ preventScroll: true });
    }
  }, [isSidebar, selectedGameId, selectedIndex]);

  if (isLoading && !schedule) return <ScheduleSkeleton />;

  if (error && !schedule) {
    return (
      <div className="flex min-h-72 w-full max-w-2xl flex-col items-center justify-center rounded-xl border border-gray-800 px-6 text-center">
        <AlertCircle className="mb-4 h-8 w-8 text-red-400" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-white">Schedule unavailable</h2>
        <p className="mt-2 max-w-sm text-sm text-gray-400">{error}</p>
        <Button
          type="button"
          onClick={onRetry}
          className="mt-5 min-h-11 bg-white text-black hover:bg-gray-200"
        >
          Try again
        </Button>
      </div>
    );
  }

  if (!schedule) return null;

  const weekIndex = schedule.weeks.findIndex((week) => week.number === schedule.week);
  const selectedWeek = schedule.weeks[weekIndex];
  const previousWeek = weekIndex > 0 ? schedule.weeks[weekIndex - 1] : null;
  const nextWeek = weekIndex < schedule.weeks.length - 1 ? schedule.weeks[weekIndex + 1] : null;

  return (
    <section
      data-testid="season-schedule"
      className="w-full max-w-2xl dashboard:flex dashboard:min-h-0 dashboard:flex-col"
      aria-labelledby="schedule-title"
    >
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => previousWeek && onSelectWeek(previousWeek.number)}
          disabled={!previousWeek || isLoading}
          aria-label={previousWeek ? `Show ${previousWeek.label}` : "No previous week"}
          className="flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-lg text-gray-300 transition-colors hover:bg-gray-900 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-30"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="min-w-0 text-center">
          <h2 id="schedule-title" className="sr-only">
            {schedule.weekLabel} schedule
          </h2>
          <label htmlFor="schedule-week" className="sr-only">
            Schedule week
          </label>
          <select
            id="schedule-week"
            name="week"
            value={schedule.week}
            onChange={(event) => onSelectWeek(Number.parseInt(event.target.value, 10))}
            disabled={isLoading}
            className="min-h-11 w-full max-w-52 touch-manipulation rounded-lg border border-gray-700 bg-gray-900 px-3 text-center text-base font-bold tabular-nums text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-60"
          >
            {schedule.weeks.map((week) => (
              <option key={week.number} value={week.number}>
                {schedule.phase === "preseason"
                  ? week.label.replace(/^Preseason /, "")
                  : week.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => nextWeek && onSelectWeek(nextWeek.number)}
          disabled={!nextWeek || isLoading}
          aria-label={nextWeek ? `Show ${nextWeek.label}` : "No next week"}
          className="flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-lg text-gray-300 transition-colors hover:bg-gray-900 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-30"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <div className="mb-3 mt-1 flex flex-wrap items-center justify-center gap-x-2 text-xs tabular-nums text-gray-400">
        {selectedWeek && (
          <p>
            <time dateTime={selectedWeek.startDate}>{formatWeekDate(selectedWeek.startDate)}</time>
            <span aria-hidden="true"> – </span>
            <span className="sr-only"> through </span>
            <time dateTime={selectedWeek.endDate}>{formatWeekDate(selectedWeek.endDate)}</time>
          </p>
        )}
        <p>
          {selectedWeek && <span aria-hidden="true">· </span>}
          {schedule.games.length} {schedule.games.length === 1 ? "game" : "games"}
        </p>
      </div>

      {pageCount > 1 && (
        <nav
          aria-label="Schedule games pages"
          className="mb-2 flex items-center justify-between gap-2 text-sm text-gray-300"
        >
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => changePage(page - 1)}
            className="min-h-11 touch-manipulation rounded px-3 hover:bg-gray-800 focus-visible:ring-2 focus-visible:ring-white disabled:opacity-40"
          >
            Previous games
          </button>
          <span className="tabular-nums">
            {page} / {pageCount}
          </span>
          <button
            type="button"
            disabled={page >= pageCount}
            onClick={() => changePage(page + 1)}
            className="min-h-11 touch-manipulation rounded px-3 hover:bg-gray-800 focus-visible:ring-2 focus-visible:ring-white disabled:opacity-40"
          >
            Next games
          </button>
        </nav>
      )}
      {schedule.games.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-gray-800 px-6 text-center">
          <h3 className="font-semibold text-white">Schedule not announced yet</h3>
          <p className="mt-2 max-w-sm text-sm text-gray-400">
            This week is on the calendar, but its matchups are not available yet. Try another week.
          </p>
        </div>
      ) : (
        <ul
          ref={listRef}
          className="divide-y divide-gray-800 overflow-hidden rounded-xl bg-gray-900 dashboard:min-h-0 dashboard:flex-1 dashboard:overflow-y-auto dashboard:overscroll-contain"
          aria-live="polite"
        >
          {visibleGames.map((game) => (
            <ScheduleGameRow key={game.id} game={game} />
          ))}
        </ul>
      )}
    </section>
  );
}
