"use client";

import { useState } from "react";
import Link from "next/link";

const TODAY_ACTIVITIES = [
  { emoji: "😴", title: "Nap / downtime", time: "3:00 PM" },
  { emoji: "🤿", title: "Snorkeling – Molokini", time: "4:30 PM" },
  { emoji: "🐟", title: "Dinner – Mama's Fish House", time: "7:00 PM" },
];

const UPCOMING_TRIPS = [
  {
    id: 1,
    title: "Christmas in NYC",
    subtitle: "Dec 20, 2026 · 5 nights · 4 travelers",
    emoji: "🎄",
    photo: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=600&h=300&fit=crop&q=80",
    photoAlt: "New York City skyline at night",
  },
  {
    id: 2,
    title: "Spring Break · Cabo",
    subtitle: "March 15, 2027 · 7 nights · 4 travelers",
    emoji: "🌊",
    photo: "https://images.unsplash.com/photo-1510097467424-192d713fd8b2?w=600&h=300&fit=crop&q=80",
    photoAlt: "Cabo San Lucas beach",
  },
  {
    id: 3,
    title: "Summer Euro Trip",
    subtitle: "July 2027 · Still planning",
    emoji: "✈️",
    photo: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=600&h=300&fit=crop&q=80",
    photoAlt: "European city",
  },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function TripsPage() {
  const [greeting] = useState(getGreeting);

  return (
    <div className="flex flex-col px-4 pt-5 pb-6 gap-5">

      {/* ── Greeting header ── */}
      <div>
        <p className="text-2xl font-black text-slate-900">
          {greeting}, Shaun 👋
        </p>
        <p className="text-sm text-slate-400 mt-0.5">Here&apos;s what&apos;s on your travel radar.</p>
      </div>

      {/* ══════════════════════════════════════
          ACTIVE TRIP CARD
      ══════════════════════════════════════ */}
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Active Trip</p>
        <div className="rounded-2xl overflow-hidden shadow-md border border-sky-100">

          {/* Hero photo */}
          <div className="relative h-48 w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=300&fit=crop&q=80"
              alt="Maui, Hawaii"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-sky-900/10" />

            {/* Countdown pill */}
            <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-md border border-white/30 text-white rounded-2xl px-3 py-1.5 text-center min-w-[56px]">
              <p className="text-xl font-black leading-none">5</p>
              <p className="text-[10px] font-semibold tracking-wide mt-0.5 opacity-80">days left</p>
            </div>

            {/* Trip identity */}
            <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
              <p className="text-[10px] font-semibold text-white/60 uppercase tracking-widest mb-0.5">
                Active · Day 2 of 7
              </p>
              <h2 className="text-xl font-black text-white leading-tight">Maui Family Trip</h2>
              <p className="text-xs text-white/70 mt-0.5">May 22 – 28 · 4 travelers 🌺</p>
            </div>
          </div>

          {/* Stats + CTA row */}
          <div
            className="px-4 py-3 flex items-center gap-4"
            style={{ background: "linear-gradient(135deg, #e0f2fe, #fef9c3)" }}
          >
            <div className="flex gap-4 flex-1">
              <div className="flex flex-col items-center">
                <span className="text-base font-black text-slate-800">7</span>
                <span className="text-[10px] text-slate-500 font-medium">days</span>
              </div>
              <div className="w-px h-8 bg-slate-200 self-center" />
              <div className="flex flex-col items-center">
                <span className="text-base font-black text-slate-800">4</span>
                <span className="text-[10px] text-slate-500 font-medium">travelers</span>
              </div>
              <div className="w-px h-8 bg-slate-200 self-center" />
              <div className="flex flex-col items-center">
                <span className="text-base font-black text-slate-800">5</span>
                <span className="text-[10px] text-slate-500 font-medium">today</span>
              </div>
            </div>
            <Link
              href="/"
              className="bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl whitespace-nowrap flex-none hover:bg-slate-800 transition-colors"
            >
              Open Trip →
            </Link>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          TODAY AT A GLANCE
      ══════════════════════════════════════ */}
      <div className="bg-sky-50 border border-sky-100 rounded-2xl px-4 py-3.5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-bold text-sky-600 uppercase tracking-widest">Today at a Glance</p>
          <Link href="/" className="text-[10px] font-semibold text-sky-600">
            See full day →
          </Link>
        </div>
        <div className="flex flex-col gap-2">
          {TODAY_ACTIVITIES.map((a, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <span className="text-base w-6 text-center flex-none">{a.emoji}</span>
              <p className="flex-1 text-sm font-medium text-slate-700 truncate">{a.title}</p>
              <span className="text-xs text-slate-400 flex-none">{a.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════
          UPCOMING TRIPS
      ══════════════════════════════════════ */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-base font-bold text-slate-900">Upcoming Trips</p>
          <span className="text-xs font-semibold text-slate-400">{UPCOMING_TRIPS.length} planned</span>
        </div>
        <div className="flex flex-col gap-3">
          {UPCOMING_TRIPS.map((trip) => (
            <div
              key={trip.id}
              className="bg-white rounded-2xl border border-dashed border-slate-200 overflow-hidden"
            >
              <div className="relative h-28 w-full overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={trip.photo}
                  alt={trip.photoAlt}
                  className="w-full h-full object-cover opacity-75"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <div className="absolute top-2.5 left-3 bg-white/20 backdrop-blur-sm border border-white/30 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                  Planning
                </div>
                <div className="absolute bottom-0 left-0 right-0 px-3 pb-2.5 flex items-end justify-between">
                  <div>
                    <p className="text-sm font-bold text-white leading-tight">{trip.title}</p>
                    <p className="text-[11px] text-white/70 mt-0.5">{trip.subtitle}</p>
                  </div>
                  <span className="text-lg">{trip.emoji}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Plan a new trip CTA ── */}
      <button className="flex items-center justify-center gap-2.5 w-full bg-white border-2 border-dashed border-slate-300 rounded-2xl py-4 text-sm font-bold text-slate-600 hover:border-sky-400 hover:text-sky-600 transition-colors">
        <span className="w-6 h-6 rounded-full border-2 border-current flex items-center justify-center text-sm leading-none font-bold flex-none">+</span>
        Plan a new trip
      </button>

    </div>
  );
}
