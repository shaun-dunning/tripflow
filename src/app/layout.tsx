import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import AuthGuard from "@/components/AuthGuard";
import { ExploreProvider } from "@/lib/exploreContext";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

// ── Viewport — controls the browser chrome and safe-area behavior ────────────
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Lets content render behind the notch / Dynamic Island / home indicator
  viewportFit: "cover",
  // Matches the app's sky-blue accent; tints the browser chrome / status bar
  themeColor: "#0ea5e9",
};

// ── App metadata ─────────────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: "TripFlow",
  description: "Your family travel command center",
  // Apple PWA — enables full-screen mode when launched from home screen
  appleWebApp: {
    capable: true,
    title: "TripFlow",
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
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 max-w-md mx-auto relative">
        <ExploreProvider>
          <AuthGuard>
            {/*
             * pb accounts for the fixed BottomNav (≈56 px) plus the iOS home
             * indicator safe area (env(safe-area-inset-bottom)).
             * Falls back to 80 px on non-notched devices.
             */}
            <main
              className="flex-1"
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
