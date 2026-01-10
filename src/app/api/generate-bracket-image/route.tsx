import { ImageResponse } from "@vercel/og";
import { type NextRequest, NextResponse } from "next/server";
import type { BracketState, Matchup, SeededTeam } from "@/types";

export const runtime = "edge";

interface TeamCardData {
  team: SeededTeam | null;
  isWinner?: boolean;
  isLoser?: boolean;
}

/**
 * Convert ArrayBuffer to base64 string (Edge-compatible, no Buffer needed)
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Fetches an image and returns it as a base64 data URI
 */
async function fetchImageAsBase64(url: string): Promise<string> {
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
    const base64 = arrayBufferToBase64(arrayBuffer);
    const contentType = response.headers.get("content-type") || "image/png";
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error("Failed to fetch image:", url, error);
    // Return a transparent 1x1 pixel as fallback
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
  }
}

/**
 * Collects all unique team logo URLs from the bracket
 */
function collectTeamLogos(bracket: BracketState): string[] {
  const urls = new Set<string>();

  const addTeamLogo = (team: SeededTeam | null) => {
    if (team?.logoUrl) {
      urls.add(team.logoUrl);
    }
  };

  // AFC
  bracket.afc.wildCard.forEach((m) => {
    addTeamLogo(m.homeTeam);
    addTeamLogo(m.awayTeam);
    addTeamLogo(m.winner);
  });
  bracket.afc.divisional.forEach((m) => {
    addTeamLogo(m.homeTeam);
    addTeamLogo(m.awayTeam);
    addTeamLogo(m.winner);
  });
  if (bracket.afc.championship) {
    addTeamLogo(bracket.afc.championship.homeTeam);
    addTeamLogo(bracket.afc.championship.awayTeam);
    addTeamLogo(bracket.afc.championship.winner);
  }

  // NFC
  bracket.nfc.wildCard.forEach((m) => {
    addTeamLogo(m.homeTeam);
    addTeamLogo(m.awayTeam);
    addTeamLogo(m.winner);
  });
  bracket.nfc.divisional.forEach((m) => {
    addTeamLogo(m.homeTeam);
    addTeamLogo(m.awayTeam);
    addTeamLogo(m.winner);
  });
  if (bracket.nfc.championship) {
    addTeamLogo(bracket.nfc.championship.homeTeam);
    addTeamLogo(bracket.nfc.championship.awayTeam);
    addTeamLogo(bracket.nfc.championship.winner);
  }

  // Super Bowl
  if (bracket.superBowl) {
    addTeamLogo(bracket.superBowl.homeTeam);
    addTeamLogo(bracket.superBowl.awayTeam);
    addTeamLogo(bracket.superBowl.winner);
  }

  return Array.from(urls);
}

function TeamCard({
  team,
  isWinner = false,
  isLoser = false,
  logoMap,
}: TeamCardData & { logoMap: Map<string, string> }) {
  if (!team) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 12px",
          height: "48px",
          borderRadius: "8px",
          border: "2px dashed #4b5563",
          backgroundColor: "rgba(31, 41, 55, 0.5)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "32px",
            height: "32px",
            borderRadius: "4px",
            backgroundColor: "#374151",
            color: "#6b7280",
            fontSize: "12px",
          }}
        >
          ?
        </div>
        <span style={{ color: "#6b7280", fontSize: "14px" }}>TBD</span>
      </div>
    );
  }

  const logoSrc = logoMap.get(team.logoUrl) || team.logoUrl;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "8px 12px",
        height: "48px",
        borderRadius: "8px",
        border: isWinner ? "2px solid #D4BE8C" : "2px solid #4b5563",
        backgroundColor: isWinner
          ? "rgba(212, 190, 140, 0.15)"
          : isLoser
            ? "rgba(31, 41, 55, 0.5)"
            : "#1f2937",
        borderLeft: `6px solid ${isWinner ? "#D4BE8C" : team.primaryColor}`,
        opacity: isLoser ? 0.5 : 1,
        minWidth: "170px",
      }}
    >
      {/* Team Logo - using img because @vercel/og doesn't support next/image */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "32px",
          height: "32px",
          borderRadius: "4px",
          backgroundColor: "white",
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        {/* biome-ignore lint/performance/noImgElement: @vercel/og requires native img element */}
        <img
          src={logoSrc}
          alt={team.name}
          width={28}
          height={28}
          style={{ objectFit: "contain" }}
        />
      </div>

      {/* Seed Badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "20px",
          height: "20px",
          borderRadius: "10px",
          backgroundColor: team.primaryColor,
          color: "white",
          fontSize: "11px",
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {team.seed}
      </div>

      {/* Team Info */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          minWidth: 0,
          flex: 1,
        }}
      >
        <span
          style={{
            color: "white",
            fontSize: "14px",
            fontWeight: 600,
          }}
        >
          {team.name}
        </span>
        <span
          style={{
            color: "#9ca3af",
            fontSize: "11px",
          }}
        >
          {team.city}
        </span>
      </div>

      {/* Winner Checkmark */}
      {isWinner && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "18px",
            height: "18px",
            borderRadius: "9px",
            backgroundColor: "#D4BE8C",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: "10px", color: "#0f172a" }}>✓</span>
        </div>
      )}
    </div>
  );
}

function MatchupComponent({
  matchup,
  logoMap,
}: {
  matchup: Matchup;
  logoMap: Map<string, string>;
}) {
  const { homeTeam, awayTeam, winner } = matchup;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <TeamCard
        team={homeTeam}
        isWinner={winner?.id === homeTeam?.id}
        isLoser={winner !== null && winner?.id !== homeTeam?.id}
        logoMap={logoMap}
      />
      <TeamCard
        team={awayTeam}
        isWinner={winner?.id === awayTeam?.id}
        isLoser={winner !== null && winner?.id !== awayTeam?.id}
        logoMap={logoMap}
      />
    </div>
  );
}

function ConferenceBracketComponent({
  conference,
  confState,
  logoMap,
  isReversed = false,
}: {
  conference: "AFC" | "NFC";
  confState: BracketState["afc"] | BracketState["nfc"];
  logoMap: Map<string, string>;
  isReversed?: boolean;
}) {
  const isAFC = conference === "AFC";

  const roundsContent = (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "20px",
        flexDirection: isReversed ? "row-reverse" : "row",
      }}
    >
      {/* Wild Card Round */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          width: "190px",
        }}
      >
        <div
          style={{
            textAlign: "center",
            fontSize: "11px",
            fontWeight: 600,
            textTransform: "uppercase",
            color: "#9ca3af",
          }}
        >
          Wild Card
        </div>
        {confState.wildCard.map((matchup) => (
          <MatchupComponent
            key={matchup.id}
            matchup={matchup}
            logoMap={logoMap}
          />
        ))}
      </div>

      {/* Divisional Round */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "48px",
          width: "190px",
          paddingTop: "40px",
        }}
      >
        <div
          style={{
            textAlign: "center",
            fontSize: "11px",
            fontWeight: 600,
            textTransform: "uppercase",
            color: "#9ca3af",
            marginTop: "-40px",
          }}
        >
          Divisional
        </div>
        {confState.divisional.map((matchup) => (
          <MatchupComponent
            key={matchup.id}
            matchup={matchup}
            logoMap={logoMap}
          />
        ))}
      </div>

      {/* Conference Championship */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "190px",
          paddingTop: "100px",
        }}
      >
        <div
          style={{
            textAlign: "center",
            fontSize: "11px",
            fontWeight: 600,
            textTransform: "uppercase",
            color: "#9ca3af",
            marginBottom: "4px",
          }}
        >
          {conference} Champ
        </div>
        {confState.championship && (
          <MatchupComponent
            matchup={confState.championship}
            logoMap={logoMap}
          />
        )}
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {/* Conference Header */}
      <div
        style={{
          display: "flex",
          justifyContent: isReversed ? "flex-end" : "flex-start",
        }}
      >
        <div
          style={{
            padding: "6px 16px",
            borderRadius: "6px",
            backgroundColor: isAFC ? "#b91c1c" : "#1d4ed8",
            color: "white",
            fontWeight: 700,
            fontSize: "14px",
          }}
        >
          {conference}
        </div>
      </div>

      {roundsContent}
    </div>
  );
}

function SuperBowlComponent({
  superBowl,
  logoMap,
}: {
  superBowl: Matchup | null;
  logoMap: Map<string, string>;
}) {
  if (!superBowl) return null;

  const { homeTeam, awayTeam, winner } = superBowl;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "12px",
      }}
    >
      {/* Trophy emoji */}
      <div style={{ fontSize: "36px" }}>🏆</div>

      {/* Super Bowl Header */}
      <div
        style={{
          padding: "6px 20px",
          borderRadius: "6px",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          backgroundColor: "black",
          color: "white",
          fontWeight: 700,
          fontSize: "14px",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        Super Bowl LX
      </div>

      {/* Matchup Container */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "12px",
          padding: "16px",
          borderRadius: "12px",
          border: "2px solid rgba(212, 190, 140, 0.3)",
          backgroundColor: "rgba(31, 41, 55, 0.5)",
        }}
      >
        {/* AFC Champion */}
        <div
          style={{ display: "flex", flexDirection: "column", width: "200px" }}
        >
          <div
            style={{
              textAlign: "center",
              fontSize: "10px",
              fontWeight: 600,
              textTransform: "uppercase",
              color: "#f87171",
              marginBottom: "4px",
            }}
          >
            AFC Champion
          </div>
          <TeamCard
            team={homeTeam}
            isWinner={winner?.id === homeTeam?.id}
            isLoser={winner !== null && winner?.id !== homeTeam?.id}
            logoMap={logoMap}
          />
        </div>

        {/* VS */}
        <div
          style={{
            fontSize: "20px",
            fontWeight: 700,
            color: "#6b7280",
          }}
        >
          VS
        </div>

        {/* NFC Champion */}
        <div
          style={{ display: "flex", flexDirection: "column", width: "200px" }}
        >
          <div
            style={{
              textAlign: "center",
              fontSize: "10px",
              fontWeight: 600,
              textTransform: "uppercase",
              color: "#60a5fa",
              marginBottom: "4px",
            }}
          >
            NFC Champion
          </div>
          <TeamCard
            team={awayTeam}
            isWinner={winner?.id === awayTeam?.id}
            isLoser={winner !== null && winner?.id !== awayTeam?.id}
            logoMap={logoMap}
          />
        </div>

        {/* Champion Display */}
        {winner && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
              marginTop: "8px",
              padding: "12px 20px",
              borderRadius: "8px",
              backgroundColor: "rgba(212, 190, 140, 0.15)",
            }}
          >
            <div style={{ fontSize: "28px" }}>🏆</div>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  color: "#D4BE8C",
                }}
              >
                Super Bowl Champion
              </div>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "white",
                }}
              >
                {winner.city} {winner.name}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BracketImage({
  bracket,
  logoMap,
}: {
  bracket: BracketState;
  logoMap: Map<string, string>;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        backgroundColor: "#000000",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Header with gradient */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "70px",
          background:
            "linear-gradient(to right, #DC2626, #1f1f1f 50%, #2563EB)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <span
            style={{
              color: "white",
              fontSize: "24px",
              fontWeight: 700,
            }}
          >
            {bracket.userName}
            {"'"}s Playoff Bracket
          </span>
          {bracket.name && (
            <span
              style={{
                color: "#a1a1aa",
                fontSize: "14px",
              }}
            >
              {bracket.name}
            </span>
          )}
        </div>
      </div>

      {/* Main Bracket Content */}
      <div
        style={{
          display: "flex",
          flex: 1,
          padding: "24px",
          alignItems: "flex-start",
          justifyContent: "center",
          gap: "24px",
        }}
      >
        {/* AFC Bracket */}
        <ConferenceBracketComponent
          conference="AFC"
          confState={bracket.afc}
          logoMap={logoMap}
        />

        {/* Super Bowl */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            paddingTop: "80px",
          }}
        >
          <SuperBowlComponent superBowl={bracket.superBowl} logoMap={logoMap} />
        </div>

        {/* NFC Bracket */}
        <ConferenceBracketComponent
          conference="NFC"
          confState={bracket.nfc}
          logoMap={logoMap}
          isReversed={true}
        />
      </div>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          padding: "12px 24px",
        }}
      >
        <span
          style={{
            color: "#6b7280",
            fontSize: "12px",
            fontWeight: 600,
          }}
        >
          bracket.build • NFL Playoffs 2025-26
        </span>
      </div>
    </div>
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const bracket: BracketState = body.bracket;

    if (!bracket) {
      return NextResponse.json(
        { error: "Bracket data is required" },
        { status: 400 },
      );
    }

    // Collect all team logo URLs and fetch them as base64
    const logoUrls = collectTeamLogos(bracket);
    const logoDataPromises = logoUrls.map(async (url) => {
      const dataUri = await fetchImageAsBase64(url);
      return [url, dataUri] as const;
    });

    const logoEntries = await Promise.all(logoDataPromises);
    const logoMap = new Map(logoEntries);

    // Calculate dimensions based on bracket content
    // Width: AFC (190*3 + 20*2 gaps) + Super Bowl (230) + NFC (190*3 + 20*2 gaps) + padding
    // = 610 + 230 + 610 + 48 = 1498 ~ 1500
    const width = 1500;
    // Height: Header (70) + content (~550) + footer (36) + padding
    const height = 700;

    return new ImageResponse(
      <BracketImage bracket={bracket} logoMap={logoMap} />,
      {
        width,
        height,
      },
    );
  } catch (error) {
    console.error("Error generating bracket image:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to generate image: ${errorMessage}` },
      { status: 500 },
    );
  }
}

// Also support GET for debugging/testing
export async function GET() {
  return NextResponse.json({
    message: "Use POST with bracket data to generate an image",
    example: {
      bracket: "BracketState object",
    },
  });
}
