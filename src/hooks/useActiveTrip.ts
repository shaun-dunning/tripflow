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

function makeInviteCode(title: string): string {
  const prefix = title
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 5)
    .toUpperCase() || "TRIP";
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}${suffix}`;
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

    const inviteCode = makeInviteCode(input.title);
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .insert({
        title: input.title.trim(),
        destination: input.destination.trim(),
        start_date: input.startDate,
        end_date: input.endDate,
        created_by: user.id,
        invite_code: inviteCode,
        cover_photo: "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=900&h=500&fit=crop&q=85",
      })
      .select("id, title, destination, start_date, end_date, invite_code, cover_photo")
      .single();

    if (tripError) throw new Error(tripError.message);
    if (!trip) throw new Error("Trip could not be created.");

    const { error: travelerError } = await supabase.from("travelers").insert({
      trip_id: trip.id,
      user_id: user.id,
      name: input.travelerName.trim() || user.email?.split("@")[0] || "Trip organizer",
      avatar: input.avatar ?? "🧳",
      role: "Trip Organizer",
      status: "active",
      is_me: true,
    });

    if (travelerError) throw new Error(travelerError.message);
    localStorage.setItem(ACTIVE_TRIP_KEY, trip.id);
    await loadTrips();
    return trip as ActiveTrip;
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
