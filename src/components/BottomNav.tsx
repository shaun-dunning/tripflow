"use client";

import { startTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { CalendarDays, Compass, FolderCheck, MessageCircle, SunMedium } from "lucide-react";

const tabs = [
  { href: "/",        label: "Today",   icon: SunMedium       },
  { href: "/explore", label: "Explore", icon: Compass         },
  { href: "/vault",   label: "Docs",    icon: FolderCheck     },
  { href: "/chat",    label: "Group",   icon: MessageCircle   },
  { href: "/trip",    label: "Trips",   icon: CalendarDays    },
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
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-100"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="max-w-md mx-auto flex items-center">
        {tabs.map((tab) => {
          const active =
            normalizedPathname === tab.href ||
            (tab.href !== "/" && normalizedPathname.startsWith(`${tab.href}/`));
          const Icon = tab.icon;
          return (
            <button
              key={tab.href}
              onClick={() => navigate(tab.href)}
              className={`flex-1 flex flex-col items-center gap-0.5 pt-1.5 pb-1 transition-colors active:opacity-60 relative ${
                active ? "text-sky-600" : "text-slate-400"
              }`}
            >
              {/* top indicator bar */}
              <span
                className={`absolute top-0 rounded-full transition-all duration-200 h-[3px] ${
                  active ? "w-6 bg-sky-500" : "w-0 bg-transparent"
                }`}
              />
              <Icon
                className={`transition-all ${
                  active ? "size-[23px] stroke-[2.5]" : "size-[22px] stroke-[1.5]"
                }`}
              />
              <span
                className={`text-[10px] leading-none transition-all ${
                  active ? "font-extrabold" : "font-medium"
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
