"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useActiveTrip } from "@/hooks/useActiveTrip";
import { getTripDateInfo, formatTodayLabel, type TripDateInfo } from "@/lib/tripDates";
import { ResilientState } from "@/components/ResilientState";
import FirstTripSetup from "@/components/FirstTripSetup";
import { DEMO_TRIP_ID, FAMILY_INVITE_KEY, PREVIEW_INVITE_KEY, buildInviteUrl } from "@/lib/tripConfig";

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

const QUICK_ACTIONS = [
  { key: "poll",    label: "Group poll",     emoji: "🗳️", bg: "bg-rose-50",    border: "border-rose-200",    text: "text-rose-700"    },
  { key: "plan",    label: "Trip plan",      emoji: "📋", bg: "bg-sky-50",     border: "border-sky-200",     text: "text-sky-700"     },
  { key: "weather", label: "Weather",        emoji: "☀️", bg: "bg-indigo-50",  border: "border-indigo-200",  text: "text-indigo-700"  },
  { key: "flight",  label: "Flight info",    emoji: "✈️", bg: "bg-amber-50",   border: "border-amber-200",   text: "text-amber-700"   },
  { key: "meetup",  label: "Meetup spot",    emoji: "📍", bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700" },
  { key: "idea",    label: "Trip idea",      emoji: "✨", bg: "bg-violet-50",  border: "border-violet-200",  text: "text-violet-700"  },
];

const AVATAR_OPTIONS = ["🧔", "👩", "👦", "👧", "👵", "👴", "🧑", "👨", "👩‍🦱", "👨‍🦳", "🧒", "👶"];
const ROLE_PRESETS = ["Trip Organizer", "Co-traveler", "Kid", "Guest", "Grandparent", "Traveler"];

function buildFallbackMessages(title: string): Message[] {
  return [
    {
      id: "preview-welcome",
      sender_name: "Daywave",
      sender_avatar: "🌺",
      text: "Welcome to the group chat. Share plans, polls, photos, and day-of updates here.",
      created_at: new Date().toISOString(),
    },
    {
      id: "preview-plan",
      sender_name: "Daywave",
      sender_avatar: "🌺",
      card_type: "plan",
      card_title: `${title} Plan`,
      card_sub: "Tap to open My Day",
      card_emoji: "📋",
      created_at: new Date().toISOString(),
    },
  ];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function statusColor(status: string) {
  return status === "active" ? "bg-emerald-400" : "bg-slate-300";
}

function statusLabel(status: string) {
  return status === "active" ? "Joined" : "Invite sent";
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

function dedupeTravelersByUser(rows: Traveler[]): Traveler[] {
  const seenUsers = new Set<string>();
  const seenLoose = new Set<string>();
  return rows.filter((traveler) => {
    if (traveler.user_id) {
      if (seenUsers.has(traveler.user_id)) return false;
      seenUsers.add(traveler.user_id);
      return true;
    }
    const looseKey = `${traveler.name.trim().toLowerCase()}|${traveler.avatar}|${traveler.role}`;
    if (seenLoose.has(looseKey)) return false;
    seenLoose.add(looseKey);
    return true;
  });
}

function limitDemoTravelers(rows: Traveler[], userId?: string | null): Traveler[] {
  const myTraveler = rows.find((traveler) => traveler.user_id === userId);
  const seededTravelers = rows.filter((traveler) => !traveler.user_id).slice(0, myTraveler ? 4 : 5);
  return myTraveler ? [myTraveler, ...seededTravelers] : seededTravelers;
}

function isSameDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

function isSingleObjectCoercionIssue(message?: string | null) {
  return message?.toLowerCase().includes("single json object") ?? false;
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

// Module-level cache so chat persists across tab switches (stale-while-revalidate)
let _messagesCache: Message[] | null = null;
let _travelersCache: Traveler[] | null = null;

// ── Main Component ────────────────────────────────────────────────────────────
export default function ChatPage() {
  const { user, signOut } = useAuth();
  const activeTrip = useActiveTrip(user);
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>(_messagesCache ?? []);
  const [travelers, setTravelers] = useState<Traveler[]>(_travelersCache ?? []);
  const [loading, setLoading] = useState(_messagesCache === null);
  const [loadIssue, setLoadIssue] = useState<string | null>(null);
  const [actionIssue, setActionIssue] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [tripDateInfo, setTripDateInfo] = useState<TripDateInfo | null>(null);
  const [tripTitle, setTripTitle] = useState("");
  const [isPreviewSession, setIsPreviewSession] = useState(false);
  const [hasFamilyInvite, setHasFamilyInvite] = useState(false);

  // Poll creation modal
  const [pollModal, setPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", "", ""]);

  // Local vote tracking per poll message
  const [pollVotes, setPollVotes] = useState<Record<string, number>>({});

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
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(new Set());
  const [reportSheet, setReportSheet] = useState<{ messageId: string; senderId: string | null; senderName: string } | null>(null);
  const [reportSent, setReportSent] = useState(false);
  const [deleteAccountConfirm, setDeleteAccountConfirm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const msgPhotoRef = useRef<HTMLInputElement>(null);
  const previousMessageCountRef = useRef(0);

  // Derived
  const myTraveler = travelers.find((t) => t.user_id === user?.id);
  const dedupedTravelers = dedupeTravelersByUser(travelers);
  const visibleTravelersBase = activeTrip.activeTripId === DEMO_TRIP_ID
    ? limitDemoTravelers(dedupedTravelers, user?.id)
    : dedupedTravelers;
  const visibleTravelers = visibleTravelersBase.filter((t) => {
    const legacyOrganizerPlaceholder =
      myTraveler &&
      t.is_me &&
      !t.user_id &&
      t.name.trim().toLowerCase() === "you";
    return !legacyOrganizerPlaceholder;
  });
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
  const needsFamilyJoin = Boolean(user && !activeTrip.isChecking && !activeTrip.isReady && !isPreviewSession);
  const isReadOnlyGroup = isPreviewSession || needsFamilyJoin;

  // ── Data ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchData() {
      setLoadIssue(null);
      try {
        let previewSession = localStorage.getItem(PREVIEW_INVITE_KEY) === "1";
        setIsPreviewSession(previewSession);
        setHasFamilyInvite(localStorage.getItem(FAMILY_INVITE_KEY) === "1");

        if (activeTrip.isChecking) return;

        if (!activeTrip.isReady || !activeTrip.activeTripId) {
          setTravelers([]);
          setMessages(previewSession ? buildFallbackMessages("Trip Preview") : []);
          setTripTitle(previewSession ? "Trip Preview" : "");
          setTripDateInfo(null);
          setLoading(false);
          return;
        }

        const [msgResult, travelerResult, tripResult] = await Promise.all([
          supabase.from("messages").select("*").eq("trip_id", activeTrip.activeTripId).order("created_at", { ascending: true }),
          supabase.from("travelers").select("*").eq("trip_id", activeTrip.activeTripId).order("created_at", { ascending: true }),
          supabase.from("trips").select("title, start_date, end_date").eq("id", activeTrip.activeTripId).maybeSingle(),
        ]);
        const error = [msgResult.error, travelerResult.error].find(
          (issue) => issue && !isSingleObjectCoercionIssue(issue.message)
        );
        if (error) setLoadIssue(error.message);
        const liveTravelers = (travelerResult.data ?? []) as Traveler[];
        const signedInTraveler = liveTravelers.some((traveler) => traveler.user_id === user?.id);
        if (previewSession && signedInTraveler) {
          localStorage.removeItem(PREVIEW_INVITE_KEY);
          previewSession = false;
          setIsPreviewSession(false);
        }
        _travelersCache = liveTravelers;
        setTravelers(liveTravelers);

        const liveMessages = (msgResult.data ?? []) as Message[];
        const resolvedMessages = liveMessages.length > 0 ? liveMessages : previewSession ? buildFallbackMessages(tripResult.data?.title ?? "Group") : [];
        _messagesCache = resolvedMessages;
        setMessages(resolvedMessages);
        if (tripResult.data) {
          setTripTitle(tripResult.data.title);
          setTripDateInfo(getTripDateInfo(tripResult.data.start_date, tripResult.data.end_date));
        }
      } catch (err) {
        setLoadIssue(err instanceof Error ? err.message : "Group chat could not refresh.");
      }
      setLoading(false);
    }
    fetchData();
  }, [activeTrip.activeTripId, activeTrip.isChecking, activeTrip.isReady, user?.id]);

  useEffect(() => {
    const onTripChanged = () => void activeTrip.reloadTrips();
    window.addEventListener("daywave:trip-changed", onTripChanged);
    return () => window.removeEventListener("daywave:trip-changed", onTripChanged);
  }, [activeTrip.reloadTrips]);

  useEffect(() => {
    if (!activeTrip.activeTripId) return;
    const channel = supabase
      .channel("messages-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `trip_id=eq.${activeTrip.activeTripId}` },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) =>
            prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]
          );
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTrip.activeTripId]);

  useEffect(() => {
    const previousCount = previousMessageCountRef.current;
    previousMessageCountRef.current = messages.length;
    if (previousCount === 0 || messages.length <= previousCount) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load blocked users
  useEffect(() => {
    if (!user) return;
    void supabase
      .from("blocked_users")
      .select("blocked_user_id")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (data) setBlockedUserIds(new Set(data.map((r: { blocked_user_id: string }) => r.blocked_user_id)));
      });
  }, [user]);

  async function reportMessage(messageId: string, reportedUserId: string | null, contentPreview: string) {
    if (!user) return;
    await supabase.from("content_reports").insert({
      reporter_user_id: user.id,
      reported_user_id: reportedUserId,
      message_id: messageId,
      trip_id: activeTrip.activeTripId,
      reason: "objectionable_content",
      content_preview: contentPreview.slice(0, 200),
    });
    setReportSheet(null);
    setReportSent(true);
    setTimeout(() => setReportSent(false), 4000);
  }

  async function deleteAccount() {
    setDeletingAccount(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/delete-account`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
      });
      if (!res.ok) throw new Error("Delete failed");
      localStorage.clear();
      window.location.replace("/auth/");
    } catch {
      setDeletingAccount(false);
      setDeleteAccountConfirm(false);
    }
  }

  async function blockUser(blockedId: string) {
    if (!user) return;
    await supabase.from("blocked_users").insert({ user_id: user.id, blocked_user_id: blockedId });
    setBlockedUserIds((prev) => new Set([...prev, blockedId]));
    await reportMessage(reportSheet?.messageId ?? "", blockedId, "blocked_user");
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  async function send() {
    const text = input.trim();
    if (!text) return;
    if (!activeTrip.activeTripId) return;
    if (isReadOnlyGroup) {
      setActionIssue(isPreviewSession
        ? "Preview mode is read-only. Use the family invite link when you want to join the real trip."
        : "Join the trip before sending messages to the group.");
      return;
    }
    setInput("");
    const senderName =
      user?.user_metadata?.full_name?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "You";
    const { data, error } = await supabase.from("messages").insert({
      trip_id: activeTrip.activeTripId,
      sender_name: senderName,
      sender_avatar: myTraveler?.avatar ?? "🧔",
      sender_user_id: user?.id ?? null,
      text,
    }).select().single();
    if (error) {
      setInput(text);
      setActionIssue(error.message);
      return;
    }
    if (data) setMessages((prev) => [...prev, data as Message]);
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

  useEffect(() => {
    if (!myTraveler) return;
    if (localStorage.getItem("daywave-open-profile") !== "1") return;
    localStorage.removeItem("daywave-open-profile");
    openProfileEdit();
    setSheet({ type: "profile" });
  }, [myTraveler]);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // works for both profile edit (myTraveler) and traveler edit (sheetTraveler)
    const targetTraveler = profileEditMode ? myTraveler : sheetTraveler;
    if (!file || !targetTraveler) return;
    setUploadingPhoto(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${targetTraveler.id}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, file, { cacheControl: "31536000", contentType: file.type || undefined });
    if (error) {
      setActionIssue(`Photo upload failed: ${error.message}`);
    } else {
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setEditAvatarUrl(`${data.publicUrl}?v=${Date.now()}`);
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
    if (!activeTrip.activeTripId) return;
    if (isReadOnlyGroup) {
      setActionIssue(isPreviewSession
        ? "Preview mode is read-only. Use the family invite link to manage real travelers."
        : "Join the trip before adding travelers.");
      return;
    }
    const { data } = await supabase
      .from("travelers")
      .insert({ trip_id: activeTrip.activeTripId, name, avatar: "🧑", role: "Traveler", status: "invited", is_me: false })
      .select()
      .single();
    if (data) setTravelers((prev) => [...prev, data as Traveler]);
    setNewName("");
    setAddingTraveler(false);
  }

  async function handleSignOut() {
    closeSheet();
    localStorage.removeItem(PREVIEW_INVITE_KEY);
    localStorage.removeItem(FAMILY_INVITE_KEY);
    await signOut();
    router.replace("/auth");
  }

  function getInviteLink() {
    const code = activeTrip.activeTrip?.invite_code;
    return buildInviteUrl(code);
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
        title: `Join us on Daywave`,
        text: `Hey! Join our trip${tripTitle ? ` — ${tripTitle}` : ""} on Daywave.`,
        url: link,
      });
    } else {
      copyInviteLink();
    }
  }

  async function handleQuickAction(key: string) {
    if (isReadOnlyGroup) {
      setActionIssue(isPreviewSession
        ? "Preview mode is read-only. Use the family invite link when you want to join the real trip."
        : "Join the trip before posting to the group.");
      return;
    }
    if (key === "poll") {
      setPollModal(true);
      return;
    }

    const senderName =
      user?.user_metadata?.full_name?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "You";
    const avatar = myTraveler?.avatar ?? "🧔";

    const destination = activeTrip.activeTrip?.destination ?? "the destination";
    const tripName = activeTrip.activeTrip?.title ?? "Trip";
    const planCard = tripDateInfo?.status === "active"
      ? { card_type: "plan", card_title: `Day ${tripDateInfo.currentDayNumber} Plan`, card_sub: "Tap to view the full itinerary in Today", card_emoji: "📋" }
      : { card_type: "plan", card_title: `${tripName} Plan`, card_sub: `${destination} · tap to open Today`, card_emoji: "📋" };

    const payloads: Record<string, object> = {
      plan: planCard,
      weather: { card_type: "weather", card_title: `${destination} weather`, card_sub: "Check the latest forecast before locking plans.", card_emoji: "☀️" },
      flight: { card_type: "reservation", card_title: "Flight info ✈️", card_sub: "Add flight reservations in Docs so everyone has the details.", card_emoji: "✈️" },
      meetup: { card_type: "location", card_title: "Meetup spot", card_sub: "Share the address, timing, and arrival notes for the group.", card_emoji: "📍" },
      idea: { card_type: "plan", card_title: "Trip idea", card_sub: "Drop an activity, meal, or free-time idea for the group to discuss.", card_emoji: "✨" },
    };

    const card = payloads[key];
    if (!card) return;
    if (!activeTrip.activeTripId) return;

    const { data } = await supabase.from("messages").insert({
      trip_id: activeTrip.activeTripId,
      sender_name: senderName,
      sender_avatar: avatar,
      sender_user_id: user?.id ?? null,
      ...card,
    }).select().single();
    if (data) setMessages((prev) => [...prev, data as Message]);
  }

  async function submitPoll() {
    const question = pollQuestion.trim();
    const opts = pollOptions.map((o) => o.trim()).filter(Boolean);
    if (!question || opts.length < 2) return;
    if (isReadOnlyGroup) return;
    if (!activeTrip.activeTripId) return;

    const senderName =
      user?.user_metadata?.full_name?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "You";
    const { data } = await supabase.from("messages").insert({
      trip_id: activeTrip.activeTripId,
      sender_name: senderName,
      sender_avatar: myTraveler?.avatar ?? "🧔",
      sender_user_id: user?.id ?? null,
      card_type: "poll",
      card_title: question,
      card_sub: opts.join("|"),
      card_emoji: "🗳️",
    }).select().single();
    if (data) setMessages((prev) => [...prev, data as Message]);

    setPollModal(false);
    setPollQuestion("");
    setPollOptions(["", "", ""]);
  }

  async function handleMsgPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (isReadOnlyGroup) {
      setActionIssue(isPreviewSession
        ? "Preview mode is read-only. Use the family invite link when you want to join the real trip."
        : "Join the trip before sending photos to the group.");
      if (msgPhotoRef.current) msgPhotoRef.current.value = "";
      return;
    }
    if (!activeTrip.activeTripId) return;
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `msg-${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (!uploadError) {
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const senderName =
        user?.user_metadata?.full_name?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "You";
      const { data } = await supabase.from("messages").insert({
        trip_id: activeTrip.activeTripId,
        sender_name: senderName,
        sender_avatar: myTraveler?.avatar ?? "🧔",
        sender_user_id: user?.id ?? null,
        image_url: urlData.publicUrl,
      }).select().single();
      if (data) setMessages((prev) => [...prev, data as Message]);
    }
    if (msgPhotoRef.current) msgPhotoRef.current.value = "";
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading && messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Loading chat…</p>
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col" style={{ height: "calc(100dvh - 64px - env(safe-area-inset-bottom, 0px))" }}>

      {(loadIssue || actionIssue) && (
        <div className="px-4 pt-3">
          <ResilientState
            title={actionIssue ? "Message not sent" : "Group chat is using the latest saved view"}
            message={actionIssue ? "Your message is back in the composer so you can try again." : "The group space is still available, but live updates could not refresh just now."}
            detail={actionIssue ?? loadIssue}
            actionLabel={actionIssue ? "Dismiss" : "Retry"}
            onAction={() => actionIssue ? setActionIssue(null) : window.location.reload()}
            compact
          />
        </div>
      )}

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
            <div className="px-4 pt-3 pb-10">
              <div className="mb-4 overflow-hidden rounded-3xl bg-[#061832] text-white shadow-lg">
                <div className="relative px-5 py-5">
                  <div className="absolute -right-12 -top-16 h-36 w-36 rounded-full bg-[#65b9bc]/25 blur-3xl" />
                  <div className="absolute -bottom-14 left-4 h-28 w-28 rounded-full bg-[#d7aa63]/20 blur-3xl" />
                  <p className="relative text-[10px] font-black uppercase tracking-widest text-white/45">Invite your crew</p>
                  <h3 className="relative mt-1 text-xl font-black leading-tight">{activeTrip.activeTrip?.title ?? tripTitle}</h3>
                  <p className="relative mt-1 text-sm leading-relaxed text-white/62">
                    Share a private Daywave link with people you want on this trip.
                  </p>
                </div>
              </div>

              <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Invite link</span>
                  <span className="text-[10px] font-bold text-slate-400">{activeTrip.activeTrip?.invite_code ?? "CODE"}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-white text-sm shadow-sm">🔗</span>
                  <p className="flex-1 truncate font-mono text-xs text-slate-600">
                    {getInviteLink()}
                  </p>
                </div>
              </div>

              <div className="mb-5 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-sky-700">Trying the app</p>
                <p className="mt-1 text-sm leading-relaxed text-sky-800">
                  For friends who should test a fully loaded anonymized trip, use <span className="font-mono font-bold">/join/DEMO</span>. For a lightweight read-only preview, use <span className="font-mono font-bold">/join/DAYWAVE</span>.
                </p>
              </div>

              <div className="flex gap-2.5">
                <button
                  onClick={copyInviteLink}
                  className={`flex-1 font-bold py-4 rounded-2xl text-sm transition-all ${
                    copied ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {copied ? "✓ Copied!" : "Copy Link"}
                </button>
                <button
                  onClick={shareInviteLink}
                  className="flex-1 bg-slate-950 text-white font-bold py-4 rounded-2xl text-sm"
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

      {/* ── Poll Creation Modal ──────────────────────────────────────────── */}
      {pollModal && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center" onClick={() => setPollModal(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
          <div
            className="relative w-full max-w-md bg-white rounded-t-3xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-9 h-1 bg-slate-200 rounded-full" />
            </div>
            <div className="px-6 pt-3 pb-10">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🗳️</span>
                <h3 className="text-lg font-black text-slate-900">Create a Group Poll</h3>
              </div>

              <div className="mb-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Question</p>
                <input
                  type="text"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  placeholder="e.g. Where should we eat tonight?"
                  className="w-full text-sm border border-slate-200 rounded-2xl px-4 py-3.5 outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-200 bg-white"
                  autoFocus
                />
              </div>

              <div className="mb-5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Options (min 2)</p>
                <div className="flex flex-col gap-2">
                  {pollOptions.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 w-4 text-right">{i + 1}</span>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const next = [...pollOptions];
                          next[i] = e.target.value;
                          setPollOptions(next);
                        }}
                        placeholder={`Option ${i + 1}…`}
                        className="flex-1 text-sm border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-rose-400 bg-white"
                      />
                      {pollOptions.length > 2 && (
                        <button
                          onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))}
                          className="text-slate-300 hover:text-slate-500 text-lg font-light leading-none"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  {pollOptions.length < 4 && (
                    <button
                      onClick={() => setPollOptions([...pollOptions, ""])}
                      className="text-xs font-semibold text-rose-500 text-left pl-6 py-1"
                    >
                      + Add option
                    </button>
                  )}
                </div>
              </div>

              <div className="flex gap-2.5">
                <button
                  onClick={() => setPollModal(false)}
                  className="flex-1 border border-slate-200 text-slate-500 font-bold py-4 rounded-2xl text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={submitPoll}
                  disabled={!pollQuestion.trim() || pollOptions.filter((o) => o.trim()).length < 2}
                  className="flex-1 bg-slate-950 text-white font-bold py-4 rounded-2xl text-sm disabled:opacity-40"
                >
                  Post Poll
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom Sheet ─────────────────────────────────────────────────── */}
      {sheet && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center" onClick={closeSheet}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
          <div
            className="relative w-full max-w-md bg-white rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1 sticky top-0 bg-white z-10">
              <div className="w-9 h-1 bg-slate-200 rounded-full" />
            </div>

            {/* ── Profile sheet ── */}
            {sheet.type === "profile" && (
              <div className="px-6 pt-3 pb-10">
                {!profileEditMode ? (
                  <>
                    <div className="flex flex-col items-center gap-3 mb-8">
                      <div className="relative">
                        {myTraveler ? (
                          <TravelerAvatar traveler={myTraveler} size="xl" />
                        ) : (
                          <div className="w-20 h-20 rounded-full bg-slate-950 flex items-center justify-center text-white text-2xl font-bold">
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
                      <button onClick={openProfileEdit} className="w-full bg-slate-950 text-white font-bold py-4 rounded-2xl text-sm mb-2.5">
                        Edit my profile
                      </button>
                    )}
                    <button onClick={handleSignOut} className="w-full border border-slate-200 bg-white text-slate-700 font-bold py-4 rounded-2xl text-sm">
                      Sign out
                    </button>
                    <button onClick={closeSheet} className="w-full mt-1 text-sm text-slate-400 font-semibold py-3 text-center">
                      Close
                    </button>
                    <button
                      onClick={() => setDeleteAccountConfirm(true)}
                      className="w-full mt-4 pb-4 text-[11px] text-slate-300 text-center"
                    >
                      Delete account
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col gap-5 py-3">
                    <h3 className="text-base font-black text-slate-900 text-center">Edit my profile</h3>
                    <div className="flex flex-col items-center gap-3">
                      <div className="relative">
                        <TravelerAvatar traveler={{ name: editName, avatar: editAvatar, avatar_url: editAvatarUrl }} size="xl" />
                        {uploadingPhoto && (
                          <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => fileInputRef.current?.click()} className="text-xs font-bold text-slate-700 bg-slate-100 px-4 py-2.5 rounded-full flex items-center gap-1.5">
                          📷 Upload photo
                        </button>
                        {editAvatarUrl && (
                          <button onClick={() => setEditAvatarUrl(null)} className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-2.5 rounded-full">
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                    {!editAvatarUrl && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Or choose emoji</p>
                        <div className="flex gap-2 flex-wrap">
                          {AVATAR_OPTIONS.map((emoji) => (
                            <button key={emoji} onClick={() => setEditAvatar(emoji)}
                              className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl transition-all ${
                                editAvatar === emoji ? "bg-slate-950 scale-110" : "bg-slate-100"
                              }`}>
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Name</p>
                      <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                        className="w-full text-sm border border-slate-200 rounded-2xl px-4 py-3.5 outline-none focus:border-slate-900 bg-white" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Role</p>
                      <div className="flex gap-1.5 flex-wrap mb-3">
                        {ROLE_PRESETS.map((preset) => {
                          const active = preset === "Kid" ? editRole.startsWith("Kid") : editRole === preset;
                          return (
                            <button key={preset} onClick={() => setEditRole(preset === "Kid" ? "Kid · Age " : preset)}
                              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                                active ? "bg-slate-950 text-white border-slate-900" : "bg-white text-slate-500 border-slate-200"
                              }`}>
                              {preset === "Kid" ? "👦 Kid" : preset}
                            </button>
                          );
                        })}
                      </div>
                      <input type="text" value={editRole} onChange={(e) => setEditRole(e.target.value)}
                        placeholder="e.g. Trip Organizer, Navigator…"
                        className="w-full text-sm border border-slate-200 rounded-2xl px-4 py-3.5 outline-none focus:border-slate-900 bg-white" />
                      <p className="text-[10px] text-slate-400 mt-1.5 px-1">Tap a preset or type anything custom</p>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={saveProfileEdit} className="flex-1 bg-slate-950 text-white font-bold py-4 rounded-2xl text-sm">Save changes</button>
                      <button onClick={() => setProfileEditMode(false)} className="px-5 text-sm font-semibold text-slate-400 border border-slate-200 rounded-2xl">Back</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Traveler sheet ── */}
            {sheet.type === "traveler" && sheetTraveler && (
              <div className="px-6 pt-2 pb-10">
                {!editMode ? (
                  <div>
                    <div className="flex flex-col items-center gap-3 py-5">
                      <div className="relative">
                        <TravelerAvatar traveler={sheetTraveler} size="xl" />
                        <span className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-white ${statusColor(sheetTraveler.status)}`} />
                      </div>
                      <div className="text-center">
                        <h2 className="text-2xl font-black text-slate-900">{sheetTraveler.name}</h2>
                        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full mt-2 inline-block">{sheetTraveler.role}</span>
                        <p className="text-xs text-slate-400 mt-2">{statusLabel(sheetTraveler.status)}</p>
                      </div>
                    </div>
                    {sheetTraveler.user_id === user?.id ? (
                      <p className="text-center text-sm text-slate-400 mb-4">This is you ✨</p>
                    ) : (
                      <div className="flex flex-col gap-2.5">
                        <button onClick={() => setEditMode(true)} className="w-full bg-slate-950 text-white font-bold py-4 rounded-2xl text-sm">Edit traveler</button>
                        <button onClick={removeTraveler} className="w-full border border-red-200 bg-red-50 text-red-500 font-bold py-4 rounded-2xl text-sm">Remove from trip</button>
                      </div>
                    )}
                    <button onClick={closeSheet} className="w-full mt-2 text-sm text-slate-400 font-semibold py-3 text-center">Close</button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-5 py-3">
                    <h3 className="text-base font-black text-slate-900 text-center">Edit traveler</h3>
                    <div className="flex flex-col items-center gap-3">
                      <div className="relative">
                        <TravelerAvatar traveler={{ ...sheetTraveler, avatar: editAvatar, avatar_url: editAvatarUrl }} size="xl" />
                        {uploadingPhoto && (
                          <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => fileInputRef.current?.click()} className="text-xs font-bold text-slate-700 bg-slate-100 px-4 py-2.5 rounded-full flex items-center gap-1.5">
                          📷 Upload photo
                        </button>
                        {editAvatarUrl && (
                          <button onClick={() => setEditAvatarUrl(null)} className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-2.5 rounded-full">Remove</button>
                        )}
                      </div>
                    </div>
                    {!editAvatarUrl && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Or choose emoji</p>
                        <div className="flex gap-2 flex-wrap">
                          {AVATAR_OPTIONS.map((emoji) => (
                            <button key={emoji} onClick={() => setEditAvatar(emoji)}
                              className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl transition-all ${
                                editAvatar === emoji ? "bg-slate-950 scale-110" : "bg-slate-100"
                              }`}>
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Name</p>
                      <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                        className="w-full text-sm border border-slate-200 rounded-2xl px-4 py-3.5 outline-none focus:border-slate-900 bg-white" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Role</p>
                      <div className="flex gap-1.5 flex-wrap mb-3">
                        {ROLE_PRESETS.map((preset) => {
                          const active = preset === "Kid" ? editRole.startsWith("Kid") : editRole === preset;
                          return (
                            <button key={preset}
                              onClick={() => setEditRole(preset === "Kid" ? "Kid · Age " : preset)}
                              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                                active ? "bg-slate-950 text-white border-slate-900" : "bg-white text-slate-500 border-slate-200"
                              }`}>
                              {preset === "Kid" ? "👦 Kid" : preset}
                            </button>
                          );
                        })}
                      </div>
                      <input type="text" value={editRole} onChange={(e) => setEditRole(e.target.value)}
                        placeholder="e.g. Kid · Age 8, Navigator, Dog Mom…"
                        className="w-full text-sm border border-slate-200 rounded-2xl px-4 py-3.5 outline-none focus:border-slate-900 bg-white" />
                      <p className="text-[10px] text-slate-400 mt-1.5 px-1">Tap a preset or type anything custom</p>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={saveEdit} className="flex-1 bg-slate-950 text-white font-bold py-4 rounded-2xl text-sm">Save changes</button>
                      <button onClick={() => setEditMode(false)} className="px-5 text-sm font-semibold text-slate-400 border border-slate-200 rounded-2xl">Back</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-100 px-4 pb-3 flex-none" style={{ paddingTop: "max(20px, env(safe-area-inset-top))" }}>
        <div className="flex items-start justify-between mb-2.5">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h1 className="text-lg font-black text-slate-900">
                {needsFamilyJoin ? "Private Group" : tripTitle}
              </h1>
              {!needsFamilyJoin && tripDateInfo?.status === "active" && (
                <span className="flex items-center gap-1 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse inline-block" />
                  Live
                </span>
              )}
              {!needsFamilyJoin && tripDateInfo?.status === "completed" && (
                <span className="bg-slate-100 text-slate-500 text-[10px] font-semibold px-2 py-0.5 rounded-full">Complete</span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              {isPreviewSession
                ? "Preview mode · group is read-only"
                : needsFamilyJoin
                ? "Not joined yet"
                : tripDateInfo?.status === "active"
                ? `Day ${tripDateInfo.currentDayNumber} of ${tripDateInfo.totalDays} · ${visibleTravelers.length} travelers`
                : `${visibleTravelers.length} travelers`}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-none">
            {!isReadOnlyGroup && (
              <button onClick={() => setShowInviteSheet(true)}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl">
                <span>🔗</span> Invite
              </button>
            )}
            <button
              onClick={() => setSheet({ type: "profile" })}
              aria-label="Your profile"
              className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-950 text-white text-[11px] font-black transition-all active:scale-90"
            >
              {initials}
            </button>
          </div>
        </div>

        {!needsFamilyJoin && (
        <div className="flex items-start gap-3 overflow-x-auto pt-1 pb-1" style={{ scrollbarWidth: "none" }}>
          {[...visibleTravelers]
            .sort((a, b) => {
              if (a.user_id === user?.id) return -1;
              if (b.user_id === user?.id) return 1;
              return 0;
            })
            .map((t) => {
              const isMe = t.user_id === user?.id;
              return (
                <button key={t.id}
                  onClick={() => isMe ? setSheet({ type: "profile" }) : openTravelerSheet(t)}
                  className="flex flex-col items-center gap-1 flex-none w-[52px]">
                  <div className="relative">
                    <div className={isMe ? "p-[2.5px] rounded-full bg-sky-500" : ""}>
                      <TravelerAvatar traveler={t} size="sm" />
                    </div>
                    <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${statusColor(t.status)}`} />
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

          {addingTraveler && !isReadOnlyGroup ? (
            <form onSubmit={(e) => { e.preventDefault(); addTraveler(); }}
              className="flex items-center gap-1.5 flex-none self-start mt-0.5">
              <input autoFocus type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                placeholder="Name…"
                className="text-xs border border-slate-300 rounded-xl px-2 py-1.5 outline-none focus:border-slate-900 w-24 bg-white" />
              <button type="submit" className="text-xs bg-slate-950 text-white px-2.5 py-1.5 rounded-xl font-bold">Add</button>
              <button type="button" onClick={() => { setAddingTraveler(false); setNewName(""); }}
                className="text-[10px] text-slate-400 font-semibold">✕</button>
            </form>
          ) : !isReadOnlyGroup ? (
            <button onClick={() => setAddingTraveler(true)} className="flex flex-col items-center gap-1 flex-none w-[52px]">
              <div className="w-9 h-9 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:border-slate-500 transition-colors">
                <span className="text-base font-light">+</span>
              </div>
              <p className="text-[10px] text-slate-400">Add</p>
            </button>
          ) : (
            <div className="flex flex-col items-center gap-1 flex-none w-[52px] opacity-60">
              <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <span className="text-sm">🔒</span>
              </div>
              <p className="text-[10px] text-slate-400">{isPreviewSession ? "Preview" : "Join"}</p>
            </div>
          )}
        </div>
        )}
      </div>

      {/* ── Messages ─────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-slate-100" />
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{formatTodayLabel()}</span>
          <div className="flex-1 h-px bg-slate-100" />
        </div>

        {needsFamilyJoin && (
          <div className="mx-auto mt-10 w-full max-w-sm rounded-3xl border border-slate-200 bg-white px-5 py-5 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-sky-50 text-2xl">🔗</div>
            <h2 className="text-base font-black text-slate-900">
              {hasFamilyInvite ? "Join this trip to use Group" : "Group is private"}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              {hasFamilyInvite
                ? `You are signed in, but this profile has not joined ${tripTitle || "this trip"} yet.`
                : "This profile has not joined a trip yet. Ask the organizer for an invite link or code."}
            </p>
            {hasFamilyInvite && (
              <button
                onClick={() => router.push(getInviteLink())}
                className="mt-4 w-full rounded-2xl bg-slate-950 py-3 text-sm font-bold text-white"
              >
                Join {tripTitle || "This Trip"}
              </button>
            )}
            <button
              onClick={handleSignOut}
              className={`${hasFamilyInvite ? "mt-2" : "mt-4"} w-full rounded-2xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-600`}
            >
              Sign out
            </button>
            <p className="mt-3 text-xs leading-relaxed text-slate-400">
              {hasFamilyInvite
                ? "Use /join/DEMO when you want someone to try Daywave without joining your family group."
                : "Private trip details only appear after an invite has been accepted."}
            </p>
          </div>
        )}

        {isPreviewSession && (
          <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-sky-700">Preview mode</p>
            <p className="mt-1 text-sm leading-relaxed text-sky-800">
              This sample group is read-only. Your profile won&apos;t be added to the organizer&apos;s trip.
            </p>
          </div>
        )}

        {!needsFamilyJoin && messages
          .filter((msg) => !msg.sender_user_id || !blockedUserIds.has(msg.sender_user_id))
          .map((msg, idx, arr) => {
          const isMe = msg.sender_user_id
            ? msg.sender_user_id === user?.id
            : msg.sender_name === (user?.user_metadata?.full_name?.split(" ")[0] ?? user?.email?.split("@")[0]);
          const prevMsg = arr[idx - 1];
          const prevIsMe = prevMsg ? (prevMsg.sender_user_id ? prevMsg.sender_user_id === user?.id : false) : false;
          const showAvatar = !isMe && (!prevMsg || prevMsg.sender_name !== msg.sender_name || prevIsMe);
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
              <div className={`flex gap-2 items-end ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                {!isMe && (
                  <div className="flex-none w-8">
                    {showAvatar && (
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-base">
                        {msg.sender_avatar}
                      </div>
                    )}
                  </div>
                )}
                <div className={`flex flex-col gap-0.5 max-w-[75%] ${isMe ? "items-end" : "items-start"}`}>
                  {showAvatar && !isMe && (
                    <p className="text-[10px] font-semibold text-slate-400 px-1">{msg.sender_name}</p>
                  )}
                  {msg.text && (
                    <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                      isMe
                        ? "bg-gradient-to-br from-sky-500 to-sky-700 text-white rounded-tr-sm"
                        : "bg-white border border-slate-100 text-slate-800 rounded-tl-sm"
                    }`}>
                      {msg.text}
                    </div>
                  )}
                  {msg.image_url && (
                    <div className="rounded-2xl overflow-hidden w-52 shadow-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={msg.image_url} alt="" className="w-full h-36 object-cover" />
                    </div>
                  )}
                  {msg.card_type && msg.card_type !== "poll" && (() => {
                    const cardDest =
                      msg.card_type === "plan" ? "/" :
                      msg.card_type === "reservation" ? "/vault" :
                      msg.card_type === "location" ? "/" : null;
                    const cardBg =
                      msg.card_type === "weather" ? "bg-indigo-50" :
                      msg.card_type === "reservation" ? "bg-amber-50" :
                      msg.card_type === "location" ? "bg-emerald-50" : "bg-sky-50";
                    return (
                      <button
                        onClick={() => cardDest && router.push(cardDest)}
                        className="bg-white border border-slate-200 rounded-2xl px-3 py-2.5 shadow-sm flex items-center gap-2.5 w-60 text-left active:scale-[0.98] transition-transform"
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-none ${cardBg}`}>
                          {msg.card_emoji}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-800 leading-tight">{msg.card_title}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{msg.card_sub}</p>
                        </div>
                        {cardDest && <span className="text-slate-300 text-xs flex-none">›</span>}
                      </button>
                    );
                  })()}
                  {msg.card_type === "poll" && (() => {
                    const opts = (msg.card_sub ?? "").split("|").map((o) => o.trim()).filter(Boolean);
                    const voted = pollVotes[msg.id];
                    const totalVotes = opts.length + 1;
                    return (
                      <div className="bg-white border border-rose-200 rounded-2xl px-3.5 py-3 shadow-sm w-64">
                        <div className="flex items-center gap-1.5 mb-2.5">
                          <span className="text-base">{msg.card_emoji}</span>
                          <p className="text-xs font-black text-slate-800 leading-tight flex-1">{msg.card_title}</p>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {opts.map((opt, i) => {
                            const isVoted = voted === i;
                            const pct = voted !== undefined ? (isVoted ? 60 : Math.max(10, 40 - i * 12)) : 0;
                            return (
                              <button key={i}
                                onClick={() => setPollVotes((prev) => ({ ...prev, [msg.id]: i }))}
                                className="relative text-left w-full">
                                <div className={`h-9 rounded-xl overflow-hidden flex items-center ${isVoted ? "bg-rose-100" : "bg-rose-50"}`}>
                                  <div
                                    className={`h-full rounded-xl transition-all duration-300 ${isVoted ? "bg-rose-300" : "bg-rose-100"}`}
                                    style={{ width: voted !== undefined ? `${pct}%` : "0%" }}
                                  />
                                </div>
                                <div className="absolute inset-0 flex items-center justify-between px-2.5">
                                  <p className={`text-[11px] font-semibold z-10 ${isVoted ? "text-rose-700" : "text-slate-700"}`}>{opt}</p>
                                  {voted !== undefined && (
                                    <p className="text-[10px] font-bold text-rose-500 z-10">{Math.round(totalVotes * pct / 100)}</p>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-[9px] text-slate-400 mt-2 text-right">
                          {voted !== undefined ? `You voted · ${totalVotes} responses` : "Tap to vote"}
                        </p>
                      </div>
                    );
                  })()}
                  <p className="text-[10px] text-slate-400 px-1">{formatTime(msg.created_at)}</p>
                </div>
                {!isMe && !isPreviewSession && msg.sender_user_id && (
                  <button
                    onClick={() => setReportSheet({ messageId: msg.id, senderId: msg.sender_user_id ?? null, senderName: msg.sender_name })}
                    className="flex-none self-end mb-0.5 text-slate-300 text-base px-0.5 leading-none"
                    aria-label="Report message"
                  >
                    ⋯
                  </button>
                )}
              </div>
            </React.Fragment>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* ── Quick actions + input ─────────────────────────────────────────── */}
      <div className="flex-none bg-white border-t border-slate-100 px-4 pt-2.5">
        <div className="flex gap-2 overflow-x-auto pb-2.5"
          style={{ scrollbarWidth: "none" }}>
          {QUICK_ACTIONS.map((a) => (
            <button key={a.key} onClick={() => handleQuickAction(a.key)}
              disabled={isReadOnlyGroup}
              className={`flex-none flex flex-col items-center gap-0.5 text-center px-3 py-2 rounded-2xl border transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 ${a.bg} ${a.border} ${a.text}`}
              style={{ minWidth: "64px" }}>
              <span className="text-xl leading-none">{a.emoji}</span>
              <span className="text-[10px] font-bold leading-tight whitespace-nowrap mt-0.5">{a.label}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2 pb-3">
          <button onClick={() => msgPhotoRef.current?.click()}
            disabled={isReadOnlyGroup}
            className="w-10 h-10 flex-none bg-slate-100 text-slate-500 rounded-2xl flex items-center justify-center text-base hover:bg-slate-200 transition-colors disabled:opacity-50"
            title="Send photo">📷</button>
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            disabled={isReadOnlyGroup}
            placeholder={isPreviewSession ? "Preview is read-only" : needsFamilyJoin ? "Join the trip to message" : "Message the group..."}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-200 transition-all" />
          <button onClick={send} disabled={!input.trim() || isReadOnlyGroup}
            className="w-10 h-10 flex-none bg-sky-600 text-white rounded-2xl flex items-center justify-center font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed transition-opacity">↑</button>
        </div>
      </div>

      {/* ── File inputs ───────────────────────────────────────────────────── */}
      <input type="file" accept="image/*" ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" />
      <input type="file" accept="image/*" ref={msgPhotoRef} onChange={handleMsgPhoto} className="hidden" />

      {/* ── Report / Block sheet ─────────────────────────────────────────── */}
      {reportSheet && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center" onClick={() => setReportSheet(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
          <div
            className="relative w-full max-w-md bg-white rounded-t-3xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-9 h-1 bg-slate-200 rounded-full" />
            </div>
            <div className="px-6 pt-3 pb-10 flex flex-col gap-2.5">
              <h3 className="text-base font-black text-slate-900 text-center mb-1">Message Options</h3>
              <button
                onClick={() => void reportMessage(reportSheet.messageId, reportSheet.senderId, "")}
                className="w-full border border-amber-200 bg-amber-50 text-amber-800 font-bold py-4 rounded-2xl text-sm"
              >
                🚩 Report this message
              </button>
              {reportSheet.senderId && (
                <button
                  onClick={() => void blockUser(reportSheet.senderId!)}
                  className="w-full border border-red-200 bg-red-50 text-red-600 font-bold py-4 rounded-2xl text-sm"
                >
                  🚫 Block {reportSheet.senderName}
                </button>
              )}
              <button
                onClick={() => setReportSheet(null)}
                className="w-full text-sm text-slate-400 font-semibold py-3 text-center"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {reportSent && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[90] bg-slate-950 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-lg whitespace-nowrap">
          Report sent — we&apos;ll review within 24 hours.
        </div>
      )}

      {/* ── Delete Account confirmation ───────────────────────────────── */}
      {deleteAccountConfirm && (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/30 backdrop-blur-[2px]"
          onClick={() => { if (!deletingAccount) setDeleteAccountConfirm(false); }}
        >
          <div
            className="w-full max-w-md bg-white rounded-t-3xl shadow-2xl px-5 pb-10 pt-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center mb-4">
              <div className="w-9 h-1 bg-slate-200 rounded-full" />
            </div>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50">
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="text-center text-base font-black text-slate-900">Delete your account?</h2>
            <p className="mt-2 text-center text-sm leading-relaxed text-slate-500">
              This permanently deletes your profile, all trip data, messages, and cannot be undone.
            </p>
            <button
              onClick={() => void deleteAccount()}
              disabled={deletingAccount}
              className="mt-5 w-full rounded-2xl bg-red-500 py-3.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {deletingAccount ? "Deleting…" : "Yes, delete my account"}
            </button>
            <button
              onClick={() => setDeleteAccountConfirm(false)}
              disabled={deletingAccount}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
