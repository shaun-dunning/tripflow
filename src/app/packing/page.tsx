"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { haptic } from "@/lib/haptic";
import { useAuth } from "@/hooks/useAuth";
import { useActiveTrip } from "@/hooks/useActiveTrip";
import FirstTripSetup from "@/components/FirstTripSetup";

// ---------------------------------------------------------------------------
// Persistence uses Supabase when the shared `packing_items` table is available,
// with localStorage as a graceful fallback for offline/dev sessions.
// ---------------------------------------------------------------------------
const LS_KEY = "tripflow-packing-v2-maui26";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Category =
  | "Documents"
  | "Clothing"
  | "Beach Gear"
  | "Kids"
  | "Pharmacy"
  | "Electronics"
  | "Misc";

const CATEGORY_META: Record<Category, { emoji: string; color: string }> = {
  Documents:   { emoji: "📋", color: "bg-amber-50 border-amber-200" },
  Clothing:    { emoji: "👕", color: "bg-sky-50 border-sky-200" },
  "Beach Gear":{ emoji: "🏖️", color: "bg-cyan-50 border-cyan-200" },
  Kids:        { emoji: "👦", color: "bg-purple-50 border-purple-200" },
  Pharmacy:    { emoji: "💊", color: "bg-rose-50 border-rose-200" },
  Electronics: { emoji: "🔌", color: "bg-slate-50 border-slate-200" },
  Misc:        { emoji: "🎒", color: "bg-emerald-50 border-emerald-200" },
};

const ALL_CATEGORIES = Object.keys(CATEGORY_META) as Category[];

// Must-haves filter shows only these categories
const MUST_HAVE_CATS: Category[] = ["Documents", "Pharmacy"];

type Traveler = {
  id: string;
  name: string;
  avatar: string;
  avatar_url?: string | null;
  role: string;
  status: string;
  is_me?: boolean;
  user_id?: string | null;
};

type Assignee = string;

// Color palette — assigned by traveler index
const CREW_COLOR_PALETTE = [
  "bg-sky-500",
  "bg-rose-400",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-indigo-400",
  "bg-teal-500",
];

function getAssigneeColor(name: string, crewNames: string[]): string {
  if (name === "Anyone") return "bg-slate-300";
  const idx = crewNames.indexOf(name);
  return idx >= 0 ? CREW_COLOR_PALETTE[idx % CREW_COLOR_PALETTE.length] : "bg-slate-400";
}

type PackItem = {
  id: string;
  name: string;
  category: Category;
  assignee: Assignee;
  packed: boolean;
  is_suggested: boolean;
};

type PackingRow = {
  id: string;
  trip_id: string;
  name: string;
  category: Category;
  assignee: string;
  packed: boolean;
  is_suggested: boolean;
  sort_order: number;
};

// ---------------------------------------------------------------------------
// Trip itinerary (mirrored from trip/page.tsx fixture)
// Used to compute smart suggestions
// ---------------------------------------------------------------------------
const TRIP_ACTIVITIES = [
  "Ka'anapali Beach",
  "Molokini Crater",
  "Mama's Fish House",
  "Road to Hana",
  "Scenic drive",
  "Black sand beach",
  "Couples massage",
  "Pool day",
  "Humble Market dinner",
  "Upcountry Market",
  "Old Lahaina Luau",
  "Sunrise at summit",   // Haleakālā
  "Sliding Sands hike",
];

type Suggestion = {
  id: string;
  name: string;
  category: Category;
  reason: string;
};

function computeSuggestions(): Suggestion[] {
  const all = TRIP_ACTIVITIES.join(" ").toLowerCase();
  const out: Suggestion[] = [];

  // Snorkel / Molokini
  if (/molokini|snorkel/.test(all)) {
    out.push(
      { id: "sug-snorkel",  name: "Snorkel gear",           category: "Beach Gear", reason: "Molokini snorkel tour" },
      { id: "sug-ucam",     name: "Underwater camera",       category: "Electronics", reason: "Molokini snorkel tour" },
      { id: "sug-seasick",  name: "Sea-sickness meds",        category: "Pharmacy",   reason: "Molokini boat tour" },
      { id: "sug-rfsun",    name: "Reef-safe sunscreen",      category: "Beach Gear", reason: "Required at Molokini" },
    );
  }

  // Haleakālā / sunrise
  if (/haleakal|sunrise|summit/.test(all)) {
    out.push(
      { id: "sug-layers",   name: "Warm layers",              category: "Clothing",   reason: "Haleakālā summit (35–45°F)" },
      { id: "sug-lamp",     name: "Headlamp",                 category: "Misc",       reason: "2:30 AM Haleakālā departure" },
      { id: "sug-warmers",  name: "Hand warmers",             category: "Misc",       reason: "Haleakālā sunrise" },
    );
  }

  // Road to Hana
  if (/hana/.test(all)) {
    out.push(
      { id: "sug-snacks",   name: "Snacks & water bottles",  category: "Misc",       reason: "Road to Hana long drive" },
      { id: "sug-msick",    name: "Motion sickness meds",     category: "Pharmacy",   reason: "620 turns — Road to Hana" },
    );
  }

  // Beach / Ka'anapali
  if (/ka.anapali|beach/.test(all)) {
    out.push(
      { id: "sug-btowels",  name: "Beach towels",             category: "Beach Gear", reason: "Ka'anapali Beach" },
      { id: "sug-rguard",   name: "Rash guard",               category: "Clothing",   reason: "Ka'anapali Beach" },
    );
  }

  // Luau
  if (/luau/.test(all)) {
    out.push(
      { id: "sug-aloha",    name: "Light sundress / aloha shirt", category: "Clothing", reason: "Old Lahaina Luau" },
    );
  }

  return out;
}

const ALL_SUGGESTIONS = computeSuggestions();

// ---------------------------------------------------------------------------
// Default items (always pre-loaded on first visit)
// ---------------------------------------------------------------------------
function buildDefaultItems(): PackItem[] {
  const items: Omit<PackItem, "packed" | "is_suggested">[] = [
    // Documents
    { id: "d1", name: "Passports",               category: "Documents",   assignee: "Anyone" },
    { id: "d3", name: "Travel insurance docs",   category: "Documents",   assignee: "Anyone" },
    { id: "d4", name: "Hotel confirmation",      category: "Documents",   assignee: "Anyone" },
    // Clothing
    { id: "c1", name: "Swimsuits",               category: "Clothing",    assignee: "Anyone" },
    { id: "c2", name: "Aloha shirts",            category: "Clothing",    assignee: "Anyone" },
    { id: "c3", name: "Light layers (Haleakālā)",category: "Clothing",    assignee: "Anyone" },
    { id: "c4", name: "Sandals",                 category: "Clothing",    assignee: "Anyone" },
    { id: "c5", name: "Reef-safe sunscreen",     category: "Clothing",    assignee: "Anyone" },
    // Beach Gear
    { id: "b1", name: "Beach towels",            category: "Beach Gear",  assignee: "Anyone" },
    { id: "b2", name: "Snorkel gear",            category: "Beach Gear",  assignee: "Anyone" },
    { id: "b3", name: "Underwater camera",       category: "Beach Gear",  assignee: "Anyone" },
    { id: "b4", name: "Boogie boards",           category: "Beach Gear",  assignee: "Anyone" },
    // Kids
    { id: "k1", name: "Kids' sunscreen",         category: "Kids",        assignee: "Anyone" },
    { id: "k2", name: "Floaties",               category: "Kids",        assignee: "Anyone" },
    { id: "k3", name: "Beach toys",             category: "Kids",        assignee: "Anyone" },
    { id: "k4", name: "Motion sickness meds",   category: "Kids",        assignee: "Anyone" },
    // Pharmacy
    { id: "p1", name: "Reef-safe sunscreen",     category: "Pharmacy",    assignee: "Anyone" },
    { id: "p2", name: "Ibuprofen",               category: "Pharmacy",    assignee: "Anyone" },
    { id: "p3", name: "Band-aids",               category: "Pharmacy",    assignee: "Anyone" },
    { id: "p4", name: "Dramamine",               category: "Pharmacy",    assignee: "Anyone" },
    // Electronics
    { id: "e1", name: "Phone chargers",          category: "Electronics", assignee: "Anyone" },
    { id: "e2", name: "Portable battery",        category: "Electronics", assignee: "Anyone" },
    { id: "e3", name: "Camera",                  category: "Electronics", assignee: "Anyone" },
  ];

  return items.map((i) => ({ ...i, packed: false, is_suggested: false }));
}

// Common items pre-populated in the Add sheet per category
const CATEGORY_PRESETS: Record<Category, string[]> = {
  Documents:    ["Passports", "Boarding passes", "Car rental confirmation", "Vaccination records"],
  Clothing:     ["Underwear", "Pajamas", "Sun hat", "Light jacket", "Casual dress", "Workout clothes"],
  "Beach Gear": ["Dry bag", "Water shoes", "Waterproof phone case", "Sand toy bag", "Paddleball set"],
  Kids:         ["Kids headphones", "Tablet + charger", "Favorite snacks", "Comfort item / stuffed animal", "Small backpack"],
  Pharmacy:     ["Prescription meds", "Aloe vera gel", "Insect repellent", "Antacids", "Eye drops", "Allergy meds"],
  Electronics:  ["Laptop", "Adapters / converters", "Earbuds / AirPods", "GoPro", "Kindle / e-reader"],
  Misc:         ["Reusable bags", "Travel umbrella", "Hand sanitizer", "Snacks", "Travel pillow", "Book / magazines"],
};

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------
function loadLocalItems(): PackItem[] {
  if (typeof window === "undefined") return buildDefaultItems();
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as PackItem[];
  } catch { /* ignore */ }
  return buildDefaultItems();
}

function saveLocalItems(items: PackItem[]): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(items));
  } catch { /* ignore */ }
}

function rowToItem(row: PackingRow): PackItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    assignee: row.assignee,
    packed: row.packed,
    is_suggested: row.is_suggested,
  };
}

function itemToRow(item: PackItem, index: number, tripId: string): PackingRow {
  return {
    ...item,
    trip_id: tripId,
    sort_order: (index + 1) * 10,
  };
}

async function loadSharedItems(tripId: string): Promise<{ items: PackItem[]; shared: boolean }> {
  const localItems = loadLocalItems();
  const { data, error } = await supabase
    .from("packing_items")
    .select("id, trip_id, name, category, assignee, packed, is_suggested, sort_order")
    .eq("trip_id", tripId)
    .order("sort_order", { ascending: true });

  if (error) return { items: localItems, shared: false };
  if (data && data.length > 0) return { items: (data as PackingRow[]).map(rowToItem), shared: true };

  await saveSharedItems(localItems, tripId);
  return { items: localItems, shared: true };
}

async function saveSharedItems(items: PackItem[], tripId: string): Promise<void> {
  const rows = items.map((item, index) => itemToRow(item, index, tripId));
  await supabase.from("packing_items").upsert(rows, { onConflict: "id" });
}

// ---------------------------------------------------------------------------
// Milestone helper
// ---------------------------------------------------------------------------
type Milestone = { label: string; sub: string; emoji: string; bg: string } | null;

function getMilestone(pct: number): Milestone {
  if (pct >= 100) return { label: "You're fully packed!", sub: "Time to enjoy Maui. You've earned it.", emoji: "🎉", bg: "bg-emerald-50 border-emerald-200" };
  if (pct >= 75)  return { label: "Almost there!", sub: "Just a few more items — you've got this.", emoji: "🏁", bg: "bg-sky-50 border-sky-200" };
  if (pct >= 50)  return { label: "Halfway there!", sub: "Great momentum. Keep going!", emoji: "⚡", bg: "bg-violet-50 border-violet-200" };
  if (pct >= 25)  return { label: "25% done — nice start!", sub: "Don't forget your must-haves.", emoji: "🌟", bg: "bg-amber-50 border-amber-200" };
  return null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function PackingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const activeTrip = useActiveTrip(user);
  const [items, setItems] = useState<PackItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [travelers, setTravelers] = useState<Traveler[]>([]);
  const [scrolled, setScrolled] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<Category>>(new Set());
  const [showMustHaves, setShowMustHaves] = useState(false);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [sharedPacking, setSharedPacking] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  // Add-item sheet
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [addName, setAddName] = useState("");
  const [addCategory, setAddCategory] = useState<Category>("Misc");
  const [addAssignee, setAddAssignee] = useState<Assignee>("Anyone");
  const [addSheetOpenedForCat, setAddSheetOpenedForCat] = useState<Category | null>(null);
  const addNameRef = useRef<HTMLInputElement>(null);

  // Load on mount
  useEffect(() => {
    if (activeTrip.isPreview) {
      queueMicrotask(() => {
        setItems(loadLocalItems());
        setSharedPacking(false);
        setHydrated(true);
      });
      return;
    }
    if (!activeTrip.activeTripId) return;
    let cancelled = false;
    loadSharedItems(activeTrip.activeTripId).then(({ items: loadedItems, shared }) => {
      if (cancelled) return;
      setItems(loadedItems);
      setSharedPacking(shared);
      setHydrated(true);
    }).catch((err) => {
      if (cancelled) return;
      console.warn("Packing list is using local fallback.", err);
      setItems(loadLocalItems());
      setSharedPacking(false);
      setHydrated(true);
    });

    void (async () => {
      try {
        const { data } = await supabase
          .from("travelers")
          .select("*")
          .eq("trip_id", activeTrip.activeTripId)
          .order("created_at", { ascending: true });
        if (data && data.length > 0) setTravelers(data as Traveler[]);
      } catch { /* traveler chips are optional */ }
    })();
    return () => { cancelled = true; };
  }, [activeTrip.activeTripId, activeTrip.isPreview]);

  // Scroll-aware sticky header
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 140);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Persist on every change (skip initial render)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (!hydrated) return;
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    saveLocalItems(items);
    if (sharedPacking && activeTrip.activeTripId) void saveSharedItems(items, activeTrip.activeTripId);
  }, [activeTrip.activeTripId, items, hydrated, sharedPacking]);

  // Focus add-name field when sheet opens
  useEffect(() => {
    if (showAddSheet) {
      setTimeout(() => addNameRef.current?.focus(), 80);
    }
  }, [showAddSheet]);

  // Derived crew list from real travelers
  const crewNames = travelers.map((t) => t.name);

  // ---------------------------------------------------------------------------
  // Stats
  // ---------------------------------------------------------------------------
  const totalItems = items.length;
  const packedCount = items.filter((i) => i.packed).length;
  const pct = totalItems > 0 ? Math.round((packedCount / totalItems) * 100) : 0;

  // Days until trip
  const tripStart = new Date("2026-06-05T00:00:00");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const daysLeft = Math.max(0, Math.ceil((tripStart.getTime() - today.getTime()) / 86_400_000));

  // ---------------------------------------------------------------------------
  // Suggestions to show (not dismissed, not already in items)
  // ---------------------------------------------------------------------------
  const existingNames = new Set(items.map((i) => i.name.toLowerCase()));
  const visibleSuggestions = ALL_SUGGESTIONS.filter(
    (s) => !dismissedSuggestions.has(s.id) && !existingNames.has(s.name.toLowerCase()),
  );

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------
  function togglePacked(id: string) {
    haptic(10);
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, packed: !i.packed } : i));
  }

  function cycleAssignee(id: string) {
    const all: Assignee[] = ["Anyone", ...crewNames];
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        const idx = all.indexOf(i.assignee);
        return { ...i, assignee: all[(idx + 1) % all.length] };
      })
    );
  }

  function deleteItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (sharedPacking && activeTrip.activeTripId) {
      void supabase.from("packing_items").delete().eq("trip_id", activeTrip.activeTripId).eq("id", id);
    }
  }

  function toggleCategory(cat: Category) {
    haptic(10);
    const catItems = items.filter((i) => i.category === cat);
    const allPacked = catItems.every((i) => i.packed);
    setItems((prev) =>
      prev.map((i) => i.category === cat ? { ...i, packed: !allPacked } : i)
    );
  }

  function addSuggestedItem(sug: Suggestion) {
    haptic([10, 30, 10]);
    const newItem: PackItem = {
      id: `sug-added-${crypto.randomUUID()}-${sug.id}`,
      name: sug.name,
      category: sug.category,
      assignee: "Anyone",
      packed: false,
      is_suggested: true,
    };
    setItems((prev) => [...prev, newItem]);
    setDismissedSuggestions((prev) => new Set([...prev, sug.id]));
  }

  function dismissSuggestion(id: string) {
    setDismissedSuggestions((prev) => new Set([...prev, id]));
  }

  function openAddSheet(cat?: Category) {
    setAddCategory(cat ?? "Misc");
    setAddSheetOpenedForCat(cat ?? null);
    setAddName("");
    setAddAssignee("Anyone");
    setShowAddSheet(true);
  }

  function submitAddItem() {
    const trimmed = addName.trim();
    if (!trimmed) return;
    haptic([10, 30, 10]);
    const newItem: PackItem = {
      id: `user-${crypto.randomUUID()}`,
      name: trimmed,
      category: addCategory,
      assignee: addAssignee,
      packed: false,
      is_suggested: false,
    };
    setItems((prev) => [...prev, newItem]);
    setShowAddSheet(false);
  }

  function applyPreset(name: string) {
    setAddName(name);
    addNameRef.current?.focus();
  }

  function resetPackedProgress() {
    const reset = items.map((i) => ({ ...i, packed: false }));
    setItems(reset);
    setConfirmReset(false);
    saveLocalItems(reset);
    if (sharedPacking && activeTrip.activeTripId) void saveSharedItems(reset, activeTrip.activeTripId);
  }

  async function shareList() {
    const lines = [
      `🧳 Maui Family Trip — Packing List (Jun 5–11)`,
      `Progress: ${packedCount}/${totalItems} packed (${pct}%)`,
      "",
    ];
    ALL_CATEGORIES.forEach((cat) => {
      const catItems = items.filter((i) => i.category === cat);
      if (!catItems.length) return;
      const meta = CATEGORY_META[cat];
      lines.push(`${meta.emoji} ${cat} (${catItems.filter((i) => i.packed).length}/${catItems.length})`);
      catItems.forEach((item) => {
        const tick = item.packed ? "✓" : "○";
        lines.push(`  ${tick} ${item.name} — ${item.assignee}`);
      });
      lines.push("");
    });
    const text = lines.join("\n");
    try {
      if (navigator.share) {
        await navigator.share({ title: "Maui Family Trip — Packing List", text });
      } else {
        await navigator.clipboard.writeText(text);
        setShareToast("Copied to clipboard!");
        setTimeout(() => setShareToast(null), 2500);
      }
    } catch { /* user cancelled */ }
  }

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------
  function toggleCollapse(cat: Category) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  function renderAssigneePill(assignee: Assignee, itemId: string) {
    const dot = getAssigneeColor(assignee, crewNames);
    return (
      <button
        onClick={(e) => { e.stopPropagation(); cycleAssignee(itemId); }}
        className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 transition-colors rounded-full px-2 py-0.5 flex-none"
        title="Tap to change assignee"
      >
        <span className={`w-2 h-2 rounded-full flex-none ${dot}`} />
        <span className="text-[10px] font-semibold text-slate-600 leading-none">{assignee}</span>
      </button>
    );
  }

  // ---------------------------------------------------------------------------
  // Categories visible in current filter mode
  // ---------------------------------------------------------------------------
  const activeCats = showMustHaves ? MUST_HAVE_CATS : ALL_CATEGORIES;

  const milestone = getMilestone(pct);

  if (activeTrip.hasNoTrip) {
    return (
      <FirstTripSetup
        defaultName={user?.user_metadata?.full_name?.split(" ")[0] ?? user?.email?.split("@")[0] ?? ""}
        onCreate={activeTrip.createTrip}
      />
    );
  }

  if (!hydrated || activeTrip.isChecking) {
    return (
      <div className="flex flex-col bg-slate-50 min-h-screen items-center justify-center">
        <span className="text-2xl animate-pulse">🧳</span>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // JSX
  // ---------------------------------------------------------------------------
  return (
    <div className="flex flex-col bg-slate-50 min-h-screen">

      {/* ── Sticky header (slides in after hero scrolls away) ── */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-out ${
          scrolled ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"
        }`}
      >
        <div className="bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm px-4 flex items-center gap-3" style={{ paddingTop: "env(safe-area-inset-top, 12px)", paddingBottom: "12px" }}>
          <div className="flex-1 min-w-0">
            <p className="text-base font-black text-slate-900 leading-tight truncate">Pack Smart</p>
            <p className="text-[11px] text-slate-400 leading-none mt-0.5">{packedCount} of {totalItems} packed · {pct}%</p>
          </div>
          <div className="h-5 w-px bg-slate-100 flex-none" />
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-700 active:scale-95 text-white text-xs font-bold px-4 py-2.5 rounded-full transition-all flex-none"
          >
            <span className="text-sm leading-none">←</span>
            <span>Done</span>
          </button>
        </div>
      </div>

      {/* ── Share toast ── */}
      {shareToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] bg-slate-900 text-white text-sm font-semibold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <span>📋</span>
          <span>{shareToast}</span>
        </div>
      )}

      {/* ── Add-item sheet ── */}
      {showAddSheet && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center"
          onClick={() => setShowAddSheet(false)}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
          <div
            className="relative w-full max-w-md bg-white rounded-t-3xl shadow-2xl flex flex-col"
            style={{ maxHeight: "calc(100dvh - 72px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 flex-none">
              <div className="w-9 h-1 bg-slate-200 rounded-full" />
            </div>

            <div className="px-5 pt-2 pb-3 flex-none border-b border-slate-50 flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900">
                {addSheetOpenedForCat ? `Add to ${addSheetOpenedForCat}` : "Add Item"}
              </h3>
              <button onClick={() => setShowAddSheet(false)} className="text-slate-400 text-lg font-light leading-none">✕</button>
            </div>

            <div className="px-5 pt-4 pb-2 flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto">

              {/* Item name */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Item name</p>
                <input
                  ref={addNameRef}
                  type="text"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") submitAddItem(); }}
                  placeholder="e.g. Sunscreen"
                  className="w-full text-sm border border-slate-200 rounded-2xl px-4 py-3.5 outline-none focus:border-slate-900 bg-white"
                />
              </div>

              {/* Quick presets */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Quick add</p>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_PRESETS[addCategory].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => applyPreset(preset)}
                      className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-full transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category picker */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Category</p>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_CATEGORIES.map((cat) => {
                    const meta = CATEGORY_META[cat];
                    return (
                      <button
                        key={cat}
                        onClick={() => setAddCategory(cat)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl border text-sm font-semibold transition-all ${
                          addCategory === cat
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                        }`}
                      >
                        <span>{meta.emoji}</span>
                        <span className="truncate">{cat}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Assignee picker */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Assign to</p>
                <div className="flex gap-2 flex-wrap">
                  {(["Anyone", ...crewNames] as Assignee[]).map((a) => {
                    const dot = getAssigneeColor(a, crewNames);
                    return (
                      <button
                        key={a}
                        onClick={() => setAddAssignee(a)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-full border text-xs font-semibold transition-all ${
                          addAssignee === a
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full flex-none ${dot}`} />
                        {a}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="px-5 pt-3 pb-8 border-t border-slate-100 flex-none">
              <button
                onClick={submitAddItem}
                disabled={!addName.trim()}
                className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl text-sm disabled:opacity-40 transition-opacity"
              >
                Add to {addCategory}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reset confirmation sheet ── */}
      {confirmReset && (
        <div className="fixed inset-0 z-[65] flex items-end justify-center" onClick={() => setConfirmReset(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
          <div
            className="relative w-full max-w-md bg-white rounded-t-3xl shadow-2xl px-5 pt-3 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pb-4">
              <div className="w-9 h-1 bg-slate-200 rounded-full" />
            </div>
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 flex items-center justify-center text-xl flex-none">↺</div>
              <div className="flex-1">
                <h3 className="text-base font-black text-slate-900">Reset packed progress?</h3>
                <p className="text-sm text-slate-500 leading-relaxed mt-1">
                  Items stay on the list, but every checkbox will return to unpacked.
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setConfirmReset(false)}
                className="flex-1 border border-slate-200 text-slate-600 font-bold py-3.5 rounded-2xl text-sm"
              >
                Keep progress
              </button>
              <button
                onClick={resetPackedProgress}
                className="flex-1 bg-slate-950 text-white font-bold py-3.5 rounded-2xl text-sm"
              >
                Reset
              </button>
            </div>
          </div>
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

        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 flex items-center gap-1.5 bg-black/40 hover:bg-black/55 active:scale-95 backdrop-blur-sm text-white text-sm font-semibold px-3.5 py-2 rounded-full transition-all"
        >
          <span className="text-base leading-none">←</span>
          <span>Back</span>
        </button>

        <button
          onClick={shareList}
          className="absolute top-4 right-4 flex items-center gap-1.5 bg-black/30 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full"
        >
          <span>↗</span> Share
        </button>

        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
          <p className="text-[10px] font-semibold text-white/60 uppercase tracking-widest">
            Maui Family Trip · Jun 5–11
          </p>
          <h1 className="text-2xl font-black text-white leading-tight">Pack Smart</h1>
          <p className="text-xs text-white/60 mt-0.5">
            {totalItems} items · {sharedPacking ? "shared with the group" : "private on this device"}
          </p>
        </div>
      </div>

      {/* ── Progress card ── */}
      <div className="bg-white border-b border-slate-100 px-4 py-3.5 flex items-center gap-4 flex-none">
        {/* Circular ring */}
        {(() => {
          const r = 28;
          const circ = 2 * Math.PI * r;
          return (
            <div className="relative flex-none w-[68px] h-[68px]">
              <svg width="68" height="68" viewBox="0 0 68 68" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="34" cy="34" r={r} fill="none" stroke="#f1f5f9" strokeWidth="7" />
                <circle
                  cx="34" cy="34" r={r} fill="none"
                  stroke={pct === 100 ? "#10b981" : "#0ea5e9"}
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={circ}
                  strokeDashoffset={circ * (1 - (packedCount / Math.max(totalItems, 1)))}
                  style={{ transition: "stroke-dashoffset 0.6s ease" }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-base font-black text-slate-900 leading-none">{pct}%</span>
              </div>
            </div>
          );
        })()}

        {/* Stats */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-slate-900 leading-tight">
            {pct === 100 ? "All packed! 🎉" : `${packedCount} of ${totalItems} packed`}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {ALL_CATEGORIES.filter((c) => {
              const catItems = items.filter((i) => i.category === c);
              return catItems.length > 0 && catItems.every((i) => i.packed);
            }).length}/{ALL_CATEGORIES.filter((c) => items.some((i) => i.category === c)).length} categories done
          </p>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2">
            <div
              className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? "bg-emerald-500" : "bg-sky-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Days pill */}
        <div className="flex-none flex flex-col items-center bg-amber-50 border border-amber-100 rounded-xl px-2.5 py-2 min-w-[52px]">
          <span className="text-base font-black text-amber-600 leading-none tabular-nums">{daysLeft}</span>
          <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wide leading-none mt-0.5">days</span>
          {packedCount > 0 && (
            <button
              onClick={() => setConfirmReset(true)}
              className="text-[8px] text-slate-300 hover:text-rose-400 transition-colors mt-1.5 leading-none"
            >
              reset
            </button>
          )}
        </div>
      </div>

      {/* ── Suggestions banner ── */}
      {visibleSuggestions.length > 0 && !showMustHaves && (
        <div className="mx-4 mt-4 bg-sky-50 border border-sky-200 rounded-2xl overflow-hidden flex-none">
          <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-2.5 border-b border-sky-100">
            <span className="text-base">✨</span>
            <div className="flex-1">
              <p className="text-xs font-bold text-sky-800">Suggested for your trip</p>
              <p className="text-[10px] text-sky-500 mt-0.5">Based on your itinerary — tap to add</p>
            </div>
          </div>
          <div className="px-4 py-3 flex flex-wrap gap-2">
            {visibleSuggestions.map((sug) => (
              <div key={sug.id} className="flex items-center gap-1">
                <button
                  onClick={() => addSuggestedItem(sug)}
                  className="flex items-center gap-1.5 bg-white border border-sky-200 hover:border-sky-400 text-sky-700 text-xs font-semibold px-3 py-1.5 rounded-full transition-all active:scale-95"
                  title={sug.reason}
                >
                  <span>{CATEGORY_META[sug.category].emoji}</span>
                  <span>{sug.name}</span>
                  <span className="text-sky-400 font-bold">+</span>
                </button>
                <button
                  onClick={() => dismissSuggestion(sug.id)}
                  className="text-sky-300 hover:text-sky-500 text-[10px] leading-none transition-colors"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Filter bar ── */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-0 flex-none">
        <button
          onClick={() => setShowMustHaves((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold transition-all border ${
            showMustHaves
              ? "bg-amber-500 border-amber-500 text-white shadow-sm"
              : "bg-white border-slate-200 text-slate-600 hover:border-amber-300"
          }`}
        >
          <span>⚠️</span>
          <span>Must-haves only</span>
          {showMustHaves && <span className="ml-0.5">✕</span>}
        </button>
        {showMustHaves && (
          <p className="text-[10px] text-slate-400 font-medium">
            Documents + Pharmacy
          </p>
        )}
      </div>

      {/* ── Milestone ── */}
      {milestone && !showMustHaves && (
        <div className={`mx-4 mt-3 ${milestone.bg} border rounded-2xl px-4 py-3 flex items-center gap-3 flex-none`}>
          <span className="text-2xl flex-none">{milestone.emoji}</span>
          <div>
            <p className="text-sm font-bold text-slate-800">{milestone.label}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{milestone.sub}</p>
          </div>
        </div>
      )}

      {/* ── Category cards ── */}
      <div className="flex flex-col gap-4 px-4 pt-4 pb-28">
        {activeCats.map((cat) => {
          const meta = CATEGORY_META[cat];
          const catItems = items.filter((i) => i.category === cat);
          if (catItems.length === 0) return null;

          const catPacked = catItems.filter((i) => i.packed).length;
          const catDone = catPacked === catItems.length;
          const isCollapsed = collapsed.has(cat);

          // Packed items go to bottom
          const unpacked = catItems.filter((i) => !i.packed);
          const packed = catItems.filter((i) => i.packed);
          const orderedItems = [...unpacked, ...packed];

          return (
            <div key={cat} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
              {/* Category header */}
              <button
                onClick={() => toggleCollapse(cat)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 border-b border-slate-50 text-left ${catDone ? "opacity-70" : ""}`}
              >
                <span className="text-xl flex-none">{meta.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 leading-tight">{cat}</p>
                </div>
                <div className="flex items-center gap-2 flex-none">
                  {/* Pack all / unpack all */}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleCategory(cat); }}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition-colors ${
                      catDone
                        ? "bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                        : "bg-slate-900 text-white hover:bg-slate-700"
                    }`}
                  >
                    {catDone ? "Unpack all" : "Pack all"}
                  </button>
                  {/* Count pill */}
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    catDone
                      ? "bg-emerald-100 text-emerald-700"
                      : catPacked > 0
                      ? "bg-sky-50 text-sky-700"
                      : "bg-slate-100 text-slate-500"
                  }`}>
                    {catPacked}/{catItems.length}
                  </span>
                  {/* Chevron */}
                  <span className="text-slate-300 text-xs">{isCollapsed ? "▼" : "▲"}</span>
                </div>
              </button>

              {/* Items list */}
              {!isCollapsed && (
                <>
                  <div className="flex flex-col divide-y divide-slate-50">
                    {orderedItems.map((item) => {
                      const isDone = item.packed;
                      return (
                        <div
                          key={item.id}
                          className={`flex items-center gap-3 px-4 py-3 transition-colors ${isDone ? "bg-slate-50/50" : "hover:bg-slate-50"}`}
                        >
                          {/* Checkbox */}
                          <button
                            onClick={() => togglePacked(item.id)}
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-none transition-all ${
                              isDone ? "bg-emerald-500 border-emerald-500" : "border-slate-300"
                            }`}
                          >
                            {isDone && <span className="text-white text-[10px] font-bold leading-none">✓</span>}
                          </button>

                          {/* Label */}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium leading-tight ${isDone ? "line-through text-slate-400" : "text-slate-800"}`}>
                              {item.name}
                            </p>
                          </div>

                          {/* Assignee pill */}
                          {renderAssigneePill(item.assignee, item.id)}

                          {/* Delete button */}
                          <button
                            onClick={() => deleteItem(item.id)}
                            className="text-slate-200 hover:text-rose-400 transition-colors text-xs flex-none ml-1"
                            title="Remove item"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* + Add item inline */}
                  <button
                    onClick={() => openAddSheet(cat)}
                    className="w-full flex items-center gap-2 px-4 py-3 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors border-t border-slate-50"
                  >
                    <span className="text-sm font-bold">+</span>
                    <span className="text-xs font-semibold">Add item to {cat}</span>
                  </button>
                </>
              )}
            </div>
          );
        })}

        {/* All done state */}
        {pct === 100 && totalItems > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-5 text-center">
            <p className="text-2xl mb-2">🎉</p>
            <p className="text-sm font-bold text-emerald-800">You&apos;re all packed!</p>
            <p className="text-xs text-emerald-600 mt-1">Time to go enjoy Maui. You&apos;ve earned it.</p>
          </div>
        )}
      </div>

      {/* ── FAB ── */}
      <button
        onClick={() => openAddSheet()}
        className="fixed bottom-24 right-4 w-14 h-14 bg-slate-900 text-white rounded-full shadow-xl flex items-center justify-center text-2xl font-light hover:bg-slate-700 transition-colors z-40 active:scale-95"
        title="Add item"
      >
        +
      </button>
    </div>
  );
}
