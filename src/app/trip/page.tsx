"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getTripDateInfo, getDayStatus, formatDateRange, type TripDateInfo } from "@/lib/tripDates";
import { ResilientState } from "@/components/ResilientState";
import TripAccessGate from "@/components/TripAccessGate";
import FirstTripSetup from "@/components/FirstTripSetup";
import { useAuth } from "@/hooks/useAuth";
import { useActiveTrip } from "@/hooks/useActiveTrip";
import {
  ARCHIVED_TRIPS_KEY,
  DEMO_TRIP_ID,
  UPCOMING_TRIPS_KEY,
  buildInviteUrl,
  getStoredTripSubtitle,
  isDefaultUpcomingTrips,
  normalizeStoredTrip,
  type StoredTrip,
} from "@/lib/tripConfig";
const PACKING_TOTAL = 23;
const DEMO_PACKED_COUNT = 5;
const PACKING_STORAGE_KEY = "daywave-packing-v2-maui26";
const LEGACY_PACKING_STORAGE_KEY = "daywave-packing-maui26";

type Traveler = {
  id: string;
  name: string;
  avatar: string;
  avatar_url: string | null;
  status: string;
};

type Activity = { emoji: string; label: string };
type Day = {
  id: number;
  date: string;
  label: string;
  theme: string;
  photo: string;
  photoAlt: string;
  activities: Activity[];
  status: "past" | "today" | "upcoming";
  weather: string;
  temp: string;
};

type TripMeta = {
  title: string;
  subtitle: string;
  destination: string;
  coverPhoto: string;
  startDate: string;
  endDate: string;
};

type TripWeatherDay = {
  date: string;
  dayLabel: string;
  emoji: string;
  high: number;
  low: number;
  precip: number;
};

function wmoToEmoji(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 2) return "🌤️";
  if (code === 3) return "⛅";
  if (code <= 48) return "🌫️";
  if (code <= 55) return "🌦️";
  if (code <= 65) return "🌧️";
  if (code <= 75) return "❄️";
  if (code <= 82) return "🌧️";
  return "⛈️";
}

type TodayGlanceItem = { emoji: string; title: string; time: string };

type UpcomingTrip = StoredTrip;

type PhotoOption = { url: string; alt: string };

const DEMO_SIDE_TRIPS: UpcomingTrip[] = [
  {
    id: 9000,
    title: "Labor Day · San Diego",
    destination: "San Diego",
    startDate: "2026-09-04",
    nights: 3,
    travelersCount: 2,
    emoji: "🌴",
    photo: "https://images.unsplash.com/photo-1535498730771-e735b998cd64?w=600&h=300&fit=crop&q=80",
    photoAlt: "San Diego coastline",
  },
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

// ── Destination photo library ──────────────────────────────────────────────
const DESTINATION_PHOTOS: { keywords: string[]; photos: PhotoOption[] }[] = [
  {
    keywords: ["new york", "nyc", "manhattan"],
    photos: [
      { url: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=600&h=300&fit=crop&q=80", alt: "New York City skyline" },
      { url: "https://images.unsplash.com/photo-1534430480872-3498386e7856?w=600&h=300&fit=crop&q=80", alt: "Times Square at night" },
      { url: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=600&h=300&fit=crop&q=80", alt: "Brooklyn Bridge" },
    ],
  },
  {
    keywords: ["paris", "france"],
    photos: [
      { url: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&h=300&fit=crop&q=80", alt: "Eiffel Tower Paris" },
      { url: "https://images.unsplash.com/photo-1549144511-f099e773c147?w=600&h=300&fit=crop&q=80", alt: "Paris streets" },
      { url: "https://images.unsplash.com/photo-1431274172761-fca41d930114?w=600&h=300&fit=crop&q=80", alt: "Paris at dusk" },
    ],
  },
  {
    keywords: ["tokyo", "japan"],
    photos: [
      { url: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&h=300&fit=crop&q=80", alt: "Tokyo city lights" },
      { url: "https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=600&h=300&fit=crop&q=80", alt: "Tokyo street" },
      { url: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=600&h=300&fit=crop&q=80", alt: "Tokyo skyline" },
    ],
  },
  {
    keywords: ["bali", "indonesia"],
    photos: [
      { url: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600&h=300&fit=crop&q=80", alt: "Bali rice terraces" },
      { url: "https://images.unsplash.com/photo-1552733407-5d5c46c3bb3b?w=600&h=300&fit=crop&q=80", alt: "Bali temple" },
      { url: "https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=600&h=300&fit=crop&q=80", alt: "Bali beach" },
    ],
  },
  {
    keywords: ["london", "england", "uk"],
    photos: [
      { url: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&h=300&fit=crop&q=80", alt: "London Big Ben" },
      { url: "https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=600&h=300&fit=crop&q=80", alt: "London Tower Bridge" },
      { url: "https://images.unsplash.com/photo-1490642914619-7955a3fd483c?w=600&h=300&fit=crop&q=80", alt: "London skyline" },
    ],
  },
  {
    keywords: ["cabo", "mexico", "cancun", "tulum", "playa"],
    photos: [
      { url: "https://images.unsplash.com/photo-1510097467424-192d713fd8b2?w=600&h=300&fit=crop&q=80", alt: "Cabo San Lucas" },
      { url: "https://images.unsplash.com/photo-1587595431973-160d0d94add1?w=600&h=300&fit=crop&q=80", alt: "Mexico beach" },
      { url: "https://images.unsplash.com/photo-1552088952-5a6f2e10c499?w=600&h=300&fit=crop&q=80", alt: "Mexico resort" },
    ],
  },
  {
    keywords: ["italy", "rome", "florence", "venice", "amalfi"],
    photos: [
      { url: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=600&h=300&fit=crop&q=80", alt: "Colosseum Rome" },
      { url: "https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=600&h=300&fit=crop&q=80", alt: "Italian coast" },
      { url: "https://images.unsplash.com/photo-1529260830199-42c24126f198?w=600&h=300&fit=crop&q=80", alt: "Venice canals" },
    ],
  },
  {
    keywords: ["barcelona", "spain", "madrid", "seville"],
    photos: [
      { url: "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=600&h=300&fit=crop&q=80", alt: "Barcelona streets" },
      { url: "https://images.unsplash.com/photo-1464790719320-516ecd75af6c?w=600&h=300&fit=crop&q=80", alt: "Barcelona architecture" },
      { url: "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=600&h=300&fit=crop&q=80", alt: "Spain coastline" },
    ],
  },
  {
    keywords: ["hawaii", "maui", "oahu", "kauai", "honolulu"],
    photos: [
      { url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=300&fit=crop&q=80", alt: "Hawaii beach" },
      { url: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=600&h=300&fit=crop&q=80", alt: "Hawaii bay" },
      { url: "https://images.unsplash.com/photo-1566895291281-ea63efd4bdab?w=600&h=300&fit=crop&q=80", alt: "Hawaii sunset" },
    ],
  },
  {
    keywords: ["caribbean", "bahamas", "jamaica", "barbados", "st lucia"],
    photos: [
      { url: "https://images.unsplash.com/photo-1548574505-5e239809ee19?w=600&h=300&fit=crop&q=80", alt: "Caribbean beach" },
      { url: "https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?w=600&h=300&fit=crop&q=80", alt: "Caribbean water" },
      { url: "https://images.unsplash.com/photo-1581889470536-467bdbe30cd0?w=600&h=300&fit=crop&q=80", alt: "Caribbean resort" },
    ],
  },
  {
    keywords: ["mountain", "alps", "colorado", "switzerland", "skiing", "ski"],
    photos: [
      { url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&h=300&fit=crop&q=80", alt: "Mountain peaks" },
      { url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=300&fit=crop&q=80", alt: "Alpine scenery" },
      { url: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600&h=300&fit=crop&q=80", alt: "Snowy mountains" },
    ],
  },
  {
    keywords: ["disney", "orlando", "universal"],
    photos: [
      { url: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&h=300&fit=crop&q=80", alt: "Theme park fireworks" },
      { url: "https://images.unsplash.com/photo-1575183672975-c6b6a4f82c9c?w=600&h=300&fit=crop&q=80", alt: "Theme park" },
    ],
  },
  {
    keywords: ["australia", "sydney", "melbourne"],
    photos: [
      { url: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=600&h=300&fit=crop&q=80", alt: "Sydney Opera House" },
      { url: "https://images.unsplash.com/photo-1524293581917-878a6d017c71?w=600&h=300&fit=crop&q=80", alt: "Sydney Harbour" },
    ],
  },
  {
    keywords: ["europe"],
    photos: [
      { url: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=600&h=300&fit=crop&q=80", alt: "European city" },
      { url: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=600&h=300&fit=crop&q=80", alt: "European street" },
      { url: "https://images.unsplash.com/photo-1471922694854-ff1b63b20054?w=600&h=300&fit=crop&q=80", alt: "European coast" },
    ],
  },
];

const DEFAULT_PHOTOS: PhotoOption[] = [
  { url: "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=600&h=300&fit=crop&q=80", alt: "Travel destination" },
  { url: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=600&h=300&fit=crop&q=80", alt: "Travel adventure" },
  { url: "https://images.unsplash.com/photo-1503220317375-aaad61436b1b?w=600&h=300&fit=crop&q=80", alt: "Journey ahead" },
];

function getPhotosForDestination(destination: string): PhotoOption[] {
  if (!destination.trim()) return DEFAULT_PHOTOS;
  const lower = destination.toLowerCase();
  for (const entry of DESTINATION_PHOTOS) {
    if (entry.keywords.some((kw) => lower.includes(kw))) return entry.photos;
  }
  return DEFAULT_PHOTOS;
}

function buildEmptyTripDays(startDate: string, endDate: string, destination: string): Day[] {
  const start = new Date(startDate + "T12:00:00");
  const end = new Date(endDate + "T12:00:00");
  const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1);
  const photo = getPhotosForDestination(destination)[0] ?? DEFAULT_PHOTOS[0];
  const dateInfo = getTripDateInfo(startDate, endDate);

  return Array.from({ length: totalDays }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const dayNumber = index + 1;
    return {
      id: dayNumber,
      date: date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
      label: `Day ${dayNumber}`,
      theme: dayNumber === 1 ? "Arrival day" : dayNumber === totalDays ? "Departure day" : "Open day",
      photo: photo.url,
      photoAlt: photo.alt,
      activities: [],
      status: getDayStatus(dayNumber, dateInfo),
      weather: "",
      temp: "",
    };
  });
}

function normalizeUpcomingTrip(value: unknown): UpcomingTrip | null {
  const destination = value && typeof value === "object" && typeof (value as Partial<UpcomingTrip>).destination === "string"
    ? (value as Partial<UpcomingTrip>).destination ?? ""
    : "";
  const photos = getPhotosForDestination(destination);
  return normalizeStoredTrip(value, photos[0] ?? DEFAULT_PHOTOS[0]);
}

function normalizeArchivedTrip(value: unknown): ArchivedTrip | null {
  if (!value || typeof value !== "object") return null;
  const trip = value as Partial<ArchivedTrip>;
  if (typeof trip.title !== "string" || !trip.title.trim()) return null;
  return {
    id: typeof trip.id === "number" ? trip.id : Date.now(),
    title: trip.title,
    destination: typeof trip.destination === "string" ? trip.destination : "",
    dateRange: typeof trip.dateRange === "string" ? trip.dateRange : "Past trip",
    emoji: typeof trip.emoji === "string" ? trip.emoji : "✈️",
    photo: typeof trip.photo === "string" ? trip.photo : DEFAULT_PHOTOS[0].url,
    photoAlt: typeof trip.photoAlt === "string" ? trip.photoAlt : "Archived trip",
    highlight: typeof trip.highlight === "string" ? trip.highlight : "",
  };
}

function isLegacyArchivedTrips(trips: ArchivedTrip[]): boolean {
  return trips.length === INITIAL_ARCHIVED.length && trips.every((trip, index) => {
    const sample = INITIAL_ARCHIVED[index];
    return (
      trip.title === sample.title &&
      trip.destination === sample.destination &&
      trip.dateRange === sample.dateRange
    );
  });
}

function readStoredList<T>(key: string, normalize: (value: unknown) => T | null, fallback: T[], isLegacyList?: (items: T[]) => boolean): T[] {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return fallback;
    const normalized = parsed.map(normalize).filter((item): item is T => item !== null);
    if (isLegacyList?.(normalized)) return fallback;
    return normalized.length > 0 ? normalized : fallback;
  } catch {
    return fallback;
  }
}

const TRIP_EMOJIS = ["✈️", "🏖️", "🏔️", "🌍", "🎄", "🌊", "🏕️", "🗼", "🌺", "🎭"];

type ArchivedTrip = {
  id: number;
  title: string;
  destination: string;
  dateRange: string;
  emoji: string;
  photo: string;
  photoAlt: string;
  highlight: string;
};

const INITIAL_ARCHIVED: ArchivedTrip[] = [
  {
    id: 100,
    title: "Big Island Adventure",
    destination: "Kona, Hawaii",
    dateRange: "Aug 2025 · 6 nights · 4 travelers",
    emoji: "🌋",
    photo: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=600&h=300&fit=crop&q=80",
    photoAlt: "Hawaii volcano landscape",
    highlight: "Night hike to the lava flow",
  },
  {
    id: 101,
    title: "Spring Break · Disneyland",
    destination: "Anaheim, CA",
    dateRange: "Mar 2025 · 4 nights · 4 travelers",
    emoji: "🎡",
    photo: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&h=300&fit=crop&q=80",
    photoAlt: "Theme park fireworks",
    highlight: "Rode every ride in the park",
  },
  {
    id: 102,
    title: "Portland Weekend",
    destination: "Portland, OR",
    dateRange: "Nov 2024 · 3 nights · 2 travelers",
    emoji: "🌲",
    photo: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=600&h=300&fit=crop&q=80",
    photoAlt: "Pacific Northwest city",
    highlight: "Every coffee shop, every bridge",
  },
];

// Returns days until startDate (positive = future), null if no date or past
function getDaysUntil(startDate: string): number | null {
  if (!startDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(startDate + "T00:00:00");
  const diff = Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : null;
}

function getStoredPackingProgress(): { count: number; pct: number } {
  if (typeof window === "undefined") return { count: 0, pct: 0 };
  try {
    const raw = localStorage.getItem(PACKING_STORAGE_KEY);
    if (raw) {
      const items = JSON.parse(raw) as { packed?: boolean }[];
      if (Array.isArray(items)) {
        const total = items.length || PACKING_TOTAL;
        const count = items.filter((item) => item.packed).length;
        return { count, pct: Math.round((count / total) * 100) };
      }
    }

    const legacyRaw = localStorage.getItem(LEGACY_PACKING_STORAGE_KEY);
    if (!legacyRaw) return { count: 0, pct: 0 };
    const ids = JSON.parse(legacyRaw) as string[];
    const count = Array.isArray(ids) ? ids.length : 0;
    return { count, pct: Math.round((count / PACKING_TOTAL) * 100) };
  } catch {
    return { count: 0, pct: 0 };
  }
}

export default function TripPage() {
  const router = useRouter();
  const { user } = useAuth();
  const activeTrip = useActiveTrip(user);
  const [selected, setSelected] = useState<number | null>(null);
  const [trip, setTrip] = useState<TripMeta | null>(null);
  const [days, setDays] = useState<Day[]>([]);
  const [todayGlance, setTodayGlance] = useState<TodayGlanceItem[]>([]);
  const [tripDateInfo, setTripDateInfo] = useState<TripDateInfo | null>(null);
  const [travelers, setTravelers] = useState<Traveler[]>([]);
  const [loadIssue, setLoadIssue] = useState<string | null>(null);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savedTripToast, setSavedTripToast] = useState<string | null>(null);
  const [tripWeather, setTripWeather] = useState<TripWeatherDay[]>([]);

  // ── Trips lifecycle state ───────────────────────────────────────────────────
  const [tripPackingProgress, setTripPackingProgress] = useState(getStoredPackingProgress);
  const tripPackingPct = tripPackingProgress.pct;
  const tripPackingCount = tripPackingProgress.count;

  const [upcomingTrips, setUpcomingTrips] = useState<UpcomingTrip[]>(() =>
    readStoredList(UPCOMING_TRIPS_KEY, normalizeUpcomingTrip, [], isDefaultUpcomingTrips)
  );
  const [archivedTrips, setArchivedTrips] = useState<ArchivedTrip[]>(() =>
    readStoredList(ARCHIVED_TRIPS_KEY, normalizeArchivedTrip, [], isLegacyArchivedTrips)
  );
  const [showArchived, setShowArchived] = useState(false);

  // Edit sheet
  const [editingTrip, setEditingTrip] = useState<UpcomingTrip | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDestination, setEditDestination] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editNights, setEditNights] = useState(7);
  const [editTravelersCount, setEditTravelersCount] = useState(2);
  const [editEmoji, setEditEmoji] = useState("");
  const [editPhotoIdx, setEditPhotoIdx] = useState(0);
  const [editPhotoOptions, setEditPhotoOptions] = useState<PhotoOption[]>(DEFAULT_PHOTOS);

  // Plan new trip sheet
  const [showPlanSheet, setShowPlanSheet] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDestination, setNewDestination] = useState("");
  const [newStartDate, setNewStartDate] = useState("");
  const [newNights, setNewNights] = useState(7);
  const [newTravelersCount, setNewTravelersCount] = useState(2);

  useEffect(() => {
    async function loadPackingProgress() {
      const localProgress = getStoredPackingProgress();
      if (!activeTrip.activeTripId) {
        setTripPackingProgress(localProgress);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("packing_items")
          .select("packed")
          .eq("trip_id", activeTrip.activeTripId);

        if (error || !data?.length) {
          setTripPackingProgress(activeTrip.activeTripId === DEMO_TRIP_ID
            ? { count: DEMO_PACKED_COUNT, pct: Math.round((DEMO_PACKED_COUNT / PACKING_TOTAL) * 100) }
            : localProgress);
          return;
        }

        const count = data.filter((item) => item.packed).length;
        setTripPackingProgress({ count, pct: Math.round((count / data.length) * 100) });
      } catch {
        setTripPackingProgress(activeTrip.activeTripId === DEMO_TRIP_ID
          ? { count: DEMO_PACKED_COUNT, pct: Math.round((DEMO_PACKED_COUNT / PACKING_TOTAL) * 100) }
          : localProgress);
      }
    }

    void loadPackingProgress();
    const onFocus = () => void loadPackingProgress();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [activeTrip.activeTripId]);

  function openEditTrip(t: UpcomingTrip) {
    const photos = getPhotosForDestination(t.destination);
    const currentIdx = photos.findIndex((p) => p.url === t.photo);
    setEditingTrip(t);
    setEditTitle(t.title);
    setEditDestination(t.destination);
    setEditStartDate(t.startDate);
    setEditNights(t.nights);
    setEditTravelersCount(t.travelersCount);
    setEditEmoji(t.emoji);
    setEditPhotoOptions(photos);
    setEditPhotoIdx(currentIdx >= 0 ? currentIdx : 0);
  }

  function saveEditTrip() {
    if (!editingTrip) return;
    const photo = editPhotoOptions[editPhotoIdx] ?? editPhotoOptions[0];
    const savedTitle = editTitle || editingTrip.title;
    setUpcomingTrips((prev) =>
      prev.map((t) =>
        t.id === editingTrip.id
          ? {
              ...t,
              title: savedTitle,
              destination: editDestination,
              startDate: editStartDate,
              nights: editNights,
              travelersCount: editTravelersCount,
              emoji: editEmoji,
              photo: photo.url,
              photoAlt: photo.alt,
            }
          : t
      )
    );
    setEditingTrip(null);
    setSavedTripToast(savedTitle);
    setTimeout(() => setSavedTripToast(null), 2500);
  }

  function archivePlanningTrip() {
    if (!editingTrip) return;
    setArchivedTrips((prev) => [
      {
        id: editingTrip.id,
        title: editingTrip.title,
        destination: editingTrip.destination,
        dateRange: getStoredTripSubtitle(editingTrip),
        emoji: editingTrip.emoji,
        photo: editingTrip.photo,
        photoAlt: editingTrip.photoAlt,
        highlight: "",
      },
      ...prev,
    ]);
    setUpcomingTrips((prev) => prev.filter((t) => t.id !== editingTrip.id));
    setEditingTrip(null);
  }

  function deleteTrip() {
    if (!editingTrip) return;
    setUpcomingTrips((prev) => prev.filter((t) => t.id !== editingTrip.id));
    setEditingTrip(null);
  }

  function archiveTripById(t: UpcomingTrip) {
    setArchivedTrips((prev) => [{
      id: t.id,
      title: t.title,
      destination: t.destination,
      dateRange: getStoredTripSubtitle(t),
      emoji: t.emoji,
      photo: t.photo,
      photoAlt: t.photoAlt,
      highlight: "",
    }, ...prev]);
    setUpcomingTrips((prev) => prev.filter((trip) => trip.id !== t.id));
  }

  function addNewTrip() {
    if (!newTitle.trim()) return;
    const photos = getPhotosForDestination(newDestination);
    const photo = photos[0];
    setUpcomingTrips((prev) => [
      ...prev,
      {
        id: Date.now(),
        title: newTitle.trim(),
        destination: newDestination,
        startDate: newStartDate,
        nights: newNights,
        travelersCount: newTravelersCount,
        emoji: "✈️",
        photo: photo.url,
        photoAlt: photo.alt,
      },
    ]);
    setShowPlanSheet(false);
    setNewTitle(""); setNewDestination(""); setNewStartDate(""); setNewNights(7); setNewTravelersCount(2);
  }

  function getInviteLink() {
    const code = activeTrip.activeTrip?.invite_code ?? "";
    return buildInviteUrl(code);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(getInviteLink());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function shareLink() {
    const link = getInviteLink();
    if (navigator.share) {
      await navigator.share({
        title: `Join our ${trip?.title ?? "trip"} 🌺`,
        text: "Hey! Join our family trip on Daywave.",
        url: link,
      });
    } else {
      copyLink();
    }
  }

  useEffect(() => {
    if (activeTrip.activeTripId !== DEMO_TRIP_ID) return;
    setUpcomingTrips((prev) => {
      const existing = new Set(prev.map((trip) => trip.title));
      const missing = DEMO_SIDE_TRIPS.filter((trip) => !existing.has(trip.title));
      return missing.length > 0 ? [...missing, ...prev] : prev;
    });
  }, [activeTrip.activeTripId]);

  // Persist trip lifecycle data after lazy state has read client storage.
  useEffect(() => {
    try { localStorage.setItem(UPCOMING_TRIPS_KEY, JSON.stringify(upcomingTrips)); } catch { /* ignore */ }
  }, [upcomingTrips]);

  useEffect(() => {
    try { localStorage.setItem(ARCHIVED_TRIPS_KEY, JSON.stringify(archivedTrips)); } catch { /* ignore */ }
  }, [archivedTrips]);

  useEffect(() => {
    const destination = activeTrip.activeTrip?.destination.toLowerCase() ?? "";
    if (!destination.includes("maui") && !destination.includes("hawaii")) {
      queueMicrotask(() => setTripWeather([]));
      return;
    }

    const url =
      "https://api.open-meteo.com/v1/forecast" +
      "?latitude=20.9282&longitude=-156.6942" +
      "&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode" +
      "&timezone=Pacific%2FHonolulu&forecast_days=7&temperature_unit=fahrenheit";
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        const { time, temperature_2m_max, temperature_2m_min, precipitation_probability_max, weathercode } =
          data.daily as {
            time: string[];
            temperature_2m_max: number[];
            temperature_2m_min: number[];
            precipitation_probability_max: number[];
            weathercode: number[];
          };
        const today = new Date().toISOString().slice(0, 10);
        setTripWeather(
          time.map((date, i) => ({
            date,
            dayLabel: date === today ? "Today" : new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" }),
            emoji: wmoToEmoji(weathercode[i]),
            high: Math.round(temperature_2m_max[i]),
            low: Math.round(temperature_2m_min[i]),
            precip: Math.round(precipitation_probability_max[i]),
          }))
        );
      })
      .catch(() => { /* fail silently — no weather strip shown */ });
  }, [activeTrip.activeTrip?.destination]);

  useEffect(() => {
    if (!activeTrip.activeTripId) return;

    async function fetchTripData() {
      setLoadIssue(null);
      try {
      // Fetch trip meta
      const { data: tripData } = await supabase
        .from("trips")
        .select("*")
        .eq("id", activeTrip.activeTripId)
        .maybeSingle();

      let dateInfo: TripDateInfo | null = null;

      if (tripData) {
        dateInfo = getTripDateInfo(tripData.start_date, tripData.end_date);
        setTripDateInfo(dateInfo);
        setTrip({
          title: tripData.title,
          subtitle: `${formatDateRange(tripData.start_date, tripData.end_date)} · ${tripData.destination}`,
          destination: tripData.destination,
          coverPhoto: tripData.cover_photo ?? getPhotosForDestination(tripData.destination)[0]?.url ?? DEFAULT_PHOTOS[0].url,
          startDate: tripData.start_date,
          endDate: tripData.end_date,
        });
      }

      // Fetch trip days + agenda items
      const { data: tripDays } = await supabase
        .from("trip_days")
        .select("*, agenda_items(*)")
        .eq("trip_id", activeTrip.activeTripId)
        .order("day_number");

      // Fetch travelers
      const { data: travelerData } = await supabase
        .from("travelers")
        .select("id, name, avatar, avatar_url, status")
        .eq("trip_id", activeTrip.activeTripId)
        .order("created_at", { ascending: true });
      if (travelerData) setTravelers(travelerData as Traveler[]);

      if (tripDays?.length && dateInfo) {
        const mapped: Day[] = tripDays.map((td) => {
          const dayNum = td.day_number;
          const status = getDayStatus(dayNum, dateInfo!);

          // Use first 3 agenda items as activity pills.
          const activities: Activity[] = td.agenda_items?.length
            ? td.agenda_items
                .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
                .slice(0, 3)
                .map((ai: { emoji: string; title: string }) => ({ emoji: ai.emoji, label: ai.title.split("–")[0].trim() }))
            : [];

          // Parse date label e.g. "Arrival Day 🛬" → theme
          const labelParts = (td.label ?? "").split(" · ");
          const label = `Day ${dayNum}`;
          const theme = labelParts.join(" · ") || (dayNum === 1 ? "Arrival day" : dayNum === dateInfo!.totalDays ? "Departure day" : "Open day");

          const dateFormatted = new Date(td.date + "T12:00:00").toLocaleDateString("en-US", {
            weekday: "short", month: "short", day: "numeric",
          });

          const photo = getPhotosForDestination(tripData?.destination ?? "")[0] ?? DEFAULT_PHOTOS[0];

          return {
            id: dayNum,
            date: dateFormatted,
            label,
            theme,
            photo: td.hero_photo ?? photo.url,
            photoAlt: td.hero_alt ?? photo.alt,
            activities,
            status,
            weather: td.weather_emoji ?? "",
            temp: td.weather_temp ?? "",
          };
        });
        setDays(mapped);

        // Today at a Glance — undone items from today
        const todayDay = tripDays.find((td) => td.day_number === dateInfo!.currentDayNumber);
        if (todayDay?.agenda_items?.length) {
          const upcoming = todayDay.agenda_items
            .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
            .filter((ai: { done: boolean }) => !ai.done)
            .slice(0, 3)
            .map((ai: { emoji: string; title: string; time: string }) => ({
              emoji: ai.emoji,
              title: ai.title,
              time: ai.time,
            }));
          if (upcoming.length) setTodayGlance(upcoming);
          else setTodayGlance([]);
        }
      } else if (tripData && dateInfo) {
        setDays(buildEmptyTripDays(tripData.start_date, tripData.end_date, tripData.destination));
        setTodayGlance([]);
      }
      } catch (err) {
        setLoadIssue(err instanceof Error ? err.message : "Trip details could not be refreshed.");
      }
    }

    fetchTripData();
  }, [activeTrip.activeTripId]);

  const today = days.find((d) => d.status === "today") ?? days[0];
  const fallbackDaysUntilTrip = trip?.startDate ? getDaysUntil(trip.startDate) : null;
  const daysUntilTrip = tripDateInfo?.daysUntilTrip ?? fallbackDaysUntilTrip;
  const daysLeft = tripDateInfo?.daysLeft ?? days.filter((d) => d.status === "upcoming").length;
  const totalDays = Math.max(days.length, tripDateInfo?.totalDays ?? 1);
  const progress = tripDateInfo?.progressPercent ?? (today ? Math.round(((today.id - 1) / totalDays) * 100) : 0);
  const tripStatus = tripDateInfo?.status ?? "upcoming";
  const countdownLabel = tripStatus === "upcoming"
    ? `${daysUntilTrip ?? "—"} days away`
    : tripStatus === "completed"
    ? "Trip complete"
    : `${daysLeft} days left`;
  const activeTripLabel = tripStatus === "upcoming"
    ? `Upcoming · ${totalDays} days`
    : tripStatus === "completed"
    ? "Completed Trip"
    : `Active Trip · Day ${tripDateInfo?.currentDayNumber} of ${tripDateInfo?.totalDays}`;

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
        defaultName={user?.user_metadata?.full_name?.split(" ")[0] ?? user?.email?.split("@")[0] ?? ""}
        onCreate={activeTrip.createTrip}
      />
    );
  }

  if (activeTrip.isPreview) {
    return (
      <TripAccessGate
        mode="preview"
        title="Trip details are private"
        message="Preview profiles can browse Daywave, but live trip details stay private until they join or create a trip."
        detail={activeTrip.error}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5 px-4 pt-4 pb-6">

      {/* ── Trip saved toast ────────────────────────────────────────────── */}
      {savedTripToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] bg-emerald-600 text-white text-sm font-semibold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <span>✓</span>
          <span className="truncate max-w-[200px]">{savedTripToast}</span>
          <span className="text-white/70">saved</span>
        </div>
      )}

      {loadIssue && (
        <ResilientState
          title="Trip details are using saved defaults"
          message="The overview stayed available, but shared trip data could not refresh just now."
          detail={loadIssue}
          actionLabel="Retry"
          onAction={() => window.location.reload()}
          compact
        />
      )}

      {/* ── Edit upcoming trip sheet ─────────────────────────────────────── */}
      {editingTrip && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center" onClick={() => setEditingTrip(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
          <div
            className="relative w-full max-w-md bg-white rounded-t-3xl shadow-2xl flex flex-col"
            style={{ maxHeight: "calc(100dvh - 72px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1 flex-none"><div className="w-9 h-1 bg-slate-200 rounded-full" /></div>
            <div className="px-5 pt-2 pb-3 flex-none border-b border-slate-50">
              <h3 className="text-base font-black text-slate-900">Edit Trip</h3>
            </div>

            {/* Scrollable body */}
            <div className="px-5 pt-4 pb-2 flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto">

              {/* Photo preview + cycle */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Cover photo</p>
                <div className="relative h-32 rounded-2xl overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={editPhotoOptions[editPhotoIdx]?.url}
                    alt={editPhotoOptions[editPhotoIdx]?.alt}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  <button
                    onClick={() => setEditPhotoIdx((i) => (i + 1) % editPhotoOptions.length)}
                    className="absolute bottom-2.5 right-2.5 bg-white/20 backdrop-blur-sm border border-white/30 text-white text-[11px] font-bold px-3 py-1.5 rounded-full"
                  >
                    Change photo ↺
                  </button>
                  <p className="absolute bottom-2.5 left-3 text-[10px] text-white/60 font-semibold">
                    {editPhotoIdx + 1} / {editPhotoOptions.length}
                  </p>
                </div>
              </div>

              {/* Emoji picker */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Icon</p>
                <div className="flex gap-2 flex-wrap">
                  {TRIP_EMOJIS.map((e) => (
                    <button key={e} onClick={() => setEditEmoji(e)}
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl transition-all ${editEmoji === e ? "bg-slate-900 scale-110" : "bg-slate-100"}`}
                    >{e}</button>
                  ))}
                </div>
              </div>

              {/* Trip name */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Trip name</p>
                <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-2xl px-4 py-3.5 outline-none focus:border-slate-900 bg-white" />
              </div>

              {/* Destination — drives photo auto-update */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Destination</p>
                <input
                  type="text"
                  value={editDestination}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEditDestination(val);
                    const photos = getPhotosForDestination(val);
                    setEditPhotoOptions(photos);
                    setEditPhotoIdx(0);
                  }}
                  placeholder="e.g. Paris, Bali, New York…"
                  className="w-full text-sm border border-slate-200 rounded-2xl px-4 py-3.5 outline-none focus:border-slate-900 bg-white"
                />
              </div>

              {/* Start date */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Start date</p>
                <input
                  type="date"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-2xl px-4 py-3.5 outline-none focus:border-slate-900 bg-white"
                />
              </div>

              {/* Nights stepper */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Nights</p>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setEditNights((n) => Math.max(1, n - 1))}
                    className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                  >−</button>
                  <span className="text-lg font-bold text-slate-900 w-8 text-center">{editNights}</span>
                  <button
                    onClick={() => setEditNights((n) => n + 1)}
                    className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                  >+</button>
                  <span className="text-sm text-slate-400">night{editNights !== 1 ? "s" : ""}</span>
                </div>
              </div>

              {/* Travelers stepper */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Travelers</p>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setEditTravelersCount((n) => Math.max(1, n - 1))}
                    className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                  >−</button>
                  <span className="text-lg font-bold text-slate-900 w-8 text-center">{editTravelersCount}</span>
                  <button
                    onClick={() => setEditTravelersCount((n) => n + 1)}
                    className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                  >+</button>
                  <span className="text-sm text-slate-400">traveler{editTravelersCount !== 1 ? "s" : ""}</span>
                </div>
              </div>
            </div>

            {/* Footer buttons */}
            <div className="px-5 pt-3 pb-8 flex flex-col gap-2.5 border-t border-slate-100 flex-none">
              <div className="flex gap-2">
                <button onClick={saveEditTrip} className="flex-1 bg-slate-900 text-white font-bold py-4 rounded-2xl text-sm">Save changes</button>
                <button onClick={() => setEditingTrip(null)} className="px-5 text-sm font-semibold text-slate-400 border border-slate-200 rounded-2xl">Cancel</button>
              </div>
              <button
                onClick={archivePlanningTrip}
                className="w-full border border-slate-200 bg-slate-50 text-slate-500 font-bold py-3.5 rounded-2xl text-sm flex items-center justify-center gap-2"
              >
                <span>🗂</span> Archive trip
              </button>
              <button onClick={deleteTrip} className="w-full text-center text-xs text-red-400 py-1">
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Plan new trip sheet ──────────────────────────────────────────── */}
      {showPlanSheet && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center" onClick={() => setShowPlanSheet(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
          <div className="relative w-full max-w-md bg-white rounded-t-3xl shadow-2xl flex flex-col"
            style={{ maxHeight: "calc(100dvh - 72px)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-1"><div className="w-9 h-1 bg-slate-200 rounded-full" /></div>
            <div className="px-5 pt-3 pb-3 flex-none border-b border-slate-50">
              <h3 className="text-base font-black text-slate-900">Plan a New Trip</h3>
              <p className="text-xs text-slate-400 mt-0.5">Start building your next adventure</p>
            </div>
            <div className="px-5 pt-4 pb-2 flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto">
              {/* Trip name */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Trip name *</p>
                <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Christmas in NYC" autoFocus
                  className="w-full text-sm border border-slate-200 rounded-2xl px-4 py-3.5 outline-none focus:border-slate-900 bg-white" />
              </div>

              {/* Destination */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Destination</p>
                <input type="text" value={newDestination} onChange={(e) => setNewDestination(e.target.value)}
                  placeholder="e.g. New York, Tokyo, Bali…"
                  className="w-full text-sm border border-slate-200 rounded-2xl px-4 py-3.5 outline-none focus:border-slate-900 bg-white" />
                {/* Destination photo preview */}
                {newDestination.trim().length > 1 && (() => {
                  const preview = getPhotosForDestination(newDestination)[0];
                  return (
                    <div className="mt-2 h-20 rounded-2xl overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={preview.url} alt={preview.alt} className="w-full h-full object-cover" />
                    </div>
                  );
                })()}
              </div>

              {/* Start date */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Start date</p>
                <input
                  type="date"
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-2xl px-4 py-3.5 outline-none focus:border-slate-900 bg-white"
                />
              </div>

              {/* Nights stepper */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Nights</p>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setNewNights((n) => Math.max(1, n - 1))}
                    className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-xl font-bold text-slate-600"
                  >−</button>
                  <span className="text-lg font-bold text-slate-900 w-8 text-center">{newNights}</span>
                  <button
                    onClick={() => setNewNights((n) => n + 1)}
                    className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-xl font-bold text-slate-600"
                  >+</button>
                  <span className="text-sm text-slate-400">night{newNights !== 1 ? "s" : ""}</span>
                </div>
              </div>

              {/* Travelers stepper */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Travelers</p>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setNewTravelersCount((n) => Math.max(1, n - 1))}
                    className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-xl font-bold text-slate-600"
                  >−</button>
                  <span className="text-lg font-bold text-slate-900 w-8 text-center">{newTravelersCount}</span>
                  <button
                    onClick={() => setNewTravelersCount((n) => n + 1)}
                    className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-xl font-bold text-slate-600"
                  >+</button>
                  <span className="text-sm text-slate-400">traveler{newTravelersCount !== 1 ? "s" : ""}</span>
                </div>
              </div>
            </div>
            <div className="px-5 pt-3 pb-8 flex gap-3 border-t border-slate-100 flex-none">
              <button onClick={addNewTrip} disabled={!newTitle.trim()}
                className="flex-1 bg-slate-900 text-white font-bold py-4 rounded-2xl text-sm disabled:opacity-40">Create Trip</button>
              <button onClick={() => setShowPlanSheet(false)}
                className="px-5 text-sm font-semibold text-slate-400 border border-slate-200 rounded-2xl">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Share sheet ───────────────────────────────────────────────────── */}
      {showShareSheet && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center"
          onClick={() => setShowShareSheet(false)}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
          <div
            className="relative w-full max-w-md bg-white rounded-t-3xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-9 h-1 bg-slate-200 rounded-full" />
            </div>

            {/* Hero gradient */}
            <div
              className="mx-4 mt-2 mb-5 rounded-2xl overflow-hidden"
              style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0c4a6e 100%)" }}
            >
              <div className="px-5 py-5">
                <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1">🌺 You&apos;re invited</p>
                <h2 className="text-xl font-black text-white mb-0.5">{trip?.title ?? activeTrip.activeTrip?.title ?? "Trip"}</h2>
                <p className="text-xs text-white/60 mb-4">{trip?.subtitle ?? "Jun 5–11 · 4 travelers"}</p>

                {/* Traveler strip */}
                {travelers.length > 0 && (
                  <div className="flex items-center gap-2 mb-5">
                    <div className="flex -space-x-2">
                      {travelers.slice(0, 5).map((t) => (
                        <div
                          key={t.id}
                          className="w-8 h-8 rounded-full bg-slate-700 border-2 border-white/20 flex items-center justify-center text-base shadow-sm flex-none"
                        >
                          {t.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={t.avatar_url} alt={t.name} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            t.avatar
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-white/70">
                      {travelers.map((t) => t.name.split(" ")[0]).slice(0, 3).join(", ")}
                      {travelers.length > 3 ? ` +${travelers.length - 3} more` : ""} already in
                    </p>
                  </div>
                )}

                {/* Code callout */}
                <div className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-white/50 uppercase tracking-widest font-bold mb-0.5">Invite code</p>
                    <p className="text-2xl font-black text-white tracking-widest font-mono">{activeTrip.activeTrip?.invite_code ?? "INVITE"}</p>
                  </div>
                  <button
                    onClick={copyLink}
                    className={`text-xs font-bold px-3 py-2 rounded-xl transition-all ${
                      copied ? "bg-emerald-500 text-white" : "bg-white/20 text-white"
                    }`}
                  >
                    {copied ? "✓ Copied" : "Copy"}
                  </button>
                </div>
              </div>
            </div>

            {/* Link row */}
            <div className="px-4 mb-4">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 flex items-center gap-3">
                <span className="text-base">🔗</span>
                <p className="flex-1 text-xs text-slate-500 font-mono truncate">
                  {getInviteLink()}
                </p>
              </div>
            </div>

            {/* Action row */}
            <div className="flex gap-2.5 px-4 pb-10">
              <button
                onClick={copyLink}
                className={`flex-1 font-bold py-4 rounded-2xl text-sm transition-all ${
                  copied ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                {copied ? "✓ Copied!" : "Copy Link"}
              </button>
              <button
                onClick={shareLink}
                className="flex-1 bg-slate-900 text-white font-bold py-4 rounded-2xl text-sm"
              >
                Share ↗
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          ACTIVE TRIP CONTAINER
      ══════════════════════════════════════ */}
      <div className="rounded-3xl overflow-hidden shadow-xl border border-sky-100">

        {/* ── Cover photo ── */}
        <div className="relative h-52 w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={trip?.coverPhoto ?? getPhotosForDestination(trip?.destination ?? "")[0]?.url ?? DEFAULT_PHOTOS[0].url}
            alt={trip?.destination ?? "Trip destination"}
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Rich gradient — dark at bottom, hint of teal at top */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-sky-900/10" />

          {/* Countdown pill */}
          <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md border border-white/30 text-white rounded-2xl px-3 py-2 text-center">
            <p className="text-2xl font-black leading-none">
              {tripStatus === "upcoming" ? daysUntilTrip ?? "—" : tripStatus === "completed" ? "✓" : daysLeft}
            </p>
            <p className="text-[10px] font-semibold tracking-wide mt-0.5 opacity-80">{countdownLabel.split(" ").slice(1).join(" ") || "days left"}</p>
          </div>

          {/* Trip identity */}
          <div className="absolute bottom-0 left-0 right-0 px-5 pb-5">
            <div className="flex items-end justify-between">
              <div className="flex-1 min-w-0 pr-3">
                <p className="text-[10px] font-semibold text-white/60 uppercase tracking-widest mb-1">{activeTripLabel}</p>
                <h2 className="text-2xl font-black text-white leading-tight">{trip?.title ?? activeTrip.activeTrip?.title ?? "Trip"}</h2>
                <p className="text-sm text-white/70 mt-0.5">{trip?.subtitle ?? "Jun 5–11 · 4 travelers"}</p>
              </div>
              <button
                onClick={() => setShowShareSheet(true)}
                className="flex-none flex items-center gap-1.5 bg-white/20 backdrop-blur-sm border border-white/30 text-white text-xs font-bold px-3 py-2 rounded-full hover:bg-white/30 transition-colors"
              >
                <span>🔗</span>
                <span>Invite</span>
              </button>
            </div>

            {/* Progress bar */}
            <div className="mt-3">
              <div className="flex justify-between mb-1.5">
                {days.map((d) => (
                  <div key={d.id} title={d.theme} className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all ${
                    d.status === "past"    ? "bg-white border-white text-sky-700" :
                    d.status === "today"  ? "bg-sky-400 border-white text-white ring-2 ring-white/60 scale-125 shadow-md" :
                                            "bg-white/20 border-white/40 text-white/60"
                  }`}>
                    {d.status === "past" ? "✓" : d.id}
                  </div>
                ))}
              </div>
              <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── 7-day forecast strip ── */}
        {tripWeather.length > 0 && (
          <div className="border-t border-slate-100 bg-white px-3.5 pt-3 pb-2">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                7-day outlook
              </p>
              {tripWeather[0] && (
                <p className="text-[11px] font-semibold text-slate-500">
                  {tripWeather[0].emoji} {tripWeather[0].high}° today
                </p>
              )}
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {tripWeather.map((d) => (
                <div
                  key={d.date}
                  className="flex-none flex min-w-[50px] flex-col items-center gap-0.5 rounded-xl bg-slate-50 px-2.5 py-2 ring-1 ring-slate-100"
                >
                  <span className="text-[10px] font-bold text-slate-500 leading-none">{d.dayLabel}</span>
                  <span className="text-lg leading-none my-0.5">{d.emoji}</span>
                  <span className="text-[13px] font-black text-slate-800 leading-none">{d.high}°</span>
                  <span className="text-[10px] text-slate-400 leading-none">{d.low}°</span>
                  {d.precip > 20 && (
                    <span className="text-[9px] font-bold text-sky-500 leading-none mt-0.5">{d.precip}%</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Day cards body — warm tropical background ── */}
        <div
          className="flex flex-col gap-2 px-3 py-3"
          style={{ background: "linear-gradient(160deg, #e0f2fe 0%, #fef9c3 60%, #fef3c7 100%)" }}
        >
          {days.map((day) => {
            const isExpanded = selected === day.id;

            // ── Collapsed "done" row ──────────────────────────────
            if (day.status === "past" && !isExpanded) {
              return (
                <button
                  key={day.id}
                  onClick={() => setSelected(day.id)}
                  className="w-full text-left flex items-center gap-3 bg-white/60 border border-white rounded-xl px-3 py-2 transition-all hover:bg-white"
                >
                  <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center flex-none">
                    <span className="text-[10px] font-bold text-slate-500">✓</span>
                  </div>
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400">{day.label}</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-xs text-slate-400 truncate">{day.theme}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-none">
                    {day.activities.map((a, i) => (
                      <span key={i} className="text-sm">{a.emoji}</span>
                    ))}
                    <span className="text-slate-300 text-xs ml-1">▼</span>
                  </div>
                </button>
              );
            }

            // ── Full card (today, upcoming, or expanded past) ─────
            return (
              <button
                key={day.id}
                onClick={() => setSelected(isExpanded ? null : day.id)}
                className={`w-full text-left rounded-2xl overflow-hidden border shadow-sm bg-white transition-all ${
                  day.status === "today"  ? "border-sky-400 ring-2 ring-sky-300 shadow-sky-100 shadow-lg" :
                  day.status === "past"   ? "border-slate-200" :
                                            "border-white hover:border-sky-200"
                }`}
              >
                {/* Photo */}
                <div className="relative h-24 w-full overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={day.photo}
                    alt={day.photoAlt}
                    className={`absolute inset-0 w-full h-full object-cover ${day.status === "past" ? "grayscale" : ""}`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  {day.status === "today" && (
                    <div className="absolute top-2 left-2 bg-sky-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">TODAY</div>
                  )}
                  {day.status === "past" && (
                    <div className="absolute top-2 left-2 bg-black/40 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">DONE</div>
                  )}
                  {(day.weather || day.temp) && (
                    <div className="absolute top-2 right-2 bg-black/30 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                      {day.weather} {day.temp}
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 px-3 pb-2 flex items-end justify-between">
                    <div>
                      <p className="text-[10px] font-semibold text-white/70 uppercase tracking-widest">{day.label} · {day.date}</p>
                      <p className="text-sm font-bold text-white leading-tight">{day.theme}</p>
                    </div>
                    <span className="text-white/60 text-xs">{isExpanded ? "▲" : "▼"}</span>
                  </div>
                </div>

                {/* Activity pills */}
                <div className="bg-white px-3 py-2 flex items-center gap-1.5 flex-wrap">
                  {day.activities.length > 0 ? (
                    day.activities.map((a, i) => (
                      <span key={i} className="flex items-center gap-1 text-xs text-slate-600 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full">
                        {a.emoji} {a.label}
                      </span>
                    ))
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full">
                      ✨ Add plans for this day
                    </span>
                  )}
                </div>

                {/* Today at a Glance inline */}
                {day.status === "today" && (
                  <div className="bg-sky-50 border-t border-sky-100 px-3 py-2.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] font-bold text-sky-600 uppercase tracking-widest">Today at a Glance</p>
                      <Link href="/" className="text-[10px] font-semibold text-sky-600">See full day →</Link>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {todayGlance.map((a, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-sm w-5 text-center flex-none">{a.emoji}</span>
                          <p className="flex-1 text-xs font-medium text-slate-700 truncate">{a.title}</p>
                          <span className="text-xs text-slate-400 flex-none">{a.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Expanded panel */}
                {isExpanded && (
                  <div className="bg-slate-50 border-t border-slate-100 px-4 py-3 flex flex-col gap-2">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Full Day Plan</p>
                    {day.activities.length > 0 ? (
                      day.activities.map((a, i) => (
                        <div key={i} className="flex items-center gap-3 text-sm text-slate-700">
                          <span className="text-base w-6 text-center">{a.emoji}</span>
                          <span>{a.label}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">No plans yet. Add reservations in Docs or find ideas in Explore.</p>
                    )}
                    {day.status === "today" && (
                      <Link href="/" className="mt-1 text-xs font-semibold text-sky-600">→ Open Today&apos;s full schedule</Link>
                    )}
                    {day.status === "upcoming" && (
                      <Link href="/explore" className="mt-1 flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
                        <span>🔍</span>
                        <span>Find activities for this day →</span>
                      </Link>
                    )}
                  </div>
                )}
              </button>
            );
          })}

          {/* ── Trip footer / end cap ── */}
          <div className="flex items-center gap-3 px-2 py-3">
            <div className="flex-1 h-px bg-sky-200/60" />
            <div className="flex items-center gap-2 bg-white/70 backdrop-blur-sm border border-sky-100 rounded-full px-4 py-1.5">
              <span className="text-base">✈️</span>
              <div>
                <p className="text-xs font-bold text-slate-700">
                  Fly home · {trip?.endDate ? new Date(trip.endDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "Jun 11"}
                </p>
                <p className="text-[10px] text-slate-400">OGG → LAX · Departs 10:30 AM</p>
              </div>
            </div>
            <div className="flex-1 h-px bg-sky-200/60" />
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          INVITE CARD
      ══════════════════════════════════════ */}
      <button
        onClick={() => setShowShareSheet(true)}
        className="w-full text-left rounded-3xl overflow-hidden shadow-sm"
        style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 55%, #0c4a6e 100%)" }}
      >
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-0.5">Traveling together</p>
              <p className="text-base font-black text-white">
                {travelers.length > 0
                  ? `${travelers.length} traveler${travelers.length !== 1 ? "s" : ""} going`
                  : "Invite your crew"}
              </p>
            </div>
            <div className="bg-white/15 border border-white/25 rounded-2xl px-3 py-2 flex items-center gap-1.5">
              <span className="text-sm">🔗</span>
              <span className="text-xs font-bold text-white">Invite</span>
            </div>
          </div>

          {/* Avatar strip with invite status */}
          {travelers.length > 0 ? (
            <div className="mb-4">
              <div className="flex items-start gap-3">
                <div className="flex -space-x-2">
                  {travelers.slice(0, 6).map((t) => (
                    <div key={t.id} className="relative w-9 h-9 flex-none shadow-sm">
                      <div className="w-9 h-9 rounded-full bg-slate-700 border-2 border-white/20 flex items-center justify-center text-lg overflow-hidden">
                        {t.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={t.avatar_url} alt={t.name} className="w-full h-full object-cover" />
                        ) : (
                          t.avatar
                        )}
                      </div>
                      {/* Joined = emerald, pending = amber */}
                      <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0f172a] ${t.status === "active" ? "bg-emerald-400" : "bg-amber-400"}`} />
                    </div>
                  ))}
                  {travelers.length < 5 && (
                    <div className="w-9 h-9 rounded-full border-2 border-dashed border-white/30 flex items-center justify-center text-white/40 flex-none">
                      <span className="text-base font-light">+</span>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs text-white/70">
                    {travelers.map((t) => t.name.split(" ")[0]).slice(0, 3).join(", ")}
                    {travelers.length > 3 ? ` +${travelers.length - 3}` : ""}
                  </p>
                  <div className="flex items-center gap-2.5 mt-1">
                    {travelers.filter((t) => t.status === "active").length > 0 && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                        {travelers.filter((t) => t.status === "active").length} joined
                      </span>
                    )}
                    {travelers.filter((t) => t.status !== "active").length > 0 && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-amber-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-300 inline-block" />
                        {travelers.filter((t) => t.status !== "active").length} pending
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-white/50 mb-4">Share a link — they can join instantly.</p>
          )}

          {/* Invite code pill */}
          <div className="flex items-center gap-2">
            <div className="bg-white/10 border border-white/20 rounded-xl px-3 py-1.5 flex items-center gap-2">
              <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Code</span>
              <span className="text-sm font-black text-white tracking-widest font-mono">{activeTrip.activeTrip?.invite_code ?? "INVITE"}</span>
            </div>
            <p className="text-[10px] text-white/40">Tap to copy link or share →</p>
          </div>
        </div>
      </button>

      {/* ══════════════════════════════════════
          TRIP LIFECYCLE SECTIONS
      ══════════════════════════════════════ */}
      {(() => {
        // Sort planning trips by date ascending, split past vs future
        const todayMs = new Date().setHours(0, 0, 0, 0);
        const sorted = [...upcomingTrips].sort((a, b) => {
          if (!a.startDate && !b.startDate) return 0;
          if (!a.startDate) return 1;
          if (!b.startDate) return -1;
          return a.startDate.localeCompare(b.startDate);
        });
        const isTripPast = (t: UpcomingTrip) => {
          if (!t.startDate) return false;
          const end = new Date(t.startDate + "T00:00:00");
          end.setDate(end.getDate() + (t.nights || 0));
          return end.getTime() < todayMs;
        };
        const pastTrips = sorted.filter(isTripPast);
        const futureTrips = sorted.filter((t) => !isTripPast(t));
        const upNextTrip = futureTrips[0] ?? null;
        const planningTrips = futureTrips.slice(1);

        return (
          <>
            {/* ── Packing list — tied to active trip ── */}
            <button
              onClick={() => router.push("/packing")}
              className="w-full flex items-center gap-3 bg-white border border-slate-100 rounded-2xl px-4 py-3.5 shadow-sm hover:shadow-md transition-shadow"
            >
              <span className="text-xl">🧳</span>
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-bold text-slate-700">Packing List</p>
                  <p className="text-[10px] font-semibold text-slate-500">
                    {tripPackingCount}/{PACKING_TOTAL} {tripPackingPct === 100 ? "✓" : "packed"}
                  </p>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${tripPackingPct === 100 ? "bg-emerald-500" : "bg-sky-500"}`}
                    style={{ width: `${tripPackingPct}%` }}
                  />
                </div>
              </div>
              <span className="text-slate-300 text-sm flex-none ml-1">›</span>
            </button>

            {/* ── Recently completed (past upcoming trips) ─────────── */}
            {pastTrips.map((t) => (
              <div key={t.id} className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 flex items-center gap-3">
                <span className="text-2xl flex-none">{t.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-emerald-800 leading-tight truncate">{t.title}</p>
                  <p className="text-[10px] text-emerald-600 mt-0.5">Trip complete · {getStoredTripSubtitle(t)}</p>
                </div>
                <button
                  onClick={() => archiveTripById(t)}
                  className="flex-none text-[11px] font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 active:scale-95 transition-all px-3 py-1.5 rounded-full"
                >
                  Archive ›
                </button>
              </div>
            ))}

            {/* ── Up Next ───────────────────────────────────────────── */}
            {upNextTrip && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Next Trip</p>
                  </div>
                  <button
                    onClick={() => openEditTrip(upNextTrip)}
                    className="text-[11px] text-slate-400 font-medium"
                  >Edit ✏️</button>
                </div>

                <button
                  onClick={() => openEditTrip(upNextTrip)}
                  className="w-full bg-white rounded-3xl border border-amber-100 shadow-md overflow-hidden text-left active:scale-[0.99] transition-transform"
                >
                  <div className="relative h-40 w-full overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={upNextTrip.photo} alt={upNextTrip.photoAlt} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

                    {/* Up Next badge */}
                    <div className="absolute top-3 left-3 bg-amber-400 text-amber-900 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wide">
                      Up Next
                    </div>

                    {/* Countdown pill */}
                    {getDaysUntil(upNextTrip.startDate) !== null && (
                      <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-sm border border-white/30 text-white text-center px-3 py-1.5 rounded-2xl">
                        <p className="text-lg font-black leading-none">{getDaysUntil(upNextTrip.startDate)}</p>
                        <p className="text-[9px] font-semibold opacity-80 mt-0.5">days away</p>
                      </div>
                    )}

                    <div className="absolute bottom-0 left-0 right-0 px-4 pb-3.5 flex items-end justify-between">
                      <div>
                        <p className="text-base font-black text-white leading-tight">{upNextTrip.title}</p>
                        <p className="text-xs text-white/70 mt-0.5">{getStoredTripSubtitle(upNextTrip)}</p>
                      </div>
                      <span className="text-xl">{upNextTrip.emoji}</span>
                    </div>
                  </div>

                  {/* Action footer */}
                  <div className="px-4 py-3 flex items-center justify-between border-t border-amber-50 bg-amber-50/40">
                    <p className="text-xs text-slate-400">Review trip details</p>
                    <span className="text-xs font-bold text-amber-600">Open →</span>
                  </div>
                </button>
              </div>
            )}

            {/* ── Planning ──────────────────────────────────────────── */}
            {(planningTrips.length > 0 || !upNextTrip) && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-sky-300" />
                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">On Deck</p>
                  </div>
                  <button
                    onClick={() => setShowPlanSheet(true)}
                    className="text-xs font-bold text-slate-900 border-2 border-slate-900 px-3 py-1.5 rounded-full"
                  >
                    + Plan trip
                  </button>
                </div>

                {planningTrips.length === 0 ? (
                  <button
                    onClick={() => setShowPlanSheet(true)}
                    className="w-full border-2 border-dashed border-slate-200 rounded-2xl py-8 flex flex-col items-center gap-2 text-slate-400 hover:border-slate-300 transition-colors"
                  >
                    <span className="text-2xl">🗺️</span>
                    <p className="text-sm font-semibold">Add another trip</p>
                    <p className="text-xs">Keep future plans close</p>
                  </button>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {planningTrips.map((t) => {
                      const daysAway = getDaysUntil(t.startDate);
                      return (
                        <button
                          key={t.id}
                          onClick={() => openEditTrip(t)}
                          className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden text-left w-full active:scale-[0.99] transition-transform"
                        >
                          <div className="flex items-stretch overflow-hidden">
                            <div className="relative w-24 flex-none">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={t.photo} alt={t.photoAlt} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/20" />
                            </div>
                            <div className="flex-1 px-3 py-2.5 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-sm flex-none">{t.emoji}</span>
                                <p className="text-sm font-bold text-slate-900 leading-tight truncate">{t.title}</p>
                              </div>
                              <p className="text-[11px] text-slate-400 truncate">{getStoredTripSubtitle(t)}</p>
                              {daysAway !== null && (
                                <p className="text-[10px] text-sky-400 font-semibold mt-0.5">in {daysAway} days</p>
                              )}
                            </div>
                            <div className="pr-3 flex items-center flex-none">
                              <span className="text-slate-300 text-sm">›</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── My Other Trips (Supabase-synced memberships) ─────── */}
            {(() => {
              const otherTrips = activeTrip.memberships.filter((m) => m.trip_id !== activeTrip.activeTripId);
              if (otherTrips.length === 0) return null;
              return (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-indigo-400" />
                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">My Other Trips</p>
                    <span className="text-[10px] text-slate-300 font-semibold">{otherTrips.length}</span>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {otherTrips.map((m) => {
                      const dateInfo = getTripDateInfo(m.trip.start_date, m.trip.end_date);
                      const photos = getPhotosForDestination(m.trip.destination);
                      const photoUrl = m.trip.cover_photo ?? photos[0]?.url ?? DEFAULT_PHOTOS[0].url;
                      const daysAway = getDaysUntil(m.trip.start_date);
                      return (
                        <button
                          key={m.trip_id}
                          onClick={() => activeTrip.selectTrip(m.trip_id)}
                          className="bg-white rounded-2xl border border-indigo-50 shadow-sm overflow-hidden text-left w-full active:scale-[0.99] transition-transform"
                        >
                          <div className="flex items-stretch overflow-hidden">
                            <div className="relative w-24 flex-none">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={photoUrl}
                                alt={m.trip.destination}
                                className={`w-full h-full object-cover ${dateInfo.status === "completed" ? "grayscale opacity-70" : ""}`}
                              />
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/20" />
                            </div>
                            <div className="flex-1 px-3 py-2.5 min-w-0">
                              <p className="text-sm font-bold text-slate-900 leading-tight truncate">{m.trip.title}</p>
                              <p className="text-[11px] text-slate-400 truncate">{m.trip.destination}</p>
                              {dateInfo.status === "upcoming" && daysAway !== null && (
                                <p className="text-[10px] text-indigo-500 font-semibold mt-0.5">in {daysAway} days</p>
                              )}
                              {dateInfo.status === "active" && (
                                <p className="text-[10px] text-emerald-500 font-semibold mt-0.5">Active · Day {dateInfo.currentDayNumber}</p>
                              )}
                              {dateInfo.status === "completed" && (
                                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Completed</p>
                              )}
                            </div>
                            <div className="pr-3 flex items-center flex-none">
                              <span className="text-[10px] font-bold text-indigo-500">Switch →</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* ── Archived ──────────────────────────────────────────── */}
            <div>
              <button
                onClick={() => setShowArchived((v) => !v)}
                className="w-full flex items-center justify-between mb-3"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-slate-300" />
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Archived</p>
                  <span className="text-[10px] text-slate-300 font-semibold">{archivedTrips.length}</span>
                </div>
                <span className="text-slate-300 text-xs">{showArchived ? "▲" : "▼"}</span>
              </button>

              {showArchived && (
                <div className="flex flex-col gap-2.5">
                  {archivedTrips.map((t) => (
                    <div
                      key={t.id}
                      className="bg-white rounded-2xl border border-slate-100 overflow-hidden"
                    >
                      <div className="flex items-stretch overflow-hidden">
                        <div className="relative w-24 flex-none">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={t.photo} alt={t.photoAlt} className="w-full h-full object-cover grayscale opacity-80" />
                        </div>
                        <div className="flex-1 px-3 py-2.5 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-sm flex-none">{t.emoji}</span>
                            <p className="text-sm font-bold text-slate-500 leading-tight truncate">{t.title}</p>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate">{t.dateRange}</p>
                          {t.highlight ? (
                            <p className="text-[10px] text-slate-400 mt-0.5 italic truncate">&ldquo;{t.highlight}&rdquo;</p>
                          ) : null}
                        </div>
                        <div className="pr-3 flex items-center flex-none">
                          <span className="text-slate-200 text-sm">🗂</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        );
      })()}

    </div>
  );
}
