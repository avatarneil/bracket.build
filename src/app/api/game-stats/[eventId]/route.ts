import { NextResponse } from "next/server";
import { fetchGameBoxscore } from "@/lib/espn-boxscore";

export const dynamic = "force-dynamic";
export const revalidate = 30; // Cache for 30 seconds

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const { eventId } = await params;

    if (!eventId || !/^\d+$/.test(eventId)) {
      return NextResponse.json(
        { error: "Invalid event ID" },
        { status: 400 },
      );
    }

    const boxscore = await fetchGameBoxscore(eventId);

    return NextResponse.json(boxscore, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error("Error fetching game stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch game stats" },
      { status: 500 },
    );
  }
}
