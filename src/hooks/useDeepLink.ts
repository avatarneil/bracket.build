"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { ViewMode } from "@/types";

export type TabId = "stats" | "leaders" | "plays" | "momentum";

export interface DeepLinkState {
  view: ViewMode;
  gameId: string | null;
  tab: TabId;
}

const VALID_VIEWS: ViewMode[] = ["bracket", "live-games"];
const VALID_TABS: TabId[] = ["stats", "leaders", "plays", "momentum"];

/**
 * Validates and returns a valid view mode, defaulting to "bracket"
 */
function parseView(value: string | null): ViewMode {
  if (value && VALID_VIEWS.includes(value as ViewMode)) {
    return value as ViewMode;
  }
  return "bracket";
}

/**
 * Validates and returns a valid tab ID, defaulting to "stats"
 */
function parseTab(value: string | null): TabId {
  if (value && VALID_TABS.includes(value as TabId)) {
    return value as TabId;
  }
  return "stats";
}

/**
 * Central hook for managing URL state (deep linking)
 *
 * Provides read/write access to URL parameters:
 * - view: "bracket" | "live-games"
 * - game: matchup ID (e.g., "afc-wc-1", "nfc-div-2", "super-bowl")
 * - tab: "stats" | "leaders" | "plays" | "momentum"
 */
export function useDeepLink() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isHydrated, setIsHydrated] = useState(false);

  // Mark as hydrated after first render
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Parse current URL state
  const state: DeepLinkState = {
    view: parseView(searchParams.get("view")),
    gameId: searchParams.get("game"),
    tab: parseTab(searchParams.get("tab")),
  };

  /**
   * Update URL with new params without page reload
   */
  const updateUrl = useCallback(
    (updates: Partial<DeepLinkState>) => {
      const params = new URLSearchParams(searchParams.toString());

      // Handle view parameter
      if (updates.view !== undefined) {
        if (updates.view === "bracket") {
          params.delete("view"); // Default, don't need in URL
        } else {
          params.set("view", updates.view);
        }
      }

      // Handle game parameter
      if (updates.gameId !== undefined) {
        if (updates.gameId === null) {
          params.delete("game");
          params.delete("tab"); // Clear tab when closing game
        } else {
          params.set("game", updates.gameId);
        }
      }

      // Handle tab parameter
      if (updates.tab !== undefined && updates.gameId !== null && state.gameId !== null) {
        if (updates.tab === "stats") {
          params.delete("tab"); // Default, don't need in URL
        } else {
          params.set("tab", updates.tab);
        }
      }

      // Build new URL
      const paramString = params.toString();
      const newUrl = paramString ? `${pathname}?${paramString}` : pathname;

      // Use replace to avoid polluting browser history with every state change
      router.replace(newUrl, { scroll: false });
    },
    [pathname, router, searchParams, state.gameId],
  );

  /**
   * Set the view mode (bracket or live-games)
   */
  const setView = useCallback(
    (view: ViewMode) => {
      updateUrl({ view });
    },
    [updateUrl],
  );

  /**
   * Open a game dialog with optional tab
   */
  const openGame = useCallback(
    (gameId: string, tab?: TabId) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("game", gameId);
      if (tab && tab !== "stats") {
        params.set("tab", tab);
      } else {
        params.delete("tab");
      }
      const paramString = params.toString();
      const newUrl = paramString ? `${pathname}?${paramString}` : pathname;
      router.replace(newUrl, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  /**
   * Close the game dialog
   */
  const closeGame = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("game");
    params.delete("tab");
    const paramString = params.toString();
    const newUrl = paramString ? `${pathname}?${paramString}` : pathname;
    router.replace(newUrl, { scroll: false });
  }, [pathname, router, searchParams]);

  /**
   * Set the active tab in the game dialog
   */
  const setTab = useCallback(
    (tab: TabId) => {
      if (!state.gameId) return; // Only set tab if game is open
      updateUrl({ tab });
    },
    [state.gameId, updateUrl],
  );

  return {
    state,
    isHydrated,
    setView,
    openGame,
    closeGame,
    setTab,
  };
}
