"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getTripDateInfo, formatDateRange, type TripDateInfo } from "@/lib/tripDates";
import { useAuth } from "@/hooks/useAuth";
import { ResilientState } from "@/components/ResilientState";
import TripAccessGate from "@/components/TripAccessGate";
import FirstTripSetup from "@/components/FirstTripSetup";
import { useActiveTrip } from "@/hooks/useActiveTrip";
import {
  DEMO_INVITE_CODE,
  DEMO_TRIP_ID,
  UPCOMING_TRIPS_KEY,
  getStoredTripSubtitle,
  readStoredTrips,
  type StoredTrip,
} from "@/lib/tripConfig";

type AgendaItem = { emoji: string; title: string; time: string };

type UpcomingTrip = StoredTrip;

const DEMO_UPCOMING_TRIPS: UpcomingTrip[] = [
  {
    id: 9001,
    title: "Fall Weekend · Napa",
    destination: "Napa Valley",
    startDate: "2026-10-09",
    nights: 3,
    travelersCount: 2,
    emoji: "🍷",
    photo: "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=600&h=300&fit=crop&q=80",
    photoAlt: "Napa Valley vineyard",
  },
];

// Fallback when Supabase agenda isn't available yet
const FALLBACK_TODAY: AgendaItem[] = [
  { emoji: "😴", title: "Nap / downtime", time: "3:00 PM" },
  { emoji: "🤿", title: "Snorkeling – Molokini", time: "4:30 PM" },
  { emoji: "🐟", title: "Dinner – Mama's Fish House", time: "7:00 PM" },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function TripsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const activeTrip = useActiveTrip(user);
  const [greeting] = useState(getGreeting);
  const firstName = user?.user_metadata?.full_name?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "traveler";
  const [upcomingTrips, setUpcomingTrips] = useState<UpcomingTrip[]>(() => readStoredTrips([]));

  // ── Live trip data ──────────────────────────────────────────────────────────
  const [tripTitle, setTripTitle] = useState("Maui Family Trip");
  const [tripDateRange, setTripDateRange] = useState("Jun 5–11, 2026");
  const [tripInfo, setTripInfo] = useState<TripDateInfo | null>(null);
  const [travelerCount, setTravelerCount] = useState(4);
  const [todayItems, setTodayItems] = useState<AgendaItem[]>(FALLBACK_TODAY);
  const [loadIssue, setLoadIssue] = useState<string | null>(null);

  useEffect(() => {
    if (!activeTrip.activeTripId) return;

    async function loadTrip() {
      setLoadIssue(null);
      try {
        const [tripResult, travelerResult] = await Promise.all([
          supabase.from("trips").select("title, start_date, end_date").eq("id", activeTrip.activeTripId).maybeSingle(),
          supabase.from("travelers").select("id", { count: "exact", head: true }).eq("trip_id", activeTrip.activeTripId),
        ]);

        if (tripResult.data) {
          setTripTitle(tripResult.data.title);
          setTripDateRange(formatDateRange(tripResult.data.start_date, tripResult.data.end_date));
          const info = getTripDateInfo(tripResult.data.start_date, tripResult.data.end_date);
          setTripInfo(info);

          // Fetch today's agenda items if trip is active
          if (info.status === "active" && info.currentDayNumber > 0) {
              const { data: dayData } = await supabase
                .from("trip_days")
                .select("id")
                .eq("trip_id", activeTrip.activeTripId)
                .eq("day_number", info.currentDayNumber)
                .maybeSingle();

            if (dayData) {
              const { data: items } = await supabase
                .from("agenda_items")
                .select("emoji, title, time")
                .eq("trip_day_id", dayData.id)
                .order("time")
                .limit(3);
              if (items && items.length > 0) {
                setTodayItems(items as AgendaItem[]);
              }
            }
          }
        }

        if (travelerResult.count) setTravelerCount(travelerResult.count);
      } catch (err) {
        setLoadIssue(err instanceof Error ? err.message : "Trip radar could not refresh.");
      }
    }

    loadTrip();
  }, [activeTrip.activeTripId]);

  useEffect(() => {
    if (activeTrip.activeTripId === DEMO_TRIP_ID || activeTrip.activeTrip?.invite_code === DEMO_INVITE_CODE) {
      setUpcomingTrips((prev) => {
        const existing = new Set(prev.map((trip) => trip.title));
        const missing = DEMO_UPCOMING_TRIPS.filter((trip) => !existing.has(trip.title));
        return missing.length > 0 ? [...missing, ...prev] : prev;
      });
    }
  }, [activeTrip.activeTrip?.invite_code, activeTrip.activeTripId]);

  // Persist upcoming trips to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(UPCOMING_TRIPS_KEY, JSON.stringify(upcomingTrips));
    } catch { /* ignore storage errors */ }
  }, [upcomingTrips]);

  // ── Derived display values ──────────────────────────────────────────────────
  const isUpcoming = !tripInfo || tripInfo.status === "upcoming";
  const isActive   = tripInfo?.status === "active";
  const isComplete = tripInfo?.status === "completed";

  const countdownNumber = isActive
    ? tripInfo!.daysLeft
    : isUpcoming
    ? (tripInfo?.daysUntilTrip ?? 36)
    : 0;

  const countdownLabel = isActive
    ? "days left"
    : isUpcoming
    ? "days to go"
    : "complete";

  const statusLabel = isActive
    ? `Active · Day ${tripInfo!.currentDayNumber} of ${tripInfo!.totalDays}`
    : isUpcoming
    ? `Upcoming · ${tripInfo?.daysUntilTrip ?? "—"} days away`
    : "Completed";

  const statDays = tripInfo?.totalDays ?? 7;
  const statRight = isActive ? tripInfo!.daysLeft : isUpcoming ? (tripInfo?.daysUntilTrip ?? "—") : 0;
  const statRightLabel = isActive ? "days left" : isUpcoming ? "days away" : "complete";

  // ── Edit upcoming trip sheet ────────────────────────────────────────────────
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

  const TRIP_EMOJIS = ["✈️", "🏖️", "🏔️", "🌍", "🎄", "🌊", "🏕️", "🗼", "🌺", "🎭"];

  function openEditTrip(trip: UpcomingTrip) {
    setEditingTrip(trip);
    setEditTitle(trip.title);
    setEditSubtitle(getStoredTripSubtitle(trip));
    setEditEmoji(trip.emoji);
  }

  function saveEditTrip() {
    if (!editingTrip) return;
    setUpcomingTrips((prev) =>
      prev.map((t) =>
        t.id === editingTrip.id
          ? { ...t, title: editTitle, subtitle: editSubtitle, emoji: editEmoji }
          : t
      )
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
    const newTrip: UpcomingTrip = {
      id: Date.now(),
      title: newTitle.trim(),
      destination: newDestination,
      startDate: "",
      nights: 0,
      travelersCount: Number.parseInt(newTravelers, 10) || 0,
      subtitle: subtitle || "Still planning",
      emoji: "✈️",
      photo: "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=600&h=300&fit=crop&q=80",
      photoAlt: newDestination || "Trip destination",
    };
    setUpcomingTrips((prev) => [...prev, newTrip]);
    setShowPlanSheet(false);
    setNewTitle("");
    setNewDestination("");
    setNewDates("");
    setNewTravelers("2");
  }

  if (activeTrip.isChecking) {
    return (
      <div className="flex min-h-[calc(100vh-9rem)] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
      </div>
    );
  }

  if (activeTrip.hasNoTrip) {
    return (
      <FirstTripSetup
        defaultName={firstName}
        onCreate={activeTrip.createTrip}
      />
    );
  }

  if (activeTrip.isPreview) {
    return (
      <TripAccessGate
        mode="preview"
        title="Trips are private"
        message="Preview profiles can explore Daywave, but live trip lists stay private until they join or create a trip."
        detail={activeTrip.error}
      />
    );
  }

  return (
    <div className="flex flex-col px-4 pt-5 pb-6 gap-5">

      {/* ── Edit trip sheet ── */}
      {editingTrip && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center" onClick={() => setEditingTrip(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
          <div
            className="relative w-full max-w-md bg-white rounded-t-3xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-9 h-1 bg-slate-200 rounded-full" />
            </div>
            <div className="px-5 pt-3 pb-10 flex flex-col gap-4">
              <h3 className="text-base font-black text-slate-900">Edit Trip</h3>

              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Icon</p>
                <div className="flex gap-2 flex-wrap">
                  {TRIP_EMOJIS.map((e) => (
                    <button
                      key={e}
                      onClick={() => setEditEmoji(e)}
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl transition-all ${
                        editEmoji === e ? "bg-slate-900 scale-110" : "bg-slate-100"
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Trip name</p>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-2xl px-4 py-3.5 outline-none focus:border-slate-900 bg-white"
                />
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Dates & details</p>
                <input
                  type="text"
                  value={editSubtitle}
                  onChange={(e) => setEditSubtitle(e.target.value)}
                  placeholder="e.g. Dec 20, 2026 · 5 nights · 4 travelers"
                  className="w-full text-sm border border-slate-200 rounded-2xl px-4 py-3.5 outline-none focus:border-slate-900 bg-white"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={saveEditTrip}
                  className="flex-1 bg-slate-900 text-white font-bold py-4 rounded-2xl text-sm"
                >
                  Save changes
                </button>
                <button
                  onClick={() => setEditingTrip(null)}
                  className="px-5 text-sm font-semibold text-slate-400 border border-slate-200 rounded-2xl"
                >
                  Cancel
                </button>
              </div>
              <button
                onClick={deleteTrip}
                className="w-full border border-red-200 bg-red-50 text-red-500 font-bold py-3.5 rounded-2xl text-sm"
              >
                Remove trip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Plan new trip sheet ── */}
      {showPlanSheet && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center" onClick={() => setShowPlanSheet(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
          <div
            className="relative w-full max-w-md bg-white rounded-t-3xl shadow-2xl flex flex-col"
            style={{ maxHeight: "calc(100dvh - 72px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-9 h-1 bg-slate-200 rounded-full" />
            </div>
            <div className="px-5 pt-3 pb-3 flex-none border-b border-slate-50">
              <h3 className="text-base font-black text-slate-900">Plan a New Trip</h3>
              <p className="text-xs text-slate-400 mt-0.5">Start building your next adventure</p>
            </div>
            <div className="px-5 pt-4 pb-2 flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto">

              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Trip name *</p>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Christmas in NYC"
                  className="w-full text-sm border border-slate-200 rounded-2xl px-4 py-3.5 outline-none focus:border-slate-900 bg-white"
                  autoFocus
                />
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Destination</p>
                <input
                  type="text"
                  value={newDestination}
                  onChange={(e) => setNewDestination(e.target.value)}
                  placeholder="e.g. New York, Tokyo, Bali…"
                  className="w-full text-sm border border-slate-200 rounded-2xl px-4 py-3.5 outline-none focus:border-slate-900 bg-white"
                />
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Dates</p>
                <input
                  type="text"
                  value={newDates}
                  onChange={(e) => setNewDates(e.target.value)}
                  placeholder="e.g. Dec 20 · 5 nights"
                  className="w-full text-sm border border-slate-200 rounded-2xl px-4 py-3.5 outline-none focus:border-slate-900 bg-white"
                />
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Travelers</p>
                <div className="flex gap-2">
                  {["1", "2", "3", "4", "5", "6+"].map((n) => (
                    <button
                      key={n}
                      onClick={() => setNewTravelers(n)}
                      className={`flex-1 py-2.5 rounded-2xl text-sm font-bold border transition-all ${
                        newTravelers === n
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-600 border-slate-200"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

            </div>
            <div className="px-5 pt-3 pb-8 flex gap-3 border-t border-slate-100 flex-none">
              <button
                onClick={addNewTrip}
                disabled={!newTitle.trim()}
                className="flex-1 bg-slate-900 text-white font-bold py-4 rounded-2xl text-sm disabled:opacity-40"
              >
                Create Trip
              </button>
              <button
                onClick={() => setShowPlanSheet(false)}
                className="px-5 text-sm font-semibold text-slate-400 border border-slate-200 rounded-2xl"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Greeting header ── */}
      <div>
        <p className="text-2xl font-black text-slate-900">{greeting}, {firstName}</p>
        <p className="text-sm text-slate-400 mt-0.5">Here&apos;s what&apos;s on your travel radar.</p>
      </div>

      {loadIssue && (
        <ResilientState
          title="Using saved trip details"
          message="Upcoming trips are still available from this device, but the active trip summary could not refresh."
          detail={loadIssue}
          actionLabel="Retry"
          onAction={() => window.location.reload()}
          compact
        />
      )}

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
              {isComplete ? (
                <p className="text-xl font-black leading-none">✓</p>
              ) : (
                <p className="text-xl font-black leading-none">{countdownNumber}</p>
              )}
              <p className="text-[10px] font-semibold tracking-wide mt-0.5 opacity-80">{countdownLabel}</p>
            </div>

            {/* Trip identity */}
            <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
              <p className="text-[10px] font-semibold text-white/60 uppercase tracking-widest mb-0.5">
                {statusLabel}
              </p>
              <h2 className="text-xl font-black text-white leading-tight">{tripTitle}</h2>
              <p className="text-xs text-white/70 mt-0.5">{tripDateRange} · {travelerCount} travelers 🌺</p>
            </div>
          </div>

          {/* Stats + CTA row */}
          <div
            className="px-4 py-3 flex items-center gap-4"
            style={{ background: "linear-gradient(135deg, #e0f2fe, #fef9c3)" }}
          >
            <div className="flex gap-4 flex-1">
              <div className="flex flex-col items-center">
                <span className="text-base font-black text-slate-800">{statDays}</span>
                <span className="text-[10px] text-slate-500 font-medium">days</span>
              </div>
              <div className="w-px h-8 bg-slate-200 self-center" />
              <div className="flex flex-col items-center">
                <span className="text-base font-black text-slate-800">{travelerCount}</span>
                <span className="text-[10px] text-slate-500 font-medium">travelers</span>
              </div>
              <div className="w-px h-8 bg-slate-200 self-center" />
              <div className="flex flex-col items-center">
                <span className="text-base font-black text-slate-800">{statRight}</span>
                <span className="text-[10px] text-slate-500 font-medium">{statRightLabel}</span>
              </div>
            </div>
            <Link
              href="/"
              className="bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl whitespace-nowrap flex-none hover:bg-slate-800 transition-colors"
            >
              Open Trip →
            </Link>
          </div>

          {/* Packing List ingress */}
          <button
            onClick={() => router.push("/packing")}
            className="w-full flex items-center gap-3 px-4 py-3 border-t border-slate-100 bg-white hover:bg-slate-50 transition-colors"
          >
            <span className="text-base">🧳</span>
            <div className="flex-1 text-left">
              <p className="text-xs font-bold text-slate-700">Packing List</p>
              <p className="text-[10px] text-slate-400">Tailored to your {tripTitle} itinerary</p>
            </div>
            <span className="text-slate-300 text-sm">›</span>
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════
          TODAY AT A GLANCE
      ══════════════════════════════════════ */}
      {isActive ? (
        <div className="bg-sky-50 border border-sky-100 rounded-2xl px-4 py-3.5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold text-sky-600 uppercase tracking-widest">Today at a Glance</p>
            <Link href="/" className="text-[10px] font-semibold text-sky-600">
              See full day →
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {todayItems.map((a, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <span className="text-base w-6 text-center flex-none">{a.emoji}</span>
                <p className="flex-1 text-sm font-medium text-slate-700 truncate">{a.title}</p>
                <span className="text-xs text-slate-400 flex-none">{a.time}</span>
              </div>
            ))}
          </div>
        </div>
      ) : isUpcoming ? (
        <div className="bg-sky-50 border border-sky-100 rounded-2xl px-4 py-4 flex items-center gap-3">
          <span className="text-2xl">🌺</span>
          <div>
            <p className="text-sm font-bold text-slate-800">Trip starts in {tripInfo?.daysUntilTrip ?? "—"} days</p>
            <p className="text-xs text-slate-400 mt-0.5">Your {tripTitle} itinerary is ready to explore</p>
          </div>
          <Link href="/" className="ml-auto text-[10px] font-bold text-sky-600 whitespace-nowrap flex-none">
            View →
          </Link>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-4 flex items-center gap-3">
          <span className="text-2xl">✈️</span>
          <div>
            <p className="text-sm font-bold text-slate-800">Trip complete!</p>
            <p className="text-xs text-slate-400 mt-0.5">Hope {tripTitle} was amazing. What&apos;s next?</p>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          UPCOMING TRIPS
      ══════════════════════════════════════ */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-base font-bold text-slate-900">Upcoming Trips</p>
          <span className="text-xs font-semibold text-slate-400">{upcomingTrips.length} planned</span>
        </div>
        <div className="flex flex-col gap-3">
          {upcomingTrips.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center">
              <p className="text-sm font-bold text-slate-700">No future trips planned yet</p>
              <p className="mt-1 text-xs text-slate-400">Create one when you are ready to sketch the next adventure.</p>
            </div>
          ) : (
            upcomingTrips.map((trip) => (
              <button
                key={trip.id}
                onClick={() => openEditTrip(trip)}
                className="bg-white rounded-2xl border border-dashed border-slate-200 overflow-hidden text-left w-full active:scale-[0.99] transition-transform"
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
                  <div className="absolute top-2.5 right-3 bg-white/20 backdrop-blur-sm border border-white/30 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Edit
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 px-3 pb-2.5 flex items-end justify-between">
                    <div>
                      <p className="text-sm font-bold text-white leading-tight">{trip.title}</p>
                      <p className="text-[11px] text-white/70 mt-0.5">{getStoredTripSubtitle(trip)}</p>
                    </div>
                    <span className="text-lg">{trip.emoji}</span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Plan a new trip CTA ── */}
      <button
        onClick={() => setShowPlanSheet(true)}
        className="flex items-center justify-center gap-2.5 w-full bg-white border-2 border-dashed border-slate-300 rounded-2xl py-4 text-sm font-bold text-slate-600 hover:border-sky-400 hover:text-sky-600 transition-colors"
      >
        <span className="w-6 h-6 rounded-full border-2 border-current flex items-center justify-center text-sm leading-none font-bold flex-none">+</span>
        Plan a new trip
      </button>

    </div>
  );
}
