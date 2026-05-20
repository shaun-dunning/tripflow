import type { Metadata, Viewport } from "next";
import "./globals.css";
import AuthGuard from "@/components/AuthGuard";
import BottomNav from "@/components/BottomNav";
import { ExploreProvider } from "@/lib/exploreContext";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";
import DeepLinkHandler from "@/components/DeepLinkHandler";

// ── Viewport — controls the browser chrome and safe-area behavior ────────────
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Lets content render behind the notch / Dynamic Island / home indicator
  viewportFit: "cover",
  // White matches the bottom nav and header — consistent chrome on iOS/Android
  themeColor: "#ffffff",
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
      <body className="h-full flex flex-col bg-slate-50 text-slate-900 max-w-md mx-auto relative">
        <ServiceWorkerRegistrar />
        <DeepLinkHandler />
        <ExploreProvider>
          <AuthGuard>
            {/*
             * BottomNav lives INSIDE <main> so it shares main's compositing
             * layer / stacking context on iOS. That lets position:fixed sheets
             * (z-[60]) correctly layer above the nav (z-50). If the nav were
             * outside main, iOS's overflow-y:auto compositing layer would trap
             * the sheets at z:auto and the nav would paint over them.
             *
             * position:fixed still pins the nav to the viewport on iOS 15+
             * (our minimum deployment target) even when the parent scrolls.
             *
             * pb accounts for the nav bar (~64 px) plus the home-indicator
             * safe area, so content can always be scrolled into view.
             */}
            {/*
             * BottomNav is INSIDE main so it shares the same stacking context.
             * This lets position:fixed sheets (z-[60]+) correctly layer above
             * the nav (z-50) on iOS where overflow:auto creates a compositing
             * layer that would otherwise trap sheets below an external nav.
             */}
            <main
              className="flex-1 tab-main-content overflow-y-auto"
              style={{
                paddingBottom: "calc(64px + env(safe-area-inset-bottom, 0px))",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {children}
              <BottomNav />
            </main>
          </AuthGuard>
        </ExploreProvider>
      </body>
    </html>
  );
}
