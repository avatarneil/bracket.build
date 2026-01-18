"use client";

import { useState, useEffect, useCallback } from "react";
import type { GameBoxscore } from "@/types";

interface UseGameStatsResult {
  stats: GameBoxscore | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  lastUpdated: Date | null;
}

export function useGameStats(
  eventId: string | null,
  isOpen: boolean,
  autoRefresh = true,
): UseGameStatsResult {
  const [stats, setStats] = useState<GameBoxscore | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStats = useCallback(async () => {
    if (!eventId) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/game-stats/${eventId}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch: ${res.status}`);
      }
      const data: GameBoxscore = await res.json();
      setStats(data);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  // Initial fetch when dialog opens
  useEffect(() => {
    if (!eventId || !isOpen) {
      return;
    }

    fetchStats();
  }, [eventId, isOpen, fetchStats]);

  // Auto-refresh for live games
  useEffect(() => {
    if (!eventId || !isOpen || !autoRefresh) {
      return;
    }

    // Only auto-refresh if game is in progress
    if (stats && !stats.isInProgress) {
      return;
    }

    const interval = setInterval(fetchStats, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, [eventId, isOpen, autoRefresh, stats, fetchStats]);

  // Clear state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setStats(null);
      setError(null);
      setLastUpdated(null);
    }
  }, [isOpen]);

  return {
    stats,
    isLoading,
    error,
    refetch: fetchStats,
    lastUpdated,
  };
}
