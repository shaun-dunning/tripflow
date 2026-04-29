"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getTripDateInfo } from "@/lib/tripDates";

const TRIP_ID = "a1b2c3d4-0000-0000-0000-000000000001";

type Place = {
  id: number;
  name: string;
  category: string;
  tags: string[];
  distance: string;
  drive: string;
  price: "$" | "$$" | "$$$";
  kidFriendly: boolean;
  rating: number;
  photo: string;
  photoAlt: string;
  blurb: string;
  address: string;
};

const PLACES: Place[] = [
  {
    id: 1, name: "Kapalua Beach", category: "Beach", tags: ["beach", "activity", "kids"],
    distance: "2.1 mi", drive: "8 min", price: "$", kidFriendly: true, rating: 4.9,
    photo: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=600&h=300&fit=crop&q=80",
    photoAlt: "Kapalua Beach Maui",
    blurb: "Calm, protected bay — perfect for little swimmers. Snorkel gear rentals on-site.",
    address: "Kapalua, Maui",
  },
  {
    id: 2, name: "Monkeypod Kitchen", category: "Food", tags: ["food", "lunch", "dinner", "kids"],
    distance: "0.8 mi", drive: "4 min", price: "$$", kidFriendly: true, rating: 4.7,
    photo: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=300&fit=crop&q=80",
    photoAlt: "Restaurant interior",
    blurb: "Local farm-to-table favorite. Great cocktails, wood-fired pizza, kids menu available.",
    address: "Wailea, Maui",
  },
  {
    id: 3, name: "Maui Ocean Center", category: "Activity", tags: ["activity", "kids", "rainy"],
    distance: "3.4 mi", drive: "12 min", price: "$$", kidFriendly: true, rating: 4.6,
    photo: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&h=300&fit=crop&q=80",
    photoAlt: "Ocean aquarium",
    blurb: "Hawaii's premier aquarium. Sharks, rays, and a walk-through tunnel. Kids love it.",
    address: "Maalaea, Maui",
  },
  {
    id: 4, name: "Ululani's Hawaiian Shave Ice", category: "Food", tags: ["food", "snack", "kids"],
    distance: "1.2 mi", drive: "5 min", price: "$", kidFriendly: true, rating: 4.8,
    photo: "https://images.unsplash.com/photo-1488900128323-21503983a07e?w=600&h=300&fit=crop&q=80",
    photoAlt: "Colorful shave ice",
    blurb: "Best shave ice on the island. Perfect afternoon treat after the beach.",
    address: "Lahaina, Maui",
  },
  {
    id: 5, name: "Andaz Maui Spa", category: "Spa", tags: ["spa", "adults"],
    distance: "0.3 mi", drive: "2 min", price: "$$$", kidFriendly: false, rating: 4.8,
    photo: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&h=300&fit=crop&q=80",
    photoAlt: "Luxury spa",
    blurb: "World-class treatments with ocean views. Book a couples massage while kids nap.",
    address: "Wailea, Maui",
  },
  {
    id: 6, name: "Surfing Goat Dairy", category: "Activity", tags: ["activity", "kids", "unique"],
    distance: "8.2 mi", drive: "22 min", price: "$", kidFriendly: true, rating: 4.5,
    photo: "https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=600&h=300&fit=crop&q=80",
    photoAlt: "Goat farm",
    blurb: "Working goat farm with tours and tastings. Unique, fun, and surprisingly memorable.",
    address: "Kula, Maui",
  },
  {
    id: 7, name: "Down the Hatch", category: "Food", tags: ["food", "drinks", "adults", "lunch"],
    distance: "4.1 mi", drive: "14 min", price: "$$", kidFriendly: true, rating: 4.4,
    photo: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&h=300&fit=crop&q=80",
    photoAlt: "Tropical cocktails",
    blurb: "Waterfront bar in Lahaina. Great mai tais, fish tacos, casual and fun.",
    address: "Lahaina, Maui",
  },
  {
    id: 8, name: "Wailea Beach Path", category: "Activity", tags: ["activity", "kids", "free", "morning"],
    distance: "0.1 mi", drive: "Walk", price: "$", kidFriendly: true, rating: 4.7,
    photo: "https://images.unsplash.com/photo-1471922694854-ff1b63b20054?w=600&h=300&fit=crop&q=80",
    photoAlt: "Coastal path",
    blurb: "1.5-mile paved coastal walk connecting Wailea's beaches. Stunning views, totally free.",
    address: "Wailea, Maui",
  },
];

const CATEGORIES = [
  { label: "All",      icon: "◉",  key: "All"      },
  { label: "Beach",    icon: "🌊", key: "Beach"    },
  { label: "Food",     icon: "🍜", key: "Food"     },
  { label: "Activity", icon: "🪁", key: "Activity"  },
  { label: "Spa",      icon: "🌺", key: "Spa"       },
];

const SCENARIOS = [
  { label: "Quick lunch", emoji: "🌮", tags: ["lunch"], maxDrive: 10 },
  { label: "Kids activity", emoji: "👦", tags: ["activity"], maxDrive: 30 },
  { label: "Rain plan", emoji: "🌧️", tags: ["rainy"], maxDrive: 30 },
  { label: "Need drinks", emoji: "🍹", tags: ["drinks"], maxDrive: 20 },
  { label: "Free & close", emoji: "🆓", tags: ["free"], maxDrive: 10 },
  { label: "Spa treat", emoji: "✨", tags: ["spa"], maxDrive: 10 },
];

const PRICE_LABELS = { "$": "Budget", "$$": "Mid-range", "$$$": "Splurge" };

function driveMinutes(drive: string): number {
  if (drive === "Walk") return 0;
  return parseInt(drive);
}

const WHAT_NOW_IDS = [4, 8, 1];

const AI_QUICK_PROMPTS = [
  "Best snorkeling spot for kids?",
  "What to do on a rainy day?",
  "Tips for Road to Hana?",
  "Best sunset dinner nearby?",
];

type AiMessage = { role: "user" | "assistant"; content: string };

export default function ExplorePage() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState("All");
  const [activeScenario, setActiveScenario] = useState<number | null>(null);
  const [maxDrive, setMaxDrive] = useState(30);
  const [kidsOnly, setKidsOnly] = useState(false);
  const [showWhatNow, setShowWhatNow] = useState(false);
  const [location, setLocation] = useState("Ka'anapali");
  const [editingLocation, setEditingLocation] = useState(false);
  const [locationInput, setLocationInput] = useState("Ka'anapali");
  const [showFilters, setShowFilters] = useState(false);
  const [travelerCount, setTravelerCount] = useState(4);
  const [currentTime, setCurrentTime] = useState("");

  // "Added to today" toast
  const [addedToast, setAddedToast] = useState<string | null>(null);

  // Today's trip_day_id for agenda inserts
  const [todayTripDayId, setTodayTripDayId] = useState<string | null>(null);

  // AI assistant
  const [showAI, setShowAI] = useState(false);
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const aiBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function updateTime() {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
    }
    updateTime();
    const timer = setInterval(updateTime, 60_000);

    supabase
      .from("travelers")
      .select("id", { count: "exact", head: true })
      .eq("trip_id", TRIP_ID)
      .then(({ count }) => { if (count) setTravelerCount(count); });

    async function fetchTodayDay() {
      const { data: tripData } = await supabase
        .from("trips")
        .select("start_date, end_date")
        .eq("id", TRIP_ID)
        .single();
      if (!tripData) return;

      const info = getTripDateInfo(tripData.start_date, tripData.end_date);
      if (info.status !== "active") return;

      const { data: dayData } = await supabase
        .from("trip_days")
        .select("id")
        .eq("trip_id", TRIP_ID)
        .eq("day_number", info.currentDayNumber)
        .single();
      if (dayData) setTodayTripDayId(dayData.id);
    }
    fetchTodayDay();

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    aiBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages]);

  async function addToToday(place: Place) {
    setAddedToast(place.name);

    if (todayTripDayId) {
      const { data: existing } = await supabase
        .from("agenda_items")
        .select("sort_order")
        .eq("trip_day_id", todayTripDayId)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextSortOrder = (existing?.sort_order ?? 0) + 10;

      await supabase.from("agenda_items").insert({
        trip_day_id: todayTripDayId,
        title: place.name,
        subtitle: `${place.drive} · ${place.address}`,
        emoji: place.category === "Beach" ? "🏖️"
             : place.category === "Food"  ? "🍽️"
             : place.category === "Spa"   ? "💆"
             : "📍",
        time: "TBD",
        done: false,
        sort_order: nextSortOrder,
        is_reservation: false,
      });
    }

    // Navigate to My Day after a beat so user sees the confirmation
    setTimeout(() => {
      setAddedToast(null);
      router.push("/");
    }, 1200);
  }

  async function sendAiMessage(text?: string) {
    const messageText = (text ?? aiInput).trim();
    if (!messageText || aiLoading) return;
    setAiInput("");
    const newMessages: AiMessage[] = [...aiMessages, { role: "user", content: messageText }];
    setAiMessages(newMessages);
    setAiLoading(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText, history: newMessages }),
      });
      const data = await res.json();
      setAiMessages([...newMessages, { role: "assistant", content: data.reply ?? "Sorry, I couldn't get a response." }]);
    } catch {
      setAiMessages([...newMessages, { role: "assistant", content: "Something went wrong. Make sure the GEMINI_API_KEY or ANTHROPIC_API_KEY is set in your environment variables." }]);
    }
    setAiLoading(false);
  }

  const scenario = activeScenario !== null ? SCENARIOS[activeScenario] : null;

  const filtered = PLACES.filter((p) => {
    if (activeFilter !== "All" && p.category !== activeFilter) return false;
    if (kidsOnly && !p.kidFriendly) return false;
    if (driveMinutes(p.drive) > maxDrive) return false;
    if (scenario && !scenario.tags.some((t) => p.tags.includes(t))) return false;
    return true;
  });

  const activeFilterCount = (kidsOnly ? 1 : 0) + (maxDrive < 30 ? 1 : 0) + (activeScenario !== null ? 1 : 0);

  return (
    <div className="flex flex-col bg-white relative">

      {/* ── "Added to Today" toast ── */}
      {addedToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] bg-slate-900 text-white text-sm font-semibold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <span>✅</span>
          <span className="truncate max-w-[200px]">{addedToast}</span>
          <span className="text-white/60">added · going to My Day…</span>
        </div>
      )}

      {/* ── AI Trip Assistant overlay ── */}
      {showAI && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-white max-w-md mx-auto">
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 pt-5 pb-4 flex-none"
            style={{ background: "linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-xl">
                🌺
              </div>
              <div>
                <h2 className="text-base font-black text-white">Maui Trip AI</h2>
                <p className="text-xs text-white/70 mt-0.5">Your personal Maui guide</p>
              </div>
            </div>
            <button
              onClick={() => setShowAI(false)}
              className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white text-base font-bold"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 bg-slate-50">
            {aiMessages.length === 0 && (
              <div className="flex flex-col gap-3 py-4">
                <div className="flex flex-col items-center gap-2 mb-3">
                  <p className="text-sm font-bold text-slate-700 text-center">Hi! I know all about your Maui trip.</p>
                  <p className="text-xs text-slate-400 text-center">Ask about activities, restaurants, packing tips, road to Hana, kids stuff — anything!</p>
                </div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Try asking:</p>
                {AI_QUICK_PROMPTS.map((q) => (
                  <button
                    key={q}
                    onClick={() => { setShowAI(true); sendAiMessage(q); }}
                    className="text-left text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-2xl px-4 py-3 hover:bg-slate-50 transition-colors shadow-sm"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {aiMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-500 to-indigo-500 flex items-center justify-center text-white text-xs flex-none mr-2 mt-0.5">
                    🌺
                  </div>
                )}
                <div
                  className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-sky-600 text-white rounded-tr-sm"
                      : "bg-white text-slate-800 rounded-tl-sm shadow-sm border border-slate-100"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {aiLoading && (
              <div className="flex justify-start">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-500 to-indigo-500 flex items-center justify-center text-white text-xs flex-none mr-2">
                  🌺
                </div>
                <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1 items-center shadow-sm border border-slate-100">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
            <div ref={aiBottomRef} />
          </div>

          {/* Input */}
          <div className="flex-none px-4 pt-3 pb-6 border-t border-slate-100 bg-white flex gap-2">
            <input
              type="text"
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendAiMessage()}
              placeholder="Ask about Maui…"
              className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-sky-400"
            />
            <button
              onClick={() => sendAiMessage()}
              disabled={!aiInput.trim() || aiLoading}
              className="w-10 h-10 bg-gradient-to-br from-sky-500 to-indigo-500 text-white rounded-2xl flex items-center justify-center font-bold text-base disabled:opacity-40"
            >
              ↑
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          SEARCH HEADER
      ══════════════════════════════════════ */}
      <div className="px-4 pt-5 pb-3">

        {/* ── Big search pill ── */}
        <div className="flex items-center gap-3 bg-white rounded-2xl border border-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.09)] px-4 py-3.5">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-slate-400 flex-none">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
            <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>

          <div className="w-px h-7 bg-slate-200 flex-none" />

          <div className="flex-1 min-w-0">
            {editingLocation ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const trimmed = locationInput.trim();
                  if (trimmed) setLocation(trimmed);
                  setEditingLocation(false);
                }}
              >
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest leading-none mb-0.5">Exploring near</p>
                <input
                  autoFocus
                  type="text"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  onBlur={() => {
                    const trimmed = locationInput.trim();
                    if (trimmed) setLocation(trimmed);
                    setEditingLocation(false);
                  }}
                  className="w-full text-sm font-bold text-slate-900 outline-none bg-transparent placeholder:text-slate-400"
                  placeholder="Any area on Maui…"
                />
              </form>
            ) : (
              <button
                onClick={() => { setLocationInput(location); setEditingLocation(true); }}
                className="text-left w-full"
              >
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest leading-none mb-0.5">Exploring near</p>
                <p className="text-sm font-bold text-slate-900 leading-tight">{location}, Maui</p>
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`relative w-9 h-9 rounded-full border-2 flex items-center justify-center flex-none transition-all ${
              showFilters || activeFilterCount > 0
                ? "bg-slate-900 border-slate-900 text-white"
                : "bg-white border-slate-200 text-slate-500 hover:border-slate-400"
            }`}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            {activeFilterCount > 0 && !showFilters && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* ── Context chips ── */}
        <div className="flex items-center gap-2 mt-3 px-1">
          <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
            <span>🕒</span> {currentTime}
          </span>
          <span className="text-slate-200">·</span>
          <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
            <span>👨‍👩‍👧‍👦</span> {travelerCount} people
          </span>
          <button
            onClick={() => setKidsOnly(!kidsOnly)}
            className={`ml-auto flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
              kidsOnly ? "bg-emerald-500 text-white border-emerald-500" : "bg-white text-slate-500 border-slate-200"
            }`}
          >
            👦 Kids OK
          </button>
        </div>

        {/* ── Expandable filter panel ── */}
        {showFilters && (
          <div className="mt-3 bg-slate-50 rounded-2xl p-3 flex flex-col gap-3 border border-slate-100">
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">What do you need?</p>
              <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                {SCENARIOS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveScenario(activeScenario === i ? null : i)}
                    className={`flex-none flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-full border whitespace-nowrap transition-colors ${
                      activeScenario === i
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-600 border-slate-200"
                    }`}
                  >
                    {s.emoji} {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1.5">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Max drive time</p>
                <span className="text-[10px] font-bold text-slate-700">{maxDrive === 30 ? "Any distance" : `${maxDrive} min`}</span>
              </div>
              <input
                type="range" min={5} max={30} step={5} value={maxDrive}
                onChange={(e) => setMaxDrive(Number(e.target.value))}
                className="w-full h-1.5 accent-slate-900 cursor-pointer"
              />
            </div>

            {activeFilterCount > 0 && (
              <button
                onClick={() => { setActiveScenario(null); setKidsOnly(false); setMaxDrive(30); }}
                className="text-xs font-semibold text-rose-500 self-start"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════
          CATEGORY TABS
      ══════════════════════════════════════ */}
      <div className="border-b border-slate-100">
        <div className="flex overflow-x-auto px-4 gap-1" style={{ scrollbarWidth: "none" }}>
          {CATEGORIES.map((cat) => {
            const active = activeFilter === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setActiveFilter(cat.key)}
                className={`flex-none flex flex-col items-center gap-1 px-4 py-3 transition-all border-b-2 ${
                  active ? "border-slate-900" : "border-transparent"
                }`}
              >
                <span className={`text-xl leading-none ${active ? "opacity-100" : "opacity-50"}`}>
                  {cat.icon}
                </span>
                <span className={`text-[11px] font-semibold whitespace-nowrap ${
                  active ? "text-slate-900" : "text-slate-400"
                }`}>
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-4 px-4 pt-4 pb-4">

        {/* ── What Now? ── */}
        {!showWhatNow ? (
          <button
            onClick={() => setShowWhatNow(true)}
            className="w-full flex items-center gap-4 bg-gradient-to-r from-sky-500 to-indigo-500 text-white rounded-2xl px-4 py-4 shadow-md shadow-sky-200 text-left"
          >
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl flex-none">
              🤔
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">What should we do right now?</p>
              <p className="text-xs text-white/80 mt-0.5">Tap for instant context-aware suggestions</p>
            </div>
            <span className="text-white/80 text-lg">→</span>
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-indigo-700 uppercase tracking-widest">Right now · Your context</p>
                <button onClick={() => setShowWhatNow(false)} className="text-[10px] font-semibold text-indigo-400 hover:text-indigo-600">
                  ✕ close
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { icon: "🕒", text: currentTime },
                  { icon: "👨‍👩‍👧‍👦", text: `${travelerCount} travelers` },
                  { icon: "📍", text: `Near ${location}` },
                ].map((chip) => (
                  <span key={chip.text} className="flex items-center gap-1 text-xs font-medium bg-white text-indigo-700 border border-indigo-100 px-2 py-1 rounded-full">
                    {chip.icon} {chip.text}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Best picks for right now</p>
              <div className="flex flex-col gap-3">
                {WHAT_NOW_IDS.map((id) => {
                  const place = PLACES.find((p) => p.id === id)!;
                  return (
                    <div key={place.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex">
                      <div className="relative w-24 flex-none overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={place.photo} alt={place.photoAlt} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0 px-3 py-2.5 flex flex-col justify-between">
                        <div>
                          <p className="font-bold text-slate-800 text-sm truncate">{place.name}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{place.drive} · {place.price}</p>
                          <p className="text-xs text-slate-500 mt-1 leading-snug line-clamp-2">{place.blurb}</p>
                        </div>
                        <button
                          onClick={() => addToToday(place)}
                          className="mt-2 self-start bg-slate-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg"
                        >
                          + Add to My Day
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            AI TRIP ASSISTANT — Prominent ingress
        ══════════════════════════════════════ */}
        <div
          className="rounded-2xl overflow-hidden shadow-lg"
          style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0c4a6e 100%)" }}
        >
          {/* Top row */}
          <div className="px-4 pt-4 pb-3 flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center text-2xl flex-none shadow-lg">
              🌺
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-sky-300 uppercase tracking-widest mb-0.5">Your Personal Guide</p>
              <h3 className="text-base font-black text-white leading-tight">Maui Trip AI</h3>
              <p className="text-xs text-white/60 mt-0.5 leading-snug">Knows your itinerary, your crew, and all of Maui</p>
            </div>
          </div>

          {/* Quick prompts */}
          <div className="px-4 pb-3 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {AI_QUICK_PROMPTS.map((q) => (
              <button
                key={q}
                onClick={() => { setShowAI(true); sendAiMessage(q); }}
                className="flex-none text-[11px] font-semibold text-white/80 bg-white/10 border border-white/15 px-3 py-1.5 rounded-full whitespace-nowrap hover:bg-white/20 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={() => setShowAI(true)}
            className="w-full flex items-center justify-between px-4 py-3 bg-white/10 border-t border-white/10 hover:bg-white/15 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-sky-500 flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path d="M8 3v10M3 8h10" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <span className="text-sm font-bold text-white">Ask anything about your trip</span>
            </div>
            <span className="text-white/60 text-lg">→</span>
          </button>
        </div>

        {/* ── Results ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-slate-800">
              {filtered.length} {filtered.length === 1 ? "place" : "places"}
              {activeFilter !== "All" ? ` · ${activeFilter}` : ""}
              {scenario ? ` · ${scenario.label}` : ""}
            </p>
            {(activeFilter !== "All" || scenario || kidsOnly || maxDrive < 30) && (
              <button
                onClick={() => { setActiveFilter("All"); setActiveScenario(null); setKidsOnly(false); setMaxDrive(30); }}
                className="text-xs font-semibold text-rose-500"
              >
                Clear
              </button>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-slate-400">
              <span className="text-3xl">🔭</span>
              <p className="text-sm font-medium">Nothing matches right now</p>
              <button
                onClick={() => { setActiveFilter("All"); setActiveScenario(null); setKidsOnly(false); setMaxDrive(30); }}
                className="text-xs text-slate-900 font-semibold mt-1 underline underline-offset-2"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filtered.map((place) => (
                <div key={place.id} className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
                  {/* Photo */}
                  <div className="relative h-44 w-full overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={place.photo} alt={place.photoAlt} className="w-full h-full object-cover" />
                    {place.kidFriendly && (
                      <span className="absolute top-3 left-3 text-[10px] font-bold bg-white/85 backdrop-blur-sm text-emerald-700 px-2 py-1 rounded-full">
                        👦 Kid-friendly
                      </span>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/40 to-transparent" />
                  </div>

                  {/* Content */}
                  <div className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 text-sm">{place.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{place.address} · {place.category}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-none">
                        <span className="text-xs font-bold text-slate-800">★ {place.rating}</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">{place.blurb}</p>

                    {/* Drive + price row */}
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-xs text-slate-600 font-semibold">
                        🚗 {place.drive}
                      </span>
                      <span className="text-slate-200">·</span>
                      <span className="text-xs text-slate-500">{place.price} · {PRICE_LABELS[place.price]}</span>
                      <div className="ml-auto flex gap-2">
                        <button className="text-xs font-bold text-slate-600 border border-slate-200 px-3 py-1.5 rounded-xl hover:bg-slate-50 transition-colors">
                          Directions
                        </button>
                        <button
                          onClick={() => addToToday(place)}
                          className="text-xs font-bold bg-slate-900 text-white px-3 py-1.5 rounded-xl hover:bg-slate-800 transition-colors"
                        >
                          + Add to My Day
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
