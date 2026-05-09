"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "tripflow-packing-maui26";

type PackItem = {
  id: string;
  label: string;
  note?: string;
  urgent?: boolean; // flagged as "don't forget"
};

type PackCategory = {
  id: string;
  title: string;
  emoji: string;
  context?: string; // why this category exists for this trip
  items: PackItem[];
};

// Smart packing list — derived from the actual itinerary:
// Beach + snorkel, Road to Hana (full day car), Haleakalā sunrise (2:30am, 10k ft),
// Old Lahaina Luau, Sheraton Ka'anapali, 4 travelers (2 adults + kids)
const CATEGORIES: PackCategory[] = [
  {
    id: "docs",
    title: "Documents & Essentials",
    emoji: "📋",
    context: "Don't leave home without these",
    items: [
      { id: "d1", label: "Passports — all 4", urgent: true },
      { id: "d2", label: "Boarding passes (AA271 + AS845)", urgent: true },
      { id: "d3", label: "Hotel confirmation — Sheraton Maui", urgent: true },
      { id: "d4", label: "Car rental confirmation" },
      { id: "d5", label: "Travel insurance docs" },
      { id: "d6", label: "Credit cards + some cash" },
    ],
  },
  {
    id: "beach",
    title: "Beach & Water",
    emoji: "🏖️",
    context: "Ka'anapali Beach, Molokini snorkeling, Kapalua Bay",
    items: [
      { id: "b1", label: "Reef-safe sunscreen", note: "Required at all Hawaii state parks", urgent: true },
      { id: "b2", label: "Swimsuits (pack 2 each — they won't dry fast enough)" },
      { id: "b3", label: "Rash guards for kids" },
      { id: "b4", label: "Beach towels", note: "Hotel charges to rent — bring your own" },
      { id: "b5", label: "Snorkel gear", note: "Or rent at Kapalua Beach on-site" },
      { id: "b6", label: "Floaties / swim vests for kids" },
      { id: "b7", label: "Water shoes", note: "Great for lava rock areas" },
      { id: "b8", label: "Dry bag for valuables" },
    ],
  },
  {
    id: "haleakala",
    title: "Haleakalā Sunrise",
    emoji: "🌋",
    context: "Day 6 — 2:30am departure, 10,023 ft summit. It's cold.",
    items: [
      { id: "h1", label: "Warm jackets — everyone", note: "Summit temp can be 35–45°F even in June", urgent: true },
      { id: "h2", label: "Warm layers (fleece or hoodie)" },
      { id: "h3", label: "Headlamp or phone torch", note: "2:30am start — you'll need it", urgent: true },
      { id: "h4", label: "Gloves (even just light ones)" },
      { id: "h5", label: "Hiking shoes or trail runners", note: "For the Sliding Sands crater hike" },
      { id: "h6", label: "Snacks + hot drinks in a thermos" },
      { id: "h7", label: "Water bottles", note: "No water available at summit" },
      { id: "h8", label: "Park reservation confirmation", note: "Required — check Docs tab", urgent: true },
    ],
  },
  {
    id: "hana",
    title: "Road to Hana",
    emoji: "🚗",
    context: "Day 3 — full day, 52 miles, 620 turns. Pack light but pack smart.",
    items: [
      { id: "r1", label: "Cooler with snacks + drinks", note: "Limited stops along the route" },
      { id: "r2", label: "Motion sickness tablets", note: "600+ turns — kids especially" },
      { id: "r3", label: "Offline maps downloaded", note: "Cell service drops along the route", urgent: true },
      { id: "r4", label: "Rain gear / light ponchos", note: "East Maui gets showers — embrace it" },
      { id: "r5", label: "Extra change of clothes for kids" },
      { id: "r6", label: "Cash", note: "Food trucks and roadside stands are cash-only" },
    ],
  },
  {
    id: "evenings",
    title: "Evenings & Luau",
    emoji: "🌺",
    context: "Mama's Fish House, Old Lahaina Luau, Humble Market",
    items: [
      { id: "e1", label: "Smart casual outfits", note: "Maui is dressy-casual — no shorts at nicer spots" },
      { id: "e2", label: "Colorful / floral outfit for the luau", note: "Day 5 — Old Lahaina Luau" },
      { id: "e3", label: "Light cardigan or wrap", note: "Evenings cool off near the ocean" },
      { id: "e4", label: "Comfortable sandals" },
    ],
  },
  {
    id: "kids",
    title: "For the Kids",
    emoji: "👦",
    context: "Activities, long drives, flights, beach days",
    items: [
      { id: "k1", label: "Entertainment for 10+ hr travel day", note: "Downloads, headphones, tablets charged" },
      { id: "k2", label: "Small backpack for day trips" },
      { id: "k3", label: "Snack bag (replenish daily)" },
      { id: "k4", label: "Favorite stuffed animal / comfort item" },
      { id: "k5", label: "Kids pain reliever + fever reducer" },
      { id: "k6", label: "Band-aids + small first aid kit" },
    ],
  },
  {
    id: "everyday",
    title: "Everyday Carry",
    emoji: "🎒",
    items: [
      { id: "ev1", label: "Phone chargers + cables" },
      { id: "ev2", label: "Portable battery pack" },
      { id: "ev3", label: "Camera + extra memory card" },
      { id: "ev4", label: "Insect repellent", note: "Hana rainforest area especially" },
      { id: "ev5", label: "Aloe vera gel", note: "Sunburns happen even with sunscreen" },
      { id: "ev6", label: "Prescription medications", urgent: true },
      { id: "ev7", label: "Sunglasses — everyone" },
      { id: "ev8", label: "Reusable water bottles" },
    ],
  },
];

function allItemIds(): Set<string> {
  const ids = new Set<string>();
  CATEGORIES.forEach((c) => c.items.forEach((i) => ids.add(i.id)));
  return ids;
}

export default function PackingPage() {
  const router = useRouter();
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [shareToast, setShareToast] = useState<string | null>(null);

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setChecked(new Set(JSON.parse(raw) as string[]));
    } catch { /* ignore */ }
  }, []);

  // Persist to localStorage
  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  }

  const totalItems = allItemIds().size;
  const packedCount = checked.size;
  const progress = totalItems > 0 ? packedCount / totalItems : 0;

  function resetAll() {
    setChecked(new Set());
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }

  async function shareList() {
    const pct = Math.round(progress * 100);
    const lines: string[] = [
      `🧳 Maui Family Trip — Packing List (Jun 5–11)`,
      `Progress: ${packedCount}/${totalItems} packed (${pct}%)`,
      ``,
    ];
    CATEGORIES.forEach((cat) => {
      const catPacked = cat.items.filter((i) => checked.has(i.id)).length;
      lines.push(`${cat.emoji} ${cat.title} (${catPacked}/${cat.items.length})`);
      cat.items.forEach((item) => {
        const tick = checked.has(item.id) ? "✓" : "○";
        const urgent = item.urgent ? " ⚠️" : "";
        lines.push(`  ${tick} ${item.label}${urgent}`);
      });
      lines.push(``);
    });
    const text = lines.join("\n");
    try {
      if (navigator.share) {
        await navigator.share({ title: "Maui Family Trip — Packing List", text });
      } else {
        await navigator.clipboard.writeText(text);
        setShareToast("Copied to clipboard!");
        setTimeout(() => setShareToast(null), 2000);
      }
    } catch { /* user cancelled or clipboard unavailable */ }
  }

  function toggleCategory(cat: PackCategory) {
    const allIds = cat.items.map((i) => i.id);
    const allChecked = allIds.every((id) => checked.has(id));
    setChecked((prev) => {
      const next = new Set(prev);
      if (allChecked) {
        allIds.forEach((id) => next.delete(id));
      } else {
        allIds.forEach((id) => next.add(id));
      }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  }

  return (
    <div className="flex flex-col bg-slate-50 min-h-screen">

      {/* Share toast */}
      {shareToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] bg-slate-900 text-white text-sm font-semibold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <span>📋</span>
          <span>{shareToast}</span>
        </div>
      )}

      {/* ── Hero ── */}
      <div className="relative h-44 w-full overflow-hidden flex-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=800&h=400&fit=crop&q=85"
          alt="Open suitcase packing"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white text-sm"
        >
          ‹
        </button>

        {/* Share button */}
        <button
          onClick={shareList}
          className="absolute top-4 right-4 flex items-center gap-1.5 bg-black/30 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full"
        >
          <span>↗</span> Share
        </button>

        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
          <p className="text-[10px] font-semibold text-white/60 uppercase tracking-widest">Maui Family Trip · Jun 5–11</p>
          <h1 className="text-2xl font-black text-white leading-tight">Pack Smart</h1>
          <p className="text-xs text-white/60 mt-0.5">Tailored to your itinerary — {totalItems} items across {CATEGORIES.length} categories</p>
        </div>
      </div>

      {/* ── Progress summary card ── */}
      {(() => {
        const r = 28; const circ = 2 * Math.PI * r;
        const catsDone = CATEGORIES.filter((c) => c.items.every((i) => checked.has(i.id))).length;
        const pct = Math.round(progress * 100);
        // Days until trip (hardcoded Jun 5 2026)
        const tripStart = new Date("2026-06-05T00:00:00");
        const today = new Date(); today.setHours(0,0,0,0);
        const daysLeft = Math.max(0, Math.ceil((tripStart.getTime() - today.getTime()) / 86_400_000));
        return (
          <div className="bg-white border-b border-slate-100 px-4 py-3.5 flex items-center gap-4 flex-none">
            {/* Circular progress ring */}
            <div className="relative flex-none w-[68px] h-[68px]">
              <svg width="68" height="68" viewBox="0 0 68 68" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="34" cy="34" r={r} fill="none" stroke="#f1f5f9" strokeWidth="7" />
                <circle cx="34" cy="34" r={r} fill="none"
                  stroke={pct === 100 ? "#10b981" : "#0ea5e9"} strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={circ}
                  strokeDashoffset={circ * (1 - progress)}
                  style={{ transition: "stroke-dashoffset 0.6s ease" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-base font-black text-slate-900 leading-none">{pct}%</span>
              </div>
            </div>
            {/* Stats */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-slate-900 leading-tight">
                {pct === 100 ? "All packed! 🎉" : `${packedCount} of ${totalItems} packed`}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {catsDone}/{CATEGORIES.length} categories done
              </p>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? "bg-emerald-500" : "bg-sky-500"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            {/* Days pill */}
            <div className="flex-none flex flex-col items-center bg-amber-50 border border-amber-100 rounded-xl px-2.5 py-2 min-w-[48px]">
              <span className="text-base font-black text-amber-600 leading-none tabular-nums">{daysLeft}</span>
              <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wide leading-none mt-0.5">days</span>
              {packedCount > 0 && (
                <button onClick={resetAll} className="text-[8px] text-slate-300 hover:text-rose-400 transition-colors mt-1.5 leading-none">
                  reset
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Don't Forget Banner ── */}
      {(() => {
        const urgentUnpacked = CATEGORIES.flatMap((c) => c.items).filter((i) => i.urgent && !checked.has(i.id));
        if (urgentUnpacked.length === 0) return null;
        return (
          <div className="mx-4 mt-4 bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden flex-none">
            <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-3 border-b border-amber-100">
              <span className="text-base">⚠️</span>
              <div className="flex-1">
                <p className="text-xs font-bold text-amber-800">Don't Forget</p>
                <p className="text-[10px] text-amber-600 mt-0.5">
                  {urgentUnpacked.length} must-pack item{urgentUnpacked.length !== 1 ? "s" : ""} still unpacked
                </p>
              </div>
            </div>
            <div className="flex flex-col divide-y divide-amber-100/70">
              {urgentUnpacked.map((item) => (
                <button
                  key={item.id}
                  onClick={() => toggle(item.id)}
                  className="flex items-center gap-3 px-4 py-3 text-left active:bg-amber-100 transition-colors"
                >
                  <div className="w-5 h-5 rounded-full border-2 border-amber-400 flex items-center justify-center flex-none" />
                  <p className="flex-1 text-sm font-semibold text-amber-900 leading-snug">{item.label}</p>
                  <span className="text-[10px] font-bold text-amber-400 flex-none">Pack it ›</span>
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── Categories ── */}
      <div className="flex flex-col gap-4 px-4 pt-4 pb-10">
        {CATEGORIES.map((cat) => {
          const catChecked = cat.items.filter((i) => checked.has(i.id)).length;
          const catDone = catChecked === cat.items.length;
          return (
            <div key={cat.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
              {/* Category header */}
              <div className={`px-4 py-3.5 border-b border-slate-50 flex items-center gap-3 ${catDone ? "opacity-60" : ""}`}>
                <span className="text-xl flex-none">{cat.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 leading-tight">{cat.title}</p>
                  {cat.context && (
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{cat.context}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-none">
                  <button
                    onClick={() => toggleCategory(cat)}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition-colors ${
                      catDone
                        ? "bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                        : "bg-slate-900 text-white hover:bg-slate-700"
                    }`}
                  >
                    {catDone ? "Unpack" : "Pack all"}
                  </button>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    catDone
                      ? "bg-emerald-100 text-emerald-700"
                      : catChecked > 0
                      ? "bg-sky-50 text-sky-700"
                      : "bg-slate-100 text-slate-500"
                  }`}>
                    {catChecked}/{cat.items.length}
                  </span>
                </div>
              </div>

              {/* Items */}
              <div className="flex flex-col divide-y divide-slate-50">
                {cat.items.map((item) => {
                  const isDone = checked.has(item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => toggle(item.id)}
                      className={`flex items-start gap-3 px-4 py-3 text-left transition-colors ${isDone ? "bg-slate-50/50" : "hover:bg-slate-50"}`}
                    >
                      {/* Checkbox */}
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-none mt-0.5 transition-all ${
                        isDone ? "bg-emerald-500 border-emerald-500" : item.urgent ? "border-amber-400" : "border-slate-300"
                      }`}>
                        {isDone && <span className="text-white text-[10px] font-bold leading-none">✓</span>}
                      </div>

                      {/* Label */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`text-sm font-medium leading-tight ${isDone ? "line-through text-slate-400" : "text-slate-800"}`}>
                            {item.label}
                          </p>
                          {item.urgent && !isDone && (
                            <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                              Must-pack
                            </span>
                          )}
                        </div>
                        {item.note && (
                          <p className={`text-[11px] mt-0.5 leading-snug ${isDone ? "text-slate-300" : "text-slate-400"}`}>
                            {item.note}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Done state */}
        {packedCount === totalItems && totalItems > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-5 text-center">
            <p className="text-2xl mb-2">🎉</p>
            <p className="text-sm font-bold text-emerald-800">You&apos;re all packed!</p>
            <p className="text-xs text-emerald-600 mt-1">Time to go enjoy Maui. You&apos;ve earned it.</p>
          </div>
        )}
      </div>
    </div>
  );
}
