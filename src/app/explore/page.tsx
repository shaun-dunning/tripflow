"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getTripDateInfo } from "@/lib/tripDates";
import { loadWishlist, addToWishlist, removeFromWishlist } from "@/lib/wishlist";

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
  // Verified traveler data
  reviewSource: "TripAdvisor" | "Yelp" | "Google";
  reviewCount: number;
  verifiedRating: number;
  reviewQuote: string;
  proTip: string;
};

const PLACES: Place[] = [
  {
    id: 1, name: "Kapalua Beach", category: "Beach", tags: ["beach", "activity", "kids"],
    distance: "2.1 mi", drive: "8 min", price: "$", kidFriendly: true, rating: 4.9,
    photo: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=600&h=300&fit=crop&q=80",
    photoAlt: "Kapalua Beach Maui",
    blurb: "Calm, protected bay — perfect for little swimmers. Snorkel gear rentals on-site.",
    address: "Kapalua, Maui",
    reviewSource: "TripAdvisor", reviewCount: 2140, verifiedRating: 5.0,
    reviewQuote: "Most beautiful beach we've ever seen. Completely calm water — our 5-year-old swam the whole time.",
    proTip: "Arrive before 9am. Parking fills fast and the calm morning water is stunning.",
  },
  {
    id: 2, name: "Monkeypod Kitchen", category: "Food", tags: ["food", "lunch", "dinner", "kids"],
    distance: "0.8 mi", drive: "4 min", price: "$$", kidFriendly: true, rating: 4.7,
    photo: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=300&fit=crop&q=80",
    photoAlt: "Restaurant interior",
    blurb: "Local farm-to-table favorite. Great cocktails, wood-fired pizza, kids menu available.",
    address: "Wailea, Maui",
    reviewSource: "Yelp", reviewCount: 1820, verifiedRating: 4.5,
    reviewQuote: "The wood-fired pizza and Monkeypod Mai Tai are absolute must-orders. One of our best meals on Maui.",
    proTip: "Walk-ins only — arrive right at opening (11am) or plan for a 30–45 min wait.",
  },
  {
    id: 3, name: "Maui Ocean Center", category: "Activity", tags: ["activity", "kids", "rainy"],
    distance: "3.4 mi", drive: "12 min", price: "$$", kidFriendly: true, rating: 4.6,
    photo: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&h=300&fit=crop&q=80",
    photoAlt: "Ocean aquarium",
    blurb: "Hawaii's premier aquarium. Sharks, rays, and a walk-through tunnel. Kids love it.",
    address: "Maalaea, Maui",
    reviewSource: "TripAdvisor", reviewCount: 3270, verifiedRating: 4.5,
    reviewQuote: "Our kids talked about the shark tunnel for months. The best rainy-day activity on the island, no contest.",
    proTip: "Book tickets online to skip the line. Plan 2–3 hours — there's more to see than you'd expect.",
  },
  {
    id: 4, name: "Ululani's Hawaiian Shave Ice", category: "Food", tags: ["food", "snack", "kids"],
    distance: "1.2 mi", drive: "5 min", price: "$", kidFriendly: true, rating: 4.8,
    photo: "https://images.unsplash.com/photo-1488900128323-21503983a07e?w=600&h=300&fit=crop&q=80",
    photoAlt: "Colorful shave ice",
    blurb: "Best shave ice on the island. Perfect afternoon treat after the beach.",
    address: "Lahaina, Maui",
    reviewSource: "Yelp", reviewCount: 2460, verifiedRating: 4.7,
    reviewQuote: "Absolute game changer. Not ice cream, not a snow cone — something else entirely. Get the mochi and sweet cream.",
    proTip: "The Lahaina location has shorter lines than Kihei. Add azuki beans for an authentic local touch.",
  },
  {
    id: 5, name: "Andaz Maui Spa", category: "Spa", tags: ["spa", "adults"],
    distance: "0.3 mi", drive: "2 min", price: "$$$", kidFriendly: false, rating: 4.8,
    photo: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&h=300&fit=crop&q=80",
    photoAlt: "Luxury spa",
    blurb: "World-class treatments with ocean views. Book a couples massage while kids nap.",
    address: "Wailea, Maui",
    reviewSource: "TripAdvisor", reviewCount: 847, verifiedRating: 4.8,
    reviewQuote: "The ocean view during my massage is something I'll never forget. Worth every single penny.",
    proTip: "Book 2+ weeks ahead for morning slots — they go fast. Ask for the lānai room.",
  },
  {
    id: 6, name: "Surfing Goat Dairy", category: "Activity", tags: ["activity", "kids", "unique"],
    distance: "8.2 mi", drive: "22 min", price: "$", kidFriendly: true, rating: 4.5,
    photo: "https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=600&h=300&fit=crop&q=80",
    photoAlt: "Goat farm",
    blurb: "Working goat farm with tours and tastings. Unique, fun, and surprisingly memorable.",
    address: "Kula, Maui",
    reviewSource: "Yelp", reviewCount: 614, verifiedRating: 4.5,
    reviewQuote: "Kids were in absolute heaven feeding baby goats. Hilarious, memorable, and totally different from anything else on Maui.",
    proTip: "The Grand Dairy Tour includes cheese tasting — worth the upgrade. Book ahead on weekends.",
  },
  {
    id: 7, name: "Down the Hatch", category: "Food", tags: ["food", "drinks", "adults", "lunch"],
    distance: "4.1 mi", drive: "14 min", price: "$$", kidFriendly: true, rating: 4.4,
    photo: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&h=300&fit=crop&q=80",
    photoAlt: "Tropical cocktails",
    blurb: "Waterfront bar in Lahaina. Great mai tais, fish tacos, casual and fun.",
    address: "Lahaina, Maui",
    reviewSource: "Yelp", reviewCount: 1240, verifiedRating: 4.4,
    reviewQuote: "Best happy hour in all of Lahaina. The fish tacos are legendary and the waterfront view doesn't hurt.",
    proTip: "Grab a waterfront table by arriving 15 min before happy hour. They fill up instantly.",
  },
  {
    id: 8, name: "Wailea Beach Path", category: "Activity", tags: ["activity", "kids", "free", "morning"],
    distance: "0.1 mi", drive: "Walk", price: "$", kidFriendly: true, rating: 4.7,
    photo: "https://images.unsplash.com/photo-1471922694854-ff1b63b20054?w=600&h=300&fit=crop&q=80",
    photoAlt: "Coastal path",
    blurb: "1.5-mile paved coastal walk connecting Wailea's beaches. Stunning views, totally free.",
    address: "Wailea, Maui",
    reviewSource: "TripAdvisor", reviewCount: 3810, verifiedRating: 4.9,
    reviewQuote: "Best free thing on Maui, full stop. Walk it early morning with a coffee — you'll have it nearly to yourself.",
    proTip: "Walk south to north for the best morning light. Ends near a great breakfast spot.",
  },
];

const CATEGORIES = [
  { label: "All",      icon: "◉",  key: "All"      },
  { label: "Beach",    icon: "🌊", key: "Beach"    },
  { label: "Food",     icon: "🍜", key: "Food"     },
  { label: "Activity", icon: "🪁", key: "Activity"  },
  { label: "Spa",      icon: "🌺", key: "Spa"       },
];

const TRIP_DAYS_INFO = [
  { dayNum: 1, date: "Fri · Jun 5",  theme: "Travel Day",       emoji: "✈️" },
  { dayNum: 2, date: "Sat · Jun 6",  theme: "Beach + Snorkel",  emoji: "🏖️" },
  { dayNum: 3, date: "Sun · Jun 7",  theme: "Road to Hana",     emoji: "🚗" },
  { dayNum: 4, date: "Mon · Jun 8",  theme: "Beach + Spa",      emoji: "💆" },
  { dayNum: 5, date: "Tue · Jun 9",  theme: "Free Day",         emoji: "🌺" },
  { dayNum: 6, date: "Wed · Jun 10", theme: "Haleakalā Sunrise",emoji: "🌋" },
  { dayNum: 7, date: "Thu · Jun 11", theme: "Fly Home",         emoji: "🏠" },
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

  // "Added to trip" toast
  const [addedToast, setAddedToast] = useState<string | null>(null);

  // All trip days: dayNum → trip_day_id
  const [tripDayMap, setTripDayMap] = useState<Record<number, string>>({});
  const [todayDayNum, setTodayDayNum] = useState<number | null>(null);

  // Day picker sheet
  const [dayPickerPlace, setDayPickerPlace] = useState<Place | null>(null);
  const [dayPickerAdding, setDayPickerAdding] = useState(false);

  // Wishlist (saved for later)
  const [wishlistIds, setWishlistIds] = useState<Set<number>>(new Set());
  const [wishlistSavedToast, setWishlistSavedToast] = useState<string | null>(null);

  // Expanded card
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState("");

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

    async function fetchTripDays() {
      const [tripResult, daysResult] = await Promise.all([
        supabase.from("trips").select("start_date, end_date").eq("id", TRIP_ID).single(),
        supabase.from("trip_days").select("id, day_number").eq("trip_id", TRIP_ID).order("day_number"),
      ]);

      if (tripResult.data) {
        const info = getTripDateInfo(tripResult.data.start_date, tripResult.data.end_date);
        if (info.status === "active") setTodayDayNum(info.currentDayNumber);
      }

      if (daysResult.data) {
        const map: Record<number, string> = {};
        daysResult.data.forEach((d) => { map[d.day_number] = d.id; });
        setTripDayMap(map);
      }
    }
    fetchTripDays();

    // Load wishlist
    const saved = loadWishlist();
    setWishlistIds(new Set(saved.map((e) => e.placeId)));

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    aiBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages]);

  async function addToDay(place: Place, dayNum: number) {
    const tripDayId = tripDayMap[dayNum];
    setDayPickerAdding(true);

    if (tripDayId) {
      const { data: existing } = await supabase
        .from("agenda_items")
        .select("sort_order")
        .eq("trip_day_id", tripDayId)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();

      await supabase.from("agenda_items").insert({
        trip_day_id: tripDayId,
        title: place.name,
        subtitle: `${place.drive} · ${place.address}`,
        emoji: place.category === "Beach" ? "🏖️"
             : place.category === "Food"  ? "🍽️"
             : place.category === "Spa"   ? "💆"
             : "📍",
        time: "TBD",
        done: false,
        sort_order: (existing?.sort_order ?? 0) + 10,
        is_reservation: false,
      });
    }

    setDayPickerAdding(false);
    setDayPickerPlace(null);
    setAddedToast(`Day ${dayNum}: ${place.name}`);
    setTimeout(() => {
      setAddedToast(null);
      router.push("/");
    }, 1500);
  }

  function toggleWishlist(place: Place) {
    if (wishlistIds.has(place.id)) {
      removeFromWishlist(place.id);
      setWishlistIds((prev) => { const n = new Set(prev); n.delete(place.id); return n; });
    } else {
      addToWishlist({
        placeId: place.id,
        name: place.name,
        category: place.category,
        drive: place.drive,
        photo: place.photo,
        photoAlt: place.photoAlt,
      });
      setWishlistIds((prev) => new Set([...prev, place.id]));
      setDayPickerPlace(null);
      setWishlistSavedToast(place.name);
      setTimeout(() => setWishlistSavedToast(null), 2000);
    }
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
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const hit =
        p.name.toLowerCase().includes(q) ||
        p.blurb.toLowerCase().includes(q) ||
        p.reviewQuote.toLowerCase().includes(q) ||
        p.proTip.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q) ||
        p.tags.some((t) => t.includes(q)) ||
        p.category.toLowerCase().includes(q);
      if (!hit) return false;
    }
    if (activeFilter !== "All" && p.category !== activeFilter) return false;
    if (kidsOnly && !p.kidFriendly) return false;
    if (driveMinutes(p.drive) > maxDrive) return false;
    if (scenario && !scenario.tags.some((t) => p.tags.includes(t))) return false;
    return true;
  });

  // Top picks by verifiedRating × log(reviewCount) — shown in Traveler Picks strip
  const travelerPicks = [...PLACES]
    .sort((a, b) => b.verifiedRating * Math.log(b.reviewCount) - a.verifiedRating * Math.log(a.reviewCount))
    .slice(0, 3);

  const activeFilterCount = (kidsOnly ? 1 : 0) + (maxDrive < 30 ? 1 : 0) + (activeScenario !== null ? 1 : 0);

  return (
    <div className="flex flex-col bg-white relative">

      {/* ── "Saved for later" toast ── */}
      {wishlistSavedToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] bg-amber-700 text-white text-sm font-semibold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <span>🔖</span>
          <span className="truncate max-w-[200px]">{wishlistSavedToast}</span>
          <span className="text-white/70">saved for later</span>
        </div>
      )}

      {/* ── "Added to trip" toast ── */}
      {addedToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] bg-slate-900 text-white text-sm font-semibold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <span>✅</span>
          <span className="truncate max-w-[220px]">{addedToast}</span>
          <span className="text-white/60">added!</span>
        </div>
      )}

      {/* ── Day Picker Sheet ── */}
      <div className={`fixed inset-0 z-[65] flex flex-col justify-end max-w-md mx-auto transition-opacity duration-200 ${dayPickerPlace ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !dayPickerAdding && setDayPickerPlace(null)} />
        <div className={`relative bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out ${dayPickerPlace ? "translate-y-0" : "translate-y-full"}`}>

          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1 flex-none">
            <div className="w-10 h-1 bg-slate-200 rounded-full" />
          </div>

          {/* Header */}
          <div className="px-5 pt-2 pb-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl flex-none">
              {dayPickerPlace?.category === "Beach" ? "🏖️"
                : dayPickerPlace?.category === "Food" ? "🍽️"
                : dayPickerPlace?.category === "Spa"  ? "💆"
                : "📍"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Add to trip</p>
              <p className="text-sm font-black text-slate-900 leading-tight truncate">{dayPickerPlace?.name}</p>
            </div>
            <button onClick={() => setDayPickerPlace(null)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-sm font-bold flex-none">
              ✕
            </button>
          </div>

          {/* Day list */}
          <div className="px-4 pt-3 pb-8 flex flex-col gap-2 max-h-[65vh] overflow-y-auto">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pick a day — or save for later</p>
            {TRIP_DAYS_INFO.map((d) => {
              const isToday = d.dayNum === todayDayNum;
              const hasDayId = !!tripDayMap[d.dayNum];
              return (
                <button
                  key={d.dayNum}
                  onClick={() => dayPickerPlace && addToDay(dayPickerPlace, d.dayNum)}
                  disabled={dayPickerAdding || !hasDayId}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-all active:scale-[0.98] ${
                    isToday
                      ? "bg-sky-50 border-sky-200 hover:bg-sky-100"
                      : "bg-white border-slate-100 hover:bg-slate-50"
                  } disabled:opacity-40`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-none ${isToday ? "bg-sky-500" : "bg-slate-100"}`}>
                    <span>{d.emoji}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-slate-900">Day {d.dayNum} · {d.theme}</p>
                      {isToday && (
                        <span className="text-[9px] font-bold bg-sky-500 text-white px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                          Today
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{d.date}</p>
                  </div>
                  {dayPickerAdding
                    ? <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin flex-none" />
                    : <span className="text-slate-300 text-lg flex-none">›</span>
                  }
                </button>
              );
            })}

            {/* Save for Later */}
            <div className="border-t border-slate-100 pt-3 mt-1">
              {dayPickerPlace && wishlistIds.has(dayPickerPlace.id) ? (
                <button
                  onClick={() => dayPickerPlace && toggleWishlist(dayPickerPlace)}
                  className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-rose-500 hover:text-rose-600 transition-colors"
                >
                  🗑️ Remove from saved list
                </button>
              ) : (
                <button
                  onClick={() => dayPickerPlace && toggleWishlist(dayPickerPlace)}
                  className="w-full flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3.5 hover:bg-amber-100 transition-colors"
                >
                  <span className="text-xl">🔖</span>
                  <div className="text-left flex-1">
                    <p className="text-sm font-bold text-amber-900">Save for later</p>
                    <p className="text-[11px] text-amber-600 mt-0.5">We&apos;ll remind you when there&apos;s a free slot</p>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

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

        {/* ── Real search input ── */}
        <div className="flex items-center gap-3 bg-white rounded-2xl border border-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.09)] px-4 py-3.5">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-slate-400 flex-none">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
            <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search beaches, dining, activities…"
            className="flex-1 text-sm font-medium text-slate-900 outline-none bg-transparent placeholder:text-slate-400"
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery("")}
              className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold flex-none hover:bg-slate-200 transition-colors"
            >
              ✕
            </button>
          ) : (
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
          )}
        </div>

        {/* ── Context chips + location ── */}
        <div className="flex items-center gap-2 mt-3 px-1">
          <button
            onClick={() => { setLocationInput(location); setEditingLocation(true); }}
            className="flex items-center gap-1 text-xs text-slate-500 font-medium hover:text-slate-700 transition-colors"
          >
            <span>📍</span>
            {editingLocation ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const trimmed = locationInput.trim();
                  if (trimmed) setLocation(trimmed);
                  setEditingLocation(false);
                }}
              >
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
                  className="text-xs font-semibold text-slate-900 outline-none bg-transparent w-28"
                  placeholder="Area on Maui…"
                />
              </form>
            ) : (
              <span className="font-semibold text-slate-700">{location}</span>
            )}
          </button>
          <span className="text-slate-200">·</span>
          <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
            <span>🕒</span> {currentTime}
          </span>
          <span className="text-slate-200">·</span>
          <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
            <span>👨‍👩‍👧‍👦</span> {travelerCount}
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

        {/* ── Saved for Later ── */}
        {wishlistIds.size > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-sm">🔖</span>
                <p className="text-sm font-bold text-slate-800">Saved for later</p>
              </div>
              <span className="text-[11px] text-slate-400">{wishlistIds.size} place{wishlistIds.size !== 1 ? "s" : ""}</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {PLACES.filter((p) => wishlistIds.has(p.id)).map((place) => (
                <div key={place.id} className="flex-none w-44 bg-white rounded-2xl overflow-hidden border border-amber-100 shadow-sm">
                  <div className="relative h-24 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={place.photo} alt={place.photoAlt} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    <button
                      onClick={() => toggleWishlist(place)}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white text-[10px] font-bold"
                    >
                      ✕
                    </button>
                    <span className="absolute bottom-2 left-2.5 text-[10px] font-bold text-white/80">{place.drive}</span>
                  </div>
                  <div className="px-3 py-2.5">
                    <p className="text-xs font-bold text-slate-900 leading-tight truncate">{place.name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{place.category}</p>
                    <button
                      onClick={() => setDayPickerPlace(place)}
                      className="mt-2 w-full bg-slate-900 text-white text-[10px] font-bold py-1.5 rounded-lg"
                    >
                      Add to Trip →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Traveler Picks ── */}
        {!searchQuery && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-black text-slate-900">Traveler Picks</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Highest rated by verified visitors</p>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <span className="text-amber-500">★</span> Top Rated
              </div>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {travelerPicks.map((place) => (
                <button
                  key={place.id}
                  onClick={() => setExpandedId(expandedId === place.id ? null : place.id)}
                  className="flex-none w-52 bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm text-left active:scale-[0.98] transition-transform"
                >
                  <div className="relative h-28 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={place.photo} alt={place.photoAlt} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-full">
                      <span className="text-amber-400">★</span>
                      <span>{place.verifiedRating.toFixed(1)}</span>
                      <span className="text-white/60 font-normal">{place.reviewSource}</span>
                    </div>
                    {place.kidFriendly && (
                      <span className="absolute top-2.5 right-2.5 text-[9px] font-bold bg-emerald-500/90 text-white px-1.5 py-0.5 rounded-full">
                        👦 Family
                      </span>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 px-3 pb-2">
                      <p className="text-xs font-bold text-white leading-tight truncate">{place.name}</p>
                    </div>
                  </div>
                  <div className="px-3 py-2.5">
                    <p className="text-[10px] text-slate-500 leading-snug line-clamp-2 italic">
                      &ldquo;{place.reviewQuote.split(".")[0]}.&rdquo;
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-slate-400">{place.drive} · {place.price}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDayPickerPlace(place); }}
                        className="text-[10px] font-bold bg-slate-900 text-white px-2.5 py-1 rounded-lg"
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

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
                          onClick={() => setDayPickerPlace(place)}
                          className="mt-2 self-start bg-slate-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg"
                        >
                          + Add to Trip
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
              {searchQuery ? ` for "${searchQuery}"` : activeFilter !== "All" ? ` · ${activeFilter}` : ""}
              {scenario ? ` · ${scenario.label}` : ""}
            </p>
            {(searchQuery || activeFilter !== "All" || scenario || kidsOnly || maxDrive < 30) && (
              <button
                onClick={() => { setSearchQuery(""); setActiveFilter("All"); setActiveScenario(null); setKidsOnly(false); setMaxDrive(30); }}
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
                onClick={() => { setSearchQuery(""); setActiveFilter("All"); setActiveScenario(null); setKidsOnly(false); setMaxDrive(30); }}
                className="text-xs text-slate-900 font-semibold mt-1 underline underline-offset-2"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filtered.map((place) => {
                const isExpanded = expandedId === place.id;
                return (
                  <div key={place.id} className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
                    {/* Photo */}
                    <div
                      className="relative h-40 w-full overflow-hidden cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : place.id)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={place.photo} alt={place.photoAlt} className="w-full h-full object-cover" />
                      {/* Verified rating badge */}
                      <div className="absolute top-3 left-3 flex items-center gap-1 bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-full">
                        <span className="text-amber-400">★</span>
                        <span>{place.verifiedRating.toFixed(1)}</span>
                        <span className="text-white/60 font-normal">{place.reviewSource}</span>
                      </div>
                      {place.kidFriendly && !wishlistIds.has(place.id) && (
                        <span className="absolute top-3 right-3 text-[10px] font-bold bg-white/85 backdrop-blur-sm text-emerald-700 px-2 py-1 rounded-full">
                          👦 Kids
                        </span>
                      )}
                      {wishlistIds.has(place.id) && (
                        <span className="absolute top-3 right-3 text-[10px] font-bold bg-amber-500 text-white px-2 py-1 rounded-full">
                          🔖 Saved
                        </span>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/40 to-transparent" />
                    </div>

                    {/* Content */}
                    <div className="px-4 py-3">
                      <button
                        className="w-full text-left"
                        onClick={() => setExpandedId(isExpanded ? null : place.id)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-900 text-sm">{place.name}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{place.address} · {place.category}</p>
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium flex-none mt-0.5">{isExpanded ? "↑ Less" : "↓ More"}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-2 leading-relaxed">{place.blurb}</p>
                        {!isExpanded && (
                          <p className="text-[11px] text-slate-400 italic mt-1.5 leading-snug line-clamp-1">
                            &ldquo;{place.reviewQuote.split(".")[0].trim()}.&rdquo;
                          </p>
                        )}
                      </button>

                      {/* Expanded: Verified review + Pro tip */}
                      {isExpanded && (
                        <>
                          <div className="mt-3 pt-3 border-t border-slate-50">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Travelers say</p>
                            <p className="text-xs text-slate-500 italic leading-relaxed">
                              &ldquo;{place.reviewQuote}&rdquo;
                            </p>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <span className="text-[10px] font-bold text-amber-500">★ {place.verifiedRating.toFixed(1)}</span>
                              <span className="text-[10px] text-slate-400">· {place.reviewCount.toLocaleString()} reviews on {place.reviewSource}</span>
                            </div>
                          </div>
                          <div className="mt-2.5 bg-amber-50 rounded-xl px-3 py-2 flex gap-2 items-start">
                            <span className="text-sm flex-none">💡</span>
                            <p className="text-[11px] text-amber-800 leading-snug">{place.proTip}</p>
                          </div>
                        </>
                      )}

                      {/* Drive + price row */}
                      <div className="flex items-center gap-2 mt-3">
                        <span className="text-xs text-slate-600 font-semibold">
                          🚗 {place.drive}
                        </span>
                        <span className="text-slate-200">·</span>
                        <span className="text-xs text-slate-500">{place.price} · {PRICE_LABELS[place.price]}</span>
                        <div className="ml-auto flex gap-2">
                          {!isExpanded && (
                            <button
                              onClick={() => setExpandedId(place.id)}
                              className="text-xs font-semibold text-slate-400 hover:text-slate-700 transition-colors"
                            >
                              Reviews ↓
                            </button>
                          )}
                          <button
                            onClick={() => setDayPickerPlace(place)}
                            className="text-xs font-bold bg-slate-900 text-white px-3 py-1.5 rounded-xl hover:bg-slate-800 transition-colors"
                          >
                            + Add to Trip
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
