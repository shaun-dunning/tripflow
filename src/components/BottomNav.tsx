"use client";

import { startTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { CalendarDays, Compass, FolderCheck, MessageCircle, SunMedium } from "lucide-react";

const tabs = [
  { href: "/", label: "Today", icon: SunMedium },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/vault", label: "Docs", icon: FolderCheck },
  { href: "/chat", label: "Group", icon: MessageCircle },
  { href: "/trip", label: "Trips", icon: CalendarDays },
];

export default function BottomNav() {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  if (!user) return null;
  const normalizedPathname = pathname === "/" ? "/" : pathname.replace(/\/$/, "");

  function navigate(href: string) {
    if (href === normalizedPathname) return;
    navigator.vibrate?.(8);
    startTransition(() => router.push(href));
  }

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 px-3 pt-2"
      style={{ paddingBottom: "max(10px, env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-center gap-1 rounded-[1.6rem] border border-white/70 bg-white/88 px-1.5 py-1.5 shadow-[0_14px_40px_rgba(15,23,42,0.16)] backdrop-blur-xl">
        {tabs.map((tab) => {
          const active =
            normalizedPathname === tab.href ||
            (tab.href !== "/" && normalizedPathname.startsWith(`${tab.href}/`));
          const Icon = tab.icon;
          return (
            <button
              key={tab.href}
              onClick={() => navigate(tab.href)}
              className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 rounded-[1.15rem] py-2 transition-all ${
                active ? "bg-slate-950 text-white shadow-sm" : "text-slate-400 active:bg-slate-100"
              }`}
            >
              <span className="relative flex items-center justify-center h-5">
                <Icon className={`size-4 transition-all ${active ? "stroke-[2.5]" : "stroke-2"}`} />
              </span>
              <span className={`text-[10px] leading-none transition-all ${active ? "font-bold" : "font-semibold"}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
