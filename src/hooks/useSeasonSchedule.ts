"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SeasonPhase, SeasonSchedule } from "@/types";

const VALID_PHASES = new Set<SeasonPhase>(["preseason", "regular", "postseason"]);

export function useSeasonSchedule() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const phaseParam = searchParams.get("phase");
  const requestedPhase =
    phaseParam && VALID_PHASES.has(phaseParam as SeasonPhase) ? (phaseParam as SeasonPhase) : null;
  const seasonParam = searchParams.get("season");
  const requestedSeason = seasonParam ? Number.parseInt(seasonParam, 10) : null;
  const weekParam = searchParams.get("week");
  const requestedWeek = weekParam ? Number.parseInt(weekParam, 10) : null;
  const [schedule, setSchedule] = useState<SeasonSchedule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const requestUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (requestedPhase) params.set("phase", requestedPhase);
    if (Number.isFinite(requestedSeason)) params.set("season", requestedSeason!.toString());
    if (requestedPhase && Number.isFinite(requestedWeek)) {
      params.set("week", requestedWeek!.toString());
    }
    const query = params.toString();
    return query ? `/api/schedule?${query}` : "/api/schedule";
  }, [requestedPhase, requestedSeason, requestedWeek]);

  const loadSchedule = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(requestUrl);
      if (!response.ok) throw new Error(`Schedule request failed: ${response.status}`);
      const nextSchedule: SeasonSchedule = await response.json();
      if (requestId === requestIdRef.current) setSchedule(nextSchedule);
    } catch (requestError) {
      if (requestId !== requestIdRef.current) return;
      console.error("Failed to load schedule:", requestError);
      setError("We couldn't load the schedule. Check your connection and try again.");
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  }, [requestUrl]);

  useEffect(() => {
    void loadSchedule();
    return () => {
      requestIdRef.current += 1;
    };
  }, [loadSchedule]);

  const hasLiveGames = schedule?.games.some((game) => game.isInProgress) ?? false;
  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") void loadSchedule();
    };
    const interval = window.setInterval(refreshIfVisible, hasLiveGames ? 10_000 : 60_000);
    document.addEventListener("visibilitychange", refreshIfVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [loadSchedule, hasLiveGames]);

  const updateSelection = useCallback(
    (phase: SeasonPhase, seasonYear: number, week?: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("phase", phase);
      params.set("season", seasonYear.toString());
      if (week === undefined) params.delete("week");
      else params.set("week", week.toString());
      params.delete("view");
      params.delete("game");
      params.delete("tab");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return {
    schedule,
    selectedPhase: requestedPhase ?? schedule?.phase ?? null,
    isLoading,
    error,
    retry: loadSchedule,
    selectPhase: (phase: SeasonPhase) => {
      if (schedule) updateSelection(phase, schedule.seasonYear);
    },
    selectSeason: (seasonYear: number) => {
      if (schedule) updateSelection(schedule.phase, seasonYear);
    },
    selectWeek: (week: number) => {
      if (schedule) updateSelection(schedule.phase, schedule.seasonYear, week);
    },
  };
}
