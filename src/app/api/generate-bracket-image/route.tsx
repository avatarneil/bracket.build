import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import type { BracketState, Matchup, SeededTeam } from "@/types";

export const runtime = "edge";

interface RequestBody {
  bracket: BracketState;
  userName: string;
  bracketName: string;
}

// Cache for fetched logo data URIs
const logoCache = new Map<string, string>();

async function fetchLogoAsDataUri(url: string): Promise<string> {
  if (logoCache.has(url)) {
    return logoCache.get(url)!;
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; NFLBracket/1.0)",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const contentType = response.headers.get("content-type") || "image/png";
    const dataUri = `data:${contentType};base64,${base64}`;

    logoCache.set(url, dataUri);
    return dataUri;
  } catch (error) {
    console.error("Failed to fetch logo:", url, error);
    // Return transparent 1x1 pixel as fallback
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
  }
}

// Collect all team logos from the bracket
function collectLogos(bracket: BracketState): string[] {
  const logos = new Set<string>();

  const addTeamLogo = (team: SeededTeam | null) => {
    if (team?.logoUrl) {
      logos.add(team.logoUrl);
    }
  };

  const addMatchupLogos = (matchup: Matchup | null) => {
    if (matchup) {
      addTeamLogo(matchup.homeTeam);
      addTeamLogo(matchup.awayTeam);
      addTeamLogo(matchup.winner);
    }
  };

  // AFC
  bracket.afc.wildCard.forEach(addMatchupLogos);
  bracket.afc.divisional.forEach(addMatchupLogos);
  addMatchupLogos(bracket.afc.championship);

  // NFC
  bracket.nfc.wildCard.forEach(addMatchupLogos);
  bracket.nfc.divisional.forEach(addMatchupLogos);
  addMatchupLogos(bracket.nfc.championship);

  // Super Bowl
  addMatchupLogos(bracket.superBowl);

  return Array.from(logos);
}

// Pre-fetch all logos and return a map
async function prefetchLogos(logoUrls: string[]): Promise<Map<string, string>> {
  const entries = await Promise.all(
    logoUrls.map(async (url) => {
      const dataUri = await fetchLogoAsDataUri(url);
      return [url, dataUri] as const;
    }),
  );
  return new Map(entries);
}

// Team card component for Satori - scaled for 4K
function TeamCardImage({
  team,
  isWinner,
  logoMap,
}: {
  team: SeededTeam | null;
  isWinner: boolean;
  logoMap: Map<string, string>;
}) {
  if (!team) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px 30px",
          backgroundColor: "#1f2937",
          borderRadius: 16,
          border: "4px dashed #4b5563",
          height: 120,
          width: 420,
          color: "#6b7280",
          fontSize: 32,
        }}
      >
        TBD
      </div>
    );
  }

  const logoDataUri = logoMap.get(team.logoUrl) || team.logoUrl;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "16px 24px",
        backgroundColor: isWinner ? "rgba(212, 190, 140, 0.15)" : "#1f2937",
        borderRadius: 16,
        border: isWinner ? "4px solid #D4BE8C" : "4px solid #4b5563",
        borderLeftWidth: 10,
        borderLeftColor: isWinner ? "#D4BE8C" : team.primaryColor,
        height: 120,
        width: 420,
      }}
    >
      <img
        src={logoDataUri}
        alt=""
        width={70}
        height={70}
        style={{
          backgroundColor: "#ffffff",
          borderRadius: 10,
          padding: 4,
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 44,
          height: 44,
          backgroundColor: team.primaryColor,
          borderRadius: 22,
          color: "#ffffff",
          fontSize: 24,
          fontWeight: 700,
        }}
      >
        {team.seed}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
        }}
      >
        <div
          style={{
            display: "flex",
            color: "#ffffff",
            fontSize: 32,
            fontWeight: 600,
          }}
        >
          {team.name}
        </div>
        <div
          style={{
            display: "flex",
            color: "#9ca3af",
            fontSize: 24,
          }}
        >
          {team.city}
        </div>
      </div>
    </div>
  );
}

// Matchup component
function MatchupImage({
  matchup,
  logoMap,
}: {
  matchup: Matchup;
  logoMap: Map<string, string>;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <TeamCardImage
        team={matchup.homeTeam}
        isWinner={matchup.winner?.id === matchup.homeTeam?.id}
        logoMap={logoMap}
      />
      <TeamCardImage
        team={matchup.awayTeam}
        isWinner={matchup.winner?.id === matchup.awayTeam?.id}
        logoMap={logoMap}
      />
    </div>
  );
}

// Round column component
function RoundColumn({
  title,
  matchups,
  logoMap,
  gap = 40,
}: {
  title: string;
  matchups: Matchup[];
  logoMap: Map<string, string>;
  gap?: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: gap,
        minWidth: 440,
      }}
    >
      <div
        style={{
          display: "flex",
          color: "#9ca3af",
          fontSize: 24,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: 2,
        }}
      >
        {title}
      </div>
      {matchups.map((matchup) => (
        <MatchupImage key={matchup.id} matchup={matchup} logoMap={logoMap} />
      ))}
    </div>
  );
}

// Conference bracket component
function ConferenceBracketImage({
  conference,
  bracket,
  logoMap,
  reversed = false,
}: {
  conference: "AFC" | "NFC";
  bracket: BracketState;
  logoMap: Map<string, string>;
  reversed?: boolean;
}) {
  const confState = conference === "AFC" ? bracket.afc : bracket.nfc;
  const isAFC = conference === "AFC";

  const rounds = [
    {
      title: "Wild Card",
      matchups: confState.wildCard,
      gap: 30,
    },
    {
      title: "Divisional",
      matchups: confState.divisional,
      gap: 160,
    },
    {
      title: `${conference} Champ`,
      matchups: confState.championship ? [confState.championship] : [],
      gap: 30,
    },
  ];

  const orderedRounds = reversed ? [...rounds].reverse() : rounds;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: reversed ? "flex-end" : "flex-start",
        }}
      >
        <div
          style={{
            display: "flex",
            backgroundColor: isAFC ? "#b91c1c" : "#1d4ed8",
            color: "#ffffff",
            padding: "10px 32px",
            borderRadius: 10,
            fontWeight: 700,
            fontSize: 28,
          }}
        >
          {conference}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 30,
        }}
      >
        {orderedRounds.map((round) => (
          <RoundColumn
            key={round.title}
            title={round.title}
            matchups={round.matchups}
            logoMap={logoMap}
            gap={round.gap}
          />
        ))}
      </div>
    </div>
  );
}

// Super Bowl component
function SuperBowlImage({
  bracket,
  logoMap,
}: {
  bracket: BracketState;
  logoMap: Map<string, string>;
}) {
  const { superBowl } = bracket;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 24,
        minWidth: 480,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", fontSize: 64 }}>🏆</div>
        <div
          style={{
            display: "flex",
            backgroundColor: "#000000",
            border: "2px solid rgba(255,255,255,0.2)",
            padding: "10px 40px",
            borderRadius: 10,
            color: "#ffffff",
            fontWeight: 700,
            fontSize: 28,
            textTransform: "uppercase",
            letterSpacing: 3,
          }}
        >
          Super Bowl LX
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
          backgroundColor: "rgba(31, 41, 55, 0.5)",
          border: "4px solid rgba(212, 190, 140, 0.3)",
          borderRadius: 24,
          padding: 40,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              color: "#f87171",
              fontSize: 20,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 2,
            }}
          >
            AFC Champion
          </div>
          <TeamCardImage
            team={superBowl?.homeTeam || null}
            isWinner={superBowl?.winner?.id === superBowl?.homeTeam?.id}
            logoMap={logoMap}
          />
        </div>

        <div
          style={{
            display: "flex",
            color: "#6b7280",
            fontSize: 40,
            fontWeight: 700,
          }}
        >
          VS
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              color: "#60a5fa",
              fontSize: 20,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 2,
            }}
          >
            NFC Champion
          </div>
          <TeamCardImage
            team={superBowl?.awayTeam || null}
            isWinner={superBowl?.winner?.id === superBowl?.awayTeam?.id}
            logoMap={logoMap}
          />
        </div>

        {superBowl?.winner && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
              backgroundColor: "rgba(212, 190, 140, 0.15)",
              padding: "24px 40px",
              borderRadius: 16,
              marginTop: 16,
            }}
          >
            <div style={{ display: "flex", fontSize: 48 }}>🏆</div>
            <div
              style={{
                display: "flex",
                color: "#D4BE8C",
                fontSize: 20,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: 2,
              }}
            >
              Champion
            </div>
            <div
              style={{
                display: "flex",
                color: "#ffffff",
                fontSize: 36,
                fontWeight: 700,
              }}
            >
              {superBowl.winner.city} {superBowl.winner.name}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { bracket, userName, bracketName } = body;

    // Prefetch all logos
    const logoUrls = collectLogos(bracket);
    const logoMap = await prefetchLogos(logoUrls);

    // 4K Image dimensions
    const width = 3840;
    const height = 2160;

    return new ImageResponse(
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#000000",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: 140,
            background:
              "linear-gradient(90deg, #dc2626 0%, #1f1f1f 50%, #2563eb 100%)",
          }}
        >
          <div
            style={{
              display: "flex",
              color: "#ffffff",
              fontSize: 52,
              fontWeight: 700,
            }}
          >
            {userName}&apos;s Playoff Bracket
          </div>
          {bracketName && (
            <div
              style={{
                display: "flex",
                color: "#a1a1aa",
                fontSize: 28,
                marginTop: 6,
              }}
            >
              {bracketName}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: "40px 80px",
            gap: 60,
          }}
        >
          <ConferenceBracketImage
            conference="AFC"
            bracket={bracket}
            logoMap={logoMap}
          />
          <SuperBowlImage bracket={bracket} logoMap={logoMap} />
          <ConferenceBracketImage
            conference="NFC"
            bracket={bracket}
            logoMap={logoMap}
            reversed
          />
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            padding: "16px 40px",
            color: "#6b7280",
            fontSize: 26,
            fontWeight: 600,
          }}
        >
          bracket.build • NFL Playoffs 2025-26
        </div>
      </div>,
      {
        width,
        height,
      },
    );
  } catch (error) {
    console.error("Error generating bracket image:", error);
    return new Response(JSON.stringify({ error: "Failed to generate image" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
