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

  const fetchStats = useCallback(async () => {
    if (!eventId || !isOpen) return;

    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setState((previous) => ({
      eventId,
      stats: previous.eventId === eventId ? previous.stats : null,
      lastUpdated: previous.eventId === eventId ? previous.lastUpdated : null,
      isLoading: true,
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
      setState((previous) => ({
        ...previous,
        isLoading: false,
        error: e instanceof Error ? e : new Error("Unknown error"),
      }));
    }
  }, [eventId, isOpen]);

  useEffect(() => {
    fetchStats();
    return () => {
      request.current?.abort();
    };
  }, [fetchStats]);

  useEffect(() => {
    if (!eventId || !isOpen || !autoRefresh || (stats && !stats.isInProgress)) return;
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [eventId, isOpen, autoRefresh, stats, fetchStats]);

  useEffect(() => {
    if (!isOpen) {
      setState({ eventId: null, stats: null, isLoading: false, error: null, lastUpdated: null });
    }
  }, [isOpen]);

  return {
    stats,
    isLoading: current?.isLoading ?? Boolean(isOpen && eventId),
    error: current?.error ?? null,
    refetch: fetchStats,
    lastUpdated: current?.lastUpdated ?? null,
  };
}
