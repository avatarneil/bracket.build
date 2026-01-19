import { ImageResponse } from "next/og";

// Image metadata
export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

// Image generation
export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #ef4444 0%, #ffffff 50%, #3b82f6 100%)",
        borderRadius: "50%",
      }}
    >
      {/* Bracket symbol using text */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          fontWeight: 900,
          color: "#171717",
          letterSpacing: -2,
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
