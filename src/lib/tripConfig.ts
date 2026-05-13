export const TRIP_ID = "a1b2c3d4-0000-0000-0000-000000000001";
export const INVITE_CODE = "MAUI26";
export const APP_PREVIEW_INVITE_CODES = ["TRIPFLOW", "TRYTRIPFLOW", "DEMO"];
export const PREVIEW_INVITE_KEY = "tripflow-preview-invite";
export const FAMILY_INVITE_KEY = "tripflow-family-invite";
export const ACTIVE_TRIP_KEY = "tripflow-active-trip-id";

export const UPCOMING_TRIPS_KEY = "tripflow-upcoming-trips";
export const ARCHIVED_TRIPS_KEY = "tripflow-archived-trips";

export type StoredTrip = {
  id: number;
  title: string;
  destination: string;
  startDate: string;
  nights: number;
  travelersCount: number;
  emoji: string;
  photo: string;
  photoAlt: string;
  subtitle?: string;
};

export const DEFAULT_UPCOMING_TRIPS: StoredTrip[] = [
  {
    id: 1,
    title: "Christmas in NYC",
    destination: "New York City",
    startDate: "2026-12-20",
    nights: 5,
    travelersCount: 4,
    emoji: "🎄",
    photo: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=600&h=300&fit=crop&q=80",
    photoAlt: "New York City skyline",
  },
  {
    id: 2,
    title: "Spring Break · Cabo",
    destination: "Cabo San Lucas",
    startDate: "2027-03-15",
    nights: 7,
    travelersCount: 4,
    emoji: "🌊",
    photo: "https://images.unsplash.com/photo-1510097467424-192d713fd8b2?w=600&h=300&fit=crop&q=80",
    photoAlt: "Cabo San Lucas beach",
  },
  {
    id: 3,
    title: "Summer Euro Trip",
    destination: "Europe",
    startDate: "2027-07-01",
    nights: 14,
    travelersCount: 4,
    emoji: "✈️",
    photo: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=600&h=300&fit=crop&q=80",
    photoAlt: "European city",
  },
];

export function buildStoredTripSubtitle(startDate: string, nights: number, travelersCount: number): string {
  const parts: string[] = [];
  if (startDate) {
    const d = new Date(startDate + "T12:00:00");
    parts.push(d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }));
  }
  if (nights > 0) parts.push(`${nights} night${nights !== 1 ? "s" : ""}`);
  if (travelersCount > 0) parts.push(`${travelersCount} traveler${travelersCount !== 1 ? "s" : ""}`);
  return parts.join(" · ") || "Still planning";
}

export function getStoredTripSubtitle(trip: StoredTrip): string {
  return trip.subtitle ?? buildStoredTripSubtitle(trip.startDate, trip.nights, trip.travelersCount);
}

export function normalizeStoredTrip(value: unknown, fallbackPhoto?: { url: string; alt: string }): StoredTrip | null {
  if (!value || typeof value !== "object") return null;
  const trip = value as Partial<StoredTrip>;
  if (typeof trip.title !== "string" || !trip.title.trim()) return null;

  return {
    id: typeof trip.id === "number" ? trip.id : Date.now(),
    title: trip.title,
    destination: typeof trip.destination === "string" ? trip.destination : "",
    startDate: typeof trip.startDate === "string" ? trip.startDate : "",
    nights: typeof trip.nights === "number" ? trip.nights : 0,
    travelersCount: typeof trip.travelersCount === "number" ? trip.travelersCount : 0,
    emoji: typeof trip.emoji === "string" ? trip.emoji : "✈️",
    photo: typeof trip.photo === "string" ? trip.photo : fallbackPhoto?.url ?? DEFAULT_UPCOMING_TRIPS[0].photo,
    photoAlt: typeof trip.photoAlt === "string" ? trip.photoAlt : fallbackPhoto?.alt ?? "Trip destination",
    subtitle: typeof trip.subtitle === "string" ? trip.subtitle : undefined,
  };
}

export function isDefaultUpcomingTrips(trips: StoredTrip[]): boolean {
  return trips.length === DEFAULT_UPCOMING_TRIPS.length && trips.every((trip, index) => {
    const sample = DEFAULT_UPCOMING_TRIPS[index];
    return (
      trip.title === sample.title &&
      trip.destination === sample.destination &&
      trip.startDate === sample.startDate &&
      trip.nights === sample.nights
    );
  });
}

export function readStoredTrips(fallback: StoredTrip[] = []): StoredTrip[] {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(UPCOMING_TRIPS_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return fallback;
    const normalized = parsed.map((item) => normalizeStoredTrip(item)).filter((item): item is StoredTrip => item !== null);
    if (isDefaultUpcomingTrips(normalized)) return fallback;
    return normalized.length > 0 ? normalized : fallback;
  } catch {
    return fallback;
  }
}
