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
      // 512 × 512 — Chrome/Android home-screen launcher & splash
      { src: "/brand/daywave-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // 512 maskable — squircle / circular launcher crops (Android)
      { src: "/brand/daywave-icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      // 192 × 192 — required by Android PWA install criteria (browser scales from 512)
      { src: "/brand/daywave-icon-512.png", sizes: "192x192", type: "image/png", purpose: "any" },
      // 180 × 180 — iOS add-to-home-screen
      { src: "/brand/daywave-apple-icon.png", sizes: "180x180", type: "image/png", purpose: "any" },
      // 32 × 32 — browser favicon fallback
      { src: "/brand/daywave-favicon.png", sizes: "32x32", type: "image/png", purpose: "any" },
    ],
  };
}
