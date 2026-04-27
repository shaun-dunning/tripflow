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
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="text-3xl">🌺</span>
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
