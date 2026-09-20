import { NextResponse } from "next/server";
import { fetchGameBoxscore } from "@/lib/espn-boxscore";
import { loadHistoricalComparison } from "@/lib/db/historical-stats";
import { generateFacts } from "@/lib/ridiculous-stats/engine";
import type { RidiculousResponse } from "@/lib/ridiculous-stats/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const rawIndex = new URL(request.url).searchParams.get("index") ?? "0";
  if (!/^\d{1,12}$/.test(eventId) || !/^\d{1,5}$/.test(rawIndex))
    return NextResponse.json({ error: "Invalid game or stat index." }, { status: 400 });
  try {
    const stats = await fetchGameBoxscore(eventId);
    const context = stats.historicalContext;
    const empty = (message: string) =>
      NextResponse.json(
        {
          eventId,
          fact: null,
          count: 0,
          index: 0,
          live: stats.isInProgress,
          asOf: stats.fetchedAt,
          message,
        } satisfies RidiculousResponse,
        { headers: { "Cache-Control": "no-store" } },
      );
    if (!context)
      return empty(
        "Historical comparisons cover regular-season and playoff games from 1999 onward. Try another game.",
      );
    if (context.status === "pre")
      return empty("Game-specific comparisons start after kickoff. Check back once play begins.");
    const { history, imports, target } = await loadHistoricalComparison(
      eventId,
      context.teams.map((t) => t.team),
      context.teams[0].date,
    );
    if (!imports.length) return empty("The historical archive is being prepared. Try again later.");
    // Completed games use the same corrected source as the historical cohort.
    // Verify identity before substituting an imported box score for ESPN's.
    if (context.status === "final") {
      for (const team of context.teams) {
        const archived = target.find(
          (t) =>
            t.team === team.team &&
            t.opponent === team.opponent &&
            t.date === team.date &&
            t.phase === team.phase &&
            t.season === team.season,
        );
        if (archived?.metrics.points != null) team.metrics = archived.metrics;
      }
    }
    const facts = generateFacts(
      context,
      history,
      imports.map((i) => i.season),
    );
    if (!facts.length)
      return empty(
        "This game’s stats don’t support a rare historical comparison yet. Try another game or check back as play continues and the archive updates.",
      );
    const index = Number(rawIndex) % facts.length;
    return NextResponse.json(
      {
        eventId,
        fact: facts[index],
        count: facts.length,
        index,
        live: context.status === "live",
        asOf: context.fetchedAt,
      } satisfies RidiculousResponse,
      {
        headers: { "Cache-Control": "public, max-age=0, s-maxage=15, must-revalidate" },
      },
    );
  } catch {
    return NextResponse.json(
      { error: "Historical stats are temporarily unavailable. Try again." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
