"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GameBoxscore } from "@/types";

interface UseGameStatsResult {
  stats: GameBoxscore | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  lastUpdated: Date | null;
}

type StatsState = Omit<UseGameStatsResult, "refetch"> & { eventId: string | null };

export function useGameStats(
  eventId: string | null,
  isOpen: boolean,
  autoRefresh = true,
): UseGameStatsResult {
  const [state, setState] = useState<StatsState>({
    eventId: null,
    stats: null,
    isLoading: false,
    error: null,
    lastUpdated: null,
  });
  const request = useRef<AbortController | null>(null);
  // Never render the previous game's data, even before effect cleanup runs.
  const current = isOpen && state.eventId === eventId ? state : null;
  const stats = current?.stats ?? null;

  const fetchStats = useCallback(
    async (background = false) => {
      if (!eventId || !isOpen) return;
      if (request.current && !request.current.signal.aborted) return;

      const controller = new AbortController();
      request.current = controller;
      setState((previous) => ({
        eventId,
        stats: previous.eventId === eventId ? previous.stats : null,
        lastUpdated: previous.eventId === eventId ? previous.lastUpdated : null,
        isLoading: background ? previous.isLoading : true,
        error: null,
      }));

      try {
        const res = await fetch(`/api/game-stats/${eventId}`, { signal: controller.signal });
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
        const data: GameBoxscore = await res.json();
        if (data.eventId !== eventId) throw new Error("Game stats do not match the requested game");
        if (controller.signal.aborted) return;
        setState({ eventId, stats: data, lastUpdated: new Date(), isLoading: false, error: null });
      } catch (e) {
        if (controller.signal.aborted) return;
        if (!background) {
          setState((previous) => ({
            ...previous,
            isLoading: false,
            error: e instanceof Error ? e : new Error("Unknown error"),
          }));
        }
      } finally {
        if (request.current === controller) request.current = null;
      }
    },
    [eventId, isOpen],
  );

  useEffect(() => {
    void fetchStats(false);
    return () => {
      request.current?.abort();
    };
  }, [fetchStats]);

  const isComplete = stats?.isComplete ?? false;
  const isLive = stats?.isInProgress ?? true;
  useEffect(() => {
    if (!eventId || !isOpen || !autoRefresh || isComplete) return;
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") void fetchStats(true);
    };
    const interval = setInterval(refreshIfVisible, isLive ? 3_000 : 60_000);
    document.addEventListener("visibilitychange", refreshIfVisible);
    window.addEventListener("focus", refreshIfVisible);
    window.addEventListener("online", refreshIfVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshIfVisible);
      window.removeEventListener("focus", refreshIfVisible);
      window.removeEventListener("online", refreshIfVisible);
    };
  }, [eventId, isOpen, autoRefresh, isComplete, isLive, fetchStats]);

  useEffect(() => {
    if (!isOpen) {
      setState({ eventId: null, stats: null, isLoading: false, error: null, lastUpdated: null });
    }
  }, [isOpen]);

  return {
    stats,
    isLoading: current?.isLoading ?? Boolean(isOpen && eventId),
    error: current?.error ?? null,
    refetch: () => fetchStats(false),
    lastUpdated: current?.lastUpdated ?? null,
  };
}
