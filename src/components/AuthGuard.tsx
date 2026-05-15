"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import BottomNav from "@/components/BottomNav";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isAuthPage = pathname === "/auth" || pathname === "/auth/";
  const isJoinPage = pathname.startsWith("/join/");
  const isPublicPage = isAuthPage || isJoinPage;

  useEffect(() => {
    if (loading) return;
    if (!user && !isPublicPage) {
      router.replace("/auth");
      const fallback = window.setTimeout(() => {
        window.location.replace("/auth/");
      }, 900);
      return () => window.clearTimeout(fallback);
    }
    if (user && isAuthPage) router.replace("/");
  }, [user, loading, isPublicPage, isAuthPage, router]);

  // Show spinner while checking session (not on public pages — they load their own data)
  if (loading && !isPublicPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_top,#e0f2fe_0%,#f8fafc_42%,#ffffff_100%)]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative size-14 rounded-3xl overflow-hidden shadow-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=180&h=180&fit=crop&q=80"
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-sky-950/20" />
            <div className="absolute inset-0 rounded-3xl border border-white/40" />
          </div>
          <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // Public pages — no nav, no auth wall
  if (isPublicPage) return <>{children}</>;

  // Not logged in — keep a visible recovery surface in case client routing stalls.
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-white">
        <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white px-5 py-6 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/daywave-symbol-light.png" alt="" className="h-8 w-8 object-contain" />
          </div>
          <h1 className="text-lg font-black text-slate-900">Opening Daywave</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Taking you to sign in. If this takes more than a moment, use the button below.
          </p>
          <button
            onClick={() => window.location.replace("/auth/")}
            className="mt-5 w-full rounded-2xl bg-slate-950 py-3.5 text-sm font-bold text-white"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  // Logged in — show app with bottom nav
  return (
    <>
      {children}
      <BottomNav />
    </>
  );
}
