import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import AuthGuard from "@/components/AuthGuard";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TripFlow",
  description: "Your family travel command center",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 max-w-md mx-auto relative">
        <AuthGuard>
          <main className="flex-1 pb-20">{children}</main>
        </AuthGuard>
      </body>
    </html>
  );
}
