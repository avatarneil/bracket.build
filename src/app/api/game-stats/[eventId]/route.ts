import { isFootballLeague } from "@/lib/football-league";
import { NextResponse } from "next/server";
import { fetchGameBoxscore } from "@/lib/espn-boxscore";

export const dynamic = "force-dynamic";
export const revalidate = 5;

export async function GET(_request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const league = new URL(_request.url).searchParams.get("league") ?? "nfl";
  if (!isFootballLeague(league))
    return NextResponse.json({ error: "Invalid football league" }, { status: 400 });
  try {
    const { eventId } = await params;

    if (!eventId || !/^\d+$/.test(eventId)) {
      return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
    }

    const boxscore = await fetchGameBoxscore(eventId, league);

    return NextResponse.json(boxscore, {
      headers: {
        "Cache-Control": "public, max-age=0, s-maxage=5, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Error fetching game stats:", error);
    return NextResponse.json({ error: "Failed to fetch game stats" }, { status: 500 });
  }
}
