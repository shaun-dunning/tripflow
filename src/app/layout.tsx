import type { Metadata, Viewport } from "next";
import "./globals.css";
import AuthGuard from "@/components/AuthGuard";
import { ExploreProvider } from "@/lib/exploreContext";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";

// ── Viewport — controls the browser chrome and safe-area behavior ────────────
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Lets content render behind the notch / Dynamic Island / home indicator
  viewportFit: "cover",
  // Matches the Daywave navy; tints the browser chrome / status bar
  themeColor: "#061832",
};

// ── App metadata ─────────────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: "Daywave",
  description: "A better way to move through your trip",
  metadataBase: new URL("https://daywave.app"),
  icons: {
    // 32 px favicon for browser tabs; 512 px as the hi-res fallback
    icon: [
      { url: "/brand/daywave-favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/daywave-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    // iOS add-to-home-screen icon
    apple: "/brand/daywave-apple-icon.png",
  },
  openGraph: {
    title: "Daywave",
    description: "A better way to move through your trip",
    url: "https://daywave.app",
    siteName: "Daywave",
    images: [{ url: "/brand/daywave-wordmark-dark.png", width: 2172, height: 724, alt: "daywave" }],
  },
  // Apple PWA — enables full-screen mode when launched from home screen
  appleWebApp: {
    capable: true,
    title: "Daywave",
    // "default" keeps the standard status bar so we don't need to
    // pad content away from the top edge manually
    statusBarStyle: "default",
  },
  // Prevent iOS from auto-linking phone numbers in the itinerary
  formatDetection: { telephone: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 max-w-md mx-auto relative">
        <ServiceWorkerRegistrar />
        <ExploreProvider>
          <AuthGuard>
            {/*
             * pb accounts for the fixed BottomNav (≈56 px) plus the iOS home
             * indicator safe area (env(safe-area-inset-bottom)).
             * Falls back to 80 px on non-notched devices.
             */}
            <main
              className="flex-1 tab-main-content"
              style={{
                paddingBottom:
                  "calc(64px + env(safe-area-inset-bottom, 0px))",
              }}
            >
              {children}
            </main>
          </AuthGuard>
        </ExploreProvider>
      </body>
    </html>
  );
}
