"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getTripDateInfo } from "@/lib/tripDates";
import { loadWishlist, type WishlistEntry } from "@/lib/wishlist";

const TRIP_ID = "a1b2c3d4-0000-0000-0000-000000000001";

function timeToMinutes(t: string): number {
  const [time, mer] = t.split(" ");
  const parts = time.split(":").map(Number);
  let h = parts[0];
  const m = parts[1] ?? 0;
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
  fromSupabase?: boolean;
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
    dayNum: 1, date: "Fri · Jun 5", theme: "Travel Day",
    hero: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&h=500&fit=crop&q=85",
    heroAlt: "Airport terminal", weatherEmoji: "☁️", temp: "68°F", condition: "Overcast",
    status: "past",
    note: "Safe travels! AA271 departs early — leave by 5am for the airport.",
    agenda: [
      { id: "mock-1-1", time: "5:00 AM", title: "Leave for airport", emoji: "🚗", done: true, notes: "30 min drive — leave buffer for traffic", photo: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=160&h=160&fit=crop&q=80", photoAlt: "Early morning drive" },
      { id: "mock-1-2", time: "8:05 AM", title: "Flight AA271 to Seattle", emoji: "✈️", done: true, notes: "LAX → SEA · Arrives 10:56am", photo: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=160&h=160&fit=crop&q=80", photoAlt: "Airport terminal" },
      { id: "mock-1-3", time: "12:45 PM", title: "Flight AS845 to Maui", emoji: "🏝️", done: true, notes: "SEA → OGG · Arrives 5:11pm", photo: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=160&h=160&fit=crop&q=80", photoAlt: "Plane window view" },
      { id: "mock-1-4", time: "5:11 PM", title: "Arrive OGG · Rental car", emoji: "🚙", done: true, notes: "Pick up rental at airport", photo: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=160&h=160&fit=crop&q=80", photoAlt: "Rental car" },
      { id: "mock-1-5", time: "6:30 PM", title: "Check in – Sheraton Maui Resort", emoji: "🏨", done: true, notes: "Ka'anapali · Ocean view rooms", photo: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=160&h=160&fit=crop&q=80", photoAlt: "Resort lobby" },
      { id: "mock-1-6", time: "8:00 PM", title: "Dinner near the resort", emoji: "🍝", done: true, notes: "Casual — settle in and unwind", photo: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=160&h=160&fit=crop&q=80", photoAlt: "Restaurant dinner" },
    ],
  },
  {
    dayNum: 2, date: "Sat · Jun 6", theme: "Beach + Snorkel",
    hero: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=500&fit=crop&q=85",
    heroAlt: "Ka'anapali beach", weatherEmoji: "⛅", temp: "82°F", condition: "Partly cloudy",
    status: "today",
    note: "Bring beach towels — hotel charges to rent. Grab reef-safe sunscreen from the bathroom.",
    agenda: [
      { id: "mock-2-1", time: "8:00 AM", title: "Breakfast at hotel", emoji: "🍳", done: false, notes: "Buffet ends at 10am", photo: "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=160&h=160&fit=crop&q=80", photoAlt: "Hotel breakfast spread" },
      { id: "mock-2-2", time: "10:00 AM", title: "Ka'anapali Beach morning", emoji: "🏖️", done: false, notes: "Bring sunscreen & floaties", photo: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=160&h=160&fit=crop&q=80", photoAlt: "Maui beach" },
      { id: "mock-2-3", time: "1:00 PM", title: "Lunch – Monkeypod Kitchen", emoji: "🌮", done: false, notes: "Walk-in only · arrive early", photo: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=160&h=160&fit=crop&q=80", photoAlt: "Restaurant table" },
      { id: "mock-2-4", time: "3:00 PM", title: "Nap / downtime", emoji: "😴", done: false, notes: "Back at the resort — pool or room", photo: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=160&h=160&fit=crop&q=80", photoAlt: "Resort pool" },
      { id: "mock-2-5", time: "4:30 PM", title: "Snorkeling – Molokini Crater", emoji: "🤿", done: false, notes: "Depart from Maalaea Harbor", photo: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=160&h=160&fit=crop&q=80", photoAlt: "Snorkeling underwater" },
      { id: "mock-2-6", time: "7:00 PM", title: "Dinner – Mama's Fish House", emoji: "🐟", done: false, notes: "Reservation confirmed · Party of 4", reservation: true, photo: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=160&h=160&fit=crop&q=80", photoAlt: "Fine dining seafood plate" },
    ],
  },
  {
    dayNum: 3, date: "Sun · Jun 7", theme: "Road to Hana",
    hero: "https://images.unsplash.com/photo-1542259009477-d625272157b7?w=800&h=500&fit=crop&q=85",
    heroAlt: "Road to Hana", weatherEmoji: "🌦️", temp: "76°F", condition: "Chance of rain",
    status: "upcoming",
    note: "Road to Hana stops are one-way — plan stops on the way there. Download offline maps.",
    agenda: [
      { id: "mock-3-1", time: "5:30 AM", title: "Early rise – pack snacks", emoji: "🌄", done: false, notes: "Long drive day — stock the cooler", photo: "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=160&h=160&fit=crop&q=80", photoAlt: "Early morning sunrise" },
      { id: "mock-3-2", time: "7:00 AM", title: "Depart for Road to Hana", emoji: "🚗", done: false, notes: "Leave by 7am to beat the crowds", photo: "https://images.unsplash.com/photo-1542259009477-d625272157b7?w=160&h=160&fit=crop&q=80", photoAlt: "Winding road" },
      { id: "mock-3-3", time: "9:30 AM", title: "Twin Falls stop", emoji: "💧", done: false, notes: "Easy 20 min walk · very kid-friendly", photo: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=160&h=160&fit=crop&q=80", photoAlt: "Waterfall in forest" },
      { id: "mock-3-4", time: "12:00 PM", title: "Lunch – Hana Farms", emoji: "🌿", done: false, notes: "Local food trucks · cash friendly", photo: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=160&h=160&fit=crop&q=80", photoAlt: "Outdoor food stand" },
      { id: "mock-3-5", time: "2:00 PM", title: "Waiʻanapanapa Black Sand Beach", emoji: "🖤", done: false, notes: "State Park · reserve parking ahead", photo: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=160&h=160&fit=crop&q=80", photoAlt: "Black sand beach" },
      { id: "mock-3-6", time: "5:00 PM", title: "Drive back to Ka'anapali", emoji: "🌅", done: false, notes: "~2 hr drive · grab sunset views", photo: "https://images.unsplash.com/photo-1472396961693-142e6e269027?w=160&h=160&fit=crop&q=80", photoAlt: "Sunset drive" },
    ],
  },
  {
    dayNum: 4, date: "Mon · Jun 8", theme: "Beach + Spa",
    hero: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&h=500&fit=crop&q=85",
    heroAlt: "Spa and pool", weatherEmoji: "☀️", temp: "84°F", condition: "Sunny",
    status: "upcoming",
    note: "The resort spa is steps from the beach — book early as they fill up.",
    agenda: [
      { id: "mock-4-1", time: "8:30 AM", title: "Slow breakfast at hotel", emoji: "🥐", done: false, notes: "No rush today — relaxed morning", photo: "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=160&h=160&fit=crop&q=80", photoAlt: "Breakfast" },
      { id: "mock-4-2", time: "10:00 AM", title: "Ka'anapali Beach", emoji: "🏖️", done: false, notes: "Chairs and umbrella — full beach day", photo: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=160&h=160&fit=crop&q=80", photoAlt: "Beach" },
      { id: "mock-4-3", time: "1:00 PM", title: "Lunch at the pool bar", emoji: "🍹", done: false, notes: "Order the fish tacos", photo: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=160&h=160&fit=crop&q=80", photoAlt: "Pool bar" },
      { id: "mock-4-4", time: "3:00 PM", title: "Couples massage – Sheraton Spa", emoji: "💆", done: false, notes: "Reservation confirmed · 60 min", reservation: true, photo: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=160&h=160&fit=crop&q=80", photoAlt: "Spa" },
      { id: "mock-4-5", time: "6:30 PM", title: "Sunset dinner – Humble Market", emoji: "🌅", done: false, notes: "Walk-in · arrive at sunset", photo: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=160&h=160&fit=crop&q=80", photoAlt: "Sunset dinner" },
    ],
  },
  {
    dayNum: 5, date: "Tue · Jun 9", theme: "Free Day",
    hero: "https://images.unsplash.com/photo-1471922694854-ff1b63b20054?w=800&h=500&fit=crop&q=85",
    heroAlt: "Tropical island", weatherEmoji: "☀️", temp: "83°F", condition: "Sunny",
    status: "upcoming",
    note: "No set plans today — go with the flow. Farmer's market in Upcountry is great in the morning.",
    agenda: [
      { id: "mock-5-1", time: "8:00 AM", title: "Upcountry Farmer's Market", emoji: "🥭", done: false, notes: "Kula · 30 min drive · incredible produce", photo: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=160&h=160&fit=crop&q=80", photoAlt: "Farmers market" },
      { id: "mock-5-2", time: "11:00 AM", title: "Shopping in Paia Town", emoji: "🛍️", done: false, notes: "Boutiques, art galleries, North Shore vibes", photo: "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=160&h=160&fit=crop&q=80", photoAlt: "Shopping street" },
      { id: "mock-5-3", time: "1:30 PM", title: "Lunch – Flatbread Company", emoji: "🍕", done: false, notes: "Paia · wood-fired pizza · kids love it", photo: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=160&h=160&fit=crop&q=80", photoAlt: "Restaurant" },
      { id: "mock-5-4", time: "4:00 PM", title: "Pool time", emoji: "🏊", done: false, notes: "Kids have been asking all week", photo: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=160&h=160&fit=crop&q=80", photoAlt: "Pool" },
      { id: "mock-5-5", time: "7:30 PM", title: "Old Lahaina Luau", emoji: "🌺", done: false, notes: "Reservation confirmed · Arrive by 7pm", reservation: true, photo: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=160&h=160&fit=crop&q=80", photoAlt: "Luau" },
    ],
  },
  {
    dayNum: 6, date: "Wed · Jun 10", theme: "Haleakalā Sunrise",
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
    dayNum: 7, date: "Thu · Jun 11", theme: "Fly Home",
    hero: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&h=500&fit=crop&q=85",
    heroAlt: "Airport departure", weatherEmoji: "☀️", temp: "81°F", condition: "Beautiful last day",
    status: "upcoming",
    note: "Squeeze in one last swim before checkout! Return rental car with enough time for the airport.",
    agenda: [
      { id: "mock-7-1", time: "7:00 AM", title: "Last sunrise + beach walk", emoji: "🌅", done: false, notes: "Soak it in — last morning in Maui", photo: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=160&h=160&fit=crop&q=80", photoAlt: "Beach sunrise" },
      { id: "mock-7-2", time: "8:30 AM", title: "Breakfast + pack up", emoji: "🧳", done: false, notes: "Check out by noon", photo: "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=160&h=160&fit=crop&q=80", photoAlt: "Packing" },
      { id: "mock-7-3", time: "11:00 AM", title: "Last swim at the pool", emoji: "🏊", done: false, notes: "You earned it", photo: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=160&h=160&fit=crop&q=80", photoAlt: "Pool" },
      { id: "mock-7-4", time: "12:00 PM", title: "Check out – Sheraton Maui", emoji: "🏨", done: false, notes: "Leave bags with bell desk if needed", photo: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=160&h=160&fit=crop&q=80", photoAlt: "Hotel checkout" },
      { id: "mock-7-5", time: "2:00 PM", title: "Depart for OGG airport", emoji: "🚗", done: false, notes: "Return rental car · allow 45 min", photo: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=160&h=160&fit=crop&q=80", photoAlt: "Road to airport" },
      { id: "mock-7-6", time: "5:00 PM", title: "Flight home", emoji: "✈️", done: false, notes: "OGG → home · See you on the other side!", reservation: true, photo: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=160&h=160&fit=crop&q=80", photoAlt: "Plane departure" },
    ],
  },
];

function getSections(agenda: Item[]) {
  return [
    {
      key: "morning", label: "Morning", emoji: "🌅", range: "Until noon",
      color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", dot: "bg-amber-400",
      defaultTime: "9:00 AM",
      items: agenda.filter((i) => timeToMinutes(i.time) < timeToMinutes("12:00 PM")),
    },
    {
      key: "afternoon", label: "Afternoon", emoji: "☀️", range: "12 – 5pm",
      color: "text-sky-600", bg: "bg-sky-50", border: "border-sky-200", dot: "bg-sky-400",
      defaultTime: "2:00 PM",
      items: agenda.filter((i) => {
        const m = timeToMinutes(i.time);
        return m >= timeToMinutes("12:00 PM") && m < timeToMinutes("5:00 PM");
      }),
    },
    {
      key: "evening", label: "Evening", emoji: "🌙", range: "5pm onwards",
      color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-200", dot: "bg-indigo-400",
      defaultTime: "7:00 PM",
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

type ForecastDay = {
  date: string;
  high: number;
  low: number;
  emoji: string;
  condition: string;
  precipChance: number;
  uvIndex: number;
  note?: string;
};

type LiveWeather = {
  temp: number;
  condition: string;
  emoji: string;
  high: number;
  low: number;
  humidity: number;
  feelsLike?: number;
  source: "live" | "static";
  forecast?: ForecastDay[];
};

// ISO date for each trip day (Jun 5 = day 1)
const TRIP_START_ISO = "2026-06-05";
function getDayISO(dayNum: number): string {
  const d = new Date(TRIP_START_ISO + "T12:00:00");
  d.setDate(d.getDate() + dayNum - 1);
  return d.toISOString().slice(0, 10);
}

// Parse a doc's stored date string (e.g. "Jun 8 · 5:30 PM") into
// { dayIndex: 0-based trip day, time: "5:30 PM" } so it can be
// merged into the My Day agenda.
function parseDocForAgenda(dateStr: string): { dayIndex: number; time: string } | null {
  const MONTHS: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  };
  const m = dateStr.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d+)/);
  if (!m) return null;
  const docDate = new Date(2026, MONTHS[m[1]], parseInt(m[2]), 12);
  const tripStart = new Date(TRIP_START_ISO + "T12:00:00");
  const dayIndex = Math.round((docDate.getTime() - tripStart.getTime()) / 86_400_000);
  if (dayIndex < 0 || dayIndex > 13) return null; // outside a 2-week window
  const tMatch = dateStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  const time = tMatch ? `${tMatch[1]}:${tMatch[2]} ${tMatch[3].toUpperCase()}` : "";
  return { dayIndex, time };
}

function nowMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

// ── Smart weather alert — cross-references forecast with today's activities ──
type WeatherAlert = { emoji: string; type: "info" | "warning"; title: string; body: string };

type WeatherForAlert = { condition: string; high: number; precipChance?: number };

function getWeatherAlert(w: WeatherForAlert | null, agenda: Item[], isToday: boolean): WeatherAlert | null {
  if (!w) return null;
  const cond = w.condition.toLowerCase();
  const isRainy = cond.includes("rain") || cond.includes("shower") || cond.includes("storm") || (w.precipChance ?? 0) >= 50;
  const isWindy = cond.includes("wind");
  const isHot = w.high >= 88;
  const outdoor = ["snorkel", "beach", "hike", "swim", "surf", "ocean", "dive", "kayak", "boat"];
  const hasOutdoor = agenda.some((i) =>
    outdoor.some((k) => i.title.toLowerCase().includes(k) || (i.notes ?? "").toLowerCase().includes(k))
  );
  const dayLabel = isToday ? "today" : "this day";
  if (isRainy && hasOutdoor) {
    return {
      emoji: "🌧️", type: "warning",
      title: `Rain in the forecast${w.precipChance ? ` · ${w.precipChance}% chance` : ""}`,
      body: `Some outdoor activities may be affected ${dayLabel}. Pack a light layer and have a backup plan ready.`,
    };
  }
  if (isHot && hasOutdoor) {
    return {
      emoji: "☀️", type: "warning",
      title: `High of ${w.high}°F ${dayLabel}`,
      body: "Apply reef-safe sunscreen early — UV is intense. Stay hydrated and seek shade between 11am–3pm.",
    };
  }
  if (isWindy && hasOutdoor) {
    return {
      emoji: "💨", type: "info",
      title: "Breezy conditions",
      body: "Ocean may be choppy — check with tour operators before heading out. Great for kite surfing!",
    };
  }
  if (!isRainy && w.high >= 78 && w.high <= 87) {
    return {
      emoji: "🌺", type: "info",
      title: "Perfect Maui day",
      body: `${w.high}° and ${w.condition.toLowerCase()} — ideal for everything on your list.`,
    };
  }
  return null;
}

// Smart gap suggestions — checks wishlist first, then time-of-day defaults
type GapSuggestion = { emoji: string; name: string; note: string; fromWishlist?: boolean };

const CATEGORY_EMOJI: Record<string, string> = {
  Beach: "🏖️", Food: "🍽️", Activity: "📍", Spa: "💆",
};

function getGapSuggestion(
  afterTime: string,
  gapMins: number,
  wishlist: WishlistEntry[],
): GapSuggestion | null {
  if (gapMins < 90) return null;
  const mins = timeToMinutes(afterTime);
  if (isNaN(mins)) return null;

  // Prefer a saved wishlist item whose category fits the time of day
  if (wishlist.length > 0) {
    const preferFood = mins >= 660 && mins < 840;   // 11am–2pm
    const preferSpa  = mins >= 840 && mins < 1020;  // 2pm–5pm (adults free time)
    const match =
      wishlist.find((e) => preferFood  && e.category === "Food")   ??
      wishlist.find((e) => preferSpa   && e.category === "Spa")    ??
      wishlist.find((e) => e.category === "Beach")                  ??
      wishlist.find((e) => e.category === "Activity")               ??
      wishlist[0];
    if (match) return {
      emoji: CATEGORY_EMOJI[match.category] ?? "📍",
      name: match.name,
      note: `${match.drive} · saved by you`,
      fromWishlist: true,
    };
  }

  // Default time-of-day suggestions
  if (mins < 720) return { emoji: "🚶", name: "Wailea Beach Path", note: "Free · 5 min walk · stunning views" };
  if (mins < 840) return { emoji: "🍜", name: "Monkeypod Kitchen", note: "Farm-to-table · 4 min drive" };
  if (mins < 1020) {
    return gapMins >= 120
      ? { emoji: "🏖️", name: "Kapalua Beach", note: "Calm bay · 8 min drive · kids love it" }
      : { emoji: "🍧", name: "Ululani's Shave Ice", note: "Best on the island · 5 min drive" };
  }
  return { emoji: "🍹", name: "Down the Hatch", note: "Waterfront happy hour · 14 min drive" };
}

// Sentinel prefix for optimistically-created items not yet in DB
const NEW_ID_PREFIX = "optimistic-";

export default function MyDayPage() {
  const router = useRouter();
  const [currentMins, setCurrentMins] = useState(nowMinutes);
  const [wishlist, setWishlist] = useState<WishlistEntry[]>([]);
  const [todayDayIndex, setTodayDayIndex] = useState(0);
  const [dayIndex, setDayIndex] = useState(0);
  const [agendas, setAgendas] = useState(() => DAYS.map((d) => d.agenda));
  const [crewMembers, setCrewMembers] = useState<{ name: string; avatar: string; avatar_url: string | null }[]>([]);
  const [weather, setWeather] = useState<LiveWeather | null>(null);
  // day_number → trip_day_id (for Supabase writes)
  const [dayIdMap, setDayIdMap] = useState<Record<number, string>>({});
  const [tripInfo, setTripInfo] = useState<{ status: "upcoming" | "active" | "completed"; daysUntilTrip: number } | null>(null);

  // Pre-trip readiness
  const [packingProgress, setPackingProgress] = useState<{ packed: number; total: number }>({ packed: 0, total: 46 });
  const [docReadiness, setDocReadiness] = useState<{ confirmed: number; total: number } | null>(null);

  // Vibe check
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  // Edit / add sheet
  const [sheetItem, setSheetItem] = useState<Item | null>(null);
  const [draft, setDraft] = useState<Item>({ id: "", time: "", title: "", emoji: "📍", done: false, notes: "" });
  const [sheetSaving, setSheetSaving] = useState(false);
  const [sheetDeleteConfirm, setSheetDeleteConfirm] = useState(false);
  const emojiInputRef = useRef<HTMLInputElement>(null);

  const isNewItem = sheetItem?.id.startsWith(NEW_ID_PREFIX) ?? false;

  useEffect(() => {
    const clockTimer = setInterval(() => setCurrentMins(nowMinutes()), 60_000);
    return () => clearInterval(clockTimer);
  }, []);

  // Load packing progress from localStorage
  useEffect(() => {
    const loadPacking = () => {
      try {
        const raw = localStorage.getItem("tripflow-packing-maui26");
        const ids: string[] = raw ? JSON.parse(raw) : [];
        setPackingProgress({ packed: ids.length, total: 46 });
      } catch { /* ignore */ }
    };
    loadPacking();
    window.addEventListener("focus", loadPacking);
    return () => window.removeEventListener("focus", loadPacking);
  }, []);

  // Load wishlist from localStorage (also refresh when tab gains focus)
  useEffect(() => {
    const refresh = () => setWishlist(loadWishlist());
    refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);

  useEffect(() => {
    fetch("/api/weather")
      .then((r) => r.json())
      .then((data) => setWeather(data))
      .catch(() => {});

    async function fetchData() {
      const [tripResult, travelersResult, agendaResult, tripDaysResult, docsResult] = await Promise.all([
        supabase.from("trips").select("start_date, end_date").eq("id", TRIP_ID).single(),
        supabase.from("travelers").select("name, avatar, avatar_url").eq("trip_id", TRIP_ID).order("created_at"),
        supabase.from("agenda_items").select("*").order("sort_order", { ascending: true }),
        supabase.from("trip_days").select("id, day_number").eq("trip_id", TRIP_ID),
        supabase.from("documents")
          .select("id, category, name, emoji, date, notes, confirmation, provider, status")
          .eq("trip_id", TRIP_ID),
      ]);

      if (docsResult.data?.length) {
        const confirmed = docsResult.data.filter((d) => d.status === "confirmed").length;
        setDocReadiness({ confirmed, total: docsResult.data.length });
      }

      if (tripResult.data) {
        const info = getTripDateInfo(tripResult.data.start_date, tripResult.data.end_date);
        setTripInfo({ status: info.status, daysUntilTrip: info.daysUntilTrip });
        const idx = Math.max(0, Math.min(info.currentDayNumber - 1, DAYS.length - 1));
        setTodayDayIndex(idx);
        setDayIndex(idx);
      }

      if (travelersResult.data?.length) {
        setCrewMembers(travelersResult.data.map((t) => ({
          name: t.name,
          avatar: t.avatar,
          avatar_url: t.avatar_url ?? null,
        })));
      }

      // Build dayIdMap for all days
      if (tripDaysResult.data) {
        const map: Record<number, string> = {};
        tripDaysResult.data.forEach((td) => { map[td.day_number] = td.id; });
        setDayIdMap(map);
      }

      // Build agenda from Supabase agenda_items, then overlay doc-sourced reservations
      {
        const byDay: Record<string, NonNullable<typeof agendaResult.data>> = {};
        (agendaResult.data ?? []).forEach((item) => {
          if (!byDay[item.trip_day_id]) byDay[item.trip_day_id] = [];
          byDay[item.trip_day_id].push(item);
        });

        // Dining / Activity docs → pseudo agenda items
        const docItems: Array<{ dayIndex: number; item: Item }> = [];
        (docsResult.data ?? [])
          .filter((d) => d.category === "Dining" || d.category === "Activities")
          .forEach((doc) => {
            const parsed = parseDocForAgenda(doc.date ?? "");
            if (!parsed) return;
            const notesParts = [
              doc.confirmation ? `Confirmation: ${doc.confirmation}` : "",
              doc.provider ?? "",
              doc.notes ?? "",
            ].filter(Boolean);
            docItems.push({
              dayIndex: parsed.dayIndex,
              item: {
                id: `doc-${doc.id}`,
                time: parsed.time,
                title: doc.name,
                emoji: doc.emoji ?? (doc.category === "Dining" ? "🍽️" : "🎯"),
                done: doc.status === "completed",
                notes: notesParts.join(" · "),
                reservation: true,
                fromSupabase: true,
              },
            });
          });

        setAgendas((prev) => {
          const updated = [...prev];

          // Layer 1: replace mock days that have real agenda_items
          if (tripDaysResult.data) {
            tripDaysResult.data.forEach((td) => {
              const items = byDay[td.id];
              if (!items?.length) return;
              const idx = td.day_number - 1;
              if (idx < 0 || idx >= updated.length) return;
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
          }

          // Layer 2: merge doc-sourced items, skipping duplicates by title
          const toMins = (t: string) => {
            const match = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
            if (!match) return 0;
            let h = parseInt(match[1]);
            const m = parseInt(match[2]);
            const pm = match[3].toUpperCase() === "PM";
            if (pm && h !== 12) h += 12;
            if (!pm && h === 12) h = 0;
            return h * 60 + m;
          };
          docItems.forEach(({ dayIndex, item }) => {
            if (dayIndex < 0 || dayIndex >= updated.length) return;
            const existing = updated[dayIndex];
            const titleLC = item.title.toLowerCase();
            const dupe = existing.some(
              (e) =>
                e.title.toLowerCase().includes(titleLC) ||
                titleLC.includes(e.title.toLowerCase()),
            );
            if (dupe) return;
            updated[dayIndex] = [...existing, item].sort((a, b) => {
              if (!a.time) return 1;
              if (!b.time) return -1;
              return toMins(a.time) - toMins(b.time);
            });
          });

          return updated;
        });
      }
    }
    fetchData();
  }, []);

  const day = DAYS[dayIndex];
  const items = agendas[dayIndex];
  const sections = getSections(items);
  const isToday = dayIndex === todayDayIndex;
  const isPast = dayIndex < todayDayIndex;
  const isEditable = !isPast; // today and upcoming are editable

  // ── Toggle done (quick tap, today only) ──────────────────────────────────
  async function toggle(id: string) {
    if (!isToday) return;
    const item = items.find((i) => i.id === id);
    if (!item) return;
    setAgendas((prev) =>
      prev.map((agenda, i) =>
        i === dayIndex
          ? agenda.map((it) => it.id === id ? { ...it, done: !it.done } : it)
          : agenda
      )
    );
    if (item.fromSupabase) {
      await supabase.from("agenda_items").update({ done: !item.done }).eq("id", id);
    }
  }

  // ── Sheet open/close ─────────────────────────────────────────────────────
  function openEdit(item: Item) {
    setSheetDeleteConfirm(false);
    setSheetItem(item);
    setDraft({ ...item });
  }

  function openAdd(defaultTime: string) {
    const newItem: Item = {
      id: `${NEW_ID_PREFIX}${Date.now()}`,
      time: defaultTime,
      title: "",
      emoji: "📍",
      done: false,
      notes: "",
      reservation: false,
      fromSupabase: false,
    };
    setSheetDeleteConfirm(false);
    setSheetItem(newItem);
    setDraft({ ...newItem });
  }

  function closeSheet() {
    setSheetItem(null);
    setSheetDeleteConfirm(false);
  }

  // ── Save edit ─────────────────────────────────────────────────────────────
  async function saveEdit() {
    if (!sheetItem || !draft.title.trim()) return;
    setSheetSaving(true);

    // Optimistic update
    setAgendas((prev) =>
      prev.map((agenda, i) =>
        i === dayIndex
          ? agenda.map((it) => it.id === sheetItem.id ? { ...it, ...draft } : it)
          : agenda
      )
    );

    if (sheetItem.fromSupabase) {
      await supabase.from("agenda_items").update({
        title: draft.title,
        emoji: draft.emoji,
        time: draft.time,
        subtitle: draft.notes,
        is_reservation: draft.reservation ?? false,
        done: draft.done,
      }).eq("id", sheetItem.id);
    }

    setSheetSaving(false);
    closeSheet();
  }

  // ── Add new item ──────────────────────────────────────────────────────────
  async function addItem() {
    if (!draft.title.trim()) return;
    setSheetSaving(true);

    const tripDayId = dayIdMap[day.dayNum];

    // Get max sort_order for this day
    let sortOrder = (items.length + 1) * 10;
    if (tripDayId) {
      const { data: existing } = await supabase
        .from("agenda_items")
        .select("sort_order")
        .eq("trip_day_id", tripDayId)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      sortOrder = (existing?.sort_order ?? 0) + 10;
    }

    const newItem: Item = {
      ...draft,
      id: `${NEW_ID_PREFIX}${Date.now()}`,
      fromSupabase: false,
    };

    // Persist to Supabase if we have the day's ID
    if (tripDayId) {
      const { data } = await supabase
        .from("agenda_items")
        .insert({
          trip_day_id: tripDayId,
          title: draft.title,
          emoji: draft.emoji,
          time: draft.time,
          subtitle: draft.notes,
          done: false,
          sort_order: sortOrder,
          is_reservation: draft.reservation ?? false,
        })
        .select()
        .single();
      if (data) newItem.id = data.id;
      newItem.fromSupabase = !!data;
    }

    setAgendas((prev) =>
      prev.map((agenda, i) => i === dayIndex ? [...agenda, newItem] : agenda)
    );
    setSheetSaving(false);
    closeSheet();
  }

  // ── Delete item ───────────────────────────────────────────────────────────
  async function deleteItem() {
    if (!sheetItem) return;
    setSheetSaving(true);
    setAgendas((prev) =>
      prev.map((agenda, i) =>
        i === dayIndex ? agenda.filter((it) => it.id !== sheetItem.id) : agenda
      )
    );
    if (sheetItem.fromSupabase) {
      await supabase.from("agenda_items").delete().eq("id", sheetItem.id);
    }
    setSheetSaving(false);
    closeSheet();
  }

  const nextUp = isToday ? items.find((i) => !i.done) : null;

  return (
    <div className="flex flex-col">

      {/* ══════════════════════════════════════
          EDIT / ADD SHEET (bottom sheet)
      ══════════════════════════════════════ */}
      <div
        className={`fixed inset-0 z-50 flex flex-col justify-end max-w-md mx-auto transition-opacity duration-200 ${
          sheetItem ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={closeSheet}
        />

        {/* Sheet panel — flex col so action bar always stays visible */}
        <div
          className={`relative bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out flex flex-col ${
            sheetItem ? "translate-y-0" : "translate-y-full"
          }`}
          style={{ maxHeight: "calc(100dvh - 72px)" }}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1 flex-none">
            <div className="w-10 h-1 bg-slate-200 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-2 pb-4 border-b border-slate-100 flex-none">
            <h3 className="text-base font-black text-slate-900">
              {isNewItem ? "Add Activity" : "Edit Activity"}
            </h3>
            <button
              onClick={closeSheet}
              className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-sm font-bold"
            >
              ✕
            </button>
          </div>

          {/* Form body — scrolls within the constrained sheet height */}
          <div className="px-5 pt-4 pb-2 flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto">

            {/* Done toggle — today + edit mode only */}
            {!isNewItem && isToday && (
              <button
                onClick={() => setDraft((d) => ({ ...d, done: !d.done }))}
                className={`w-full flex items-center gap-3 rounded-2xl px-4 py-3 border-2 transition-all ${
                  draft.done
                    ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                    : "bg-slate-50 border-slate-200 text-slate-500"
                }`}
              >
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-none transition-all ${
                  draft.done ? "bg-emerald-500 border-emerald-500" : "border-slate-300"
                }`}>
                  {draft.done && <span className="text-white text-xs font-bold">✓</span>}
                </div>
                <span className="text-sm font-semibold">
                  {draft.done ? "Marked as done" : "Mark as done"}
                </span>
              </button>
            )}

            {/* Emoji + Title row */}
            <div className="flex gap-3 items-start">
              <button
                onClick={() => emojiInputRef.current?.focus()}
                className="w-14 h-14 rounded-2xl border-2 border-slate-200 flex items-center justify-center text-3xl flex-none hover:border-slate-400 transition-colors relative"
              >
                {draft.emoji || "📍"}
                <input
                  ref={emojiInputRef}
                  type="text"
                  value={draft.emoji}
                  onChange={(e) => {
                    const val = e.target.value;
                    // Keep only the last character typed (new emoji)
                    const chars = [...val];
                    setDraft((d) => ({ ...d, emoji: chars[chars.length - 1] ?? d.emoji }));
                  }}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  maxLength={4}
                />
              </button>

              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Activity</p>
                <input
                  type="text"
                  value={draft.title}
                  onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                  placeholder="What are you doing?"
                  autoFocus={isNewItem}
                  className="w-full text-sm font-semibold text-slate-900 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-slate-900 bg-white"
                />
              </div>
            </div>

            {/* Time */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Time</p>
              <input
                type="text"
                value={draft.time}
                onChange={(e) => setDraft((d) => ({ ...d, time: e.target.value }))}
                placeholder="e.g. 2:00 PM"
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-slate-900 bg-white"
              />
            </div>

            {/* Notes */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Notes</p>
              <textarea
                value={draft.notes}
                onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                placeholder="Any details, tips, or reminders…"
                rows={2}
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-slate-900 bg-white resize-none"
              />
            </div>

            {/* Reservation flag */}
            <button
              onClick={() => setDraft((d) => ({ ...d, reservation: !d.reservation }))}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 border transition-all ${
                draft.reservation
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
              }`}
            >
              <span className="text-base">🗓</span>
              <span className="text-sm font-semibold">
                {draft.reservation ? "Reservation (tap to remove)" : "Flag as reservation"}
              </span>
            </button>

            {/* Delete confirm */}
            {!isNewItem && sheetDeleteConfirm && (
              <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex flex-col gap-2">
                <p className="text-sm font-bold text-red-700">Delete this activity?</p>
                <p className="text-xs text-red-500">This can&apos;t be undone.</p>
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={deleteItem}
                    disabled={sheetSaving}
                    className="flex-1 bg-red-500 text-white text-sm font-bold py-2.5 rounded-xl disabled:opacity-50"
                  >
                    {sheetSaving ? "Deleting…" : "Yes, delete"}
                  </button>
                  <button
                    onClick={() => setSheetDeleteConfirm(false)}
                    className="px-4 text-sm font-semibold text-slate-500 border border-slate-200 rounded-xl"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action bar — always visible, never clipped */}
          <div className="px-5 pt-3 pb-8 flex gap-3 border-t border-slate-100 flex-none">
            {!isNewItem && !sheetDeleteConfirm && (
              <button
                onClick={() => setSheetDeleteConfirm(true)}
                className="px-4 py-3 text-sm font-bold text-red-500 border border-red-200 rounded-2xl hover:bg-red-50 transition-colors"
              >
                Delete
              </button>
            )}
            <button
              onClick={isNewItem ? addItem : saveEdit}
              disabled={sheetSaving || !draft.title.trim()}
              className="flex-1 bg-slate-900 text-white font-bold py-3.5 rounded-2xl text-sm disabled:opacity-40 transition-opacity"
            >
              {sheetSaving
                ? (isNewItem ? "Adding…" : "Saving…")
                : (isNewItem ? "Add Activity" : "Save Changes")}
            </button>
          </div>
        </div>
      </div>

      {/* ── Hero (with embedded navigation) ── */}
      <div className="relative h-56 w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={day.hero}
          alt={day.heroAlt}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/20" />

        <div className="absolute top-0 left-0 right-0 px-4 pt-3 flex items-center justify-between">
          <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">My Day</span>
          <span className="text-[10px] font-semibold text-white/60 uppercase tracking-widest">
            Day {day.dayNum} of {DAYS.length}
          </span>
        </div>

        {dayIndex > 0 && (
          <button
            onClick={() => setDayIndex((i) => i - 1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-black/25 backdrop-blur-sm border border-white/20 text-white text-lg font-bold hover:bg-black/40 transition-all"
          >
            ‹
          </button>
        )}

        {dayIndex < DAYS.length - 1 && (
          <button
            onClick={() => setDayIndex((i) => i + 1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-black/25 backdrop-blur-sm border border-white/20 text-white text-lg font-bold hover:bg-black/40 transition-all"
          >
            ›
          </button>
        )}

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

        {(() => {
          // Per-day weather: use live current for today, forecast entry for other days
          const dayISO = getDayISO(day.dayNum);
          const forecastEntry = weather?.forecast?.find((f) => f.date === dayISO) ?? null;
          const viewWeather = forecastEntry ?? (isToday && weather ? {
            high: weather.high, low: weather.low,
            emoji: weather.emoji, condition: weather.condition,
            precipChance: 0, uvIndex: 0,
          } : null);
          const displayTemp = isToday && weather ? `${weather.temp}°F` : (viewWeather ? `${viewWeather.high}°F` : day.temp);
          const displayEmoji = viewWeather?.emoji ?? day.weatherEmoji;
          const displayCond = viewWeather?.condition ?? day.condition;

          return (
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

                {/* Weather pill — richer with Hi/Lo */}
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-2xl px-3 py-2 border border-white/20 text-left">
                  <span className="text-2xl leading-none">{displayEmoji}</span>
                  <div>
                    <div className="flex items-baseline gap-1">
                      <p className="text-base font-black text-white leading-none">{displayTemp}</p>
                      {weather?.source === "live" && isToday && (
                        <span className="text-[9px] text-white/50 font-semibold">live</span>
                      )}
                    </div>
                    <p className="text-[10px] text-white/70 mt-0.5 leading-none">{displayCond}</p>
                    {viewWeather && (
                      <p className="text-[9px] text-white/50 mt-0.5 leading-none">
                        H:{viewWeather.high}° L:{viewWeather.low}°
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ── Weather detail strip ── */}
      {(() => {
        const dayISO = getDayISO(day.dayNum);
        const forecastEntry = weather?.forecast?.find((f) => f.date === dayISO) ?? null;
        const viewWeather = forecastEntry ?? (isToday && weather ? {
          high: weather.high, low: weather.low,
          emoji: weather.emoji, condition: weather.condition,
          precipChance: 0, uvIndex: 0, note: undefined,
        } : null);
        if (!viewWeather) return null;

        const uvColor = viewWeather.uvIndex >= 11 ? "text-purple-600"
          : viewWeather.uvIndex >= 8 ? "text-red-500"
          : viewWeather.uvIndex >= 6 ? "text-orange-500"
          : "text-amber-500";

        return (
          <div className="flex items-center gap-0 border-b border-slate-100 bg-white">
            {/* Temp + condition */}
            <div className="flex-1 flex items-center gap-2.5 px-4 py-2.5">
              <span className="text-xl">{viewWeather.emoji}</span>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-black text-slate-900">
                    {isToday && weather ? `${weather.temp}°` : `${viewWeather.high}°`}
                  </span>
                  <span className="text-xs text-slate-400">H:{viewWeather.high}° L:{viewWeather.low}°</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-none">{viewWeather.condition}</p>
              </div>
            </div>

            {/* Divider */}
            <div className="w-px h-8 bg-slate-100" />

            {/* Stats */}
            <div className="flex items-center gap-3 px-4 py-2.5">
              {/* Precip */}
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-base">🌧️</span>
                <p className="text-[10px] font-bold text-slate-600">{viewWeather.precipChance}%</p>
              </div>
              {/* UV */}
              {viewWeather.uvIndex > 0 && (
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-base">☀️</span>
                  <p className={`text-[10px] font-bold ${uvColor}`}>UV {viewWeather.uvIndex}</p>
                </div>
              )}
              {/* Humidity (today only with live data) */}
              {isToday && weather?.humidity && (
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-base">💧</span>
                  <p className="text-[10px] font-bold text-slate-600">{weather.humidity}%</p>
                </div>
              )}
            </div>

            {/* Source badge */}
            <div className="pr-3 flex flex-col items-end gap-1">
              {weather?.source === "live" && isToday ? (
                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                  Live
                </span>
              ) : (
                <span className="text-[9px] font-semibold text-slate-400 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded-full">
                  Typical
                </span>
              )}
              {viewWeather.note && (
                <span className="text-[9px] text-amber-600 font-semibold text-right leading-tight max-w-[64px]">
                  {viewWeather.note}
                </span>
              )}
            </div>
          </div>
        );
      })()}

      <div className="flex flex-col gap-4 px-4 pt-4 pb-4">

        {/* ── Trip Countdown (pre-trip only) — compact strip ── */}
        {tripInfo?.status === "upcoming" && tripInfo.daysUntilTrip > 0 && (
          <div className="flex items-center gap-3 bg-white border border-slate-100 rounded-2xl px-3 py-2.5 shadow-sm">
            {/* Thumbnail */}
            <div className="relative flex-none w-11 h-11 rounded-xl overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=120&h=120&fit=crop&q=80"
                alt="Maui"
                className="w-full h-full object-cover"
              />
            </div>
            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 leading-tight">✈ Maui, Hawaii</p>
              <p className="text-xs text-slate-400 leading-tight mt-0.5">Jun 5–11 · 4 travelers</p>
            </div>
            {/* Pill */}
            <div className="flex-none flex flex-col items-center bg-sky-50 border border-sky-100 rounded-xl px-3 py-1.5">
              <span className="text-lg font-black text-sky-600 leading-none tabular-nums">{tripInfo.daysUntilTrip}</span>
              <span className="text-[9px] font-semibold text-sky-400 uppercase tracking-wide leading-none mt-0.5">days</span>
            </div>
          </div>
        )}

        {/* ── Smart weather alert (all days, uses per-day forecast) ── */}
        {!isPast && (() => {
          const dayISO = getDayISO(day.dayNum);
          const forecastEntry = weather?.forecast?.find((f) => f.date === dayISO) ?? null;
          const alertWeather: WeatherForAlert | null = forecastEntry ?? (isToday && weather
            ? { condition: weather.condition, high: weather.high, precipChance: 0 }
            : null);
          const alert = getWeatherAlert(alertWeather, items, isToday);
          if (!alert) return null;
          const isWarning = alert.type === "warning";
          return (
            <div className={`flex items-start gap-3 rounded-2xl px-4 py-3.5 border ${
              isWarning ? "bg-amber-50 border-amber-200" : "bg-sky-50 border-sky-100"
            }`}>
              <span className="text-xl flex-none">{alert.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-bold mb-0.5 ${isWarning ? "text-amber-800" : "text-sky-800"}`}>
                  {alert.title}
                </p>
                <p className={`text-xs leading-snug ${isWarning ? "text-amber-700" : "text-sky-600"}`}>
                  {alert.body}
                </p>
              </div>
              {isWarning && (
                <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded-full flex-none">
                  Heads up
                </span>
              )}
            </div>
          );
        })()}

        {/* ── Pre-trip Smart Readiness Panel ── */}
        {tripInfo?.status === "upcoming" && tripInfo.daysUntilTrip > 0 && (
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-4 pt-4 pb-3 border-b border-slate-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Before You Go</p>
                  <p className="text-sm font-black text-slate-900">Trip Readiness</p>
                </div>
                <div className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                  (packingProgress.packed / packingProgress.total) > 0.8 && (docReadiness?.confirmed === docReadiness?.total)
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}>
                  {tripInfo.daysUntilTrip} days left
                </div>
              </div>
            </div>

            {/* Readiness items */}
            <div className="px-4 py-3 flex flex-col gap-3">

              {/* Packing */}
              <button onClick={() => router.push("/packing")} className="flex items-center gap-3 w-full text-left group">
                <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center flex-none text-lg">🧳</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-bold text-slate-700">Packing list</p>
                    <p className="text-[10px] font-semibold text-slate-500">
                      {packingProgress.packed}/{packingProgress.total}
                    </p>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        packingProgress.packed === packingProgress.total ? "bg-emerald-500" : "bg-sky-500"
                      }`}
                      style={{ width: `${Math.round((packingProgress.packed / packingProgress.total) * 100)}%` }}
                    />
                  </div>
                </div>
                <span className="text-slate-300 group-hover:text-slate-500 text-sm flex-none">›</span>
              </button>

              {/* Docs */}
              {docReadiness && (
                <button onClick={() => router.push("/vault")} className="flex items-center gap-3 w-full text-left group">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-none text-lg">📋</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-bold text-slate-700">Docs & reservations</p>
                      <p className="text-[10px] font-semibold text-slate-500">
                        {docReadiness.confirmed}/{docReadiness.total} confirmed
                      </p>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          docReadiness.confirmed === docReadiness.total ? "bg-emerald-500" : "bg-amber-500"
                        }`}
                        style={{ width: `${Math.round((docReadiness.confirmed / docReadiness.total) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-slate-300 group-hover:text-slate-500 text-sm flex-none">›</span>
                </button>
              )}

              {/* Smart reminders based on days away */}
              <div className="bg-slate-50 rounded-xl px-3 py-2.5 flex flex-col gap-2">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Smart reminders</p>
                {tripInfo.daysUntilTrip <= 3 && (
                  <div className="flex items-start gap-2">
                    <span className="text-base flex-none">🚨</span>
                    <p className="text-[11px] text-slate-700 leading-snug">Check in online for AA271 — opens 24 hrs before departure</p>
                  </div>
                )}
                {tripInfo.daysUntilTrip <= 7 && (
                  <div className="flex items-start gap-2">
                    <span className="text-base flex-none">🗺️</span>
                    <p className="text-[11px] text-slate-700 leading-snug">Download offline maps for Road to Hana — cell service drops along the route</p>
                  </div>
                )}
                {tripInfo.daysUntilTrip <= 14 && (
                  <div className="flex items-start gap-2">
                    <span className="text-base flex-none">💳</span>
                    <p className="text-[11px] text-slate-700 leading-snug">Alert your bank and credit cards about Hawaii travel</p>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <span className="text-base flex-none">🌡️</span>
                  <p className="text-[11px] text-slate-700 leading-snug">Forecast for Jun 5–11: 78–84°F, mix of sun and showers — typical for Maui</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Next Up (today only) ── */}
        {nextUp && isToday && (() => {
          const nextMins = nextUp.time && nextUp.time !== "TBD" ? timeToMinutes(nextUp.time) : null;
          const minsAway = nextMins !== null ? Math.max(0, nextMins - currentMins) : null;
          const isUrgent = minsAway !== null && minsAway <= 15;
          const isWarning = minsAway !== null && minsAway <= 60;
          const timeLabel = minsAway === null ? "Scheduled"
            : minsAway === 0 ? "Now!"
            : minsAway < 60 ? `${minsAway} min away`
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
                <p className={`text-[10px] ${mutedText}`}>{isUrgent ? "🚨 Leaving soon!" : isWarning ? "⏰ Coming up" : "Up next"}</p>
                <p className="text-xl font-bold">{timeLabel}</p>
                {!isUrgent && !isWarning && minsAway !== null && minsAway > 60 && (
                  <p className={`text-[10px] ${mutedText}`}>{nextUp.time}</p>
                )}
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
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Vibe Check</p>
              {selectedMood && (
                <span className="text-[10px] font-semibold text-slate-500">{selectedMood} selected</span>
              )}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {MOODS.map((m) => {
                const isSelected = selectedMood === m.label;
                return (
                  <button
                    key={m.label}
                    onClick={() => setSelectedMood(isSelected ? null : m.label)}
                    className={`flex-none flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-full whitespace-nowrap transition-all ${
                      isSelected
                        ? "bg-slate-900 text-white shadow-md scale-105"
                        : `${m.color} opacity-80`
                    }`}
                  >
                    {m.emoji} {m.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Time Sections ── */}
        {sections.map((section) => {
          const doneCount = section.items.filter((i) => i.done).length;
          const sectionProgress = section.items.length > 0 ? doneCount / section.items.length : 0;
          const allDone = doneCount === section.items.length && section.items.length > 0;
          return (
            <div key={section.key}>
              <div className="flex items-center gap-2.5 mb-3">
                <span className="text-base">{section.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-800">{section.label}</span>
                      <span className="text-[11px] text-slate-400">{section.range}</span>
                    </div>
                    <span className={`text-[10px] font-bold ${allDone ? "text-emerald-600" : "text-slate-400"}`}>
                      {allDone ? "✓ Done" : `${doneCount}/${section.items.length}`}
                    </span>
                  </div>
                  {isToday && section.items.length > 0 && (
                    <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${allDone ? "bg-emerald-500" : section.key === "morning" ? "bg-amber-400" : section.key === "afternoon" ? "bg-sky-400" : "bg-indigo-400"}`}
                        style={{ width: `${sectionProgress * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col">
                {section.items.map((item, idx) => {
                  const next = section.items[idx + 1];
                  const gap = next ? timeToMinutes(next.time) - timeToMinutes(item.time) : null;
                  return (
                    <div key={item.id} className="flex flex-col">
                      {/* ── Item card — split zones ── */}
                      <div
                        className={`flex items-stretch bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
                          item.done ? "opacity-50 border-slate-100" : "border-slate-100 hover:border-slate-200 hover:shadow-md"
                        } ${item.reservation ? "ring-1 ring-slate-900" : ""}`}
                      >
                        {/* Left + Center: tap to edit (today + upcoming) */}
                        <button
                          onClick={() => isEditable ? openEdit(item) : undefined}
                          disabled={!isEditable}
                          className={`flex-1 min-w-0 flex items-stretch gap-3 text-left ${isEditable ? "cursor-pointer" : "cursor-default"}`}
                        >
                          <div className="flex flex-col items-center justify-start pt-3 pl-3 w-14 flex-none">
                            <span className="text-xl">{item.emoji}</span>
                            <span className="text-[10px] text-slate-400 mt-1 text-center leading-tight font-medium">{item.time}</span>
                          </div>
                          <div className="flex-1 min-w-0 py-3 pr-2">
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
                        </button>

                        {/* Right: photo (decorative) or done-toggle button */}
                        {item.photo ? (
                          <button
                            onClick={() => toggle(item.id)}
                            disabled={!isToday}
                            className={`relative w-20 h-[72px] flex-none overflow-hidden ${isToday ? "cursor-pointer" : "cursor-default"}`}
                            title={isToday ? (item.done ? "Mark undone" : "Mark done") : undefined}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.photo}
                              alt={item.photoAlt ?? item.title}
                              className={`w-full h-full object-cover transition-all ${item.done || isPast ? "grayscale" : ""}`}
                            />
                            {/* Done overlay on photo */}
                            {isToday && (
                              <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${item.done ? "opacity-100 bg-black/40" : "opacity-0 hover:opacity-100 bg-black/20"}`}>
                                <div className={`w-7 h-7 rounded-full border-2 border-white flex items-center justify-center ${item.done ? "bg-white" : "bg-transparent"}`}>
                                  {item.done && <span className="text-slate-900 text-xs font-bold">✓</span>}
                                </div>
                              </div>
                            )}
                          </button>
                        ) : (
                          <button
                            onClick={() => toggle(item.id)}
                            disabled={!isToday}
                            className={`flex items-center pr-4 pl-2 ${isToday ? "cursor-pointer" : "cursor-default"}`}
                          >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-none transition-colors ${
                              item.done ? "bg-slate-900 border-slate-900" : "border-slate-300"
                            }`}>
                              {item.done && <span className="text-white text-[10px] leading-none">✓</span>}
                            </div>
                          </button>
                        )}
                      </div>

                      {gap !== null && (
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2 px-4 py-1.5">
                            <div className="flex flex-col items-center gap-0.5">
                              <div className="w-0.5 h-2 rounded-full bg-slate-300" />
                              <div className="w-0.5 h-2 rounded-full bg-slate-200" />
                              <div className="w-0.5 h-2 rounded-full bg-slate-100" />
                            </div>
                            <span className="text-xs font-medium text-slate-400">
                              {formatGap(gap)} until {next?.title.split("–")[0].trim()}
                            </span>
                          </div>
                          {(() => {
                            const suggestion = getGapSuggestion(item.time, gap, wishlist);
                            if (!suggestion) return null;
                            return (
                              <button
                                onClick={() => router.push("/explore")}
                                className={`mx-4 mb-1.5 flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-left transition-colors ${
                                  suggestion.fromWishlist
                                    ? "bg-amber-50 border border-amber-100 hover:bg-amber-100"
                                    : "bg-sky-50 border border-sky-100 hover:bg-sky-100"
                                }`}
                              >
                                <span className="text-lg flex-none">{suggestion.emoji}</span>
                                <div className="flex-1 min-w-0">
                                  {suggestion.fromWishlist && (
                                    <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest mb-0.5">From your saved list</p>
                                  )}
                                  <p className={`text-[11px] font-bold leading-tight ${suggestion.fromWishlist ? "text-amber-900" : "text-sky-800"}`}>
                                    {suggestion.fromWishlist ? suggestion.name : `Perfect gap for ${suggestion.name}`}
                                  </p>
                                  <p className={`text-[10px] mt-0.5 ${suggestion.fromWishlist ? "text-amber-600" : "text-sky-500"}`}>{suggestion.note}</p>
                                </div>
                                <span className={`text-sm flex-none ${suggestion.fromWishlist ? "text-amber-300" : "text-sky-300"}`}>→</span>
                              </button>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* ── Add activity to this section ── */}
              {isEditable && (
                <button
                  onClick={() => openAdd(section.defaultTime)}
                  className="mt-2 w-full flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-600 py-2 px-2 rounded-xl hover:bg-slate-50 transition-all group"
                >
                  <div className="w-5 h-5 rounded-full border-[1.5px] border-slate-300 group-hover:border-slate-500 flex items-center justify-center text-xs leading-none font-bold transition-colors">
                    +
                  </div>
                  Add to {section.label.toLowerCase()}
                </button>
              )}
            </div>
          );
        })}

        {/* ── Add to today / Explore CTA ── */}
        {isEditable && (
          <button
            onClick={() => router.push("/explore")}
            className="w-full relative overflow-hidden rounded-2xl text-left group"
            style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #0c4a6e 100%)" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=200&fit=crop&q=70"
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-20"
            />
            <div className="relative flex items-center gap-4 px-4 py-4">
              <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-lg flex-none">
                🔍
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-white">Discover something to add</p>
                <p className="text-xs text-white/60 mt-0.5">Beaches, restaurants & activities nearby</p>
              </div>
              <span className="text-white/50 group-hover:text-white/80 transition-colors text-lg">→</span>
            </div>
          </button>
        )}

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

        {/* ── Crew ── */}
        {crewMembers.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                {isPast ? "Who Was There" : "Who's Coming"}
              </p>
              <button
                onClick={() => router.push("/chat")}
                className="text-[10px] font-semibold text-sky-600"
              >
                Manage crew →
              </button>
            </div>
            <div className="flex gap-3 flex-wrap">
              {crewMembers.map((p) => (
                <button
                  key={p.name}
                  onClick={() => router.push("/chat")}
                  className="flex flex-col items-center gap-1"
                >
                  {p.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.avatar_url} alt={p.name} className="w-11 h-11 rounded-full object-cover" />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-sky-100 flex items-center justify-center text-xl">
                      {p.avatar}
                    </div>
                  )}
                  <span className="text-xs text-slate-500">{p.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
