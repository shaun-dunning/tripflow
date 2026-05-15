import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export for iOS Capacitor and zero-server Vercel deployment.
  // API routes have been moved to Supabase Edge Functions.
  output: "export",
  // Required so Capacitor can resolve routes from file:// URLs
  trailingSlash: true,
  images: {
    // next/image optimization API is unavailable in static export
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
