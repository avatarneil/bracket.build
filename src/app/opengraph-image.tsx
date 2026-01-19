import { ImageResponse } from "next/og";

// Image metadata
export const alt = "bracket.build - NFL Playoff Predictions 2025-26";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

// Image generation
export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #000000 0%, #1a1a1a 100%)",
        position: "relative",
      }}
    >
      {/* Gradient accent at top */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 8,
          background: "linear-gradient(90deg, #ef4444 0%, #ffffff 50%, #3b82f6 100%)",
        }}
      />

      {/* Icon */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 120,
          height: 120,
          background: "linear-gradient(135deg, #ef4444 0%, #ffffff 50%, #3b82f6 100%)",
          borderRadius: 30,
          marginBottom: 40,
        }}
      >
        <div
          style={{
            fontSize: 60,
            fontWeight: 900,
            color: "#171717",
            letterSpacing: -5,
            fontFamily: "system-ui",
          }}
        >
          {"{ }"}
        </div>
      </div>

      {/* Title */}
      <div
        style={{
          display: "flex",
          fontSize: 72,
          fontWeight: 800,
          background: "linear-gradient(90deg, #ef4444 0%, #ffffff 50%, #3b82f6 100%)",
          backgroundClip: "text",
          color: "transparent",
          fontFamily: "system-ui",
          letterSpacing: -2,
        }}
      >
        bracket.build
      </div>

      {/* Subtitle */}
      <div
        style={{
          display: "flex",
          fontSize: 32,
          color: "#a3a3a3",
          marginTop: 20,
          fontFamily: "system-ui",
        }}
      >
        NFL Playoff Predictions • 2025-26
      </div>

      {/* Call to action */}
      <div
        style={{
          display: "flex",
          fontSize: 24,
          color: "#737373",
          marginTop: 40,
          fontFamily: "system-ui",
        }}
      >
        Build & share your Super Bowl predictions
      </div>
    </div>,
    {
      ...size,
    },
  );
}
