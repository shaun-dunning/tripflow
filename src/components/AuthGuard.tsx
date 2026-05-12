"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import BottomNav from "@/components/BottomNav";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isAuthPage = pathname === "/auth";
  const isJoinPage = pathname.startsWith("/join/");
  const isPublicPage = isAuthPage || isJoinPage;

  useEffect(() => {
    if (loading) return;
    if (!user && !isPublicPage) router.replace("/auth");
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

  // Not logged in — show nothing while redirect happens
  if (!user) return null;

  // Logged in — show app with bottom nav
  return (
    <>
      {children}
      <BottomNav />
    </>
  );
}
