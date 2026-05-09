"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { getTripDateInfo, formatTodayLabel, type TripDateInfo } from "@/lib/tripDates";

// ── Types ─────────────────────────────────────────────────────────────────────
type Message = {
  id: string;
  sender_name: string;
  sender_avatar: string;
  sender_user_id?: string | null;
  text?: string | null;
  image_url?: string | null;
  card_type?: string | null;
  card_title?: string | null;
  card_sub?: string | null;
  card_emoji?: string | null;
  created_at: string;
};

type Traveler = {
  id: string;
  name: string;
  avatar: string;
  avatar_url?: string | null;
  role: string;
  status: string;
  is_me?: boolean;
  user_id?: string | null;
};

type Sheet =
  | { type: "profile" }
  | { type: "traveler"; id: string }
  | null;

// ── Constants ─────────────────────────────────────────────────────────────────
const TRIP_ID = "a1b2c3d4-0000-0000-0000-000000000001";
const INVITE_CODE = "MAUI26";

const QUICK_ACTIONS = [
  { key: "poll",    label: "Group poll",     emoji: "🗳️", bg: "bg-rose-50",    border: "border-rose-200",    text: "text-rose-700"    },
  { key: "plan",    label: "Trip plan",      emoji: "📋", bg: "bg-sky-50",     border: "border-sky-200",     text: "text-sky-700"     },
  { key: "weather", label: "Maui weather",   emoji: "🌺", bg: "bg-indigo-50",  border: "border-indigo-200",  text: "text-indigo-700"  },
  { key: "flight",  label: "Flight info",    emoji: "✈️", bg: "bg-amber-50",   border: "border-amber-200",   text: "text-amber-700"   },
  { key: "meetup",  label: "Meet at resort", emoji: "🏨", bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700" },
  { key: "luau",    label: "Luau night",     emoji: "🌟", bg: "bg-violet-50",  border: "border-violet-200",  text: "text-violet-700"  },
];

const AVATAR_OPTIONS = ["🧔", "👩", "👦", "👧", "👵", "👴", "🧑", "👨", "👩‍🦱", "👨‍🦳", "🧒", "👶"];
const ROLE_PRESETS = ["Trip Organizer", "Co-traveler", "Kid", "Guest", "Grandparent", "Traveler"];

// ── Helpers ───────────────────────────────────────────────────────────────────
function statusColor(status: string) {
  return status === "active" ? "bg-emerald-400" : "bg-amber-400";
}

function statusLabel(status: string) {
  return status === "active" ? "Active" : "Invited";
}

function formatTime(isoString: string) {
  return new Date(isoString).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDateLabel(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(date, now)) return "Today";
  if (sameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

function isSameDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

// Unified avatar — shows photo if available, else emoji
function TravelerAvatar({
  traveler,
  size = "md",
  className = "",
}: {
  traveler: Pick<Traveler, "name" | "avatar" | "avatar_url">;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const dims: Record<string, string> = {
    xs: "w-7 h-7 text-sm",
    sm: "w-9 h-9 text-lg",
    md: "w-12 h-12 text-2xl",
    lg: "w-16 h-16 text-3xl",
    xl: "w-20 h-20 text-4xl",
  };
  const d = dims[size];
  if (traveler.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={traveler.avatar_url}
        alt={traveler.name}
        className={`${d} rounded-full object-cover flex-none ${className}`}
      />
    );
  }
  return (
    <div className={`${d} rounded-full bg-slate-100 flex items-center justify-center flex-none ${className}`}>
      {traveler.avatar ?? "🧑"}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ChatPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [travelers, setTravelers] = useState<Traveler[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [tripDateInfo, setTripDateInfo] = useState<TripDateInfo | null>(null);
  const [tripTitle, setTripTitle] = useState("Maui Trip Group");

  // Sheet
  const [sheet, setSheet] = useState<Sheet>(null);
  const [editMode, setEditMode] = useState(false);
  const [profileEditMode, setProfileEditMode] = useState(false);
  const [showInviteSheet, setShowInviteSheet] = useState(false);
  const [copied, setCopied] = useState(false);

  // Edit fields
  const [editName, setEditName] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState<string | null>(null);
  const [editRole, setEditRole] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Add traveler
  const [addingTraveler, setAddingTraveler] = useState(false);
  const [newName, setNewName] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const msgPhotoRef = useRef<HTMLInputElement>(null);

  // Derived
  const myTraveler = travelers.find((t) => t.user_id === user?.id);
  const displayName =
    myTraveler?.name ??
    user?.user_metadata?.full_name?.split(" ")[0] ??
    user?.email?.split("@")[0] ??
    "Me";
  const initials = (user?.user_metadata?.full_name ?? user?.email ?? "?")
    .split(" ")
    .map((w: string) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const sheetTraveler =
    sheet?.type === "traveler"
      ? travelers.find((t) => t.id === (sheet as { type: "traveler"; id: string }).id) ?? null
      : null;

  // ── Data ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchData() {
      const [msgResult, travelerResult, tripResult] = await Promise.all([
        supabase.from("messages").select("*").eq("trip_id", TRIP_ID).order("created_at", { ascending: true }),
        supabase.from("travelers").select("*").eq("trip_id", TRIP_ID).order("created_at", { ascending: true }),
        supabase.from("trips").select("title, start_date, end_date").eq("id", TRIP_ID).single(),
      ]);
      if (msgResult.data) setMessages(msgResult.data as Message[]);
      if (travelerResult.data) setTravelers(travelerResult.data as Traveler[]);
      if (tripResult.data) {
        setTripTitle(tripResult.data.title);
        setTripDateInfo(getTripDateInfo(tripResult.data.start_date, tripResult.data.end_date));
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("messages-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `trip_id=eq.${TRIP_ID}` },
        (payload) => setMessages((prev) => [...prev, payload.new as Message])
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Actions ───────────────────────────────────────────────────────────────
  async function send() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    const senderName =
      user?.user_metadata?.full_name?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "You";
    await supabase.from("messages").insert({
      trip_id: TRIP_ID,
      sender_name: senderName,
      sender_avatar: myTraveler?.avatar ?? "🧔",
      sender_user_id: user?.id ?? null,
      text,
    });
  }

  function openTravelerSheet(t: Traveler) {
    setSheet({ type: "traveler", id: t.id });
    setEditMode(false);
    setEditName(t.name);
    setEditAvatar(t.avatar);
    setEditAvatarUrl(t.avatar_url ?? null);
    setEditRole(t.role);
  }

  function closeSheet() {
    setSheet(null);
    setEditMode(false);
    setProfileEditMode(false);
  }

  function openProfileEdit() {
    if (!myTraveler) return;
    setEditName(myTraveler.name);
    setEditAvatar(myTraveler.avatar);
    setEditAvatarUrl(myTraveler.avatar_url ?? null);
    setEditRole(myTraveler.role);
    setProfileEditMode(true);
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // works for both profile edit (myTraveler) and traveler edit (sheetTraveler)
    const targetTraveler = profileEditMode ? myTraveler : sheetTraveler;
    if (!file || !targetTraveler) return;
    setUploadingPhoto(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${targetTraveler.id}.${ext}`;
    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setEditAvatarUrl(data.publicUrl);
    }
    setUploadingPhoto(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function saveProfileEdit() {
    if (!myTraveler) return;
    const updates = {
      name: editName,
      avatar: editAvatar,
      avatar_url: editAvatarUrl,
      role: editRole,
    };
    await supabase.from("travelers").update(updates).eq("id", myTraveler.id);
    setTravelers((prev) =>
      prev.map((t) => (t.id === myTraveler.id ? { ...t, ...updates } : t))
    );
    setProfileEditMode(false);
  }

  async function saveEdit() {
    if (!sheetTraveler) return;
    const updates = {
      name: editName,
      avatar: editAvatar,
      avatar_url: editAvatarUrl,
      role: editRole,
    };
    await supabase.from("travelers").update(updates).eq("id", sheetTraveler.id);
    setTravelers((prev) =>
      prev.map((t) => (t.id === sheetTraveler.id ? { ...t, ...updates } : t))
    );
    closeSheet();
  }

  async function removeTraveler() {
    if (!sheetTraveler) return;
    await supabase.from("travelers").delete().eq("id", sheetTraveler.id);
    setTravelers((prev) => prev.filter((t) => t.id !== sheetTraveler.id));
    closeSheet();
  }

  async function addTraveler() {
    const name = newName.trim();
    if (!name) return;
    const { data } = await supabase
      .from("travelers")
      .insert({ trip_id: TRIP_ID, name, avatar: "🧑", role: "Traveler", status: "invited", is_me: false })
      .select()
      .single();
    if (data) setTravelers((prev) => [...prev, data as Traveler]);
    setNewName("");
    setAddingTraveler(false);
  }

  async function handleSignOut() {
    closeSheet();
    await signOut();
    router.replace("/auth");
  }

  function getInviteLink() {
    return `${window.location.origin}/join/${INVITE_CODE}`;
  }

  async function copyInviteLink() {
    await navigator.clipboard.writeText(getInviteLink());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function shareInviteLink() {
    const link = getInviteLink();
    if (navigator.share) {
      await navigator.share({
        title: "Join our Maui Trip 🌺",
        text: "Hey! Join our family trip to Maui on TripFlow.",
        url: link,
      });
    } else {
      copyInviteLink();
    }
  }

  async function handleQuickAction(key: string) {
    const senderName =
      user?.user_metadata?.full_name?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "You";
    const avatar = myTraveler?.avatar ?? "🧔";

    if (key === "poll") {
      await supabase.from("messages").insert({
        trip_id: TRIP_ID,
        sender_name: senderName,
        sender_avatar: avatar,
        sender_user_id: user?.id ?? null,
        card_type: "poll",
        card_title: "Where should we eat on our last night?",
        card_sub: "Mama's Fish House|Merriman's|Monkeypod Kitchen",
        card_emoji: "🗳️",
      });
    } else if (key === "plan") {
      await supabase.from("messages").insert({
        trip_id: TRIP_ID,
        sender_name: senderName,
        sender_avatar: avatar,
        sender_user_id: user?.id ?? null,
        card_type: "plan",
        card_title: "Today's Plan · Day 2",
        card_sub: "Beach → Molokini → Mama's Fish House",
        card_emoji: "📋",
      });
    } else if (key === "dinner") {
      await supabase.from("messages").insert({
        trip_id: TRIP_ID,
        sender_name: senderName,
        sender_avatar: avatar,
        sender_user_id: user?.id ?? null,
        card_type: "reservation",
        card_title: "Dinner · Mama's Fish House",
        card_sub: "7:00 PM · Reservation confirmed · Party of 4",
        card_emoji: "🐟",
      });
    } else if (key === "weather") {
      await supabase.from("messages").insert({
        trip_id: TRIP_ID,
        sender_name: senderName,
        sender_avatar: avatar,
        sender_user_id: user?.id ?? null,
        card_type: "weather",
        card_title: "Jun 5–11 Forecast · Maui",
        card_sub: "78–84°F, mix of sun + showers — perfect beach weather 🌺",
        card_emoji: "🌺",
      });
    } else if (key === "flight") {
      await supabase.from("messages").insert({
        trip_id: TRIP_ID,
        sender_name: senderName,
        sender_avatar: avatar,
        sender_user_id: user?.id ?? null,
        card_type: "reservation",
        card_title: "Flights confirmed ✈️",
        card_sub: "AA271 departs LAX 8:05am → SEA, then AS845 SEA → OGG 12:45pm",
        card_emoji: "✈️",
      });
    } else if (key === "meetup") {
      await supabase.from("messages").insert({
        trip_id: TRIP_ID,
        sender_name: senderName,
        sender_avatar: avatar,
        sender_user_id: user?.id ?? null,
        card_type: "location",
        card_title: "Meet at the Sheraton",
        card_sub: "Sheraton Maui Resort · Ka'anapali Beach · Check-in Jun 5 from 3pm",
        card_emoji: "🏨",
      });
    } else if (key === "luau") {
      await supabase.from("messages").insert({
        trip_id: TRIP_ID,
        sender_name: senderName,
        sender_avatar: avatar,
        sender_user_id: user?.id ?? null,
        card_type: "reservation",
        card_title: "Old Lahaina Luau · Jun 9",
        card_sub: "5:45 PM · 4 tickets · Lei greeting · Front of house seating 🌺",
        card_emoji: "🌟",
      });
    }
  }

  async function handleMsgPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `msg-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const senderName =
        user?.user_metadata?.full_name?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "You";
      await supabase.from("messages").insert({
        trip_id: TRIP_ID,
        sender_name: senderName,
        sender_avatar: myTraveler?.avatar ?? "🧔",
        sender_user_id: user?.id ?? null,
        image_url: data.publicUrl,
      });
    }
    if (msgPhotoRef.current) msgPhotoRef.current.value = "";
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Loading chat…</p>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-5rem)]">

      {/* ── Invite Sheet ─────────────────────────────────────────────────── */}
      {showInviteSheet && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center" onClick={() => setShowInviteSheet(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
          <div
            className="relative w-full max-w-md bg-white rounded-t-3xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-9 h-1 bg-slate-200 rounded-full" />
            </div>
            <div className="px-6 pt-3 pb-10">
              <h3 className="text-lg font-black text-slate-900 mb-1">Invite to Trip</h3>
              <p className="text-sm text-slate-400 mb-5">
                Share this link with anyone you want to add to the Maui trip.
              </p>

              {/* Link display */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 flex items-center gap-3 mb-4">
                <span className="text-base">🔗</span>
                <p className="flex-1 text-xs text-slate-600 font-mono truncate">
                  {typeof window !== "undefined" ? getInviteLink() : `…/join/${INVITE_CODE}`}
                </p>
              </div>

              {/* Code callout */}
              <div className="flex items-center justify-center gap-2 mb-5">
                <span className="text-xs text-slate-400">Or share the code</span>
                <span className="text-base font-black text-slate-900 tracking-widest bg-slate-100 px-3 py-1 rounded-xl">
                  {INVITE_CODE}
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2.5">
                <button
                  onClick={copyInviteLink}
                  className={`flex-1 font-bold py-4 rounded-2xl text-sm transition-all ${
                    copied
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {copied ? "✓ Copied!" : "Copy Link"}
                </button>
                <button
                  onClick={shareInviteLink}
                  className="flex-1 bg-slate-900 text-white font-bold py-4 rounded-2xl text-sm"
                >
                  Share ↗
                </button>
              </div>

              <button
                onClick={() => setShowInviteSheet(false)}
                className="w-full mt-2 text-sm text-slate-400 font-semibold py-3 text-center"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom Sheet ─────────────────────────────────────────────────── */}
      {sheet && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center" onClick={closeSheet}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />

          {/* Sheet panel — constrained to app width */}
          <div
            className="relative w-full max-w-md bg-white rounded-t-3xl shadow-2xl max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 sticky top-0 bg-white z-10">
              <div className="w-9 h-1 bg-slate-200 rounded-full" />
            </div>

            {/* ── Profile sheet ── */}
            {sheet.type === "profile" && (
              <div className="px-6 pt-3 pb-10">
                {!profileEditMode ? (
                  /* ── View mode ── */
                  <>
                    <div className="flex flex-col items-center gap-3 mb-8">
                      <div className="relative">
                        {myTraveler ? (
                          <TravelerAvatar traveler={myTraveler} size="xl" />
                        ) : (
                          <div className="w-20 h-20 rounded-full bg-slate-900 flex items-center justify-center text-white text-2xl font-bold">
                            {initials}
                          </div>
                        )}
                        <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-white" />
                      </div>
                      <div className="text-center">
                        <h2 className="text-2xl font-black text-slate-900">{displayName}</h2>
                        {myTraveler?.role && (
                          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full mt-2 inline-block">
                            {myTraveler.role}
                          </span>
                        )}
                        <p className="text-xs text-slate-400 mt-2">{user?.email}</p>
                      </div>
                    </div>

                    {myTraveler && (
                      <button
                        onClick={openProfileEdit}
                        className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl text-sm mb-2.5"
                      >
                        Edit my profile
                      </button>
                    )}
                    <button
                      onClick={handleSignOut}
                      className="w-full border border-red-200 bg-red-50 text-red-500 font-bold py-4 rounded-2xl text-sm"
                    >
                      Sign out
                    </button>
                    <button
                      onClick={closeSheet}
                      className="w-full mt-2 text-sm text-slate-400 font-semibold py-3 pb-6 text-center"
                    >
                      Close
                    </button>
                  </>
                ) : (
                  /* ── Edit mode ── */
                  <div className="flex flex-col gap-5 py-3">
                    <h3 className="text-base font-black text-slate-900 text-center">Edit my profile</h3>

                    {/* Photo / avatar preview */}
                    <div className="flex flex-col items-center gap-3">
                      <div className="relative">
                        <TravelerAvatar
                          traveler={{ name: editName, avatar: editAvatar, avatar_url: editAvatarUrl }}
                          size="xl"
                        />
                        {uploadingPhoto && (
                          <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                      </div>

                      {/* file input rendered once at component root — see below */}

                      <div className="flex gap-2">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="text-xs font-bold text-slate-700 bg-slate-100 px-4 py-2.5 rounded-full flex items-center gap-1.5"
                        >
                          📷 Upload photo
                        </button>
                        {editAvatarUrl && (
                          <button
                            onClick={() => setEditAvatarUrl(null)}
                            className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-2.5 rounded-full"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Emoji picker */}
                    {!editAvatarUrl && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                          Or choose emoji
                        </p>
                        <div className="flex gap-2 flex-wrap">
                          {AVATAR_OPTIONS.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => setEditAvatar(emoji)}
                              className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl transition-all ${
                                editAvatar === emoji
                                  ? "bg-slate-900 scale-110"
                                  : "bg-slate-100"
                              }`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Name */}
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                        Name
                      </p>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full text-sm border border-slate-200 rounded-2xl px-4 py-3.5 outline-none focus:border-slate-900 bg-white"
                      />
                    </div>

                    {/* Role */}
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                        Role
                      </p>
                      <div className="flex gap-1.5 flex-wrap mb-3">
                        {ROLE_PRESETS.map((preset) => {
                          const active =
                            preset === "Kid"
                              ? editRole.startsWith("Kid")
                              : editRole === preset;
                          return (
                            <button
                              key={preset}
                              onClick={() =>
                                setEditRole(preset === "Kid" ? "Kid · Age " : preset)
                              }
                              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                                active
                                  ? "bg-slate-900 text-white border-slate-900"
                                  : "bg-white text-slate-500 border-slate-200"
                              }`}
                            >
                              {preset === "Kid" ? "👦 Kid" : preset}
                            </button>
                          );
                        })}
                      </div>
                      <input
                        type="text"
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                        placeholder="e.g. Trip Organizer, Navigator…"
                        className="w-full text-sm border border-slate-200 rounded-2xl px-4 py-3.5 outline-none focus:border-slate-900 bg-white"
                      />
                      <p className="text-[10px] text-slate-400 mt-1.5 px-1">
                        Tap a preset or type anything custom
                      </p>
                    </div>

                    {/* Save / Cancel */}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={saveProfileEdit}
                        className="flex-1 bg-slate-900 text-white font-bold py-4 rounded-2xl text-sm"
                      >
                        Save changes
                      </button>
                      <button
                        onClick={() => setProfileEditMode(false)}
                        className="px-5 text-sm font-semibold text-slate-400 border border-slate-200 rounded-2xl"
                      >
                        Back
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Traveler sheet ── */}
            {sheet.type === "traveler" && sheetTraveler && (
              <div className="px-6 pt-2 pb-10">
                {!editMode ? (
                  /* View mode */
                  <div>
                    <div className="flex flex-col items-center gap-3 py-5">
                      <div className="relative">
                        <TravelerAvatar traveler={sheetTraveler} size="xl" />
                        <span className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-white ${statusColor(sheetTraveler.status)}`} />
                      </div>
                      <div className="text-center">
                        <h2 className="text-2xl font-black text-slate-900">{sheetTraveler.name}</h2>
                        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full mt-2 inline-block">
                          {sheetTraveler.role}
                        </span>
                        <p className="text-xs text-slate-400 mt-2">{statusLabel(sheetTraveler.status)}</p>
                      </div>
                    </div>

                    {sheetTraveler.user_id === user?.id ? (
                      <p className="text-center text-sm text-slate-400 mb-4">This is you ✨</p>
                    ) : (
                      <div className="flex flex-col gap-2.5">
                        <button
                          onClick={() => setEditMode(true)}
                          className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl text-sm"
                        >
                          Edit traveler
                        </button>
                        <button
                          onClick={removeTraveler}
                          className="w-full border border-red-200 bg-red-50 text-red-500 font-bold py-4 rounded-2xl text-sm"
                        >
                          Remove from trip
                        </button>
                      </div>
                    )}
                    <button
                      onClick={closeSheet}
                      className="w-full mt-2 text-sm text-slate-400 font-semibold py-3 text-center"
                    >
                      Close
                    </button>
                  </div>
                ) : (
                  /* Edit mode */
                  <div className="flex flex-col gap-5 py-3">
                    <h3 className="text-base font-black text-slate-900 text-center">Edit traveler</h3>

                    {/* Photo / avatar preview */}
                    <div className="flex flex-col items-center gap-3">
                      <div className="relative">
                        <TravelerAvatar
                          traveler={{ ...sheetTraveler, avatar: editAvatar, avatar_url: editAvatarUrl }}
                          size="xl"
                        />
                        {uploadingPhoto && (
                          <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                      </div>

                      {/* file input rendered once at component root — see below */}

                      <div className="flex gap-2">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="text-xs font-bold text-slate-700 bg-slate-100 px-4 py-2.5 rounded-full flex items-center gap-1.5"
                        >
                          📷 Upload photo
                        </button>
                        {editAvatarUrl && (
                          <button
                            onClick={() => setEditAvatarUrl(null)}
                            className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-2.5 rounded-full"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Emoji picker — only shown if no photo */}
                    {!editAvatarUrl && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                          Or choose emoji
                        </p>
                        <div className="flex gap-2 flex-wrap">
                          {AVATAR_OPTIONS.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => setEditAvatar(emoji)}
                              className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl transition-all ${
                                editAvatar === emoji
                                  ? "bg-slate-900 scale-110"
                                  : "bg-slate-100"
                              }`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Name */}
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                        Name
                      </p>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full text-sm border border-slate-200 rounded-2xl px-4 py-3.5 outline-none focus:border-slate-900 bg-white"
                      />
                    </div>

                    {/* Role */}
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                        Role
                      </p>
                      {/* Quick-select presets */}
                      <div className="flex gap-1.5 flex-wrap mb-3">
                        {ROLE_PRESETS.map((preset) => {
                          const active =
                            preset === "Kid"
                              ? editRole.startsWith("Kid")
                              : editRole === preset;
                          return (
                            <button
                              key={preset}
                              onClick={() => {
                                if (preset === "Kid") {
                                  setEditRole("Kid · Age ");
                                } else {
                                  setEditRole(preset);
                                }
                              }}
                              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                                active
                                  ? "bg-slate-900 text-white border-slate-900"
                                  : "bg-white text-slate-500 border-slate-200"
                              }`}
                            >
                              {preset === "Kid" ? "👦 Kid" : preset}
                            </button>
                          );
                        })}
                      </div>
                      {/* Free-text role — always editable */}
                      <input
                        type="text"
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                        placeholder="e.g. Kid · Age 8, Navigator, Dog Mom…"
                        className="w-full text-sm border border-slate-200 rounded-2xl px-4 py-3.5 outline-none focus:border-slate-900 bg-white"
                      />
                      <p className="text-[10px] text-slate-400 mt-1.5 px-1">
                        Tap a preset or type anything custom
                      </p>
                    </div>

                    {/* Save / Cancel */}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={saveEdit}
                        className="flex-1 bg-slate-900 text-white font-bold py-4 rounded-2xl text-sm"
                      >
                        Save changes
                      </button>
                      <button
                        onClick={() => setEditMode(false)}
                        className="px-5 text-sm font-semibold text-slate-400 border border-slate-200 rounded-2xl"
                      >
                        Back
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-100 px-4 pt-5 pb-3 flex-none">

        {/* Title row */}
        <div className="flex items-start justify-between mb-2.5">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h1 className="text-lg font-black text-slate-900">{tripTitle}</h1>
              {tripDateInfo?.status === "active" && (
                <span className="flex items-center gap-1 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse inline-block" />
                  Live
                </span>
              )}
              {tripDateInfo?.status === "upcoming" && (
                <span className="bg-sky-50 border border-sky-200 text-sky-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  ✈️ {tripDateInfo.daysUntilTrip}d
                </span>
              )}
              {tripDateInfo?.status === "completed" && (
                <span className="bg-slate-100 text-slate-500 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                  Complete
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              {tripDateInfo?.status === "active"
                ? `Day ${tripDateInfo.currentDayNumber} of ${tripDateInfo.totalDays} · ${travelers.length} travelers`
                : `${travelers.length} travelers`}
            </p>
          </div>
          <button
            onClick={() => setShowInviteSheet(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl mt-0.5"
          >
            <span>🔗</span> Invite
          </button>
        </div>

        {/* ── Crew strip — always visible, "You" pinned first ── */}
        <div
          className="flex items-start gap-3 overflow-x-auto pt-1 pb-1"
          style={{ scrollbarWidth: "none" }}
        >
          {[...travelers]
            .sort((a, b) => {
              if (a.user_id === user?.id) return -1;
              if (b.user_id === user?.id) return 1;
              return 0;
            })
            .map((t) => {
            const isMe = t.user_id === user?.id;
            return (
              <button
                key={t.id}
                onClick={() => isMe ? setSheet({ type: "profile" }) : openTravelerSheet(t)}
                className="flex flex-col items-center gap-1 flex-none w-[52px]"
              >
                <div className="relative">
                  {/* Sky-blue border on your avatar — wrapper avoids overflow clipping */}
                  <div className={isMe ? "p-[2.5px] rounded-full bg-sky-500" : ""}>
                    <TravelerAvatar traveler={t} size="sm" />
                  </div>
                  {/* Status dot */}
                  <span
                    className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${statusColor(t.status)}`}
                  />
                </div>
                <p className={`text-[10px] font-semibold truncate w-full text-center leading-tight ${isMe ? "text-sky-600" : "text-slate-700"}`}>
                  {isMe ? "You" : t.name}
                </p>
                <p className="text-[9px] text-slate-400 truncate w-full text-center leading-tight">
                  {t.role.split(" · ")[0]}
                </p>
              </button>
            );
          })}

          {/* Add traveler */}
          {addingTraveler ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addTraveler();
              }}
              className="flex items-center gap-1.5 flex-none self-start mt-0.5"
            >
              <input
                autoFocus
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Name…"
                className="text-xs border border-slate-300 rounded-xl px-2 py-1.5 outline-none focus:border-slate-900 w-24 bg-white"
              />
              <button
                type="submit"
                className="text-xs bg-slate-900 text-white px-2.5 py-1.5 rounded-xl font-bold"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddingTraveler(false);
                  setNewName("");
                }}
                className="text-[10px] text-slate-400 font-semibold"
              >
                ✕
              </button>
            </form>
          ) : (
            <button
              onClick={() => setAddingTraveler(true)}
              className="flex flex-col items-center gap-1 flex-none w-[52px]"
            >
              <div className="w-9 h-9 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:border-slate-500 transition-colors">
                <span className="text-base font-light">+</span>
              </div>
              <p className="text-[10px] text-slate-400">Add</p>
            </button>
          )}
        </div>

      </div>

      {/* ── Messages ─────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-slate-100" />
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
            {formatTodayLabel()}
          </span>
          <div className="flex-1 h-px bg-slate-100" />
        </div>

        {messages.map((msg, idx) => {
          const isMe = msg.sender_user_id
            ? msg.sender_user_id === user?.id
            : msg.sender_name ===
              (user?.user_metadata?.full_name?.split(" ")[0] ??
                user?.email?.split("@")[0]);
          const prevMsg = messages[idx - 1];
          const prevIsMe = prevMsg
            ? prevMsg.sender_user_id
              ? prevMsg.sender_user_id === user?.id
              : false
            : false;
          const showAvatar =
            !isMe &&
            (!prevMsg || prevMsg.sender_name !== msg.sender_name || prevIsMe);
          const showDateDivider = !prevMsg || !isSameDay(prevMsg.created_at, msg.created_at);

          return (
            <React.Fragment key={msg.id}>
              {showDateDivider && (
                <div className="flex items-center gap-3 my-2 px-1">
                  <div className="flex-1 h-px bg-slate-100" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                    {formatDateLabel(msg.created_at)}
                  </span>
                  <div className="flex-1 h-px bg-slate-100" />
                </div>
              )}
            <div
              className={`flex gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}
            >
              {!isMe && (
                <div className="flex-none w-8 mt-auto">
                  {showAvatar && (
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-base">
                      {msg.sender_avatar}
                    </div>
                  )}
                </div>
              )}
              <div
                className={`flex flex-col gap-0.5 max-w-[75%] ${
                  isMe ? "items-end" : "items-start"
                }`}
              >
                {showAvatar && !isMe && (
                  <p className="text-[10px] font-semibold text-slate-400 px-1">
                    {msg.sender_name}
                  </p>
                )}
                {msg.text && (
                  <div
                    className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                      isMe
                        ? "bg-gradient-to-br from-sky-500 to-sky-700 text-white rounded-tr-sm"
                        : "bg-white border border-slate-100 text-slate-800 rounded-tl-sm"
                    }`}
                  >
                    {msg.text}
                  </div>
                )}
                {msg.image_url && (
                  <div className="rounded-2xl overflow-hidden w-52 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={msg.image_url} alt="" className="w-full h-36 object-cover" />
                  </div>
                )}
                {msg.card_type && msg.card_type !== "poll" && (
                  <div className="bg-white border border-slate-200 rounded-2xl px-3 py-2.5 shadow-sm flex items-center gap-2.5 w-60">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-none ${
                      msg.card_type === "weather" ? "bg-indigo-50" :
                      msg.card_type === "reservation" ? "bg-amber-50" :
                      msg.card_type === "location" ? "bg-emerald-50" : "bg-sky-50"
                    }`}>
                      {msg.card_emoji}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 leading-tight">
                        {msg.card_title}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                        {msg.card_sub}
                      </p>
                    </div>
                  </div>
                )}
                {msg.card_type === "poll" && (
                  <div className="bg-white border border-rose-200 rounded-2xl px-3.5 py-3 shadow-sm w-64">
                    <div className="flex items-center gap-1.5 mb-2.5">
                      <span className="text-base">{msg.card_emoji}</span>
                      <p className="text-xs font-black text-slate-800 leading-tight flex-1">{msg.card_title}</p>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {(msg.card_sub ?? "").split("|").map((opt, i) => {
                        const widths = ["72%", "45%", "28%"];
                        const votes = [3, 2, 1];
                        return (
                          <div key={i} className="relative">
                            <div className="h-8 rounded-xl bg-rose-50 overflow-hidden flex items-center">
                              <div className="h-full bg-rose-100 rounded-xl transition-all" style={{ width: widths[i] }} />
                            </div>
                            <div className="absolute inset-0 flex items-center justify-between px-2.5">
                              <p className="text-[11px] font-semibold text-slate-700 z-10">{opt.trim()}</p>
                              <p className="text-[10px] font-bold text-rose-500 z-10">{votes[i]}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[9px] text-slate-400 mt-2 text-right">Tap to vote · 6 responses</p>
                  </div>
                )}
                <p className="text-[10px] text-slate-400 px-1">
                  {formatTime(msg.created_at)}
                </p>
              </div>
            </div>
            </React.Fragment>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* ── Quick actions + input ─────────────────────────────────────────── */}
      <div className="flex-none bg-white border-t border-slate-100 px-4 pt-2.5">
        <div
          className="flex gap-2 overflow-x-auto pb-2.5"
          style={
            { scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties
          }
        >
          {QUICK_ACTIONS.map((a) => (
            <button
              key={a.key}
              onClick={() => handleQuickAction(a.key)}
              className={`flex-none flex flex-col items-center gap-0.5 text-center px-3 py-2 rounded-2xl border transition-all active:scale-95 ${a.bg} ${a.border} ${a.text}`}
              style={{ minWidth: "64px" }}
            >
              <span className="text-xl leading-none">{a.emoji}</span>
              <span className="text-[10px] font-bold leading-tight whitespace-nowrap mt-0.5">{a.label}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2 pb-3">
          <button
            onClick={() => msgPhotoRef.current?.click()}
            className="w-10 h-10 flex-none bg-slate-100 text-slate-500 rounded-2xl flex items-center justify-center text-base hover:bg-slate-200 transition-colors"
            title="Send photo"
          >
            📷
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Message the group..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-200 transition-all"
          />
          <button
            onClick={send}
            disabled={!input.trim()}
            className="w-10 h-10 flex-none bg-sky-600 text-white rounded-2xl flex items-center justify-center font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            ↑
          </button>
        </div>
      </div>

      {/* ── File inputs ───────────────────────────────────────────────────── */}
      {/* Avatar uploads (traveler/profile edit) */}
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handlePhotoUpload}
        className="hidden"
      />
      {/* Message photo (📷 quick action) */}
      <input
        type="file"
        accept="image/*"
        ref={msgPhotoRef}
        onChange={handleMsgPhoto}
        className="hidden"
      />

    </div>
  );
}
