import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TripFlow",
    short_name: "TripFlow",
    description: "Your family travel command center",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#0ea5e9",
    orientation: "portrait",
    categories: ["travel", "lifestyle"],
    icons: [
      // "any" — used for square launchers, browser tabs, etc.
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      // "maskable" — safe-zone design for circular / squircle launchers (Android)
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "maskable" },
      // Fallback at smaller size
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png", purpose: "any" },
    ],
  };
}
