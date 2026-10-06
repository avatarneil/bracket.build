import { ImageResponse } from "next/og";

export async function GET(_request: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size: value } = await params;
  if (value !== "192" && value !== "512") return new Response(null, { status: 404 });
  const size = Number(value);
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #ef4444 0%, #ffffff 50%, #3b82f6 100%)",
        color: "#171717",
        fontSize: size / 2,
        fontWeight: 900,
        letterSpacing: -size / 20,
      }}
    >
      {"{ }"}
    </div>,
    { width: size, height: size, headers: { "Cache-Control": "public, max-age=86400" } },
  );
}
