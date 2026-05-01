"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getTripDateInfo, getDayStatus, formatDateRange, type TripDateInfo } from "@/lib/tripDates";

const TRIP_ID = "a1b2c3d4-0000-0000-0000-000000000001";
const INVITE_CODE = "MAUI26";

type Traveler = {
  id: string;
  name: string;
  avatar: string;
  avatar_url: string | null;
  status: string;
};

type Activity = { emoji: string; label: string };
type Day = {
  id: number;
  date: string;
  label: string;
  theme: string;
  photo: string;
  photoAlt: string;
  activities: Activity[];
  status: "past" | "today" | "upcoming";
  weather: string;
  temp: string;
};

type TripMeta = {
  title: string;
  subtitle: string;
  coverPhoto: string;
  startDate: string;
  endDate: string;
};

const TRIP: Day[] = [
  {
    id: 1, date: "Wed · May 22", label: "Day 1", theme: "Travel Day",
    photo: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&h=300&fit=crop&q=80",
    photoAlt: "Airport terminal",
    activities: [{ emoji: "✈️", label: "Depart 7am" }, { emoji: "🏨", label: "Check in" }, { emoji: "🍕", label: "Dinner near hotel" }],
    status: "past", weather: "☁️", temp: "68°F",
  },
  {
    id: 2, date: "Thu · May 23", label: "Day 2", theme: "Beach + Snorkel",
    photo: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=300&fit=crop&q=80",
    photoAlt: "Maui beach",
    activities: [{ emoji: "🏖️", label: "Beach AM" }, { emoji: "🤿", label: "Molokini" }, { emoji: "🐟", label: "Mama's Fish House" }],
    status: "today", weather: "⛅", temp: "82°F",
  },
  {
    id: 3, date: "Fri · May 24", label: "Day 3", theme: "Road to Hana",
    photo: "https://images.unsplash.com/photo-1542259009477-d625272157b7?w=600&h=300&fit=crop&q=80",
    photoAlt: "Road to Hana",
    activities: [{ emoji: "🚗", label: "Scenic drive" }, { emoji: "🌊", label: "Black sand beach" }, { emoji: "🌿", label: "Bamboo forest" }],
    status: "upcoming", weather: "🌦️", temp: "76°F",
  },
  {
    id: 4, date: "Sat · May 25", label: "Day 4", theme: "Beach + Spa",
    photo: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&h=300&fit=crop&q=80",
    photoAlt: "Spa and pool",
    activities: [{ emoji: "💆", label: "Couples massage" }, { emoji: "🏊", label: "Pool day" }, { emoji: "🌅", label: "Sunset dinner" }],
    status: "upcoming", weather: "☀️", temp: "84°F",
  },
  {
    id: 5, date: "Sun · May 26", label: "Day 5", theme: "Free Day",
    photo: "https://images.unsplash.com/photo-1471922694854-ff1b63b20054?w=600&h=300&fit=crop&q=80",
    photoAlt: "Tropical island",
    activities: [{ emoji: "😎", label: "No plans" }, { emoji: "🛍️", label: "Shops + market" }, { emoji: "🍹", label: "Luau night" }],
    status: "upcoming", weather: "☀️", temp: "83°F",
  },
  {
    id: 6, date: "Mon · May 27", label: "Day 6", theme: "Haleakalā Sunrise",
    photo: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=600&h=300&fit=crop&q=80",
    photoAlt: "Volcano sunrise",
    activities: [{ emoji: "🌋", label: "Sunrise hike" }, { emoji: "🚲", label: "Crater bike" }, { emoji: "🍺", label: "Brewery dinner" }],
    status: "upcoming", weather: "🌤️", temp: "55°F",
  },
  {
    id: 7, date: "Tue · May 28", label: "Day 7", theme: "Travel Home",
    photo: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&h=300&fit=crop&q=80",
    photoAlt: "Airport departure",
    activities: [{ emoji: "🧳", label: "Pack up" }, { emoji: "🏝️", label: "Last swim" }, { emoji: "✈️", label: "Depart 4pm" }],
    status: "upcoming", weather: "☀️", temp: "81°F",
  },
];

const TODAY_GLANCE = [
  { emoji: "😴", title: "Nap / downtime", time: "3:00 PM" },
  { emoji: "🤿", title: "Snorkeling – Molokini", time: "4:30 PM" },
  { emoji: "🐟", title: "Dinner – Mama's Fish House", time: "7:00 PM" },
];

type UpcomingTrip = {
  id: number;
  title: string;
  subtitle: string;
  emoji: string;
  photo: string;
  photoAlt: string;
};

const INITIAL_UPCOMING: UpcomingTrip[] = [
  {
    id: 1, title: "Christmas in NYC", subtitle: "Dec 20, 2026 · 5 nights · 4 travelers", emoji: "🎄",
    photo: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=600&h=300&fit=crop&q=80",
    photoAlt: "New York City skyline",
  },
  {
    id: 2, title: "Spring Break · Cabo", subtitle: "March 15, 2027 · 7 nights · 4 travelers", emoji: "🌊",
    photo: "https://images.unsplash.com/photo-1510097467424-192d713fd8b2?w=600&h=300&fit=crop&q=80",
    photoAlt: "Cabo San Lucas beach",
  },
  {
    id: 3, title: "Summer Euro Trip", subtitle: "July 2027 · Still planning", emoji: "✈️",
    photo: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=600&h=300&fit=crop&q=80",
    photoAlt: "European city",
  },
];

const TRIP_EMOJIS = ["✈️", "🏖️", "🏔️", "🌍", "🎄", "🌊", "🏕️", "🗼", "🌺", "🎭"];

export default function TripPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<number | null>(null);
  const [trip, setTrip] = useState<TripMeta | null>(null);
  const [days, setDays] = useState<Day[]>(TRIP);
  const [todayGlance, setTodayGlance] = useState(TODAY_GLANCE);
  const [tripDateInfo, setTripDateInfo] = useState<TripDateInfo | null>(null);
  const [travelers, setTravelers] = useState<Traveler[]>([]);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [copied, setCopied] = useState(false);

  // ── Upcoming trips state ────────────────────────────────────────────────────
  const [upcomingTrips, setUpcomingTrips] = useState<UpcomingTrip[]>(INITIAL_UPCOMING);

  // Edit sheet
  const [editingTrip, setEditingTrip] = useState<UpcomingTrip | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSubtitle, setEditSubtitle] = useState("");
  const [editEmoji, setEditEmoji] = useState("");

  // Plan new trip sheet
  const [showPlanSheet, setShowPlanSheet] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDestination, setNewDestination] = useState("");
  const [newDates, setNewDates] = useState("");
  const [newTravelers, setNewTravelers] = useState("2");

  function openEditTrip(t: UpcomingTrip) {
    setEditingTrip(t);
    setEditTitle(t.title);
    setEditSubtitle(t.subtitle);
    setEditEmoji(t.emoji);
  }

  function saveEditTrip() {
    if (!editingTrip) return;
    setUpcomingTrips((prev) =>
      prev.map((t) => t.id === editingTrip.id ? { ...t, title: editTitle, subtitle: editSubtitle, emoji: editEmoji } : t)
    );
    setEditingTrip(null);
  }

  function deleteTrip() {
    if (!editingTrip) return;
    setUpcomingTrips((prev) => prev.filter((t) => t.id !== editingTrip.id));
    setEditingTrip(null);
  }

  function addNewTrip() {
    if (!newTitle.trim()) return;
    const subtitle = [newDates, newTravelers ? `${newTravelers} travelers` : ""].filter(Boolean).join(" · ");
    setUpcomingTrips((prev) => [...prev, {
      id: Date.now(),
      title: newTitle.trim(),
      subtitle: subtitle || "Still planning",
      emoji: "✈️",
      photo: "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=600&h=300&fit=crop&q=80",
      photoAlt: newDestination || "Trip destination",
    }]);
    setShowPlanSheet(false);
    setNewTitle(""); setNewDestination(""); setNewDates(""); setNewTravelers("2");
  }

  function getInviteLink() {
    if (typeof window === "undefined") return `/join/${INVITE_CODE}`;
    return `${window.location.origin}/join/${INVITE_CODE}`;
  }

  async function copyLink() {
    await navigator.clipboard.writeText(getInviteLink());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function shareLink() {
    const link = getInviteLink();
    if (navigator.share) {
      await navigator.share({
        title: `Join our ${trip?.title ?? "trip"} 🌺`,
        text: "Hey! Join our family trip on TripFlow.",
        url: link,
      });
    } else {
      copyLink();
    }
  }

  useEffect(() => {
    async function fetchTripData() {
      // Fetch trip meta
      const { data: tripData } = await supabase
        .from("trips")
        .select("*")
        .eq("id", TRIP_ID)
        .single();

      let dateInfo: TripDateInfo | null = null;

      if (tripData) {
        dateInfo = getTripDateInfo(tripData.start_date, tripData.end_date);
        setTripDateInfo(dateInfo);
        setTrip({
          title: tripData.title,
          subtitle: `${formatDateRange(tripData.start_date, tripData.end_date)} · 4 travelers`,
          coverPhoto: tripData.cover_photo,
          startDate: tripData.start_date,
          endDate: tripData.end_date,
        });
      }

      // Fetch trip days + agenda items
      const { data: tripDays } = await supabase
        .from("trip_days")
        .select("*, agenda_items(*)")
        .eq("trip_id", TRIP_ID)
        .order("day_number");

      // Fetch travelers
      const { data: travelerData } = await supabase
        .from("travelers")
        .select("id, name, avatar, avatar_url, status")
        .eq("trip_id", TRIP_ID)
        .order("created_at", { ascending: true });
      if (travelerData) setTravelers(travelerData as Traveler[]);

      if (tripDays?.length && dateInfo) {
        const mapped: Day[] = tripDays.map((td) => {
          const dayNum = td.day_number;
          const status = getDayStatus(dayNum, dateInfo!);

          // Use first 3 agenda items as activity pills, fall back to mock
          const mockDay = TRIP.find((d) => d.id === dayNum);
          const activities: Activity[] = td.agenda_items?.length
            ? td.agenda_items
                .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
                .slice(0, 3)
                .map((ai: { emoji: string; title: string }) => ({ emoji: ai.emoji, label: ai.title.split("–")[0].trim() }))
            : (mockDay?.activities ?? []);

          // Parse date label e.g. "Arrival Day 🛬" → theme
          const labelParts = (td.label ?? "").split(" · ");
          const label = `Day ${dayNum}`;
          const theme = labelParts.join(" · ") || mockDay?.theme || "";

          const dateFormatted = new Date(td.date + "T12:00:00").toLocaleDateString("en-US", {
            weekday: "short", month: "short", day: "numeric",
          });

          return {
            id: dayNum,
            date: dateFormatted,
            label,
            theme,
            photo: td.hero_photo ?? mockDay?.photo ?? "",
            photoAlt: td.hero_alt ?? mockDay?.photoAlt ?? "",
            activities,
            status,
            weather: td.weather_emoji ?? mockDay?.weather ?? "☀️",
            temp: td.weather_temp ?? mockDay?.temp ?? "",
          };
        });
        setDays(mapped);

        // Today at a Glance — undone items from today
        const todayDay = tripDays.find((td) => td.day_number === dateInfo!.currentDayNumber);
        if (todayDay?.agenda_items?.length) {
          const upcoming = todayDay.agenda_items
            .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
            .filter((ai: { done: boolean }) => !ai.done)
            .slice(0, 3)
            .map((ai: { emoji: string; title: string; time: string }) => ({
              emoji: ai.emoji,
              title: ai.title,
              time: ai.time,
            }));
          if (upcoming.length) setTodayGlance(upcoming);
        }
      }
    }

    fetchTripData();
  }, []);

  const today = days.find((d) => d.status === "today") ?? days[0];
  const daysLeft = tripDateInfo?.daysLeft ?? days.filter((d) => d.status === "upcoming").length;
  const progress = tripDateInfo?.progressPercent ?? Math.round(((today.id - 1) / days.length) * 100);
  const tripStatus = tripDateInfo?.status ?? "upcoming";
  const countdownLabel = tripStatus === "upcoming"
    ? `${tripDateInfo?.daysUntilTrip ?? "?"} days away`
    : tripStatus === "completed"
    ? "Trip complete"
    : `${daysLeft} days left`;
  const activeTripLabel = tripStatus === "upcoming"
    ? `Upcoming · ${days.length} days`
    : tripStatus === "completed"
    ? "Completed Trip"
    : `Active Trip · Day ${tripDateInfo?.currentDayNumber} of ${tripDateInfo?.totalDays}`;

  return (
    <div className="flex flex-col gap-5 px-4 pt-4 pb-6">

      {/* ── Edit upcoming trip sheet ─────────────────────────────────────── */}
      {editingTrip && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center" onClick={() => setEditingTrip(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
          <div className="relative w-full max-w-md bg-white rounded-t-3xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-1"><div className="w-9 h-1 bg-slate-200 rounded-full" /></div>
            <div className="px-5 pt-3 pb-10 flex flex-col gap-4">
              <h3 className="text-base font-black text-slate-900">Edit Trip</h3>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Icon</p>
                <div className="flex gap-2 flex-wrap">
                  {TRIP_EMOJIS.map((e) => (
                    <button key={e} onClick={() => setEditEmoji(e)}
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl transition-all ${editEmoji === e ? "bg-slate-900 scale-110" : "bg-slate-100"}`}
                    >{e}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Trip name</p>
                <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-2xl px-4 py-3.5 outline-none focus:border-slate-900 bg-white" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Dates & details</p>
                <input type="text" value={editSubtitle} onChange={(e) => setEditSubtitle(e.target.value)}
                  placeholder="e.g. Dec 20, 2026 · 5 nights · 4 travelers"
                  className="w-full text-sm border border-slate-200 rounded-2xl px-4 py-3.5 outline-none focus:border-slate-900 bg-white" />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={saveEditTrip} className="flex-1 bg-slate-900 text-white font-bold py-4 rounded-2xl text-sm">Save changes</button>
                <button onClick={() => setEditingTrip(null)} className="px-5 text-sm font-semibold text-slate-400 border border-slate-200 rounded-2xl">Cancel</button>
              </div>
              <button onClick={deleteTrip} className="w-full border border-red-200 bg-red-50 text-red-500 font-bold py-3.5 rounded-2xl text-sm">Remove trip</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Plan new trip sheet ──────────────────────────────────────────── */}
      {showPlanSheet && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center" onClick={() => setShowPlanSheet(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
          <div className="relative w-full max-w-md bg-white rounded-t-3xl shadow-2xl flex flex-col"
            style={{ maxHeight: "calc(100dvh - 72px)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-1"><div className="w-9 h-1 bg-slate-200 rounded-full" /></div>
            <div className="px-5 pt-3 pb-3 flex-none border-b border-slate-50">
              <h3 className="text-base font-black text-slate-900">Plan a New Trip</h3>
              <p className="text-xs text-slate-400 mt-0.5">Start building your next adventure</p>
            </div>
            <div className="px-5 pt-4 pb-2 flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Trip name *</p>
                <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Christmas in NYC" autoFocus
                  className="w-full text-sm border border-slate-200 rounded-2xl px-4 py-3.5 outline-none focus:border-slate-900 bg-white" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Destination</p>
                <input type="text" value={newDestination} onChange={(e) => setNewDestination(e.target.value)}
                  placeholder="e.g. New York, Tokyo, Bali…"
                  className="w-full text-sm border border-slate-200 rounded-2xl px-4 py-3.5 outline-none focus:border-slate-900 bg-white" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Dates</p>
                <input type="text" value={newDates} onChange={(e) => setNewDates(e.target.value)}
                  placeholder="e.g. Dec 20 · 5 nights"
                  className="w-full text-sm border border-slate-200 rounded-2xl px-4 py-3.5 outline-none focus:border-slate-900 bg-white" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Travelers</p>
                <div className="flex gap-2">
                  {["1","2","3","4","5","6+"].map((n) => (
                    <button key={n} onClick={() => setNewTravelers(n)}
                      className={`flex-1 py-2.5 rounded-2xl text-sm font-bold border transition-all ${newTravelers === n ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200"}`}
                    >{n}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-5 pt-3 pb-8 flex gap-3 border-t border-slate-100 flex-none">
              <button onClick={addNewTrip} disabled={!newTitle.trim()}
                className="flex-1 bg-slate-900 text-white font-bold py-4 rounded-2xl text-sm disabled:opacity-40">Create Trip</button>
              <button onClick={() => setShowPlanSheet(false)}
                className="px-5 text-sm font-semibold text-slate-400 border border-slate-200 rounded-2xl">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Share sheet ───────────────────────────────────────────────────── */}
      {showShareSheet && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center"
          onClick={() => setShowShareSheet(false)}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
          <div
            className="relative w-full max-w-md bg-white rounded-t-3xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-9 h-1 bg-slate-200 rounded-full" />
            </div>

            {/* Hero gradient */}
            <div
              className="mx-4 mt-2 mb-5 rounded-2xl overflow-hidden"
              style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0c4a6e 100%)" }}
            >
              <div className="px-5 py-5">
                <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1">🌺 You&apos;re invited</p>
                <h2 className="text-xl font-black text-white mb-0.5">{trip?.title ?? "Maui Family Trip"}</h2>
                <p className="text-xs text-white/60 mb-4">{trip?.subtitle ?? "Jun 5–11 · 4 travelers"}</p>

                {/* Traveler strip */}
                {travelers.length > 0 && (
                  <div className="flex items-center gap-2 mb-5">
                    <div className="flex -space-x-2">
                      {travelers.slice(0, 5).map((t) => (
                        <div
                          key={t.id}
                          className="w-8 h-8 rounded-full bg-slate-700 border-2 border-white/20 flex items-center justify-center text-base shadow-sm flex-none"
                        >
                          {t.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={t.avatar_url} alt={t.name} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            t.avatar
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-white/70">
                      {travelers.map((t) => t.name.split(" ")[0]).slice(0, 3).join(", ")}
                      {travelers.length > 3 ? ` +${travelers.length - 3} more` : ""} already in
                    </p>
                  </div>
                )}

                {/* Code callout */}
                <div className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-white/50 uppercase tracking-widest font-bold mb-0.5">Invite code</p>
                    <p className="text-2xl font-black text-white tracking-widest font-mono">{INVITE_CODE}</p>
                  </div>
                  <button
                    onClick={copyLink}
                    className={`text-xs font-bold px-3 py-2 rounded-xl transition-all ${
                      copied ? "bg-emerald-500 text-white" : "bg-white/20 text-white"
                    }`}
                  >
                    {copied ? "✓ Copied" : "Copy"}
                  </button>
                </div>
              </div>
            </div>

            {/* Link row */}
            <div className="px-4 mb-4">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 flex items-center gap-3">
                <span className="text-base">🔗</span>
                <p className="flex-1 text-xs text-slate-500 font-mono truncate">
                  {getInviteLink()}
                </p>
              </div>
            </div>

            {/* Action row */}
            <div className="flex gap-2.5 px-4 pb-10">
              <button
                onClick={copyLink}
                className={`flex-1 font-bold py-4 rounded-2xl text-sm transition-all ${
                  copied ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                {copied ? "✓ Copied!" : "Copy Link"}
              </button>
              <button
                onClick={shareLink}
                className="flex-1 bg-slate-900 text-white font-bold py-4 rounded-2xl text-sm"
              >
                Share ↗
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          ACTIVE TRIP CONTAINER
      ══════════════════════════════════════ */}
      <div className="rounded-3xl overflow-hidden shadow-xl border border-sky-100">

        {/* ── Cover photo ── */}
        <div className="relative h-56 w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=500&fit=crop&q=85"
            alt="Maui, Hawaii"
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Rich gradient — dark at bottom, hint of teal at top */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-sky-900/10" />

          {/* Countdown pill */}
          <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md border border-white/30 text-white rounded-2xl px-3 py-2 text-center">
            <p className="text-2xl font-black leading-none">
              {tripStatus === "upcoming" ? tripDateInfo?.daysUntilTrip ?? "—" : tripStatus === "completed" ? "✓" : daysLeft}
            </p>
            <p className="text-[10px] font-semibold tracking-wide mt-0.5 opacity-80">{countdownLabel.split(" ").slice(1).join(" ") || "days left"}</p>
          </div>

          {/* Trip identity */}
          <div className="absolute bottom-0 left-0 right-0 px-5 pb-5">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] font-semibold text-white/60 uppercase tracking-widest mb-1">{activeTripLabel}</p>
                <h2 className="text-2xl font-black text-white leading-tight">{trip?.title ?? "Maui Family Trip"}</h2>
                <p className="text-sm text-white/70 mt-0.5">{trip?.subtitle ?? "Jun 5–11 · 4 travelers"}</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-3">
              <div className="flex justify-between mb-1.5">
                {TRIP.map((d) => (
                  <div key={d.id} className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all ${
                    d.status === "past"    ? "bg-white border-white text-sky-700" :
                    d.status === "today"  ? "bg-sky-400 border-white text-white ring-2 ring-white/50 scale-110" :
                                            "bg-white/20 border-white/40 text-white/60"
                  }`}>
                    {d.status === "past" ? "✓" : d.id}
                  </div>
                ))}
              </div>
              <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Day cards body — warm tropical background ── */}
        <div
          className="flex flex-col gap-2 px-3 py-3"
          style={{ background: "linear-gradient(160deg, #e0f2fe 0%, #fef9c3 60%, #fef3c7 100%)" }}
        >
          {days.map((day) => {
            const isExpanded = selected === day.id;

            // ── Collapsed "done" row ──────────────────────────────
            if (day.status === "past" && !isExpanded) {
              return (
                <button
                  key={day.id}
                  onClick={() => setSelected(day.id)}
                  className="w-full text-left flex items-center gap-3 bg-white/60 border border-white rounded-xl px-3 py-2 transition-all hover:bg-white"
                >
                  <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center flex-none">
                    <span className="text-[10px] font-bold text-slate-500">✓</span>
                  </div>
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400">{day.label}</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-xs text-slate-400 truncate">{day.theme}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-none">
                    {day.activities.map((a, i) => (
                      <span key={i} className="text-sm">{a.emoji}</span>
                    ))}
                    <span className="text-slate-300 text-xs ml-1">▼</span>
                  </div>
                </button>
              );
            }

            // ── Full card (today, upcoming, or expanded past) ─────
            return (
              <button
                key={day.id}
                onClick={() => setSelected(isExpanded ? null : day.id)}
                className={`w-full text-left rounded-2xl overflow-hidden border shadow-sm bg-white transition-all ${
                  day.status === "today"  ? "border-sky-400 ring-2 ring-sky-300" :
                  day.status === "past"   ? "border-slate-200" :
                                            "border-white hover:border-sky-200"
                }`}
              >
                {/* Photo */}
                <div className="relative h-24 w-full overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={day.photo}
                    alt={day.photoAlt}
                    className={`absolute inset-0 w-full h-full object-cover ${day.status === "past" ? "grayscale" : ""}`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  {day.status === "today" && (
                    <div className="absolute top-2 left-2 bg-sky-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">TODAY</div>
                  )}
                  {day.status === "past" && (
                    <div className="absolute top-2 left-2 bg-black/40 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">DONE</div>
                  )}
                  <div className="absolute top-2 right-2 bg-black/30 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                    {day.weather} {day.temp}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 px-3 pb-2 flex items-end justify-between">
                    <div>
                      <p className="text-[10px] font-semibold text-white/70 uppercase tracking-widest">{day.label} · {day.date}</p>
                      <p className="text-sm font-bold text-white leading-tight">{day.theme}</p>
                    </div>
                    <span className="text-white/60 text-xs">{isExpanded ? "▲" : "▼"}</span>
                  </div>
                </div>

                {/* Activity pills */}
                <div className="bg-white px-3 py-2 flex items-center gap-1.5 flex-wrap">
                  {day.activities.map((a, i) => (
                    <span key={i} className="flex items-center gap-1 text-xs text-slate-600 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full">
                      {a.emoji} {a.label}
                    </span>
                  ))}
                </div>

                {/* Today at a Glance inline */}
                {day.status === "today" && (
                  <div className="bg-sky-50 border-t border-sky-100 px-3 py-2.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] font-bold text-sky-600 uppercase tracking-widest">Today at a Glance</p>
                      <Link href="/" className="text-[10px] font-semibold text-sky-600">See full day →</Link>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {todayGlance.map((a, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-sm w-5 text-center flex-none">{a.emoji}</span>
                          <p className="flex-1 text-xs font-medium text-slate-700 truncate">{a.title}</p>
                          <span className="text-xs text-slate-400 flex-none">{a.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Expanded panel */}
                {isExpanded && (
                  <div className="bg-slate-50 border-t border-slate-100 px-4 py-3 flex flex-col gap-2">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Full Day Plan</p>
                    {day.activities.map((a, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm text-slate-700">
                        <span className="text-base w-6 text-center">{a.emoji}</span>
                        <span>{a.label}</span>
                      </div>
                    ))}
                    {day.status === "today" && (
                      <Link href="/" className="mt-1 text-xs font-semibold text-sky-600">→ Open Today&apos;s full schedule</Link>
                    )}
                    {day.status === "upcoming" && (
                      <span className="mt-1 text-xs font-semibold text-slate-400">+ Add activity</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}

          {/* ── Trip footer / end cap ── */}
          <div className="flex items-center gap-3 px-2 py-3">
            <div className="flex-1 h-px bg-sky-200/60" />
            <div className="flex items-center gap-2 bg-white/70 backdrop-blur-sm border border-sky-100 rounded-full px-4 py-1.5">
              <span className="text-base">✈️</span>
              <div>
                <p className="text-xs font-bold text-slate-700">Fly home · Tue May 28</p>
                <p className="text-[10px] text-slate-400">OGG → LAX · Departs 4:10 PM</p>
              </div>
            </div>
            <div className="flex-1 h-px bg-sky-200/60" />
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          INVITE CARD
      ══════════════════════════════════════ */}
      <button
        onClick={() => setShowShareSheet(true)}
        className="w-full text-left rounded-3xl overflow-hidden shadow-sm"
        style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 55%, #0c4a6e 100%)" }}
      >
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-0.5">Traveling together</p>
              <p className="text-base font-black text-white">
                {travelers.length > 0
                  ? `${travelers.length} traveler${travelers.length !== 1 ? "s" : ""} going`
                  : "Invite your crew"}
              </p>
            </div>
            <div className="bg-white/15 border border-white/25 rounded-2xl px-3 py-2 flex items-center gap-1.5">
              <span className="text-sm">🔗</span>
              <span className="text-xs font-bold text-white">Invite</span>
            </div>
          </div>

          {/* Avatar strip */}
          {travelers.length > 0 ? (
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex -space-x-2">
                {travelers.slice(0, 6).map((t) => (
                  <div
                    key={t.id}
                    className="w-9 h-9 rounded-full bg-slate-700 border-2 border-white/20 flex items-center justify-center text-lg flex-none shadow-sm"
                  >
                    {t.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.avatar_url} alt={t.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      t.avatar
                    )}
                  </div>
                ))}
                {travelers.length < 5 && (
                  <div className="w-9 h-9 rounded-full border-2 border-dashed border-white/30 flex items-center justify-center text-white/40 flex-none">
                    <span className="text-base font-light">+</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-white/60">
                {travelers.map((t) => t.name.split(" ")[0]).slice(0, 3).join(", ")}
                {travelers.length > 3 ? ` +${travelers.length - 3}` : ""}
              </p>
            </div>
          ) : (
            <p className="text-xs text-white/50 mb-4">Share a link — they can join instantly.</p>
          )}

          {/* Invite code pill */}
          <div className="flex items-center gap-2">
            <div className="bg-white/10 border border-white/20 rounded-xl px-3 py-1.5 flex items-center gap-2">
              <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Code</span>
              <span className="text-sm font-black text-white tracking-widest font-mono">{INVITE_CODE}</span>
            </div>
            <p className="text-[10px] text-white/40">Tap to copy link or share →</p>
          </div>
        </div>
      </button>

      {/* ══════════════════════════════════════
          UPCOMING TRIPS
      ══════════════════════════════════════ */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-base font-bold text-slate-900">Upcoming Trips</p>
          <button
            onClick={() => setShowPlanSheet(true)}
            className="text-xs font-bold text-slate-900 border-2 border-slate-900 px-3 py-1.5 rounded-full hover:bg-slate-50 transition-colors"
          >
            + Plan trip
          </button>
        </div>

        {/* Packing list ingress */}
        <button
          onClick={() => router.push("/packing")}
          className="w-full flex items-center gap-3 bg-white border border-slate-100 rounded-2xl px-4 py-3 shadow-sm mb-3 hover:shadow-md transition-shadow"
        >
          <span className="text-base">🧳</span>
          <div className="flex-1 text-left">
            <p className="text-xs font-bold text-slate-700">Packing List</p>
            <p className="text-[10px] text-slate-400">Tailored to your Maui itinerary</p>
          </div>
          <span className="text-slate-300 text-sm">›</span>
        </button>

        <div className="flex flex-col gap-3">
          {upcomingTrips.map((t) => (
            <button
              key={t.id}
              onClick={() => openEditTrip(t)}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden text-left w-full active:scale-[0.99] transition-transform"
            >
              <div className="relative h-28 w-full overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t.photo} alt={t.photoAlt} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <div className="absolute top-2.5 left-3 bg-white/20 backdrop-blur-sm border border-white/30 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                  Planning
                </div>
                <div className="absolute top-2.5 right-3 bg-white/20 backdrop-blur-sm border border-white/30 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Edit ✏️
                </div>
                <div className="absolute bottom-0 left-0 right-0 px-3 pb-2.5 flex items-end justify-between">
                  <div>
                    <p className="text-sm font-bold text-white leading-tight">{t.title}</p>
                    <p className="text-[11px] text-white/70 mt-0.5">{t.subtitle}</p>
                  </div>
                  <span className="text-lg">{t.emoji}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
