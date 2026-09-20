import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { syncHistory } from "@/lib/ridiculous-stats/sync";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret)
    return NextResponse.json({ error: "History sync is not configured." }, { status: 503 });
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    return NextResponse.json(
      { seasons: await syncHistory() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    console.error("NFL history sync failed; previously imported seasons remain available.");
    return NextResponse.json(
      { error: "Historical sync failed. Rerun to resume." },
      { status: 502 },
    );
  }
}
