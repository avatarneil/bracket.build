import { NextRequest, NextResponse } from "next/server";
import { fetchSeasonSchedule } from "@/lib/football-schedule";
import { isFootballLeague } from "@/lib/football-league";
import type { SeasonPhase } from "@/types";

const VALID_PHASES = new Set<SeasonPhase>(["preseason", "regular", "postseason"]);

export async function GET(request: NextRequest) {
  const league = request.nextUrl.searchParams.get("league") ?? "nfl";
  if (!isFootballLeague(league)) {
    return NextResponse.json({ error: "Invalid football league" }, { status: 400 });
  }
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
      league,
    );
    return NextResponse.json(schedule, {
      headers: { "Cache-Control": "public, max-age=0, s-maxage=5, must-revalidate" },
    });
  } catch (error) {
    console.error("Failed to fetch football schedule:", error);
    return NextResponse.json({ error: "Failed to fetch the football schedule" }, { status: 502 });
  }
}
