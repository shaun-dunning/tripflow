"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ACTIVE_TRIP_KEY, PREVIEW_INVITE_KEY } from "@/lib/tripConfig";
import type { User } from "@supabase/supabase-js";

export type ActiveTrip = {
  id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  invite_code: string | null;
  cover_photo: string | null;
};

export type ActiveTripMembership = {
  id: string;
  trip_id: string;
  role: string;
  status: string;
  trip: ActiveTrip;
};

type ActiveTripStatus = "checking" | "ready" | "no-trip" | "preview";

type CreateTripInput = {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  travelerName: string;
  avatar?: string;
};

function normalizeTrip(value: unknown): ActiveTrip | null {
  if (!value || typeof value !== "object") return null;
  const trip = value as Partial<ActiveTrip>;
  if (!trip.id || !trip.title || !trip.destination || !trip.start_date || !trip.end_date) return null;
  return {
    id: trip.id,
    title: trip.title,
    destination: trip.destination,
    start_date: trip.start_date,
    end_date: trip.end_date,
    invite_code: trip.invite_code ?? null,
    cover_photo: trip.cover_photo ?? null,
  };
}

export function useActiveTrip(user: User | null) {
  const [status, setStatus] = useState<ActiveTripStatus>("checking");
  const [memberships, setMemberships] = useState<ActiveTripMembership[]>([]);
  const [activeTrip, setActiveTrip] = useState<ActiveTrip | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadTrips = useCallback(async () => {
    setError(null);

    if (typeof window !== "undefined" && localStorage.getItem(PREVIEW_INVITE_KEY) === "1") {
      setStatus("preview");
      setMemberships([]);
      setActiveTrip(null);
      return;
    }

    if (!user) {
      setStatus("checking");
      setMemberships([]);
      setActiveTrip(null);
      return;
    }

    setStatus("checking");
    const { data, error: travelerError } = await supabase
      .from("travelers")
      .select("id, trip_id, role, status, trips(id, title, destination, start_date, end_date, invite_code, cover_photo)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (travelerError) {
      setError(travelerError.message);
      setStatus("no-trip");
      setMemberships([]);
      setActiveTrip(null);
      return;
    }

    const rows = (data ?? [])
      .map((row) => {
        const trip = normalizeTrip(Array.isArray(row.trips) ? row.trips[0] : row.trips);
        if (!trip) return null;
        return {
          id: row.id,
          trip_id: row.trip_id,
          role: row.role,
          status: row.status,
          trip,
        };
      })
      .filter((row): row is ActiveTripMembership => row !== null);

    if (rows.length === 0) {
      if (typeof window !== "undefined") localStorage.removeItem(ACTIVE_TRIP_KEY);
      setMemberships([]);
      setActiveTrip(null);
      setStatus("no-trip");
      return;
    }

    const storedTripId = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_TRIP_KEY) : null;
    const selected = rows.find((row) => row.trip_id === storedTripId) ?? rows[0];
    if (typeof window !== "undefined") localStorage.setItem(ACTIVE_TRIP_KEY, selected.trip_id);
    setMemberships(rows);
    setActiveTrip(selected.trip);
    setStatus("ready");
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      await loadTrips();
      if (cancelled) return;
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [loadTrips]);

  const selectTrip = useCallback((tripId: string) => {
    const membership = memberships.find((row) => row.trip_id === tripId);
    if (!membership) return;
    localStorage.setItem(ACTIVE_TRIP_KEY, tripId);
    setActiveTrip(membership.trip);
  }, [memberships]);

  const createTrip = useCallback(async (input: CreateTripInput) => {
    if (!user) throw new Error("Sign in before creating a trip.");

    const { data: trip, error: tripError } = await supabase.rpc("create_trip_with_organizer", {
      trip_title: input.title.trim(),
      trip_destination: input.destination.trim(),
      trip_start_date: input.startDate,
      trip_end_date: input.endDate,
      traveler_name: input.travelerName.trim() || user.email?.split("@")[0] || "Trip organizer",
      traveler_avatar: input.avatar ?? "🧳",
      trip_cover_photo: "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=900&h=500&fit=crop&q=85",
    });

    if (tripError) throw new Error(tripError.message);
    const createdTrip = Array.isArray(trip) ? trip[0] : trip;
    if (!createdTrip) throw new Error("Trip could not be created.");

    localStorage.setItem(ACTIVE_TRIP_KEY, createdTrip.id);
    await loadTrips();
    return createdTrip as ActiveTrip;
  }, [loadTrips, user]);

  return {
    status,
    error,
    memberships,
    activeTrip,
    activeTripId: activeTrip?.id ?? null,
    isChecking: status === "checking",
    isReady: status === "ready",
    isPreview: status === "preview",
    hasNoTrip: status === "no-trip",
    selectTrip,
    createTrip,
    reloadTrips: loadTrips,
  };
}
