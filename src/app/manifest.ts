import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "bracket.build",
    short_name: "bracket.build",
    description: "NFL and college football schedules, picks, and game alerts.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [192, 512].map((size) => ({
      src: `/pwa-icon/${size}`,
      sizes: `${size}x${size}`,
      type: "image/png",
      purpose: "any",
    })),
  };
}
