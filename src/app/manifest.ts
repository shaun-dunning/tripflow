import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Daywave",
    short_name: "Daywave",
    description: "A better way to move through your trip",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#061832",
    orientation: "portrait",
    categories: ["travel", "lifestyle"],
    icons: [
      // "any" — used for square launchers, browser tabs, etc.
      { src: "/brand/daywave-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // "maskable" — safe-zone design for circular / squircle launchers (Android)
      { src: "/brand/daywave-icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      // Fallback at smaller size
      { src: "/brand/daywave-apple-icon.png", sizes: "180x180", type: "image/png", purpose: "any" },
    ],
  };
}
