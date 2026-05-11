"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ── Trip days data (mirrors fixture in page.tsx) ────────────────────────────
const DAYS = [
  {
    dayNum: 1, date: "Fri · Jun 5", theme: "Travel Day", status: "past" as const,
    hero: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&h=500&fit=crop&q=85",
    weatherEmoji: "☁️", temp: "68°F", condition: "Overcast",
    agenda: [
      { emoji: "🚗", title: "Leave for airport", time: "5:00 AM", done: true },
      { emoji: "✈️", title: "Flight AA271 to Seattle", time: "8:05 AM", done: true },
      { emoji: "🏝️", title: "Flight AS845 to Maui", time: "12:45 PM", done: true },
      { emoji: "🚙", title: "Arrive OGG · Rental car", time: "5:11 PM", done: true },
      { emoji: "🏨", title: "Check in – Sheraton Maui Resort", time: "6:30 PM", done: true },
      { emoji: "🍝", title: "Dinner near the resort", time: "8:00 PM", done: true },
    ],
  },
  {
    dayNum: 2, date: "Sat · Jun 6", theme: "Beach + Snorkel", status: "today" as const,
    hero: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=500&fit=crop&q=85",
    weatherEmoji: "⛅", temp: "82°F", condition: "Partly cloudy",
    agenda: [
      { emoji: "🍳", title: "Breakfast at hotel", time: "8:00 AM", done: true },
      { emoji: "🏖️", title: "Ka'anapali Beach morning", time: "10:00 AM", done: true },
      { emoji: "🌮", title: "Lunch – Monkeypod Kitchen", time: "1:00 PM", done: false },
      { emoji: "😴", title: "Nap / downtime", time: "3:00 PM", done: false },
      { emoji: "🤿", title: "Snorkeling – Molokini Crater", time: "4:30 PM", done: false },
      { emoji: "🐟", title: "Dinner – Mama's Fish House", time: "7:00 PM", done: false },
    ],
  },
  {
    dayNum: 3, date: "Sun · Jun 7", theme: "Road to Hana", status: "upcoming" as const,
    hero: "https://images.unsplash.com/photo-1542259009477-d625272157b7?w=800&h=500&fit=crop&q=85",
    weatherEmoji: "🌦️", temp: "76°F", condition: "Chance of rain",
    agenda: [
      { emoji: "🌄", title: "Early rise – pack snacks", time: "5:30 AM", done: false },
      { emoji: "🚗", title: "Depart for Road to Hana", time: "7:00 AM", done: false },
      { emoji: "💧", title: "Twin Falls stop", time: "9:30 AM", done: false },
      { emoji: "🌿", title: "Lunch – Hana Farms", time: "12:00 PM", done: false },
      { emoji: "🖤", title: "Waiʻanapanapa Black Sand Beach", time: "2:00 PM", done: false },
      { emoji: "🌅", title: "Drive back to Ka'anapali", time: "5:00 PM", done: false },
    ],
  },
  {
    dayNum: 4, date: "Mon · Jun 8", theme: "Beach + Spa", status: "upcoming" as const,
    hero: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&h=500&fit=crop&q=85",
    weatherEmoji: "☀️", temp: "84°F", condition: "Sunny",
    agenda: [
      { emoji: "🥐", title: "Slow breakfast at hotel", time: "8:30 AM", done: false },
      { emoji: "🏖️", title: "Ka'anapali Beach", time: "10:00 AM", done: false },
      { emoji: "🍹", title: "Lunch at the pool bar", time: "1:00 PM", done: false },
      { emoji: "💆", title: "Couples massage – Sheraton Spa", time: "3:00 PM", done: false },
      { emoji: "🌅", title: "Sunset dinner – Humble Market", time: "6:30 PM", done: false },
    ],
  },
  {
    dayNum: 5, date: "Tue · Jun 9", theme: "Free Day", status: "upcoming" as const,
    hero: "https://images.unsplash.com/photo-1471922694854-ff1b63b20054?w=800&h=500&fit=crop&q=85",
    weatherEmoji: "☀️", temp: "83°F", condition: "Sunny",
    agenda: [
      { emoji: "🥭", title: "Upcountry Farmer's Market", time: "8:00 AM", done: false },
      { emoji: "🛍️", title: "Shopping in Paia Town", time: "11:00 AM", done: false },
      { emoji: "🍕", title: "Lunch – Flatbread Company", time: "1:30 PM", done: false },
      { emoji: "🏊", title: "Pool time", time: "4:00 PM", done: false },
      { emoji: "🌺", title: "Old Lahaina Luau", time: "7:30 PM", done: false },
    ],
  },
  {
    dayNum: 6, date: "Wed · Jun 10", theme: "Haleakalā Sunrise", status: "upcoming" as const,
    hero: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&h=500&fit=crop&q=85",
    weatherEmoji: "🌤️", temp: "55°F", condition: "Clear at summit",
    agenda: [
      { emoji: "⏰", title: "Wake up – summit drive", time: "2:30 AM", done: false },
      { emoji: "🌋", title: "Haleakalā Sunrise", time: "5:45 AM", done: false },
      { emoji: "🥾", title: "Crater hike – Sliding Sands", time: "9:00 AM", done: false },
      { emoji: "😴", title: "Lunch + nap at hotel", time: "12:00 PM", done: false },
      { emoji: "🚲", title: "Downhill bike tour (optional)", time: "5:00 PM", done: false },
      { emoji: "🍺", title: "Dinner – Maui Brewing Co.", time: "7:30 PM", done: false },
    ],
  },
  {
    dayNum: 7, date: "Thu · Jun 11", theme: "Fly Home", status: "upcoming" as const,
    hero: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&h=500&fit=crop&q=85",
    weatherEmoji: "☀️", temp: "81°F", condition: "Beautiful last day",
    agenda: [
      { emoji: "🌅", title: "Last sunrise + beach walk", time: "7:00 AM", done: false },
      { emoji: "🧳", title: "Breakfast + pack up", time: "8:30 AM", done: false },
      { emoji: "🏊", title: "Last swim at the pool", time: "11:00 AM", done: false },
      { emoji: "🏨", title: "Check out – Sheraton Maui", time: "12:00 PM", done: false },
      { emoji: "🚗", title: "Depart for OGG airport", time: "2:00 PM", done: false },
      { emoji: "✈️", title: "Flight home", time: "5:00 PM", done: false },
    ],
  },
];

type Day = typeof DAYS[0];

const STATUS_CONFIG = {
  past:     { label: "Completed", badge: "bg-emerald-100 text-emerald-700", ring: "ring-emerald-200" },
  today:    { label: "Today",     badge: "bg-sky-100 text-sky-700",         ring: "ring-sky-300" },
  upcoming: { label: "Upcoming",  badge: "bg-slate-100 text-slate-500",     ring: "ring-transparent" },
};

function completionPct(day: Day): number {
  if (!day.agenda.length) return 0;
  return Math.round((day.agenda.filter((i) => i.done).length / day.agenda.length) * 100);
}

// ── Day detail sheet ─────────────────────────────────────────────────────────
function DayDetailSheet({ day, onClose }: { day: Day; onClose: () => void }) {
  const cfg = STATUS_CONFIG[day.status];
  const pct = completionPct(day);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end max-w-md mx-auto"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-t-3xl shadow-2xl flex flex-col"
        style={{ maxHeight: "85vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-none">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        {/* Hero image */}
        <div className="relative h-36 mx-4 rounded-2xl overflow-hidden flex-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={day.hero} alt={day.theme} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-3">
            <p className="text-[10px] font-semibold text-white/60 uppercase tracking-widest">Day {day.dayNum} · {day.date}</p>
            <h2 className="text-xl font-black text-white leading-tight">{day.theme}</h2>
          </div>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white text-xs font-bold"
          >✕</button>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 flex-none">
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${cfg.badge}`}>{cfg.label}</span>
          <span className="text-[10px] text-slate-400">{day.weatherEmoji} {day.temp} · {day.condition}</span>
          {day.status !== "upcoming" && (
            <span className="ml-auto text-[10px] font-bold text-slate-500">{pct}% done</span>
          )}
        </div>

        {/* Activity list */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 flex flex-col gap-2"
          style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom, 24px))" }}>
          {day.agenda.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm flex-none ${
                item.done ? "bg-emerald-50" : day.status === "upcoming" ? "bg-slate-50" : "bg-slate-50"
              }`}>
                {item.done ? "✓" : item.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold leading-tight ${item.done ? "text-slate-400 line-through" : "text-slate-800"}`}>
                  {item.title}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">{item.time}</p>
              </div>
              {item.done && (
                <span className="text-[10px] font-bold text-emerald-500 flex-none">Done</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function MemoriesPage() {
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState<Day | null>(null);

  const tripStart = new Date("2026-06-05T00:00:00");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const daysUntilTrip = Math.max(0, Math.ceil((tripStart.getTime() - today.getTime()) / 86_400_000));
  const isPreTrip = daysUntilTrip > 0;

  const pastDays = DAYS.filter((d) => d.status === "past");
  const totalDone = DAYS.reduce((acc, d) => acc + d.agenda.filter((i) => i.done).length, 0);
  const totalItems = DAYS.reduce((acc, d) => acc + d.agenda.length, 0);

  return (
    <div className="flex flex-col bg-slate-50 min-h-screen">
      {selectedDay && (
        <DayDetailSheet day={selectedDay} onClose={() => setSelectedDay(null)} />
      )}

      {/* ── Hero ── */}
      <div className="relative h-52 w-full overflow-hidden flex-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=500&fit=crop&q=85"
          alt="Maui"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-indigo-950/85 via-indigo-900/30 to-transparent" />

        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm text-white text-sm font-semibold px-3.5 py-2 rounded-full"
        >
          <span className="text-base leading-none">←</span>
          <span>Back</span>
        </button>

        <div className="absolute bottom-0 left-0 right-0 px-4 pb-5">
          <p className="text-[10px] font-semibold text-white/60 uppercase tracking-widest">Maui Family Trip · Jun 5–11</p>
          <h1 className="text-2xl font-black text-white leading-tight">Trip Memories</h1>
          <p className="text-xs text-white/60 mt-0.5">
            {isPreTrip
              ? `Your story begins in ${daysUntilTrip} day${daysUntilTrip !== 1 ? "s" : ""}`
              : `${totalDone} of ${totalItems} moments complete`}
          </p>
        </div>
      </div>

      {/* ── Pre-trip state ── */}
      {isPreTrip && (
        <div className="mx-4 mt-4 bg-indigo-50 border border-indigo-100 rounded-2xl px-5 py-4 flex items-center gap-4 flex-none">
          <span className="text-3xl flex-none">📅</span>
          <div>
            <p className="text-sm font-bold text-indigo-900">Trip starts in {daysUntilTrip} days</p>
            <p className="text-xs text-indigo-500 mt-0.5 leading-relaxed">
              After each day wraps up, a memory card will appear here — auto-built from your itinerary.
            </p>
          </div>
        </div>
      )}

      {/* ── Day cards — horizontal scroll reel ── */}
      <div className="mt-4 px-4 flex-none">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">All 7 Days</p>
        <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}>
          {DAYS.map((day) => {
            const cfg = STATUS_CONFIG[day.status];
            const pct = completionPct(day);
            return (
              <button
                key={day.dayNum}
                onClick={() => setSelectedDay(day)}
                className={`flex-none w-40 bg-white rounded-2xl shadow-sm border overflow-hidden active:scale-95 transition-all text-left ring-2 ${cfg.ring}`}
                style={{ scrollSnapAlign: "start" }}
              >
                {/* Thumbnail */}
                <div className="relative h-24 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={day.hero} alt={day.theme} className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute top-2 left-2">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
                  </div>
                  <div className="absolute bottom-2 left-2">
                    <p className="text-white text-[9px] font-semibold opacity-70">Day {day.dayNum}</p>
                  </div>
                  {day.status === "upcoming" && (
                    <div className="absolute inset-0 bg-slate-900/30 flex items-center justify-center">
                      <span className="text-2xl">🔒</span>
                    </div>
                  )}
                </div>

                {/* Card body */}
                <div className="px-3 py-2.5">
                  <p className="text-xs font-bold text-slate-800 leading-tight truncate">{day.theme}</p>
                  <p className="text-[9px] text-slate-400 mt-0.5">{day.date}</p>
                  {day.status !== "upcoming" && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] text-slate-400">{pct}%</span>
                        <span className="text-[9px] text-slate-400">{day.agenda.filter(i => i.done).length}/{day.agenda.length}</span>
                      </div>
                      <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${pct === 100 ? "bg-emerald-500" : "bg-sky-400"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {day.status === "upcoming" && (
                    <p className="text-[9px] text-slate-400 mt-1.5">{day.agenda.length} activities planned</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Completed day recaps (vertical list) ── */}
      {pastDays.length > 0 && (
        <div className="flex flex-col gap-3 px-4 mt-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Day Recaps</p>
          {pastDays.map((day) => {
            const pct = completionPct(day);
            return (
              <button
                key={day.dayNum}
                onClick={() => setSelectedDay(day)}
                className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden active:scale-[0.98] transition-all text-left w-full"
              >
                <div className="flex items-stretch">
                  {/* Side photo strip */}
                  <div className="relative w-20 flex-none">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={day.hero} alt={day.theme} className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/20" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Day {day.dayNum} · {day.date}</p>
                        <p className="text-sm font-black text-slate-900 leading-tight mt-0.5">{day.theme}</p>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full flex-none">
                        {pct === 100 ? "All done ✓" : `${pct}%`}
                      </span>
                    </div>

                    {/* Activity highlights */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {day.agenda.slice(0, 3).map((item, idx) => (
                        <span key={idx} className="text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full">
                          {item.emoji} {item.title.split("–")[0].trim()}
                        </span>
                      ))}
                      {day.agenda.length > 3 && (
                        <span className="text-[10px] text-slate-400 px-2 py-0.5">
                          +{day.agenda.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Upcoming days preview ── */}
      <div className="flex flex-col gap-3 px-4 mt-4 pb-28">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Coming Up</p>
        {DAYS.filter((d) => d.status === "upcoming").map((day) => (
          <button
            key={day.dayNum}
            onClick={() => setSelectedDay(day)}
            className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden active:scale-[0.98] transition-all text-left w-full"
          >
            <div className="flex items-stretch">
              <div className="relative w-20 flex-none">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={day.hero} alt={day.theme} className="absolute inset-0 w-full h-full object-cover opacity-60" />
                <div className="absolute inset-0 bg-slate-200/40" />
              </div>
              <div className="flex-1 min-w-0 px-4 py-3">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Day {day.dayNum} · {day.date}</p>
                <p className="text-sm font-black text-slate-700 leading-tight mt-0.5">{day.theme}</p>
                <p className="text-[10px] text-slate-400 mt-1.5">{day.weatherEmoji} {day.temp} · {day.agenda.length} activities</p>
              </div>
              <div className="flex items-center pr-4 text-slate-300 text-lg">›</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
