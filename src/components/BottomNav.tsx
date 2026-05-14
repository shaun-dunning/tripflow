"use client";

import { startTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { CalendarDays, Compass, FolderCheck, MessageCircle, SunMedium } from "lucide-react";

const NEXT_EVENT_MINUTES = 42;

const tabs = [
  { href: "/trip", label: "Trip", icon: CalendarDays, badge: 0 },
  { href: "/", label: "Today", icon: SunMedium, badge: 0 },
  { href: "/explore", label: "Explore", icon: Compass, badge: 0 },
  { href: "/vault", label: "Docs", icon: FolderCheck, badge: 0 },
  { href: "/chat", label: "Group", icon: MessageCircle, badge: 0 },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  function navigate(href: string) {
    if (href === pathname) return;
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
          const active = pathname === tab.href;
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
                {tab.badge > 0 && !active && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                    {tab.badge > 9 ? "9+" : tab.badge}
                  </span>
                )}
                {tab.href === "/" && !active && NEXT_EVENT_MINUTES > 0 && NEXT_EVENT_MINUTES <= 60 && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full flex items-center justify-center">
                    <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${NEXT_EVENT_MINUTES <= 30 ? "bg-red-400" : "bg-orange-400"}`} />
                    <span className={`relative inline-flex w-2 h-2 rounded-full ${NEXT_EVENT_MINUTES <= 30 ? "bg-red-500" : "bg-orange-400"}`} />
                  </span>
                )}
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
