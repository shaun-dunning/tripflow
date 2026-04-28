"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getTripDateInfo, getDayStatus, formatDateRange, type TripDateInfo } from "@/lib/tripDates";

const TRIP_ID = "a1b2c3d4-0000-0000-0000-000000000001";

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

const UPCOMING_TRIPS = [
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

export default function TripPage() {
  const [selected, setSelected] = useState<number | null>(null);
  const [trip, setTrip] = useState<TripMeta | null>(null);
  const [days, setDays] = useState<Day[]>(TRIP);
  const [todayGlance, setTodayGlance] = useState(TODAY_GLANCE);
  const [tripDateInfo, setTripDateInfo] = useState<TripDateInfo | null>(null);

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
          UPCOMING TRIPS
      ══════════════════════════════════════ */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-base font-bold text-slate-900">Upcoming Trips</p>
          <button className="text-xs font-bold text-slate-900 border-2 border-slate-900 px-3 py-1.5 rounded-full hover:bg-slate-50 transition-colors">
            + Plan trip
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {UPCOMING_TRIPS.map((trip) => (
            <div key={trip.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {/* Cover photo */}
              <div className="relative h-28 w-full overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={trip.photo}
                  alt={trip.photoAlt}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 px-3 pb-2.5 flex items-end justify-between">
                  <div>
                    <p className="text-sm font-bold text-white leading-tight">{trip.title}</p>
                    <p className="text-[11px] text-white/70 mt-0.5">{trip.subtitle}</p>
                  </div>
                  <span className="text-lg">{trip.emoji}</span>
                </div>
                {/* Planning badge */}
                <div className="absolute top-2.5 left-3 bg-white/20 backdrop-blur-sm border border-white/30 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                  Planning
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
