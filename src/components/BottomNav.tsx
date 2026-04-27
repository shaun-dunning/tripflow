"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NEXT_EVENT_MINUTES = 42;

const tabs = [
  { href: "/", label: "My Day", icon: "☀️", badge: 0 },
  { href: "/trip", label: "Trips", icon: "🗺️", badge: 0 },
  { href: "/explore", label: "Explore", icon: "🔍", badge: 0 },
  { href: "/vault", label: "Docs", icon: "📁", badge: 1 },
  { href: "/chat", label: "Group", icon: "💬", badge: 3 },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-100 flex z-50 px-1 pb-1 pt-1">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex-1 flex flex-col items-center gap-0.5 py-1"
          >
            <span className="relative flex items-center justify-center w-10 h-7 text-lg transition-all">
              <span className={`transition-all ${active ? "opacity-100 scale-110" : "opacity-40"}`}>
                {tab.icon}
              </span>
              {tab.badge > 0 && !active && (
                <span className="absolute top-0 right-0 min-w-[16px] h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                  {tab.badge > 9 ? "9+" : tab.badge}
                </span>
              )}
              {tab.href === "/" && !active && NEXT_EVENT_MINUTES > 0 && NEXT_EVENT_MINUTES <= 60 && (
                <span className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full flex items-center justify-center">
                  <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${NEXT_EVENT_MINUTES <= 30 ? "bg-red-400" : "bg-orange-400"}`} />
                  <span className={`relative inline-flex w-2 h-2 rounded-full ${NEXT_EVENT_MINUTES <= 30 ? "bg-red-500" : "bg-orange-400"}`} />
                </span>
              )}
            </span>
            <span className={`text-[10px] transition-all ${active ? "text-slate-900 font-bold" : "text-slate-400 font-medium"}`}>
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
