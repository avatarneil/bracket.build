import { NextResponse } from "next/server";
import { fetchLiveResults } from "@/lib/espn-api";

// Cache the results for 10 seconds for near real-time updates
let cachedResults: Awaited<ReturnType<typeof fetchLiveResults>> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 10 * 1000; // 10 seconds

export async function GET() {
  const now = Date.now();

  // Return cached results if still valid
  if (cachedResults && now - cacheTimestamp < CACHE_TTL) {
    return NextResponse.json(cachedResults, {
      headers: {
        "Cache-Control": "public, max-age=10, stale-while-revalidate=30",
      },
    });
  }

  try {
    const results = await fetchLiveResults();
    cachedResults = results;
    cacheTimestamp = now;

    return NextResponse.json(results, {
      headers: {
        "Cache-Control": "public, max-age=10, stale-while-revalidate=30",
      },
    });
  } catch (error) {
    console.error("Failed to fetch live standings:", error);

    // If we have stale cached data, return it
    if (cachedResults) {
      return NextResponse.json(cachedResults, {
        headers: {
          "Cache-Control": "public, max-age=10, stale-while-revalidate=30",
          "X-Stale": "true",
        },
      });
    }

    return NextResponse.json(
      { error: "Failed to fetch live standings" },
      { status: 500 },
    );
  }
}
