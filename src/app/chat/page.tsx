"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

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
  { label: "Today's plan", emoji: "📋" },
  { label: "Share location", emoji: "📍" },
  { label: "Dinner details", emoji: "🐟" },
  { label: "Photo", emoji: "📷" },
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

  // Sheet
  const [sheet, setSheet] = useState<Sheet>(null);
  const [editMode, setEditMode] = useState(false);
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
      const [msgResult, travelerResult] = await Promise.all([
        supabase
          .from("messages")
          .select("*")
          .eq("trip_id", TRIP_ID)
          .order("created_at", { ascending: true }),
        supabase
          .from("travelers")
          .select("*")
          .eq("trip_id", TRIP_ID)
          .order("created_at", { ascending: true }),
      ]);
      if (msgResult.data) setMessages(msgResult.data as Message[]);
      if (travelerResult.data) setTravelers(travelerResult.data as Traveler[]);
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
      is_me: true,
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
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !sheetTraveler) return;
    setUploadingPhoto(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${sheetTraveler.id}.${ext}`;
    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setEditAvatarUrl(data.publicUrl);
    }
    setUploadingPhoto(false);
    // reset so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
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
                {/* Avatar + name */}
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

                {/* Actions */}
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

                      {/* Hidden file input */}
                      <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />

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
        <div className="flex items-start justify-between mb-3">
          <div>
            <h1 className="text-lg font-black text-slate-900">Maui Trip Group</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Day 2 of 7 &middot; {travelers.length} travelers
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

        {/* Pinned banner */}
        <div className="mt-3 flex items-center gap-2 bg-sky-50 border border-sky-100 rounded-xl px-3 py-2">
          <span className="text-base">📌</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-sky-700">Pinned · Tonight</p>
            <p className="text-xs text-sky-600 truncate">
              Dinner @ Mama&apos;s Fish House · 7:00 PM · Meet in lobby at 6:45
            </p>
          </div>
        </div>
      </div>

      {/* ── Messages ─────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-slate-100" />
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
            Today · May 23
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

          return (
            <div
              key={msg.id}
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
                    className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      isMe
                        ? "bg-sky-600 text-white rounded-tr-sm"
                        : "bg-white border border-slate-100 text-slate-800 shadow-sm rounded-tl-sm"
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
                {msg.card_type && (
                  <div className="bg-white border border-slate-200 rounded-2xl px-3 py-2.5 shadow-sm flex items-center gap-2.5 w-56">
                    <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center text-lg flex-none">
                      {msg.card_emoji}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {msg.card_title}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {msg.card_sub}
                      </p>
                    </div>
                  </div>
                )}
                <p className="text-[10px] text-slate-400 px-1">
                  {formatTime(msg.created_at)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* ── Quick actions + input ─────────────────────────────────────────── */}
      <div className="flex-none bg-white border-t border-slate-100 px-4 pt-2">
        <div
          className="flex gap-2 overflow-x-auto pb-2"
          style={
            { scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties
          }
        >
          {QUICK_ACTIONS.map((a) => (
            <button
              key={a.label}
              className="flex-none flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full whitespace-nowrap"
            >
              {a.emoji} {a.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 pb-3">
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
            className="w-10 h-10 bg-sky-600 text-white rounded-2xl flex items-center justify-center font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            ↑
          </button>
        </div>
      </div>

    </div>
  );
}
