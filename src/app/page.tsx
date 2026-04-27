"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const TRIP_ID = "a1b2c3d4-0000-0000-0000-000000000001";

function timeToMinutes(t: string): number {
  const [time, mer] = t.split(" ");
  let [h, m] = time.split(":").map(Number);
  if (mer === "PM" && h !== 12) h += 12;
  if (mer === "AM" && h === 12) h = 0;
  return h * 60 + m;
}

function formatGap(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h} hr ${m} min` : `${h} hr`;
}

type Item = {
  id: string;
  time: string;
  title: string;
  emoji: string;
  done: boolean;
  notes: string;
  reservation?: boolean;
  photo?: string;
  photoAlt?: string;
  fromSupabase?: boolean; // true = persisted in DB, false = local mock
};

type DayData = {
  dayNum: number;
  date: string;
  theme: string;
  hero: string;
  heroAlt: string;
  weatherEmoji: string;
  temp: string;
  condition: string;
  status: "past" | "today" | "upcoming";
  note: string;
  agenda: Item[];
};

const DAYS: DayData[] = [
  {
    dayNum: 1, date: "Wed · May 22", theme: "Travel Day",
    hero: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&h=500&fit=crop&q=85",
    heroAlt: "Airport terminal", weatherEmoji: "☁️", temp: "68°F", condition: "Overcast",
    status: "past",
    note: "Safe travels day! All items completed.",
    agenda: [
      { id: "mock-1-1", time: "5:30 AM", title: "Leave for LAX", emoji: "🚗", done: true, notes: "15 min drive — leave buffer for traffic", photo: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=160&h=160&fit=crop&q=80", photoAlt: "Early morning drive" },
      { id: "mock-1-2", time: "9:15 AM", title: "Flight AA221 to Maui", emoji: "✈️", done: true, notes: "Gate B22 · 5h 45min flight", photo: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=160&h=160&fit=crop&q=80", photoAlt: "Airport terminal" },
      { id: "mock-1-3", time: "11:30 AM", title: "Arrive OGG · Rental car", emoji: "🏝️", done: true, notes: "Enterprise Lot B · Conf #ENT2847", photo: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=160&h=160&fit=crop&q=80", photoAlt: "Rental car" },
      { id: "mock-1-4", time: "2:00 PM", title: "Check in – Wailea Resort", emoji: "🏨", done: true, notes: "Room 412 · Ocean view confirmed", photo: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=160&h=160&fit=crop&q=80", photoAlt: "Resort lobby" },
      { id: "mock-1-5", time: "7:00 PM", title: "Dinner – Longhi's Wailea", emoji: "🍝", done: true, notes: "Casual dinner to settle in", photo: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=160&h=160&fit=crop&q=80", photoAlt: "Restaurant dinner" },
    ],
  },
  {
    dayNum: 2, date: "Thu · May 23", theme: "Beach + Snorkel",
    hero: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=500&fit=crop&q=85",
    heroAlt: "Maui beach", weatherEmoji: "⛅", temp: "82°F", condition: "Partly cloudy",
    status: "today",
    note: "Bring beach towels — hotel charges $10 to rent. Grab reef-safe sunscreen from the bathroom.",
    agenda: [
      { id: "mock-2-1", time: "8:00 AM", title: "Breakfast at hotel", emoji: "🍳", done: false, notes: "Buffet ends at 10am", photo: "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=160&h=160&fit=crop&q=80", photoAlt: "Hotel breakfast spread" },
      { id: "mock-2-2", time: "10:00 AM", title: "Beach morning", emoji: "🏖️", done: false, notes: "Bring sunscreen & floaties", photo: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=160&h=160&fit=crop&q=80", photoAlt: "Maui beach" },
      { id: "mock-2-3", time: "1:00 PM", title: "Lunch – Monkeypod Kitchen", emoji: "🌮", done: false, notes: "Walk-in only · arrive early", photo: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=160&h=160&fit=crop&q=80", photoAlt: "Restaurant table" },
      { id: "mock-2-4", time: "3:00 PM", title: "Nap / downtime", emoji: "😴", done: false, notes: "Back at the resort — pool or room", photo: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=160&h=160&fit=crop&q=80", photoAlt: "Resort pool" },
      { id: "mock-2-5", time: "4:30 PM", title: "Snorkeling – Molokini", emoji: "🤿", done: false, notes: "Depart from Maalaea Harbor", photo: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=160&h=160&fit=crop&q=80", photoAlt: "Snorkeling underwater" },
      { id: "mock-2-6", time: "7:00 PM", title: "Dinner – Mama's Fish House", emoji: "🐟", done: false, notes: "Reservation confirmed · Party of 4", reservation: true, photo: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=160&h=160&fit=crop&q=80", photoAlt: "Fine dining seafood plate" },
    ],
  },
  {
    dayNum: 3, date: "Fri · May 24", theme: "Road to Hana",
    hero: "https://images.unsplash.com/photo-1542259009477-d625272157b7?w=800&h=500&fit=crop&q=85",
    heroAlt: "Road to Hana", weatherEmoji: "🌦️", temp: "76°F", condition: "Chance of rain",
    status: "upcoming",
    note: "Road to Hana stops are one-way — plan stops on the way there. Download offline maps in case of spotty service.",
    agenda: [
      { id: "mock-3-1", time: "5:30 AM", title: "Early rise – pack snacks", emoji: "🌄", done: false, notes: "Long drive day — stock the cooler", photo: "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=160&h=160&fit=crop&q=80", photoAlt: "Early morning sunrise" },
      { id: "mock-3-2", time: "7:00 AM", title: "Depart for Road to Hana", emoji: "🚗", done: false, notes: "Leave by 7am to beat the crowds", photo: "https://images.unsplash.com/photo-1542259009477-d625272157b7?w=160&h=160&fit=crop&q=80", photoAlt: "Winding road" },
      { id: "mock-3-3", time: "9:30 AM", title: "Twin Falls stop", emoji: "💧", done: false, notes: "Easy 20 min walk · very kid-friendly", photo: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=160&h=160&fit=crop&q=80", photoAlt: "Waterfall in forest" },
      { id: "mock-3-4", time: "12:00 PM", title: "Lunch – Hana Farms", emoji: "🌿", done: false, notes: "Local food trucks · cash friendly", photo: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=160&h=160&fit=crop&q=80", photoAlt: "Outdoor food stand" },
      { id: "mock-3-5", time: "2:00 PM", title: "Waiʻanapanapa Black Sand Beach", emoji: "🖤", done: false, notes: "State Park · reserve parking ahead", photo: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=160&h=160&fit=crop&q=80", photoAlt: "Black sand beach" },
      { id: "mock-3-6", time: "5:00 PM", title: "Drive back to Wailea", emoji: "🌅", done: false, notes: "~2 hr drive · grab sunset views", photo: "https://images.unsplash.com/photo-1472396961693-142e6e269027?w=160&h=160&fit=crop&q=80", photoAlt: "Sunset drive" },
    ],
  },
  {
    dayNum: 4, date: "Sat · May 25", theme: "Beach + Spa",
    hero: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&h=500&fit=crop&q=85",
    heroAlt: "Spa and pool", weatherEmoji: "☀️", temp: "84°F", condition: "Sunny",
    status: "upcoming",
    note: "Spa is 0.3 mi from the resort — walk or take the beach path.",
    agenda: [
      { id: "mock-4-1", time: "8:30 AM", title: "Slow breakfast at hotel", emoji: "🥐", done: false, notes: "No rush today — relaxed morning", photo: "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=160&h=160&fit=crop&q=80", photoAlt: "Breakfast" },
      { id: "mock-4-2", time: "10:00 AM", title: "Wailea Beach", emoji: "🏖️", done: false, notes: "Chairs and umbrella — full beach day", photo: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=160&h=160&fit=crop&q=80", photoAlt: "Beach" },
      { id: "mock-4-3", time: "1:00 PM", title: "Lunch at the pool bar", emoji: "🍹", done: false, notes: "Order the fish tacos", photo: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=160&h=160&fit=crop&q=80", photoAlt: "Pool bar" },
      { id: "mock-4-4", time: "3:00 PM", title: "Couples massage – Andaz Spa", emoji: "💆", done: false, notes: "Reservation confirmed · 60 min", reservation: true, photo: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=160&h=160&fit=crop&q=80", photoAlt: "Spa" },
      { id: "mock-4-5", time: "6:30 PM", title: "Sunset dinner – Humble Market", emoji: "🌅", done: false, notes: "Walk-in · arrive at sunset", photo: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=160&h=160&fit=crop&q=80", photoAlt: "Sunset dinner" },
    ],
  },
  {
    dayNum: 5, date: "Sun · May 26", theme: "Free Day",
    hero: "https://images.unsplash.com/photo-1471922694854-ff1b63b20054?w=800&h=500&fit=crop&q=85",
    heroAlt: "Tropical island", weatherEmoji: "☀️", temp: "83°F", condition: "Sunny",
    status: "upcoming",
    note: "No set plans today — go with the flow. Farmer's market is great in the morning.",
    agenda: [
      { id: "mock-5-1", time: "8:00 AM", title: "Upcountry Farmer's Market", emoji: "🥭", done: false, notes: "Kula · 30 min drive · incredible produce", photo: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=160&h=160&fit=crop&q=80", photoAlt: "Farmers market" },
      { id: "mock-5-2", time: "11:00 AM", title: "Shopping in Paia Town", emoji: "🛍️", done: false, notes: "Boutiques, art galleries, North Shore vibes", photo: "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=160&h=160&fit=crop&q=80", photoAlt: "Shopping street" },
      { id: "mock-5-3", time: "1:30 PM", title: "Lunch – Flatbread Company", emoji: "🍕", done: false, notes: "Paia · wood-fired pizza · kids love it", photo: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=160&h=160&fit=crop&q=80", photoAlt: "Restaurant" },
      { id: "mock-5-4", time: "4:00 PM", title: "Pool time", emoji: "🏊", done: false, notes: "Kids have been asking all week", photo: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=160&h=160&fit=crop&q=80", photoAlt: "Pool" },
      { id: "mock-5-5", time: "7:30 PM", title: "Old Lahaina Luau", emoji: "🌺", done: false, notes: "Reservation confirmed · Arrive by 7pm", reservation: true, photo: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=160&h=160&fit=crop&q=80", photoAlt: "Luau" },
    ],
  },
  {
    dayNum: 6, date: "Mon · May 27", theme: "Haleakalā Sunrise",
    hero: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&h=500&fit=crop&q=85",
    heroAlt: "Volcano sunrise", weatherEmoji: "🌤️", temp: "55°F", condition: "Clear at summit",
    status: "upcoming",
    note: "It's cold at the summit — bring jackets! Reservation required to enter the park at sunrise.",
    agenda: [
      { id: "mock-6-1", time: "2:30 AM", title: "Wake up – summit drive", emoji: "⏰", done: false, notes: "1.5 hr drive to summit — leave by 3am", photo: "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=160&h=160&fit=crop&q=80", photoAlt: "Dark early morning" },
      { id: "mock-6-2", time: "5:45 AM", title: "Haleakalā Sunrise", emoji: "🌋", done: false, notes: "Park reservation confirmed · Dress warm", reservation: true, photo: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=160&h=160&fit=crop&q=80", photoAlt: "Volcano sunrise" },
      { id: "mock-6-3", time: "9:00 AM", title: "Crater hike – Sliding Sands", emoji: "🥾", done: false, notes: "2-mile trail · bring plenty of water", photo: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=160&h=160&fit=crop&q=80", photoAlt: "Volcanic crater" },
      { id: "mock-6-4", time: "12:00 PM", title: "Lunch + nap at hotel", emoji: "😴", done: false, notes: "Early wake-up means early nap time", photo: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=160&h=160&fit=crop&q=80", photoAlt: "Resort" },
      { id: "mock-6-5", time: "5:00 PM", title: "Downhill bike tour (optional)", emoji: "🚲", done: false, notes: "Maui Downhill · fun if energy allows", photo: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=160&h=160&fit=crop&q=80", photoAlt: "Cycling" },
      { id: "mock-6-6", time: "7:30 PM", title: "Dinner – Maui Brewing Co.", emoji: "🍺", done: false, notes: "Kihei · great food & local beers", photo: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=160&h=160&fit=crop&q=80", photoAlt: "Brewery dinner" },
    ],
  },
  {
    dayNum: 7, date: "Tue · May 28", theme: "Fly Home",
    hero: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&h=500&fit=crop&q=85",
    heroAlt: "Airport departure", weatherEmoji: "☀️", temp: "81°F", condition: "Beautiful last day",
    status: "upcoming",
    note: "Flight departs at 4:10 PM — check out by noon. Squeeze in one last swim!",
    agenda: [
      { id: "mock-7-1", time: "7:00 AM", title: "Last sunrise + beach walk", emoji: "🌅", done: false, notes: "Soak it in — last morning in Maui", photo: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=160&h=160&fit=crop&q=80", photoAlt: "Beach sunrise" },
      { id: "mock-7-2", time: "8:30 AM", title: "Breakfast + pack up", emoji: "🧳", done: false, notes: "Check out by noon · pack tonight's items in carry-on", photo: "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=160&h=160&fit=crop&q=80", photoAlt: "Packing" },
      { id: "mock-7-3", time: "11:00 AM", title: "Last swim at the pool", emoji: "🏊", done: false, notes: "You earned it", photo: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=160&h=160&fit=crop&q=80", photoAlt: "Pool" },
      { id: "mock-7-4", time: "12:00 PM", title: "Check out", emoji: "🏨", done: false, notes: "Leave bags with bell desk if needed", photo: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=160&h=160&fit=crop&q=80", photoAlt: "Hotel checkout" },
      { id: "mock-7-5", time: "1:30 PM", title: "Depart for OGG airport", emoji: "🚗", done: false, notes: "Return rental car · 30 min to airport", photo: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=160&h=160&fit=crop&q=80", photoAlt: "Road to airport" },
      { id: "mock-7-6", time: "4:10 PM", title: "Flight home – AA222", emoji: "✈️", done: false, notes: "OGG → LAX · 5h 30min", reservation: true, photo: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=160&h=160&fit=crop&q=80", photoAlt: "Plane departure" },
    ],
  },
];

// Auto-assign items to morning / afternoon / evening by time
function getSections(agenda: Item[]) {
  return [
    {
      key: "morning", label: "Morning", emoji: "🌅", range: "Until noon",
      color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", dot: "bg-amber-400",
      items: agenda.filter((i) => timeToMinutes(i.time) < timeToMinutes("12:00 PM")),
    },
    {
      key: "afternoon", label: "Afternoon", emoji: "☀️", range: "12 – 5pm",
      color: "text-sky-600", bg: "bg-sky-50", border: "border-sky-200", dot: "bg-sky-400",
      items: agenda.filter((i) => {
        const m = timeToMinutes(i.time);
        return m >= timeToMinutes("12:00 PM") && m < timeToMinutes("5:00 PM");
      }),
    },
    {
      key: "evening", label: "Evening", emoji: "🌙", range: "5pm onwards",
      color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-200", dot: "bg-indigo-400",
      items: agenda.filter((i) => timeToMinutes(i.time) >= timeToMinutes("5:00 PM")),
    },
  ].filter((s) => s.items.length > 0);
}

const MOODS = [
  { label: "Easy Morning", emoji: "☀️", color: "bg-amber-100 text-amber-700" },
  { label: "Adventure Mode", emoji: "⚡", color: "bg-orange-100 text-orange-700" },
  { label: "Rain Plan", emoji: "🌧️", color: "bg-blue-100 text-blue-700" },
  { label: "Parents Need Drinks", emoji: "🍹", color: "bg-purple-100 text-purple-700" },
  { label: "Kids Meltdown", emoji: "😤", color: "bg-red-100 text-red-700" },
  { label: "Fancy Night", emoji: "✨", color: "bg-slate-100 text-slate-700" },
];

const TODAY_INDEX = 1; // Day 2 is index 1

export default function MyDayPage() {
  const [dayIndex, setDayIndex] = useState(TODAY_INDEX);
  const [agendas, setAgendas] = useState(() => DAYS.map((d) => d.agenda));

  // Overlay Supabase agenda_items on top of the mock data for Day 2
  useEffect(() => {
    async function fetchAgendaItems() {
      const { data } = await supabase
        .from("agenda_items")
        .select("*")
        .order("sort_order", { ascending: true });

      if (!data || data.length === 0) return;

      // Group items by trip_day_id
      const byDay: Record<string, typeof data> = {};
      data.forEach((item) => {
        if (!byDay[item.trip_day_id]) byDay[item.trip_day_id] = [];
        byDay[item.trip_day_id].push(item);
      });

      // Fetch trip_days to map day_number → items
      const { data: tripDays } = await supabase
        .from("trip_days")
        .select("id, day_number")
        .eq("trip_id", TRIP_ID);

      if (!tripDays) return;

      setAgendas((prev) => {
        const updated = [...prev];
        tripDays.forEach((td) => {
          const items = byDay[td.id];
          if (!items?.length) return;
          const idx = td.day_number - 1;
          updated[idx] = items.map((ai) => ({
            id: ai.id,
            time: ai.time,
            title: ai.title,
            emoji: ai.emoji,
            done: ai.done,
            notes: ai.subtitle ?? "",
            reservation: ai.is_reservation,
            fromSupabase: true,
          }));
        });
        return updated;
      });
    }
    fetchAgendaItems();
  }, []);

  const day = DAYS[dayIndex];
  const items = agendas[dayIndex];
  const sections = getSections(items);
  const isToday = day.status === "today";
  const isPast = day.status === "past";

  async function toggle(id: string) {
    if (!isToday) return;
    const item = items.find((i) => i.id === id);
    if (!item) return;

    // Optimistic UI update
    setAgendas((prev) =>
      prev.map((agenda, i) =>
        i === dayIndex
          ? agenda.map((it) => it.id === id ? { ...it, done: !it.done } : it)
          : agenda
      )
    );

    // Persist to Supabase if it came from there
    if (item.fromSupabase) {
      await supabase
        .from("agenda_items")
        .update({ done: !item.done })
        .eq("id", id);
    }
  }

  const nextUp = isToday ? items.find((i) => !i.done) : null;

  return (
    <div className="flex flex-col">

      {/* ── Hero (with embedded navigation) ── */}
      <div className="relative h-56 w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={day.hero}
          alt={day.heroAlt}
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Gradient: dark bottom for text, subtle top for "My Day" label */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/20" />

        {/* ── Top label ── */}
        <div className="absolute top-0 left-0 right-0 px-4 pt-3 flex items-center justify-between">
          <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">My Day</span>
          <span className="text-[10px] font-semibold text-white/60 uppercase tracking-widest">
            Day {day.dayNum} of {DAYS.length}
          </span>
        </div>

        {/* ── Left arrow ── */}
        {dayIndex > 0 && (
          <button
            onClick={() => setDayIndex((i) => i - 1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-black/25 backdrop-blur-sm border border-white/20 text-white text-lg font-bold hover:bg-black/40 transition-all"
          >
            ‹
          </button>
        )}

        {/* ── Right arrow ── */}
        {dayIndex < DAYS.length - 1 && (
          <button
            onClick={() => setDayIndex((i) => i + 1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-black/25 backdrop-blur-sm border border-white/20 text-white text-lg font-bold hover:bg-black/40 transition-all"
          >
            ›
          </button>
        )}

        {/* ── Dot indicators (very bottom of hero) ── */}
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
          {DAYS.map((d, i) => (
            <button
              key={i}
              onClick={() => setDayIndex(i)}
              className={`rounded-full transition-all duration-200 ${
                i === dayIndex
                  ? "w-5 h-1.5 bg-white"
                  : d.status === "past"
                  ? "w-1.5 h-1.5 bg-white/40"
                  : d.status === "today"
                  ? "w-1.5 h-1.5 bg-white/70"
                  : "w-1.5 h-1.5 bg-white/30"
              }`}
            />
          ))}
        </div>

        {/* ── Bottom text ── */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
          <div className="flex items-end justify-between">
            <div>
              <span className="text-xs font-semibold text-white/70 uppercase tracking-widest">{day.date}</span>
              <h1 className="text-2xl font-bold text-white leading-tight">{day.theme}</h1>
              <div className="flex items-center gap-2 mt-1">
                {isToday && (
                  <span className="text-[10px] font-bold bg-sky-400 text-white px-2 py-0.5 rounded-full uppercase tracking-wide">
                    Today
                  </span>
                )}
                {isPast && (
                  <span className="text-[10px] font-bold bg-white/30 text-white px-2 py-0.5 rounded-full uppercase tracking-wide">
                    Completed
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-xl px-3 py-1.5 border border-white/20">
              <span className="text-lg">{day.weatherEmoji}</span>
              <div>
                <p className="text-sm font-bold text-white">{day.temp}</p>
                <p className="text-[10px] text-white/70">{day.condition}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 px-4 pt-4 pb-4">

        {/* ── Next Up (today only) ── */}
        {nextUp && isToday && (() => {
          const minsAway = 42;
          const isUrgent = minsAway <= 30;
          const isWarning = minsAway <= 60;
          const timeLabel = minsAway < 60
            ? `${minsAway} min away`
            : `${Math.floor(minsAway / 60)} hr ${minsAway % 60 > 0 ? `${minsAway % 60} min` : ""} away`;
          const bannerBg = isUrgent ? "bg-red-500 shadow-red-200" : isWarning ? "bg-orange-500 shadow-orange-200" : "bg-sky-600 shadow-sky-200";
          const mutedText = isUrgent ? "text-red-200" : isWarning ? "text-orange-200" : "text-sky-200";
          return (
            <div className={`${bannerBg} text-white rounded-2xl px-4 py-3 flex items-center justify-between shadow-md`}>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className={`text-[10px] font-semibold uppercase tracking-widest ${mutedText}`}>Next Up</p>
                  {isWarning && (
                    <span className="flex h-2 w-2">
                      <span className={`animate-ping absolute inline-flex h-2 w-2 rounded-full opacity-75 ${isUrgent ? "bg-red-300" : "bg-orange-300"}`} />
                      <span className={`relative inline-flex h-2 w-2 rounded-full ${isUrgent ? "bg-red-200" : "bg-orange-200"}`} />
                    </span>
                  )}
                </div>
                <p className="font-semibold mt-0.5 text-sm">{nextUp.emoji} {nextUp.title}</p>
                <p className={`text-xs mt-0.5 ${mutedText}`}>{nextUp.time}</p>
              </div>
              <div className="text-right">
                <p className={`text-[10px] ${mutedText}`}>{isUrgent ? "🚨 Leaving soon!" : isWarning ? "⏰ Coming up" : "Travel time"}</p>
                <p className="text-xl font-bold">{isUrgent || isWarning ? timeLabel : "12 min"}</p>
                {!isUrgent && !isWarning && <p className={`text-[10px] ${mutedText}`}>12 min drive</p>}
              </div>
            </div>
          );
        })()}

        {/* ── Past day banner ── */}
        {isPast && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 flex gap-3 items-center">
            <span className="text-2xl">✅</span>
            <div>
              <p className="text-xs font-bold text-slate-600 mb-0.5">Day complete</p>
              <p className="text-sm text-slate-500">This day is in the books. What a trip!</p>
            </div>
          </div>
        )}

        {/* ── Upcoming tip banner ── */}
        {day.status === "upcoming" && (
          <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex gap-3 items-start shadow-sm">
            <span className="text-lg">📌</span>
            <div>
              <p className="text-xs font-bold text-slate-700 mb-0.5">Trip Note</p>
              <p className="text-sm text-slate-600">{day.note}</p>
            </div>
          </div>
        )}

        {/* ── Vibe Check (today only) ── */}
        {isToday && (
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Vibe Check</p>
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {MOODS.map((m) => (
                <button key={m.label} className={`flex-none flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-full ${m.color} whitespace-nowrap`}>
                  {m.emoji} {m.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Time Sections ── */}
        {sections.map((section) => {
          const doneCount = section.items.filter((i) => i.done).length;
          return (
            <div key={section.key}>
              {/* Airbnb-style minimal section divider */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-base">{section.emoji}</span>
                <span className="text-sm font-bold text-slate-800">{section.label}</span>
                <span className="text-xs text-slate-400">{section.range}</span>
                <div className="flex-1 h-px bg-slate-100" />
                <span className="text-xs text-slate-400">{doneCount}/{section.items.length}</span>
              </div>

              <div className="flex flex-col">
                {section.items.map((item, idx) => {
                  const next = section.items[idx + 1];
                  const gap = next ? timeToMinutes(next.time) - timeToMinutes(item.time) : null;
                  return (
                    <div key={item.id} className="flex flex-col">
                      <button
                        onClick={() => toggle(item.id)}
                        disabled={!isToday}
                        className={`w-full text-left flex items-stretch gap-3 bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
                          item.done ? "opacity-40 border-slate-100" : "border-slate-100 hover:border-slate-300 hover:shadow-md"
                        } ${item.reservation ? "ring-1 ring-slate-900" : ""} ${!isToday ? "cursor-default" : ""}`}
                      >
                        <div className="flex flex-col items-center justify-start pt-3 pl-3 w-14 flex-none">
                          <span className="text-xl">{item.emoji}</span>
                          <span className="text-[10px] text-slate-400 mt-1 text-center leading-tight font-medium">{item.time}</span>
                        </div>
                        <div className="flex-1 min-w-0 py-3">
                          <p className={`font-semibold text-sm ${item.done ? "line-through text-slate-400" : "text-slate-900"}`}>
                            {item.title}
                          </p>
                          {item.notes && <p className="text-xs text-slate-400 mt-0.5 leading-snug">{item.notes}</p>}
                          {item.reservation && !item.done && (
                            <span className="inline-block mt-1.5 text-[10px] font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-full">
                              🗓 Reserved
                            </span>
                          )}
                        </div>
                        {item.photo ? (
                          <div className="relative w-20 h-[72px] flex-none overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.photo}
                              alt={item.photoAlt ?? item.title}
                              className={`w-full h-full object-cover transition-all ${item.done || isPast ? "grayscale" : ""}`}
                            />
                          </div>
                        ) : (
                          <div className="flex items-center pr-4">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-none transition-colors ${
                              item.done ? "bg-slate-900 border-slate-900" : "border-slate-300"
                            }`}>
                              {item.done && <span className="text-white text-[10px] leading-none">✓</span>}
                            </div>
                          </div>
                        )}
                      </button>

                      {gap !== null && (
                        <div className="flex items-center gap-2 px-4 py-1.5">
                          <div className="flex flex-col items-center gap-0.5">
                            <div className="w-0.5 h-2 rounded-full bg-slate-300" />
                            <div className="w-0.5 h-2 rounded-full bg-slate-200" />
                            <div className="w-0.5 h-2 rounded-full bg-slate-100" />
                          </div>
                          <span className="text-xs font-medium text-slate-400">
                            {formatGap(gap)} until {next?.title.split("–")[0].trim()}
                          </span>
                          {gap >= 90 && (
                            <span className="text-[10px] text-slate-400 ml-auto">explore nearby →</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* ── Trip Note (today + past) ── */}
        {(isToday || isPast) && (
          <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex gap-3 items-start shadow-sm">
            <span className="text-lg">📌</span>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-0.5">Trip Note</p>
              <p className="text-sm text-slate-700">{day.note}</p>
            </div>
          </div>
        )}

        {/* ── Family ── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">
            {isPast ? "Who Was There" : "Who's Coming"}
          </p>
          <div className="flex gap-3">
            {[
              { name: "You", emoji: "🧔" },
              { name: "Sarah", emoji: "👩" },
              { name: "Liam", emoji: "👦" },
              { name: "Emma", emoji: "👧" },
            ].map((p) => (
              <div key={p.name} className="flex flex-col items-center gap-1">
                <div className="w-11 h-11 rounded-full bg-sky-100 flex items-center justify-center text-xl">
                  {p.emoji}
                </div>
                <span className="text-xs text-slate-500">{p.name}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
