"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import type { BracketState } from "@/types";
import {
  applyPicksToFreshBracket,
  decodeBracketPicks,
  generateShareableUrl,
  parseUrlParams,
} from "@/lib/url-encoding";

export interface UrlState {
  /** Whether the current view is from a shared URL */
  isSharedBracket: boolean;
  /** The name of the bracket owner from URL params */
  sharedBracketOwner: string | null;
  /** Initial view mode from URL (null = default bracket view, "live" = live games view) */
  initialViewMode: "live" | "bracket" | null;
  /** Decoded bracket from URL params (null if not a shared link) */
  sharedBracket: BracketState | null;
  /** Generate a shareable URL for the given bracket */
  generateUrl: (bracket: BracketState) => string;
}

/**
 * Hook to handle URL-based state for bracket sharing
 *
 * Must be used within a Suspense boundary (required by useSearchParams)
 */
export function useUrlState(): UrlState {
  const searchParams = useSearchParams();

  const urlState = useMemo(() => {
    const { encodedBracket, userName, viewMode } = parseUrlParams(searchParams);

    let sharedBracket: BracketState | null = null;
    if (encodedBracket) {
      try {
        const codes = decodeBracketPicks(encodedBracket);
        sharedBracket = applyPicksToFreshBracket(codes, userName || "Someone");
      } catch (e) {
        console.error("Failed to decode bracket from URL:", e);
      }
    }

    return {
      isSharedBracket: !!encodedBracket,
      sharedBracketOwner: userName,
      initialViewMode: viewMode,
      sharedBracket,
    };
  }, [searchParams]);

  return {
    ...urlState,
    generateUrl: generateShareableUrl,
  };
}
