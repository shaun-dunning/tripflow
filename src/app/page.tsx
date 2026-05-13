"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getTripDateInfo } from "@/lib/tripDates";
import { loadWishlist, type WishlistEntry } from "@/lib/wishlist";
import { useExploreContext } from "@/lib/exploreContext";
import { SortableAgendaSections, type Section as DndSection, getMapsInfo, SHERATON } from "@/components/SortableAgendaSection";
import { ResilientState } from "@/components/ResilientState";
import TripAccessGate from "@/components/TripAccessGate";
import { useAuth } from "@/hooks/useAuth";
import { useTripMembership } from "@/hooks/useTripMembership";
import { TRIP_ID } from "@/lib/tripConfig";

function timeToMinutes(t: string): number {
  if (!t || t === "TBD" || t === "tbd") return -1; // TBD items sort to top of Morning
  const [time, mer] = t.split(" ");
  const parts = time.split(":").map(Number);
  let h = parts[0];
  const m = parts[1] ?? 0;
  if (isNaN(h) || isNaN(m)) return -1;
  if (mer === "PM" && h !== 12) h += 12;
  if (mer === "AM" && h === 12) h = 0;
  return h * 60 + m;
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
  sourceDocId?: string;
  sourceLabel?: string;
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

// ── Hero image picker: keyword-matched so the photo updates when themes change ──
const THEME_PHOTOS: { keywords: string[]; url: string; alt: string }[] = [
  {
    keywords: ["travel", "fly", "flight", "airport", "depart", "return", "home"],
    url: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&h=500&fit=crop&q=85",
    alt: "Airport terminal",
  },
  {
    keywords: ["beach", "snorkel", "swim", "ocean", "ka'anapali", "surf", "paddle", "kayak", "dive", "water", "coast"],
    url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=500&fit=crop&q=85",
    alt: "Beautiful Maui beach",
  },
  {
    keywords: ["hana", "waterfall", "road", "jungle", "forest", "lush", "hike", "trail", "rainforest", "bamboo"],
    url: "https://images.unsplash.com/photo-1542259009477-d625272157b7?w=800&h=500&fit=crop&q=85",
    alt: "Road to Hana",
  },
  {
    keywords: ["spa", "relax", "massage", "wellness", "resort", "rest", "pool"],
    url: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&h=500&fit=crop&q=85",
    alt: "Spa and pool",
  },
  {
    keywords: ["haleakala", "volcano", "sunrise", "summit", "crater", "bike", "downhill"],
    url: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&h=500&fit=crop&q=85",
    alt: "Haleakalā sunrise",
  },
  {
    keywords: ["luau", "dinner", "dining", "restaurant", "food", "lunch", "breakfast", "eat", "market", "farm"],
    url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=500&fit=crop&q=85",
    alt: "Hawaiian dining",
  },
  {
    keywords: ["snorkeling", "reef", "fish", "molokini", "turtle"],
    url: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&h=500&fit=crop&q=85",
    alt: "Snorkeling",
  },
  {
    keywords: ["sunset", "golden hour", "evening", "sky"],
    url: "https://images.unsplash.com/photo-1472396961693-142e6e269027?w=800&h=500&fit=crop&q=85",
    alt: "Maui sunset",
  },
  {
    keywords: ["shopping", "paia", "lahaina", "town", "explore", "upcountry", "market"],
    url: "https://images.unsplash.com/photo-1471922694854-ff1b63b20054?w=800&h=500&fit=crop&q=85",
    alt: "Maui island",
  },
];

const FALLBACK_HEROES = [
  { url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=500&fit=crop&q=85", alt: "Maui beach" },
  { url: "https://images.unsplash.com/photo-1471922694854-ff1b63b20054?w=800&h=500&fit=crop&q=85", alt: "Tropical island" },
  { url: "https://images.unsplash.com/photo-1542259009477-d625272157b7?w=800&h=500&fit=crop&q=85", alt: "Maui scenery" },
];

function getHeroForTheme(theme: string, dayNum: number): { url: string; alt: string } {
  const lower = theme.toLowerCase();
  for (const photo of THEME_PHOTOS) {
    if (photo.keywords.some((k) => lower.includes(k))) return photo;
  }
  return FALLBACK_HEROES[(dayNum - 1) % FALLBACK_HEROES.length];
}

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
const AGENDA_DOC_CATEGORIES = new Set(["Flights", "Hotel", "Car", "Activities", "Dining"]);
const DOC_CATEGORY_EMOJI: Record<string, string> = {
  Flights: "✈️",
  Hotel: "🏨",
  Car: "🚙",
  Activities: "🎟️",
  Dining: "🍽️",
};

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
  const time = tMatch ? `${tMatch[1]}:${tMatch[2]} ${tMatch[3].toUpperCase()}` : "TBD";
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

// Sentinel prefix for optimistically-created items not yet in DB
const NEW_ID_PREFIX = "optimistic-";

function getStoredDayIndex(): number {
  if (typeof window === "undefined") return 0;
  const saved = localStorage.getItem("tripflow-dayIndex");
  if (saved === null) return 0;
  const idx = parseInt(saved, 10);
  return !isNaN(idx) && idx >= 0 && idx < DAYS.length ? idx : 0;
}

export default function MyDayPage() {
  const router = useRouter();
  const { user } = useAuth();
  const membership = useTripMembership(user);
  const { pendingItem, setPendingItem } = useExploreContext();
  const [currentMins, setCurrentMins] = useState(nowMinutes);
  const [wishlist, setWishlist] = useState<WishlistEntry[]>([]);
  const [todayDayIndex, setTodayDayIndex] = useState(0);
  const [dayIndex, setDayIndex] = useState(getStoredDayIndex);
  const savedDayRestored = useRef(dayIndex !== 0);
  const [agendas, setAgendas] = useState(() => DAYS.map((d) => d.agenda));
  // Move-to-day sheet
  const [showMoveSheet, setShowMoveSheet] = useState(false);
  const [crewMembers, setCrewMembers] = useState<{ name: string; avatar: string; avatar_url: string | null }[]>([]);
  const [weather, setWeather] = useState<LiveWeather | null>(null);
  // day_number → trip_day_id (for Supabase writes)
  const [dayIdMap, setDayIdMap] = useState<Record<number, string>>({});
  // day_number → editable label stored in trip_days.label
  const [dayLabels, setDayLabels] = useState<Record<number, string>>({});
  // inline theme editor
  const [editingTheme, setEditingTheme] = useState(false);
  const [themeInput, setThemeInput] = useState("");
  const [tripInfo, setTripInfo] = useState<{ status: "upcoming" | "active" | "completed"; daysUntilTrip: number } | null>(null);

  // Pre-trip readiness
  const [packingProgress, setPackingProgress] = useState<{ packed: number; total: number }>({ packed: 0, total: 46 });
  const [docReadiness, setDocReadiness] = useState<{ confirmed: number; total: number } | null>(null);

  // Loading / pull-to-refresh
  const [loading, setLoading] = useState(true);
  const [loadIssue, setLoadIssue] = useState<string | null>(null);
  const [weatherIssue, setWeatherIssue] = useState(false);
  const [actionIssue, setActionIssue] = useState<string | null>(null);
  const [pullDistance, setPullDistance] = useState(0);  // visual only
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const fetchDataRef = useRef<(() => Promise<void>) | null>(null);
  const pullStartY = useRef<number | null>(null);
  const pullDistanceRef = useRef(0);  // for logic in touch handlers (no re-render cost)
  const isPulling = useRef(false);

  // Vibe check
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  // Day route sheet
  const [showRouteSheet, setShowRouteSheet] = useState(false);

  // AI day-planner
  const [aiPlannerOpen, setAiPlannerOpen] = useState(false);
  const [aiPlannerLoading, setAiPlannerLoading] = useState(false);
  const [aiPlannerReply, setAiPlannerReply] = useState<string | null>(null);

  // Edit / add sheet
  const [sheetItem, setSheetItem] = useState<Item | null>(null);
  const [draft, setDraft] = useState<Item>({ id: "", time: "", title: "", emoji: "📍", done: false, notes: "" });
  const [sheetSaving, setSheetSaving] = useState(false);
  const [sheetDeleteConfirm, setSheetDeleteConfirm] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const emojiInputRef = useRef<HTMLInputElement>(null);

  // Use explicit flag rather than id-prefix check so that optimistically-added
  // items that failed to persist are still treated as editable (not new).
  const isNewItem = isAddingNew;

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

  // Pick up any item bridged from Explore and inject it immediately.
  useEffect(() => {
    // Consume a pending item passed from the Explore tab
    const bridgeStr = localStorage.getItem("tripflow-explore-add");
    if (bridgeStr) {
      localStorage.removeItem("tripflow-explore-add");
      try {
        const bridged = JSON.parse(bridgeStr) as {
          dayIndex: number; id: string; title: string; emoji: string;
          time: string; notes: string; done: boolean; reservation: boolean; fromSupabase: boolean;
        };
        if (bridged.dayIndex >= 0 && bridged.dayIndex < DAYS.length) {
          queueMicrotask(() => {
            setAgendas((prev) =>
              prev.map((agenda, i) =>
                i === bridged.dayIndex
                  ? [...agenda.filter((a) => a.title !== bridged.title), {
                      id: bridged.id,
                      title: bridged.title,
                      emoji: bridged.emoji,
                      time: bridged.time,
                      notes: bridged.notes,
                      done: bridged.done,
                      reservation: bridged.reservation,
                      fromSupabase: bridged.fromSupabase,
                    }]
                  : agenda
              )
            );
          });
        }
      } catch { /* ignore bad data */ }
    }
  }, []);

  // Persist dayIndex whenever it changes
  useEffect(() => {
    localStorage.setItem("tripflow-dayIndex", String(dayIndex));
  }, [dayIndex]);

  // Consume an item pushed from the Explore tab via shared layout context.
  // This fires any time pendingItem changes — works even when My Day is
  // served from the Next.js router cache and never fully remounts.
  useEffect(() => {
    if (!pendingItem) return;
    const { dayIndex: targetDay, ...item } = pendingItem;
    if (targetDay >= 0 && targetDay < DAYS.length) {
      queueMicrotask(() => {
        setDayIndex(targetDay);
        setAgendas((prev) =>
          prev.map((agenda, i) =>
            i === targetDay
              ? [...agenda.filter((a) => a.title !== item.title), {
                  id: item.id,
                  title: item.title,
                  emoji: item.emoji,
                  time: item.time,
                  notes: item.notes,
                  done: item.done,
                  reservation: item.reservation,
                  fromSupabase: true,
                }]
              : agenda
          )
        );
      });
    }
    setPendingItem(null); // clear so it doesn't fire again
  }, [pendingItem, setPendingItem]);

  useEffect(() => {
    if (membership.isChecking) return;
    if (!membership.isMember) {
      return;
    }

    fetch("/api/weather")
      .then((r) => r.json())
      .then((data) => setWeather(data))
      .catch(() => setWeatherIssue(true));

    async function fetchData() {
      setLoadIssue(null);
      try {
        const [tripResult, travelersResult, agendaResult, tripDaysResult, docsResult] = await Promise.all([
          supabase.from("trips").select("start_date, end_date").eq("id", TRIP_ID).maybeSingle(),
          supabase.from("travelers").select("name, avatar, avatar_url").eq("trip_id", TRIP_ID).order("created_at"),
          supabase.from("agenda_items").select("*").order("sort_order", { ascending: true }),
          supabase.from("trip_days").select("id, day_number, label").eq("trip_id", TRIP_ID),
          supabase.from("documents")
            .select("id, category, name, emoji, date, notes, confirmation, provider, status")
            .eq("trip_id", TRIP_ID),
        ]);

        const blockingError = agendaResult.error ?? tripDaysResult.error;
        if (blockingError) {
          setLoadIssue(blockingError.message);
          setLoading(false);
          return;
        }


        if (docsResult.data?.length) {
          const confirmed = docsResult.data.filter((d) => d.status === "confirmed").length;
          setDocReadiness({ confirmed, total: docsResult.data.length });
        }

        if (tripResult.data) {
          const info = getTripDateInfo(tripResult.data.start_date, tripResult.data.end_date);
          setTripInfo({ status: info.status, daysUntilTrip: info.daysUntilTrip });
          const idx = Math.max(0, Math.min(info.currentDayNumber - 1, DAYS.length - 1));
          setTodayDayIndex(idx);
          // Only auto-jump to today if user hasn't manually selected a day
          if (!savedDayRestored.current) setDayIndex(idx);
        }

        if (travelersResult.data?.length) {
          setCrewMembers(travelersResult.data.map((t) => ({
            name: t.name,
            avatar: t.avatar,
            avatar_url: t.avatar_url ?? null,
          })));
        }

      // Build dayIdMap and dayLabels for all days
        if (tripDaysResult.data) {
          const map: Record<number, string> = {};
          const labels: Record<number, string> = {};
          tripDaysResult.data.forEach((td) => {
            map[td.day_number] = td.id;
            if (td.label) {
            // Strip "Day N · " prefix if present, keep just the description
            const parts = (td.label as string).split(" · ");
            labels[td.day_number] = parts.length > 1 ? parts.slice(1).join(" · ") : td.label;
            }
          });
          setDayIdMap(map);
          setDayLabels(labels);
        }

      // Build agenda from Supabase agenda_items, then overlay doc-sourced reservations
        {
          const byDay: Record<string, NonNullable<typeof agendaResult.data>> = {};
          (agendaResult.data ?? []).forEach((item) => {
            if (!byDay[item.trip_day_id]) byDay[item.trip_day_id] = [];
            byDay[item.trip_day_id].push(item);
          });

        // Dated Vault docs → linked agenda items. They open back to Vault
        // instead of behaving like editable agenda rows.
        const docItems: Array<{ dayIndex: number; item: Item }> = [];
        (docsResult.data ?? [])
          .filter((d) => AGENDA_DOC_CATEGORIES.has(d.category))
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
                emoji: doc.emoji ?? DOC_CATEGORY_EMOJI[doc.category] ?? "📍",
                done: doc.status === "completed",
                notes: notesParts.join(" · "),
                reservation: true,
                fromSupabase: false,
                sourceDocId: doc.id,
                sourceLabel: doc.category,
              },
            });
          });

        // Build fresh agendas: start with mock data as fallback,
        // replace each day with Supabase items where they exist.
        // Using a direct value (not functional form) to guarantee React
        // sees the new reference and re-renders.
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

        const fresh: Item[][] = DAYS.map((d) => [...d.agenda]);

        // Layer 1 — Supabase agenda_items replace mock data day-by-day
        (tripDaysResult.data ?? []).forEach((td) => {
          const idx = td.day_number - 1;
          if (idx < 0 || idx >= fresh.length) return;
          const items = byDay[td.id];
          if (items?.length) {
            fresh[idx] = items.map((ai) => ({
              id: ai.id,
              time: ai.time,
              title: ai.title,
              emoji: ai.emoji,
              done: ai.done,
              notes: ai.subtitle ?? "",
              reservation: ai.is_reservation,
              fromSupabase: true,
            }));
          }
        });

        // Layer 2 — doc-sourced reservations overlaid on top
        docItems.forEach(({ dayIndex, item }) => {
          if (dayIndex < 0 || dayIndex >= fresh.length) return;
          const existing = fresh[dayIndex];
          const normalize = (value: string) =>
            value
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, " ")
              .replace(/\b(the|and|of|at|by)\b/g, "")
              .replace(/\s+/g, " ")
              .trim();
          const titleLC = normalize(item.title);
          const dupe = existing.some(
            (e) => {
              if (e.id === item.id || e.sourceDocId === item.sourceDocId) return true;
              const existingTitle = normalize(e.title);
              return existingTitle.includes(titleLC) || titleLC.includes(existingTitle);
            },
          );
          if (dupe) return;
          fresh[dayIndex] = [...existing, item].sort((a, b) => {
            if (!a.time) return 1;
            if (!b.time) return -1;
            return toMins(a.time) - toMins(b.time);
          });
        });

          setAgendas(fresh);
        }
      } catch (err) {
        setLoadIssue(err instanceof Error ? err.message : "The trip could not be refreshed.");
      } finally {
        setLoading(false);
      }
    }
    fetchDataRef.current = fetchData;
    fetchData();

    // Re-fetch agenda any time the tab regains focus (e.g. returning from Explore)
    const handleFocus = () => fetchData();
    window.addEventListener("focus", handleFocus);

    // Custom event dispatched by Explore immediately before router.push("/").
    // window-level listeners fire even when My Day is in the Next.js router cache
    // (frozen components don't receive context/state updates, but window events always work).
    const handleExploreAdd = (e: Event) => {
      const item = (e as CustomEvent).detail as {
        dayIndex: number; id: string; title: string; emoji: string;
        time: string; notes: string; done: boolean; reservation: boolean;
      };
      if (item.dayIndex < 0 || item.dayIndex >= DAYS.length) return;
      setDayIndex(item.dayIndex);
      setAgendas((prev) =>
        prev.map((agenda, i) =>
          i === item.dayIndex
            ? [
                ...agenda.filter((a) => a.title !== item.title),
                {
                  id: item.id,
                  title: item.title,
                  emoji: item.emoji,
                  time: item.time,
                  notes: item.notes,
                  done: item.done,
                  reservation: item.reservation,
                  fromSupabase: false,
                },
              ]
            : agenda
        )
      );
    };
    window.addEventListener("tripflow:explore-add", handleExploreAdd);

    // Pull-to-refresh touch handlers
    const PULL_THRESHOLD = 64; // px of damped pull before release triggers refresh
    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY > 0) return; // only activate at the very top
      pullStartY.current = e.touches[0].clientY;
      isPulling.current = false;
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (pullStartY.current === null) return;
      const delta = e.touches[0].clientY - pullStartY.current;
      if (delta <= 0) { pullDistanceRef.current = 0; setPullDistance(0); return; }
      isPulling.current = true;
      const damped = Math.min(delta * 0.4, PULL_THRESHOLD + 16);
      pullDistanceRef.current = damped;
      setPullDistance(damped);
      if (damped > 8) e.preventDefault();
    };
    const handleTouchEnd = async () => {
      if (!isPulling.current || pullStartY.current === null) {
        pullStartY.current = null;
        pullDistanceRef.current = 0;
        setPullDistance(0);
        return;
      }
      pullStartY.current = null;
      const dist = pullDistanceRef.current;
      pullDistanceRef.current = 0;
      setPullDistance(0);
      isPulling.current = false;
      if (dist >= PULL_THRESHOLD * 0.4) {
        setPullRefreshing(true);
        await fetchDataRef.current?.();
        setPullRefreshing(false);
      }
    };
    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("tripflow:explore-add", handleExploreAdd);
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [membership.isChecking, membership.isMember]);

  const day = DAYS[dayIndex];
  const items = agendas[dayIndex];
  const sections = getSections(items);
  const isToday = dayIndex === todayDayIndex;
  const isPast = dayIndex < todayDayIndex;
  const isEditable = !isPast; // today and upcoming are editable

  // Derived: theme for the current day (Supabase label overrides mock)
  const currentTheme = dayLabels[day.dayNum] ?? day.theme;

  // Derived: ordered stops for the day route sheet
  const dayRouteStops = items
    .filter((i) => i.time && i.time !== "TBD")
    .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time))
    .map((i) => { const info = getMapsInfo(i.title); return info ? { ...i, ...info } : null; })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  // ── Save day theme ────────────────────────────────────────────────────────
  async function saveTheme() {
    const trimmed = themeInput.trim();
    setEditingTheme(false);
    if (!trimmed || trimmed === currentTheme) return;
    const tripDayId = dayIdMap[day.dayNum];
    if (tripDayId) {
      await supabase.from("trip_days")
        .update({ label: `Day ${day.dayNum} · ${trimmed}` })
        .eq("id", tripDayId);
    }
    setDayLabels((prev) => ({ ...prev, [day.dayNum]: trimmed }));
  }

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
      const { error } = await supabase.from("agenda_items").update({ done: !item.done }).eq("id", id);
      if (error) setActionIssue(error.message);
    }
  }

  // ── Sheet open/close ─────────────────────────────────────────────────────
  function openEdit(item: Item) {
    if (item.sourceDocId) {
      localStorage.setItem("tripflow-vault-focus-doc", item.sourceDocId);
      router.push("/vault");
      return;
    }
    setSheetDeleteConfirm(false);
    setIsAddingNew(false);
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
    setIsAddingNew(true);
    setSheetItem(newItem);
    setDraft({ ...newItem });
  }

  function closeSheet() {
    setSheetItem(null);
    setSheetDeleteConfirm(false);
    setIsAddingNew(false);
    setShowMoveSheet(false);
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
      const { error } = await supabase.from("agenda_items").update({
        title: draft.title,
        emoji: draft.emoji,
        time: draft.time,
        subtitle: draft.notes,
        is_reservation: draft.reservation ?? false,
        done: draft.done,
      }).eq("id", sheetItem.id);
      if (error) setActionIssue(error.message);
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
      const { data, error } = await supabase
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
      if (error) setActionIssue(error.message);
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
      const { error } = await supabase.from("agenda_items").delete().eq("id", sheetItem.id);
      if (error) setActionIssue(error.message);
    }
    setSheetSaving(false);
    closeSheet();
  }

  // ── Move item to a different day ──────────────────────────────────────────
  async function moveItemToDay(targetDayNum: number) {
    if (!sheetItem) return;
    const targetDayId = dayIdMap[targetDayNum];
    if (!targetDayId) return;
    const targetDayIndex = DAYS.findIndex((d) => d.dayNum === targetDayNum);
    if (targetDayIndex < 0) return;

    // Optimistic: remove from current day, add to target day
    const moved = { ...sheetItem };
    setAgendas((prev) =>
      prev.map((agenda, i) => {
        if (i === dayIndex) return agenda.filter((it) => it.id !== sheetItem.id);
        if (i === targetDayIndex) return [...agenda, moved];
        return agenda;
      })
    );

    if (sheetItem.fromSupabase) {
      const { error } = await supabase.from("agenda_items")
        .update({ trip_day_id: targetDayId })
        .eq("id", sheetItem.id);
      if (error) setActionIssue(error.message);
    }

    setShowMoveSheet(false);
    closeSheet();
  }

  // ── Live Now mode (today only) ────────────────────────────────────────────
  // Compute the most relevant item: if an item's time has passed and it's not
  // done yet, treat it as "happening now". Otherwise show the next upcoming
  // undone item. Also track day progress for the bar.
  const liveNow = (() => {
    if (!isToday) return null;
    const undone = items.filter((i) => !i.done);
    if (undone.length === 0) return null;
    const timed = undone
      .map((i) => ({ item: i, mins: i.time && i.time !== "TBD" ? timeToMinutes(i.time) : null }))
      .filter((x) => x.mins !== null) as Array<{ item: Item; mins: number }>;
    // Prefer an item whose start has passed by ≤ 90 min and isn't done — that's "now"
    const inProgress = timed
      .filter((x) => x.mins <= currentMins && currentMins - x.mins <= 90)
      .sort((a, b) => b.mins - a.mins)[0]; // most recent
    if (inProgress) {
      return { item: inProgress.item, mins: inProgress.mins, status: "now" as const };
    }
    // Otherwise next upcoming
    const upcoming = timed
      .filter((x) => x.mins > currentMins)
      .sort((a, b) => a.mins - b.mins)[0];
    if (upcoming) {
      return { item: upcoming.item, mins: upcoming.mins, status: "upcoming" as const };
    }
    // Fallback: undone TBD items
    const tbd = undone.find((i) => !i.time || i.time === "TBD");
    if (tbd) return { item: tbd, mins: null, status: "tbd" as const };
    // All timed items are in the past and undone — show the latest
    const past = timed.sort((a, b) => b.mins - a.mins)[0];
    return past ? { item: past.item, mins: past.mins, status: "now" as const } : null;
  })();
  const dayProgress = isToday && items.length > 0
    ? { done: items.filter((i) => i.done).length, total: items.length }
    : null;
  const allDoneToday = isToday && items.length > 0 && items.every((i) => i.done);

  // ── AI day-planner ───────────────────────────────────────────────────────
  async function planMyDay() {
    setAiPlannerOpen(true);
    setAiPlannerLoading(true);
    setAiPlannerReply(null);

    const agendaPayload = items.map((it) => ({
      time: it.time,
      title: it.title,
      emoji: it.emoji,
      notes: it.notes,
      reservation: it.reservation,
    }));

    const prompt = `Here's our Day ${day.dayNum} agenda (${day.date} · ${currentTheme}):\n` +
      agendaPayload.map((it) => `• ${it.emoji} ${it.time}: ${it.title}${it.notes ? ` — ${it.notes}` : ""}`).join("\n") +
      "\n\nIdentify free time gaps and suggest 2–3 activities that fit naturally into our schedule. Be specific to Maui and our family context.";

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: prompt,
          history: [{ role: "user", content: prompt }],
          agendaItems: agendaPayload,
          dayNum: day.dayNum,
        }),
      });
      const data = await res.json() as { reply: string };
      setAiPlannerReply(data.reply);
    } catch {
      setAiPlannerReply("Sorry, couldn't reach the AI assistant. Try again in a moment.");
    } finally {
      setAiPlannerLoading(false);
    }
  }

  // ── Drag-to-reorder handler ───────────────────────────────────────────────
  const handleReorder = useCallback(async (newSections: DndSection[]) => {
    // Merge reordered sections back into the full agenda for this day, then
    // reassign times: within-section reorders keep the section's existing times
    // sorted by position; cross-section moves adopt the target section's default time.
    const existingSections = sections; // capture current before update

    // Build a map of old item times so we can detect cross-section moves
    const oldSectionByItemId: Record<string, string> = {};
    for (const s of existingSections) {
      for (const it of s.items) oldSectionByItemId[it.id] = s.key;
    }

    // The newSections coming in may have a different key order or fewer sections
    // (if items were moved between sections). Rebuild the full ordered list.
    const mergedItems: Item[] = [];
    const sectionDefaultTimes: Record<string, string> = {};
    for (const s of newSections) sectionDefaultTimes[s.key] = s.defaultTime;

    for (const newSec of newSections) {
      // Collect existing times for items that stayed in the same section
      const oldSec = existingSections.find((s) => s.key === newSec.key);
      const oldTimes = oldSec ? [...oldSec.items.map((i) => i.time)] : [];
      // Sort them to redistribute in the same relative order
      const sortedOldTimes = [...oldTimes].sort((a, b) => timeToMinutes(a) - timeToMinutes(b));

      newSec.items.forEach((item, posIdx) => {
        const movedCross = oldSectionByItemId[item.id] !== newSec.key;
        let newTime: string;
        if (movedCross) {
          // Item crossed a section boundary — assign the target section's default time
          newTime = sectionDefaultTimes[newSec.key] ?? item.time;
        } else {
          // Same section — keep relative time order
          newTime = sortedOldTimes[posIdx] ?? item.time;
        }
        mergedItems.push({ ...item, time: newTime });
      });
    }

    // Optimistic UI update
    setAgendas((prev) =>
      prev.map((agenda, i) => (i === dayIndex ? mergedItems : agenda))
    );

    // Persist to Supabase: update sort_order and time for every item in the day
    const tripDayId = dayIdMap[day.dayNum];
    if (!tripDayId) return;

    const updates = mergedItems
      .filter((it) => it.fromSupabase)
      .map((it, idx) => ({
        id: it.id,
        sort_order: (idx + 1) * 10,
        time: it.time,
      }));

    // Fire all updates in parallel (no await — optimistic)
    updates.forEach(({ id, sort_order, time }) => {
      supabase
        .from("agenda_items")
        .update({ sort_order, time })
        .eq("id", id)
        .then(() => {}); // intentionally fire-and-forget
    });
  }, [sections, dayIndex, dayIdMap, day.dayNum]);

  if (membership.isChecking) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Checking trip access…</p>
      </div>
    );
  }

  if (!membership.isMember) {
    return (
      <TripAccessGate
        mode={membership.isPreview ? "preview" : "not-member"}
        title={membership.isPreview
          ? "Today is private to the trip"
          : membership.hasFamilyInvite
          ? "Join the trip to see Today"
          : "Today is private"}
        message={membership.isPreview
          ? "Preview profiles can browse the app shell, but the live family itinerary stays private until they join the trip."
          : membership.hasFamilyInvite
          ? "This profile is signed in, but it is not a traveler on the Maui family trip yet."
          : "This profile has not joined a private trip. Use an invite link or code from the organizer to unlock Today."}
        detail={membership.error}
        showJoinAction={membership.hasFamilyInvite}
      />
    );
  }

  return (
    <div className="flex flex-col">

      {/* ══════════════════════════════════════
          EDIT / ADD SHEET (bottom sheet)
      ══════════════════════════════════════ */}
      <div
        className={`fixed inset-0 z-[60] flex flex-col justify-end max-w-md mx-auto transition-opacity duration-200 ${
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
          style={{ maxHeight: "90dvh" }}
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
          <div className="px-5 pt-3 flex gap-2 border-t border-slate-100 flex-none"
            style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom, 24px))" }}>
            {!isNewItem && !sheetDeleteConfirm && (
              <button
                onClick={() => setSheetDeleteConfirm(true)}
                className="px-3 py-3 text-sm font-bold text-red-500 border border-red-200 rounded-2xl hover:bg-red-50 transition-colors"
              >
                Delete
              </button>
            )}
            {!isNewItem && !sheetDeleteConfirm && sheetItem?.fromSupabase && (
              <button
                onClick={() => setShowMoveSheet(true)}
                className="px-3 py-3 text-sm font-bold text-slate-600 border border-slate-200 rounded-2xl hover:bg-slate-50 transition-colors"
              >
                Move
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

      {/* ── Move to Day sheet ── */}
      {showMoveSheet && (
        <div className="fixed inset-0 z-[70] flex flex-col justify-end max-w-md mx-auto">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowMoveSheet(false)} />
          <div className="relative bg-white rounded-t-3xl shadow-2xl">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-slate-200 rounded-full" />
            </div>
            <div className="flex items-center justify-between px-5 pt-2 pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">Move to Day</h3>
              <button onClick={() => setShowMoveSheet(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-sm font-bold">✕</button>
            </div>
            <div className="px-4 pt-3 flex flex-col gap-2 max-h-[55vh] overflow-y-auto"
              style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom, 24px))" }}>
              {DAYS.map((d) => {
                const isCurrent = d.dayNum === day.dayNum;
                const label = dayLabels[d.dayNum] ?? d.theme;
                return (
                  <button
                    key={d.dayNum}
                    disabled={isCurrent}
                    onClick={() => moveItemToDay(d.dayNum)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-all active:scale-[0.98] ${
                      isCurrent ? "bg-slate-50 border-slate-100 opacity-40 cursor-default" : "bg-white border-slate-100 hover:bg-sky-50 hover:border-sky-200"
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-base flex-none">
                      {d.dayNum}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">Day {d.dayNum} · {label}</p>
                      <p className="text-xs text-slate-400">{d.date}</p>
                    </div>
                    {!isCurrent && <span className="text-slate-300 text-lg flex-none">›</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── AI Day-Planner Bottom Sheet ── */}
      {aiPlannerOpen && (
        <div
          className="fixed inset-0 z-[70] flex flex-col justify-end max-w-md mx-auto"
          onClick={() => { if (!aiPlannerLoading) setAiPlannerOpen(false); }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-t-3xl shadow-2xl max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 flex-none">
              <div className="w-10 h-1 bg-slate-200 rounded-full" />
            </div>
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-2 pb-3 border-b border-slate-100 flex-none">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-lg flex-none">
                  🤖
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">AI Day Planner</h3>
                  <p className="text-[10px] text-slate-400">Day {day.dayNum} · {currentTheme}</p>
                </div>
              </div>
              {!aiPlannerLoading && (
                <button
                  onClick={() => setAiPlannerOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-sm font-bold"
                >
                  ✕
                </button>
              )}
            </div>
            {/* Body */}
            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4"
              style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom, 24px))" }}>
              {aiPlannerLoading ? (
                <div className="flex flex-col items-center justify-center gap-4 py-8">
                  <div className="w-10 h-10 border-2 border-slate-200 border-t-violet-500 rounded-full animate-spin" />
                  <p className="text-sm text-slate-400 text-center">Analyzing your Day {day.dayNum} schedule<br />and finding the perfect gaps…</p>
                </div>
              ) : aiPlannerReply ? (
                <div className="flex flex-col gap-4">
                  <div className="bg-violet-50 border border-violet-100 rounded-2xl px-4 py-4">
                    <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{aiPlannerReply}</p>
                  </div>
                  <div className="flex gap-2.5">
                    <button
                      onClick={() => router.push("/explore")}
                      className="flex-1 bg-slate-900 text-white font-bold py-3.5 rounded-2xl text-sm"
                    >
                      Browse Activities →
                    </button>
                    <button
                      onClick={planMyDay}
                      className="px-4 border border-slate-200 text-slate-600 font-bold py-3.5 rounded-2xl text-sm"
                    >
                      Refresh
                    </button>
                  </div>
                  <button
                    onClick={() => setAiPlannerOpen(false)}
                    className="text-sm text-slate-400 font-semibold text-center pb-2"
                  >
                    Close
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* ── Day Route Sheet ── */}
      {showRouteSheet && (() => {
        const isApple = typeof navigator !== "undefined" && /iphone|ipad|mac/i.test(navigator.userAgent);
        const googleWaypoints = dayRouteStops.slice(0, -1).map((s) => `${s.lat},${s.lng}`).join("|");
        const last = dayRouteStops[dayRouteStops.length - 1];
        const googleRouteUrl = dayRouteStops.length > 0
          ? `https://www.google.com/maps/dir/?api=1&origin=${SHERATON.lat},${SHERATON.lng}&destination=${last.lat},${last.lng}${googleWaypoints ? `&waypoints=${googleWaypoints}` : ""}&travelmode=driving`
          : "";
        const appleRouteUrl = dayRouteStops.length > 0
          ? `maps://maps.apple.com/?saddr=${SHERATON.lat},${SHERATON.lng}&daddr=${last.lat},${last.lng}&dirflg=d`
          : "";

        return (
          <div
            className="fixed inset-0 z-[70] flex flex-col justify-end max-w-md mx-auto"
            onClick={() => setShowRouteSheet(false)}
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <div
              className="relative bg-white rounded-t-3xl shadow-2xl flex flex-col"
              style={{ maxHeight: "75vh" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1 flex-none">
                <div className="w-10 h-1 bg-slate-200 rounded-full" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-2 pb-3 border-b border-slate-100 flex-none">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Day {day.dayNum} Route</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">{currentTheme} · {dayRouteStops.length} stops</p>
                </div>
                <button
                  onClick={() => setShowRouteSheet(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-sm font-bold"
                >✕</button>
              </div>

              {/* Stops list */}
              <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
                {/* Origin */}
                <div className="flex items-start gap-3 mb-1">
                  <div className="flex flex-col items-center flex-none pt-0.5">
                    <div className="w-7 h-7 rounded-full bg-slate-900 flex items-center justify-center text-white text-xs">🏨</div>
                    <div className="w-0.5 h-4 bg-slate-200 mt-1" />
                  </div>
                  <div className="pt-1">
                    <p className="text-xs font-bold text-slate-700">Sheraton Maui Resort</p>
                    <p className="text-[10px] text-slate-400">Your home base · Ka&apos;anapali</p>
                  </div>
                </div>

                {dayRouteStops.map((stop, idx) => {
                  const isLast = idx === dayRouteStops.length - 1;
                  return (
                    <div key={stop.id}>
                      {/* Drive segment */}
                      <div className="flex items-center gap-3 mb-1 ml-3">
                        <div className="flex flex-col items-center flex-none">
                          <div className="w-0.5 h-3 bg-slate-200" />
                        </div>
                        <a
                          href={stop.mapsUrl}
                          className="flex items-center gap-1.5 text-[10px] text-sky-600 font-semibold bg-sky-50 rounded-full px-2.5 py-1 border border-sky-100 hover:border-sky-300 transition-colors"
                        >
                          <span>🗺</span>
                          <span>{stop.driveMin === 0 ? "On-site" : `${stop.driveMin} min drive`}</span>
                          <span className="text-sky-400">↗</span>
                        </a>
                      </div>

                      {/* Stop */}
                      <div className="flex items-start gap-3 mb-1">
                        <div className="flex flex-col items-center flex-none pt-0.5">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm ${isLast ? "bg-emerald-500" : "bg-indigo-100"}`}>
                            {isLast ? "🏁" : stop.emoji}
                          </div>
                          {!isLast && <div className="w-0.5 h-4 bg-slate-200 mt-1" />}
                        </div>
                        <div className="pt-1 flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 leading-tight">{stop.title}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{stop.time}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Open in Maps CTAs */}
              <div className="px-5 pb-8 pt-3 border-t border-slate-100 flex flex-col gap-2 flex-none">
                <a
                  href={googleRouteUrl}
                  className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white font-bold py-4 rounded-2xl text-sm active:scale-[0.98] transition-all"
                >
                  <span>🗺</span>
                  <span>Open Full Route in Google Maps</span>
                </a>
                {isApple && (
                  <a
                    href={appleRouteUrl}
                    className="w-full flex items-center justify-center gap-2 border border-slate-200 text-slate-700 font-bold py-3.5 rounded-2xl text-sm active:scale-[0.98] transition-all"
                  >
                    <span>🍎</span>
                    <span>Open in Apple Maps</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Hero (with embedded navigation) ── */}
      <div className="relative h-56 w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={getHeroForTheme(currentTheme, day.dayNum).url}
          alt={getHeroForTheme(currentTheme, day.dayNum).alt}
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
            onClick={() => { setDayIndex((i) => i - 1); setEditingTheme(false); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-black/25 backdrop-blur-sm border border-white/20 text-white text-lg font-bold hover:bg-black/40 transition-all"
          >
            ‹
          </button>
        )}

        {dayIndex < DAYS.length - 1 && (
          <button
            onClick={() => { setDayIndex((i) => i + 1); setEditingTheme(false); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-black/25 backdrop-blur-sm border border-white/20 text-white text-lg font-bold hover:bg-black/40 transition-all"
          >
            ›
          </button>
        )}

        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
          {DAYS.map((d, i) => (
            <button
              key={i}
              onClick={() => { setDayIndex(i); setEditingTheme(false); }}
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

        {/* Jump to Today removed from hero — shown below instead */}

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
                  {editingTheme ? (
                    <input
                      autoFocus
                      value={themeInput}
                      onChange={(e) => setThemeInput(e.target.value)}
                      onBlur={saveTheme}
                      onKeyDown={(e) => { if (e.key === "Enter") saveTheme(); if (e.key === "Escape") setEditingTheme(false); }}
                      className="text-2xl font-bold text-white leading-tight bg-transparent border-b border-white/50 outline-none w-full placeholder-white/40"
                      placeholder="Day theme…"
                    />
                  ) : (
                    <button
                      className="flex items-center gap-1.5 group text-left"
                      onClick={() => { setThemeInput(currentTheme); setEditingTheme(true); }}
                    >
                      <h1 className="text-2xl font-bold text-white leading-tight">{currentTheme}</h1>
                      <span className="text-white/50 text-sm opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">✏️</span>
                    </button>
                  )}
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
                        {viewWeather.precipChance > 0 ? `🌧 ${viewWeather.precipChance}% · ` : ""}H:{viewWeather.high}° L:{viewWeather.low}°
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ── Day action pills: Route + Jump to Today ── */}
      {(dayRouteStops.length > 0 || dayIndex !== todayDayIndex) && (
        <div className="flex items-center justify-center gap-2 pt-2 pb-0 px-4 flex-wrap">
          {dayRouteStops.length > 0 && (
            <button
              onClick={() => setShowRouteSheet(true)}
              className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 text-[11px] font-bold px-4 py-2 rounded-full shadow-sm hover:border-slate-400 active:scale-95 transition-all"
            >
              <span>🗺</span>
              <span>View Route</span>
            </button>
          )}
          {dayIndex !== todayDayIndex && (
            <button
              onClick={() => { setDayIndex(todayDayIndex); setEditingTheme(false); }}
              className="flex items-center gap-1.5 bg-slate-900 text-white text-[11px] font-bold px-4 py-2 rounded-full shadow-md hover:bg-slate-700 active:scale-95 transition-all"
            >
              <span className="text-[8px]">⬤</span>
              <span>Jump to Today</span>
            </button>
          )}
        </div>
      )}

      {/* ── Pull-to-refresh indicator ── */}
      {(pullDistance > 0 || pullRefreshing) && (
        <div
          className="flex items-center justify-center overflow-hidden transition-all duration-150"
          style={{ height: pullRefreshing ? 40 : pullDistance }}
        >
          <div className={`w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center transition-transform ${pullRefreshing ? "animate-spin" : ""}`}
            style={{ transform: pullRefreshing ? undefined : `rotate(${Math.min(pullDistance / 64, 1) * 180}deg)` }}>
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-sky-500" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
        </div>
      )}

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

        {/* ── Pre-trip Readiness ── */}
        {tripInfo?.status === "upcoming" && tripInfo.daysUntilTrip > 0 && (
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm px-4 py-3.5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trip Readiness</p>
              <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                (packingProgress.packed / packingProgress.total) > 0.8 && docReadiness?.confirmed === docReadiness?.total
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}>
                {tripInfo.daysUntilTrip}d to go
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => router.push("/packing")} className="flex flex-col gap-2 bg-sky-50 rounded-xl p-3 text-left active:scale-[0.98] transition-transform">
                <div className="flex items-center justify-between">
                  <span className="text-lg">🧳</span>
                  <span className="text-[10px] font-bold text-slate-500">{packingProgress.packed}/{packingProgress.total}</span>
                </div>
                <div className="h-1.5 bg-sky-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${packingProgress.packed === packingProgress.total ? "bg-emerald-500" : "bg-sky-500"}`}
                    style={{ width: `${Math.round((packingProgress.packed / packingProgress.total) * 100)}%` }} />
                </div>
                <p className="text-[11px] font-bold text-slate-700">Packing List ›</p>
              </button>
              <button onClick={() => router.push("/vault")} className="flex flex-col gap-2 bg-emerald-50 rounded-xl p-3 text-left active:scale-[0.98] transition-transform">
                <div className="flex items-center justify-between">
                  <span className="text-lg">📋</span>
                  {docReadiness && (
                    <span className="text-[10px] font-bold text-slate-500">{docReadiness.confirmed}/{docReadiness.total}</span>
                  )}
                </div>
                <div className="h-1.5 bg-emerald-100 rounded-full overflow-hidden">
                  {docReadiness && (
                    <div className={`h-full rounded-full transition-all ${docReadiness.confirmed === docReadiness.total ? "bg-emerald-500" : "bg-amber-500"}`}
                      style={{ width: `${Math.round((docReadiness.confirmed / docReadiness.total) * 100)}%` }} />
                  )}
                </div>
                <p className="text-[11px] font-bold text-slate-700">Docs & Reservations ›</p>
              </button>
            </div>
          </div>
        )}

        {/* ── Live Now mode (today only) — sticky card that auto-advances ── */}
        {allDoneToday && (
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-2xl px-4 py-4 flex items-center gap-4 shadow-md shadow-emerald-200">
            <span className="text-4xl">🎉</span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-100">Day Complete</p>
              <p className="font-bold text-base mt-0.5">All done — great day!</p>
              <p className="text-xs text-emerald-100 mt-0.5">{items.length} of {items.length} activities checked off</p>
            </div>
          </div>
        )}
        {liveNow && isToday && !allDoneToday && (() => {
          const { item, mins, status } = liveNow;
          const minsAway = mins !== null ? mins - currentMins : null;
          const minsIntoNow = mins !== null && status === "now" ? Math.max(0, currentMins - mins) : 0;
          const isUrgent = status === "upcoming" && minsAway !== null && minsAway <= 15;
          const isWarning = status === "upcoming" && minsAway !== null && minsAway <= 60 && minsAway > 15;

          // Live card label + countdown copy
          let statusLabel: string;
          let countdownPrimary: string;
          let countdownSecondary: string | null = null;
          if (status === "now") {
            statusLabel = "Happening Now";
            countdownPrimary = minsIntoNow === 0 ? "Now" : minsIntoNow < 60 ? `${minsIntoNow} min in` : `${Math.floor(minsIntoNow / 60)}h in`;
            countdownSecondary = item.time && item.time !== "TBD" ? `Started ${item.time}` : null;
          } else if (status === "tbd") {
            statusLabel = "Up Next";
            countdownPrimary = "Whenever";
            countdownSecondary = "No set time";
          } else {
            // upcoming
            statusLabel = isUrgent ? "Leaving Soon" : isWarning ? "Coming Up" : "Up Next";
            if (minsAway === null || minsAway <= 0) countdownPrimary = "Now";
            else if (minsAway < 60) countdownPrimary = `in ${minsAway} min`;
            else countdownPrimary = `in ${Math.floor(minsAway / 60)}h ${minsAway % 60 > 0 ? `${minsAway % 60}m` : ""}`.trim();
            countdownSecondary = item.time && item.time !== "TBD" ? `Starts ${item.time}` : null;
          }

          // Color theme by status
          const theme = status === "now"
            ? { bg: "bg-gradient-to-br from-emerald-500 to-emerald-600", shadow: "shadow-emerald-200", muted: "text-emerald-100", dot: "bg-emerald-200", dotPing: "bg-emerald-300" }
            : isUrgent
            ? { bg: "bg-gradient-to-br from-red-500 to-red-600", shadow: "shadow-red-200", muted: "text-red-100", dot: "bg-red-200", dotPing: "bg-red-300" }
            : isWarning
            ? { bg: "bg-gradient-to-br from-amber-500 to-orange-500", shadow: "shadow-amber-200", muted: "text-amber-100", dot: "bg-amber-200", dotPing: "bg-amber-300" }
            : { bg: "bg-gradient-to-br from-sky-600 to-sky-700", shadow: "shadow-sky-200", muted: "text-sky-100", dot: "bg-sky-200", dotPing: "bg-sky-300" };

          return (
            <div className="sticky top-2 z-30 -mx-1 px-1">
              <div className={`${theme.bg} ${theme.shadow} text-white rounded-2xl shadow-lg overflow-hidden`}>
                {/* Top row: status + tap area */}
                <button
                  onClick={() => openEdit(item)}
                  className="w-full text-left active:scale-[0.99] transition-transform"
                >
                  <div className="px-4 pt-3 pb-3 flex items-center gap-3">
                    {/* Big emoji */}
                    <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center flex-none">
                      <span className="text-3xl">{item.emoji}</span>
                    </div>
                    {/* Middle */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="relative flex h-2 w-2">
                          <span className={`absolute inline-flex h-2 w-2 rounded-full opacity-75 animate-ping ${theme.dotPing}`} />
                          <span className={`relative inline-flex h-2 w-2 rounded-full ${theme.dot}`} />
                        </span>
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${theme.muted}`}>{statusLabel}</p>
                      </div>
                      <p className="font-bold text-sm leading-snug truncate">{item.title}</p>
                      {countdownSecondary && (
                        <p className={`text-[11px] mt-0.5 ${theme.muted}`}>{countdownSecondary}</p>
                      )}
                    </div>
                    {/* Right: countdown */}
                    <div className="text-right flex-none">
                      <p className="text-lg font-black leading-none">{countdownPrimary}</p>
                    </div>
                  </div>
                </button>

                {/* Bottom row: progress bar + done button */}
                <div className="px-4 pb-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    {dayProgress && (
                      <>
                        <div className={`text-[10px] ${theme.muted} mb-1 font-semibold`}>
                          {dayProgress.done} of {dayProgress.total} done today
                        </div>
                        <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-white rounded-full transition-all duration-500"
                            style={{ width: `${(dayProgress.done / dayProgress.total) * 100}%` }}
                          />
                        </div>
                      </>
                    )}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggle(item.id); }}
                    className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 active:scale-95 transition-all flex-none"
                  >
                    <span className="text-sm leading-none">✓</span>
                    Done
                  </button>
                </div>
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


        {loadIssue && !loading && (
          <ResilientState
            title="Using saved itinerary"
            message="TripFlow couldn't refresh the latest shared trip data, so the page is staying usable with the itinerary already on this device."
            detail={loadIssue}
            actionLabel="Try again"
            onAction={() => { setLoading(true); void fetchDataRef.current?.(); }}
            compact
          />
        )}

        {weatherIssue && !weather && !loading && (
          <ResilientState
            eyebrow="Weather paused"
            title="Forecast is temporarily unavailable"
            message="Agenda details still work. Weather will update automatically the next time the service responds."
            actionLabel="Retry weather"
            onAction={() => {
              setWeatherIssue(false);
              fetch("/api/weather")
                .then((r) => r.json())
                .then((data) => setWeather(data))
                .catch(() => setWeatherIssue(true));
            }}
            compact
          />
        )}

        {actionIssue && (
          <ResilientState
            eyebrow="Not saved"
            title="That change stayed local"
            message="The app couldn't update the shared trip yet. Your screen is still responsive, but you may want to retry when you're online."
            detail={actionIssue}
            actionLabel="Dismiss"
            onAction={() => setActionIssue(null)}
            compact
          />
        )}

        {/* ── Skeleton loaders (initial page load) ── */}
        {loading && (
          <div className="flex flex-col gap-4 animate-pulse">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex flex-col gap-2">
                {/* Section header skeleton */}
                <div className="flex items-center gap-2.5 mb-1">
                  <div className="w-5 h-5 rounded-full bg-slate-200" />
                  <div className="h-3.5 w-20 rounded-full bg-slate-200" />
                  <div className="h-3 w-12 rounded-full bg-slate-100 ml-1" />
                </div>
                {/* Card skeletons */}
                {[1, 2].map((c) => (
                  <div key={c} className="bg-white rounded-2xl border border-slate-100 shadow-sm flex items-stretch h-16 overflow-hidden">
                    <div className="w-14 flex flex-col items-center justify-center gap-1 bg-slate-50 flex-none">
                      <div className="w-6 h-6 rounded-full bg-slate-200" />
                      <div className="w-8 h-2 rounded-full bg-slate-100" />
                    </div>
                    <div className="flex-1 flex flex-col justify-center px-3 gap-2">
                      <div className="h-3 w-3/4 rounded-full bg-slate-200" />
                      <div className="h-2.5 w-1/2 rounded-full bg-slate-100" />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* ── Empty state (no items after loading) ── */}
        {!loading && sections.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="text-5xl mb-4">🌴</div>
            <p className="text-base font-bold text-slate-800 mb-1">Nothing planned yet</p>
            <p className="text-sm text-slate-400 mb-6">Tap below to discover beaches,<br />restaurants and activities nearby</p>
            <button
              onClick={() => router.push("/explore")}
              className="bg-sky-500 text-white text-sm font-bold px-6 py-3 rounded-2xl shadow-md hover:bg-sky-600 active:scale-95 transition-all"
            >
              Browse Activities
            </button>
          </div>
        )}

        {/* ── Time Sections (drag-to-reorder) ── */}
        {!loading && (
          <SortableAgendaSections
            sections={sections as DndSection[]}
            isToday={isToday}
            isPast={isPast}
            isEditable={isEditable}
            wishlist={wishlist}
            onReorder={handleReorder}
            onEdit={openEdit}
            onToggle={toggle}
            onAddClick={openAdd}
            onSuggestionClick={() => router.push("/explore")}
          />
        )}


        {/* ── AI Plan My Day CTA ── */}
        {!loading && items.length > 0 && isEditable && (
          <button
            onClick={planMyDay}
            className="w-full flex items-center gap-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl px-4 py-3.5 shadow-sm active:scale-[0.98] transition-all"
          >
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-lg flex-none">
              🤖
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="font-bold text-sm">Plan my day with AI</p>
              <p className="text-xs text-white/70 mt-0.5">Find free gaps · get Maui-specific suggestions</p>
            </div>
            <span className="text-white/60 text-lg flex-none">→</span>
          </button>
        )}

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

        {/* ── Trip Memories CTA ── */}
        <button
          onClick={() => router.push("/memories")}
          className="w-full relative overflow-hidden rounded-2xl text-left group active:scale-[0.98] transition-all"
          style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=200&fit=crop&q=60"
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-10"
          />
          <div className="relative flex items-center gap-4 px-4 py-4">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-lg flex-none">
              📸
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-white">Trip Memories</p>
              <p className="text-xs text-white/60 mt-0.5">Your day-by-day story, auto-built as you go</p>
            </div>
            <span className="text-white/50 group-hover:text-white/80 transition-colors text-lg">→</span>
          </div>
        </button>

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

        {/* ── Trip Note (all days) ── */}
        {day.note && (
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
