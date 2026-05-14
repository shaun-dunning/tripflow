"use client";

import { useState, useEffect, useRef } from "react";

export type TravelInfo = {
  durationMin: number;
  mapsUrl: string;
  estimated: boolean;
};

export type TravelTimeResult = {
  info: TravelInfo | null;
  loading: boolean;
};

// ── Static keyword lookup for known Maui places ───────────────────────────────
// Fast-path: no network call needed when origin is Sheraton Ka'anapali.
const SHERATON = { lat: 20.9236, lng: -156.6941 };

type StaticPlace = {
  keywords: string[];
  driveMin: number;
  lat: number;
  lng: number;
  estimated?: boolean;
};

const MAUI_PLACES: StaticPlace[] = [
  { keywords: ["molokini"],                            driveMin: 45, lat: 20.6317, lng: -156.4969 },
  { keywords: ["mama's fish", "mamas fish"],           driveMin: 35, lat: 20.9394, lng: -156.3153 },
  { keywords: ["twin falls", "road to hana", "hana"],  driveMin: 90, lat: 20.8980, lng: -156.2497 },
  { keywords: ["wai'anapanapa", "black sand"],         driveMin: 120, lat: 20.7617, lng: -156.0001 },
  { keywords: ["haleakala", "haleakalā"],              driveMin: 75, lat: 20.7097, lng: -156.2535 },
  { keywords: ["paia", "pāia"],                        driveMin: 40, lat: 20.9158, lng: -156.3695 },
  { keywords: ["old lahaina luau", "luau"],            driveMin: 10, lat: 20.8786, lng: -156.6794 },
  { keywords: ["upcountry", "kula", "surfing goat"],   driveMin: 55, lat: 20.7603, lng: -156.3317 },
  { keywords: ["duke's beach", "dukes beach", "duke's", "dukes"], driveMin: 4, lat: 20.9322, lng: -156.6919 },
  { keywords: ["merriman's", "merrimans"],             driveMin: 10, lat: 21.0013, lng: -156.6662 },
  { keywords: ["kapalua"],                             driveMin: 8, lat: 20.9989, lng: -156.6703 },
  { keywords: ["napili"],                              driveMin: 7, lat: 20.9964, lng: -156.6676, estimated: true },
  { keywords: ["monkeypod"],                           driveMin: 4, lat: 20.8896, lng: -156.6616 },
  { keywords: ["maalaea", "maʻalaea"],                 driveMin: 45, lat: 20.7931, lng: -156.5017, estimated: true },
  { keywords: ["maui ocean center"],                   driveMin: 20, lat: 20.7931, lng: -156.5017 },
  { keywords: ["ululani"],                             driveMin: 5, lat: 20.9158, lng: -156.6758 },
  { keywords: ["andaz", "wailea"],                     driveMin: 30, lat: 20.6913, lng: -156.4427 },
  { keywords: ["kihei", "kīhei"],                      driveMin: 35, lat: 20.7644, lng: -156.4450, estimated: true },
  { keywords: ["down the hatch", "lahaina"],           driveMin: 14, lat: 20.8786, lng: -156.6794 },
  { keywords: ["ka'anapali beach", "kaanapali beach"], driveMin: 2, lat: 20.9244, lng: -156.6927 },
  { keywords: ["ka'anapali", "kaanapali"],             driveMin: 5, lat: 20.9244, lng: -156.6927, estimated: true },
  { keywords: ["sheraton"],                            driveMin: 0, lat: 20.9236, lng: -156.6941 },
  { keywords: ["airport", "ogg", "kahului"],           driveMin: 25, lat: 20.8986, lng: -156.4305 },
];

function latLngNear(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
  thresholdDeg = 0.05
): boolean {
  return (
    Math.abs(a.lat - b.lat) < thresholdDeg &&
    Math.abs(a.lng - b.lng) < thresholdDeg
  );
}

function mapsUrlFromCoords(
  oLat: number,
  oLng: number,
  dLat: number,
  dLng: number
): string {
  const isApple =
    typeof navigator !== "undefined" &&
    /iphone|ipad|mac/i.test(navigator.userAgent);
  return isApple
    ? `maps://maps.apple.com/?saddr=${oLat},${oLng}&daddr=${dLat},${dLng}&dirflg=d`
    : `https://www.google.com/maps/dir/?api=1&origin=${oLat},${oLng}&destination=${dLat},${dLng}&travelmode=driving`;
}

function mapsUrlFromAddress(
  oLat: number,
  oLng: number,
  destination: string
): string {
  const isApple =
    typeof navigator !== "undefined" &&
    /iphone|ipad|mac/i.test(navigator.userAgent);
  const dest = encodeURIComponent(destination);
  return isApple
    ? `maps://maps.apple.com/?saddr=${oLat},${oLng}&daddr=${dest}&dirflg=d`
    : `https://www.google.com/maps/dir/?api=1&origin=${oLat},${oLng}&destination=${dest}&travelmode=driving`;
}

function explicitDriveMin(text: string): number | null {
  const m = text.match(/(\d{1,3})\s*(?:min|minute|minutes)\s*(?:drive|away)?/i);
  return m ? Number(m[1]) : null;
}

/** Synchronous lookup for known Maui places (fast path). */
function staticLookup(
  text: string,
  origin: { lat: number; lng: number }
): TravelInfo | null {
  // Only use the static table when origin is near Sheraton Ka'anapali
  if (!latLngNear(origin, SHERATON)) return null;

  const lower = text.toLowerCase();
  const match = MAUI_PLACES.find((p) =>
    p.keywords.some((k) => lower.includes(k))
  );
  const explicit = explicitDriveMin(text);

  if (match) {
    const driveMin = explicit ?? match.driveMin;
    return {
      durationMin: driveMin,
      mapsUrl: mapsUrlFromCoords(origin.lat, origin.lng, match.lat, match.lng),
      estimated: match.estimated === true || explicit !== null,
    };
  }

  if (explicit !== null) {
    return {
      durationMin: explicit,
      mapsUrl: mapsUrlFromAddress(origin.lat, origin.lng, text),
      estimated: true,
    };
  }

  return null;
}

// ── Client-side API response cache ────────────────────────────────────────────
const apiCache = new Map<string, TravelInfo | null>();

type ItemLike = {
  title: string;
  notes?: string;
  reservation?: boolean;
};

/**
 * Returns travel info for an agenda item.
 *
 * Sync fast-path: returns immediately for known Maui places.
 * Async fallback: fetches /api/travel-time for reservations at other origins.
 */
export function useTravelTime(
  item: ItemLike,
  origin: { lat: number; lng: number } | null
): TravelTimeResult {
  const text = `${item.title} ${item.notes ?? ""}`;

  // Always try the static table first — zero network cost
  const staticInfo = origin ? staticLookup(text, origin) : null;

  const [apiInfo, setApiInfo] = useState<TravelInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    // No need for API call if static lookup succeeded
    if (staticInfo) {
      setApiInfo(null);
      setLoading(false);
      fetchedRef.current = false;
      return;
    }
    // Only fetch for reservations (not every item) to limit API load
    if (!item.reservation || !origin) return;
    if (fetchedRef.current) return;

    const destination = item.title.trim();
    const cacheKey = `${origin.lat.toFixed(4)},${origin.lng.toFixed(4)}|${destination}`;

    if (apiCache.has(cacheKey)) {
      setApiInfo(apiCache.get(cacheKey) ?? null);
      return;
    }

    fetchedRef.current = true;
    setLoading(true);

    const params = new URLSearchParams({
      originLat: origin.lat.toString(),
      originLng: origin.lng.toString(),
      destination,
    });

    fetch(`/api/travel-time?${params}`)
      .then((r) => r.json())
      .then((data: { durationMin?: number | null; estimated?: boolean }) => {
        if (data.durationMin == null) {
          apiCache.set(cacheKey, null);
          setApiInfo(null);
          return;
        }
        const info: TravelInfo = {
          durationMin: data.durationMin,
          mapsUrl: mapsUrlFromAddress(origin.lat, origin.lng, destination),
          estimated: data.estimated ?? true,
        };
        apiCache.set(cacheKey, info);
        setApiInfo(info);
      })
      .catch(() => {
        apiCache.set(cacheKey, null);
        setApiInfo(null);
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.title, item.notes, item.reservation, origin?.lat, origin?.lng, staticInfo]);

  return {
    info: staticInfo ?? apiInfo,
    loading: !staticInfo && loading,
  };
}

// Re-export SHERATON so the existing page.tsx usage continues to work
export { SHERATON };
