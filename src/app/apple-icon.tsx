import { ImageResponse } from "next/og";

// Image metadata - Apple recommends 180x180 for apple-touch-icon
export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

// Image generation
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #ef4444 0%, #ffffff 50%, #3b82f6 100%)",
        borderRadius: 40,
      }}
    >
      {/* Bracket symbol */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 90,
          fontWeight: 900,
          color: "#171717",
          letterSpacing: -8,
          fontFamily: "system-ui",
        }}
      >
        {"{ }"}
      </div>
    </div>,
    {
      ...size,
    },
  );
}
