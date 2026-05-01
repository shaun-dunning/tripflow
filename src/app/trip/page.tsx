"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getTripDateInfo, getDayStatus, formatDateRange, type TripDateInfo } from "@/lib/tripDates";

const TRIP_ID = "a1b2c3d4-0000-0000-0000-000000000001";
const INVITE_CODE = "MAUI26";

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
  coverPhoto: string;
  startDate: string;
  endDate: string;
};

const TRIP: Day[] = [
  {
    id: 1, date: "Wed · May 22", label: "Day 1", theme: "Travel Day",
    photo: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&h=300&fit=crop&q=80",
    photoAlt: "Airport terminal",
    activities: [{ emoji: "✈️", label: "Depart 7am" }, { emoji: "🏨", label: "Check in" }, { emoji: "🍕", label: "Dinner near hotel" }],
    status: "past", weather: "☁️", temp: "68°F",
  },
  {
    id: 2, date: "Thu · May 23", label: "Day 2", theme: "Beach + Snorkel",
    photo: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=300&fit=crop&q=80",
    photoAlt: "Maui beach",
    activities: [{ emoji: "🏖️", label: "Beach AM" }, { emoji: "🤿", label: "Molokini" }, { emoji: "🐟", label: "Mama's Fish House" }],
    status: "today", weather: "⛅", temp: "82°F",
  },
  {
    id: 3, date: "Fri · May 24", label: "Day 3", theme: "Road to Hana",
    photo: "https://images.unsplash.com/photo-1542259009477-d625272157b7?w=600&h=300&fit=crop&q=80",
    photoAlt: "Road to Hana",
    activities: [{ emoji: "🚗", label: "Scenic drive" }, { emoji: "🌊", label: "Black sand beach" }, { emoji: "🌿", label: "Bamboo forest" }],
    status: "upcoming", weather: "🌦️", temp: "76°F",
  },
  {
    id: 4, date: "Sat · May 25", label: "Day 4", theme: "Beach + Spa",
    photo: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&h=300&fit=crop&q=80",
    photoAlt: "Spa and pool",
    activities: [{ emoji: "💆", label: "Couples massage" }, { emoji: "🏊", label: "Pool day" }, { emoji: "🌅", label: "Sunset dinner" }],
    status: "upcoming", weather: "☀️", temp: "84°F",
  },
  {
    id: 5, date: "Sun · May 26", label: "Day 5", theme: "Free Day",
    photo: "https://images.unsplash.com/photo-1471922694854-ff1b63b20054?w=600&h=300&fit=crop&q=80",
    photoAlt: "Tropical island",
    activities: [{ emoji: "😎", label: "No plans" }, { emoji: "🛍️", label: "Shops + market" }, { emoji: "🍹", label: "Luau night" }],
    status: "upcoming", weather: "☀️", temp: "83°F",
  },
  {
    id: 6, date: "Mon · May 27", label: "Day 6", theme: "Haleakalā Sunrise",
    photo: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=600&h=300&fit=crop&q=80",
    photoAlt: "Volcano sunrise",
    activities: [{ emoji: "🌋", label: "Sunrise hike" }, { emoji: "🚲", label: "Crater bike" }, { emoji: "🍺", label: "Brewery dinner" }],
    status: "upcoming", weather: "🌤️", temp: "55°F",
  },
  {
    id: 7, date: "Tue · May 28", label: "Day 7", theme: "Travel Home",
    photo: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&h=300&fit=crop&q=80",
    photoAlt: "Airport departure",
    activities: [{ emoji: "🧳", label: "Pack up" }, { emoji: "🏝️", label: "Last swim" }, { emoji: "✈️", label: "Depart 4pm" }],
    status: "upcoming", weather: "☀️", temp: "81°F",
  },
];

const TODAY_GLANCE = [
  { emoji: "😴", title: "Nap / downtime", time: "3:00 PM" },
  { emoji: "🤿", title: "Snorkeling – Molokini", time: "4:30 PM" },
  { emoji: "🐟", title: "Dinner – Mama's Fish House", time: "7:00 PM" },
];

type UpcomingTrip = {
  id: number;
  title: string;
  destination: string;
  startDate: string;   // "YYYY-MM-DD" or ""
  nights: number;
  travelersCount: number;
  emoji: string;
  photo: string;
  photoAlt: string;
};

type PhotoOption = { url: string; alt: string };

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

function buildSubtitle(startDate: string, nights: number, travelersCount: number): string {
  const parts: string[] = [];
  if (startDate) {
    const d = new Date(startDate + "T12:00:00");
    parts.push(d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }));
  }
  if (nights > 0) parts.push(`${nights} night${nights !== 1 ? "s" : ""}`);
  if (travelersCount > 0) parts.push(`${travelersCount} traveler${travelersCount !== 1 ? "s" : ""}`);
  return parts.join(" · ") || "Still planning";
}

const INITIAL_UPCOMING: UpcomingTrip[] = [
  {
    id: 1, title: "Christmas in NYC", destination: "New York City",
    startDate: "2026-12-20", nights: 5, travelersCount: 4, emoji: "🎄",
    photo: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=600&h=300&fit=crop&q=80",
    photoAlt: "New York City skyline",
  },
  {
    id: 2, title: "Spring Break · Cabo", destination: "Cabo San Lucas",
    startDate: "2027-03-15", nights: 7, travelersCount: 4, emoji: "🌊",
    photo: "https://images.unsplash.com/photo-1510097467424-192d713fd8b2?w=600&h=300&fit=crop&q=80",
    photoAlt: "Cabo San Lucas beach",
  },
  {
    id: 3, title: "Summer Euro Trip", destination: "Europe",
    startDate: "2027-07-01", nights: 14, travelersCount: 4, emoji: "✈️",
    photo: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=600&h=300&fit=crop&q=80",
    photoAlt: "European city",
  },
];

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

export default function TripPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<number | null>(null);
  const [trip, setTrip] = useState<TripMeta | null>(null);
  const [days, setDays] = useState<Day[]>(TRIP);
  const [todayGlance, setTodayGlance] = useState(TODAY_GLANCE);
  const [tripDateInfo, setTripDateInfo] = useState<TripDateInfo | null>(null);
  const [travelers, setTravelers] = useState<Traveler[]>([]);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [copied, setCopied] = useState(false);

  // ── Trips lifecycle state ───────────────────────────────────────────────────
  const [upcomingTrips, setUpcomingTrips] = useState<UpcomingTrip[]>(INITIAL_UPCOMING);
  const [archivedTrips, setArchivedTrips] = useState<ArchivedTrip[]>(INITIAL_ARCHIVED);
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
    setUpcomingTrips((prev) =>
      prev.map((t) =>
        t.id === editingTrip.id
          ? {
              ...t,
              title: editTitle,
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
  }

  function archivePlanningTrip() {
    if (!editingTrip) return;
    setArchivedTrips((prev) => [
      {
        id: editingTrip.id,
        title: editingTrip.title,
        destination: editingTrip.destination,
        dateRange: buildSubtitle(editingTrip.startDate, editingTrip.nights, editingTrip.travelersCount),
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
    if (typeof window === "undefined") return `/join/${INVITE_CODE}`;
    return `${window.location.origin}/join/${INVITE_CODE}`;
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
        text: "Hey! Join our family trip on TripFlow.",
        url: link,
      });
    } else {
      copyLink();
    }
  }

  useEffect(() => {
    async function fetchTripData() {
      // Fetch trip meta
      const { data: tripData } = await supabase
        .from("trips")
        .select("*")
        .eq("id", TRIP_ID)
        .single();

      let dateInfo: TripDateInfo | null = null;

      if (tripData) {
        dateInfo = getTripDateInfo(tripData.start_date, tripData.end_date);
        setTripDateInfo(dateInfo);
        setTrip({
          title: tripData.title,
          subtitle: `${formatDateRange(tripData.start_date, tripData.end_date)} · 4 travelers`,
          coverPhoto: tripData.cover_photo,
          startDate: tripData.start_date,
          endDate: tripData.end_date,
        });
      }

      // Fetch trip days + agenda items
      const { data: tripDays } = await supabase
        .from("trip_days")
        .select("*, agenda_items(*)")
        .eq("trip_id", TRIP_ID)
        .order("day_number");

      // Fetch travelers
      const { data: travelerData } = await supabase
        .from("travelers")
        .select("id, name, avatar, avatar_url, status")
        .eq("trip_id", TRIP_ID)
        .order("created_at", { ascending: true });
      if (travelerData) setTravelers(travelerData as Traveler[]);

      if (tripDays?.length && dateInfo) {
        const mapped: Day[] = tripDays.map((td) => {
          const dayNum = td.day_number;
          const status = getDayStatus(dayNum, dateInfo!);

          // Use first 3 agenda items as activity pills, fall back to mock
          const mockDay = TRIP.find((d) => d.id === dayNum);
          const activities: Activity[] = td.agenda_items?.length
            ? td.agenda_items
                .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
                .slice(0, 3)
                .map((ai: { emoji: string; title: string }) => ({ emoji: ai.emoji, label: ai.title.split("–")[0].trim() }))
            : (mockDay?.activities ?? []);

          // Parse date label e.g. "Arrival Day 🛬" → theme
          const labelParts = (td.label ?? "").split(" · ");
          const label = `Day ${dayNum}`;
          const theme = labelParts.join(" · ") || mockDay?.theme || "";

          const dateFormatted = new Date(td.date + "T12:00:00").toLocaleDateString("en-US", {
            weekday: "short", month: "short", day: "numeric",
          });

          return {
            id: dayNum,
            date: dateFormatted,
            label,
            theme,
            photo: td.hero_photo ?? mockDay?.photo ?? "",
            photoAlt: td.hero_alt ?? mockDay?.photoAlt ?? "",
            activities,
            status,
            weather: td.weather_emoji ?? mockDay?.weather ?? "☀️",
            temp: td.weather_temp ?? mockDay?.temp ?? "",
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
        }
      }
    }

    fetchTripData();
  }, []);

  const today = days.find((d) => d.status === "today") ?? days[0];
  const daysLeft = tripDateInfo?.daysLeft ?? days.filter((d) => d.status === "upcoming").length;
  const progress = tripDateInfo?.progressPercent ?? Math.round(((today.id - 1) / days.length) * 100);
  const tripStatus = tripDateInfo?.status ?? "upcoming";
  const countdownLabel = tripStatus === "upcoming"
    ? `${tripDateInfo?.daysUntilTrip ?? "?"} days away`
    : tripStatus === "completed"
    ? "Trip complete"
    : `${daysLeft} days left`;
  const activeTripLabel = tripStatus === "upcoming"
    ? `Upcoming · ${days.length} days`
    : tripStatus === "completed"
    ? "Completed Trip"
    : `Active Trip · Day ${tripDateInfo?.currentDayNumber} of ${tripDateInfo?.totalDays}`;

  return (
    <div className="flex flex-col gap-5 px-4 pt-4 pb-6">

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
                <h2 className="text-xl font-black text-white mb-0.5">{trip?.title ?? "Maui Family Trip"}</h2>
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
                    <p className="text-2xl font-black text-white tracking-widest font-mono">{INVITE_CODE}</p>
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
        <div className="relative h-56 w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=500&fit=crop&q=85"
            alt="Maui, Hawaii"
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Rich gradient — dark at bottom, hint of teal at top */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-sky-900/10" />

          {/* Countdown pill */}
          <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md border border-white/30 text-white rounded-2xl px-3 py-2 text-center">
            <p className="text-2xl font-black leading-none">
              {tripStatus === "upcoming" ? tripDateInfo?.daysUntilTrip ?? "—" : tripStatus === "completed" ? "✓" : daysLeft}
            </p>
            <p className="text-[10px] font-semibold tracking-wide mt-0.5 opacity-80">{countdownLabel.split(" ").slice(1).join(" ") || "days left"}</p>
          </div>

          {/* Trip identity */}
          <div className="absolute bottom-0 left-0 right-0 px-5 pb-5">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] font-semibold text-white/60 uppercase tracking-widest mb-1">{activeTripLabel}</p>
                <h2 className="text-2xl font-black text-white leading-tight">{trip?.title ?? "Maui Family Trip"}</h2>
                <p className="text-sm text-white/70 mt-0.5">{trip?.subtitle ?? "Jun 5–11 · 4 travelers"}</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-3">
              <div className="flex justify-between mb-1.5">
                {TRIP.map((d) => (
                  <div key={d.id} className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all ${
                    d.status === "past"    ? "bg-white border-white text-sky-700" :
                    d.status === "today"  ? "bg-sky-400 border-white text-white ring-2 ring-white/50 scale-110" :
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
                  day.status === "today"  ? "border-sky-400 ring-2 ring-sky-300" :
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
                  <div className="absolute top-2 right-2 bg-black/30 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                    {day.weather} {day.temp}
                  </div>
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
                  {day.activities.map((a, i) => (
                    <span key={i} className="flex items-center gap-1 text-xs text-slate-600 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full">
                      {a.emoji} {a.label}
                    </span>
                  ))}
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
                    {day.activities.map((a, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm text-slate-700">
                        <span className="text-base w-6 text-center">{a.emoji}</span>
                        <span>{a.label}</span>
                      </div>
                    ))}
                    {day.status === "today" && (
                      <Link href="/" className="mt-1 text-xs font-semibold text-sky-600">→ Open Today&apos;s full schedule</Link>
                    )}
                    {day.status === "upcoming" && (
                      <span className="mt-1 text-xs font-semibold text-slate-400">+ Add activity</span>
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
                <p className="text-xs font-bold text-slate-700">Fly home · Tue May 28</p>
                <p className="text-[10px] text-slate-400">OGG → LAX · Departs 4:10 PM</p>
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

          {/* Avatar strip */}
          {travelers.length > 0 ? (
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex -space-x-2">
                {travelers.slice(0, 6).map((t) => (
                  <div
                    key={t.id}
                    className="w-9 h-9 rounded-full bg-slate-700 border-2 border-white/20 flex items-center justify-center text-lg flex-none shadow-sm"
                  >
                    {t.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.avatar_url} alt={t.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      t.avatar
                    )}
                  </div>
                ))}
                {travelers.length < 5 && (
                  <div className="w-9 h-9 rounded-full border-2 border-dashed border-white/30 flex items-center justify-center text-white/40 flex-none">
                    <span className="text-base font-light">+</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-white/60">
                {travelers.map((t) => t.name.split(" ")[0]).slice(0, 3).join(", ")}
                {travelers.length > 3 ? ` +${travelers.length - 3}` : ""}
              </p>
            </div>
          ) : (
            <p className="text-xs text-white/50 mb-4">Share a link — they can join instantly.</p>
          )}

          {/* Invite code pill */}
          <div className="flex items-center gap-2">
            <div className="bg-white/10 border border-white/20 rounded-xl px-3 py-1.5 flex items-center gap-2">
              <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Code</span>
              <span className="text-sm font-black text-white tracking-widest font-mono">{INVITE_CODE}</span>
            </div>
            <p className="text-[10px] text-white/40">Tap to copy link or share →</p>
          </div>
        </div>
      </button>

      {/* ══════════════════════════════════════
          TRIP LIFECYCLE SECTIONS
      ══════════════════════════════════════ */}
      {(() => {
        // Sort planning trips by date ascending
        const sorted = [...upcomingTrips].sort((a, b) => {
          if (!a.startDate && !b.startDate) return 0;
          if (!a.startDate) return 1;
          if (!b.startDate) return -1;
          return a.startDate.localeCompare(b.startDate);
        });
        const upNextTrip = sorted[0] ?? null;
        const planningTrips = sorted.slice(1);

        return (
          <>
            {/* ── Packing list — tied to active trip ── */}
            <button
              onClick={() => router.push("/packing")}
              className="w-full flex items-center gap-3 bg-white border border-slate-100 rounded-2xl px-4 py-3 shadow-sm hover:shadow-md transition-shadow"
            >
              <span className="text-base">🧳</span>
              <div className="flex-1 text-left">
                <p className="text-xs font-bold text-slate-700">Packing List</p>
                <p className="text-[10px] text-slate-400">Tailored to your Maui itinerary</p>
              </div>
              <span className="text-slate-300 text-sm">›</span>
            </button>

            {/* ── Up Next ───────────────────────────────────────────── */}
            {upNextTrip && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Up Next</p>
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
                        <p className="text-xs text-white/70 mt-0.5">{buildSubtitle(upNextTrip.startDate, upNextTrip.nights, upNextTrip.travelersCount)}</p>
                      </div>
                      <span className="text-xl">{upNextTrip.emoji}</span>
                    </div>
                  </div>

                  {/* Action footer */}
                  <div className="px-4 py-3 flex items-center justify-between border-t border-amber-50 bg-amber-50/40">
                    <p className="text-xs text-slate-400">Tap to edit your plans</p>
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
                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Planning</p>
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
                    <p className="text-sm font-semibold">Plan your next adventure</p>
                    <p className="text-xs">Add a trip to start dreaming</p>
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
                              <p className="text-[11px] text-slate-400 truncate">{buildSubtitle(t.startDate, t.nights, t.travelersCount)}</p>
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
                            <p className="text-[10px] text-slate-400 mt-0.5 italic truncate">"{t.highlight}"</p>
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
