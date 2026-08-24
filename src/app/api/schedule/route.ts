import { NextRequest, NextResponse } from "next/server";
import { fetchSeasonSchedule } from "@/lib/nfl-schedule";
import type { SeasonPhase } from "@/types";

const VALID_PHASES = new Set<SeasonPhase>(["preseason", "regular", "postseason"]);

export async function GET(request: NextRequest) {
  const phaseParam = request.nextUrl.searchParams.get("phase");
  if (phaseParam && !VALID_PHASES.has(phaseParam as SeasonPhase)) {
    return NextResponse.json({ error: "Invalid season phase" }, { status: 400 });
  }
  const phase =
    phaseParam && VALID_PHASES.has(phaseParam as SeasonPhase)
      ? (phaseParam as SeasonPhase)
      : undefined;
  const weekParam = request.nextUrl.searchParams.get("week");
  const week = weekParam ? Number.parseInt(weekParam, 10) : undefined;
  const seasonParam = request.nextUrl.searchParams.get("season");
  const season = seasonParam ? Number.parseInt(seasonParam, 10) : undefined;

  try {
    const schedule = await fetchSeasonSchedule(
      phase,
      Number.isFinite(week) ? week : undefined,
      Number.isFinite(season) ? season : undefined,
    );
    return NextResponse.json(schedule, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("Failed to fetch NFL schedule:", error);
    return NextResponse.json({ error: "Failed to fetch the NFL schedule" }, { status: 502 });
  }
}
