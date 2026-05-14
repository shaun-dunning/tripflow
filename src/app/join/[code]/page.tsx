"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  ACTIVE_TRIP_KEY,
  APP_PREVIEW_INVITE_CODES,
  DEMO_INVITE_CODE,
  DEMO_TRIP_ID,
  FAMILY_INVITE_KEY,
  INVITE_CODE,
  PREVIEW_INVITE_KEY,
  TRIP_ID,
} from "@/lib/tripConfig";
import type { User } from "@supabase/supabase-js";

type TripInfo = {
  id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  cover_photo: string | null;
  travelers: { id: string; name: string; avatar: string; avatar_url: string | null }[];
};

const MAUI_FALLBACK =
  "https://images.unsplash.com/photo-1542259009477-d625272157b7?w=800&h=500&fit=crop&q=80";
const FALLBACK_TRIP: TripInfo = {
  id: TRIP_ID,
  title: "Maui Family Trip",
  destination: "Maui, Hawaii",
  start_date: "2026-06-05",
  end_date: "2026-06-11",
  cover_photo: MAUI_FALLBACK,
  travelers: [
    { id: "fallback-shaun", name: "Shaun", avatar: "🧔", avatar_url: null },
    { id: "fallback-family", name: "Family", avatar: "🌺", avatar_url: null },
  ],
};
const DEMO_FALLBACK_TRIP: TripInfo = {
  id: DEMO_TRIP_ID,
  title: "Maui Demo Trip",
  destination: "Maui, Hawaii",
  start_date: "2026-06-05",
  end_date: "2026-06-11",
  cover_photo: MAUI_FALLBACK,
  travelers: [
    { id: "demo-alex", name: "Alex", avatar: "🧑", avatar_url: null },
    { id: "demo-jamie", name: "Jamie", avatar: "👩", avatar_url: null },
    { id: "demo-riley", name: "Riley", avatar: "👧", avatar_url: null },
    { id: "demo-casey", name: "Casey", avatar: "👦", avatar_url: null },
  ],
};
const AVATARS = ["🌺", "🏄", "🌊", "☀️", "🧳", "🍍"];
const ONBOARDING_STEPS = [
  { title: "See the plan", body: "Check each day, reservations, maps, and what is coming up next.", icon: "🗓️" },
  { title: "Join the group", body: "Chat, vote on plans, and keep everyone moving together.", icon: "💬" },
  { title: "Arrive ready", body: "Use packing, docs, and leave-by guidance when the trip gets close.", icon: "✨" },
];

type InviteMode = "family" | "preview" | "demo";

function formatDateRange(start: string, end: string) {
  const s = new Date(start + "T12:00:00");
  const e = new Date(end + "T12:00:00");
  const month = s.toLocaleString("default", { month: "long" });
  return `${month} ${s.getDate()}–${e.getDate()}, ${s.getFullYear()}`;
}

function formatJoinError(err: unknown) {
  const message = err instanceof Error ? err.message : "Could not join this trip.";
  if (/row-level security|rls|policy/i.test(message)) {
    return "TripFlow could not add this account to the trip because Supabase is missing the traveler invite policy. Apply the membership policy SQL, then try again.";
  }
  if (/foreign key|violates.*constraint|not present/i.test(message)) {
    return "The demo trip has not been installed in Supabase yet. Run supabase/demo-trip.sql in the SQL Editor, then try this link again.";
  }
  return message;
}

async function joinTrip(tripId: string, user: User, avatar = "🧑") {
  // Don't double-add
  const { data: existing, error: existingError } = await supabase
    .from("travelers")
    .select("id")
    .eq("trip_id", tripId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Could not check trip membership: ${existingError.message}`);
  }
  if (existing) return;

  const name =
    user.user_metadata?.full_name?.split(" ")[0] ??
    user.email?.split("@")[0] ??
    "Traveler";

  const { error: insertError } = await supabase.from("travelers").insert({
    trip_id: tripId,
    name,
    avatar,
    role: "Co-traveler",
    status: "active",
    is_me: false,
    user_id: user.id,
  });

  if (insertError) {
    throw new Error(`Could not add you to this trip: ${insertError.message}`);
  }

  const { data: confirmed, error: confirmError } = await supabase
    .from("travelers")
    .select("id")
    .eq("trip_id", tripId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (confirmError || !confirmed) {
    throw new Error(confirmError?.message ?? "Trip membership could not be confirmed.");
  }

  const { error: messageError } = await supabase.from("messages").insert({
    trip_id: tripId,
    sender_name: "TripFlow",
    sender_avatar: "🌺",
    text: `${name} joined the trip.`,
  });
  if (messageError) console.warn("Join announcement failed:", messageError.message);
}

async function loadTripByInviteCode(inviteCode: string): Promise<TripInfo | null> {
  const select = `id, title, destination, start_date, end_date, cover_photo,
                 travelers(id, name, avatar, avatar_url)`;
  const inviteResult = await supabase.rpc("get_trip_invite", { target_invite_code: inviteCode });
  if (inviteResult.data?.[0]) {
    const trip = inviteResult.data[0];
    return { ...trip, travelers: [] } as TripInfo;
  }

  const byCode = await supabase
    .from("trips")
    .select(select)
    .eq("invite_code", inviteCode)
    .maybeSingle();

  if (byCode.data) return byCode.data as TripInfo;

  if (inviteCode === INVITE_CODE) {
    const byId = await supabase
      .from("trips")
      .select(select)
      .eq("id", TRIP_ID)
      .maybeSingle();
    if (byId.data) return byId.data as TripInfo;
  }

  if (inviteCode === DEMO_INVITE_CODE) {
    const byId = await supabase
      .from("trips")
      .select(select)
      .eq("id", DEMO_TRIP_ID)
      .maybeSingle();
    if (byId.data) return byId.data as TripInfo;
  }

  return null;
}

export default function JoinPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();

  const [trip, setTrip] = useState<TripInfo | null>(null);
  const [inviteMode, setInviteMode] = useState<InviteMode>("family");
  const [notFound, setNotFound] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [alreadyMember, setAlreadyMember] = useState(false);
  const [joining, setJoining] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);

  // Auth form state
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Load trip info
  useEffect(() => {
    async function load() {
      const inviteCode = (code ?? INVITE_CODE).toUpperCase();
      const isPreviewInvite = APP_PREVIEW_INVITE_CODES.includes(inviteCode);
      const isDemoInvite = inviteCode === DEMO_INVITE_CODE;
      setInviteMode(isPreviewInvite ? "preview" : isDemoInvite ? "demo" : "family");
      if (isPreviewInvite) {
        localStorage.removeItem(FAMILY_INVITE_KEY);
        localStorage.setItem(PREVIEW_INVITE_KEY, "1");
      } else {
        localStorage.removeItem(PREVIEW_INVITE_KEY);
        localStorage.setItem(FAMILY_INVITE_KEY, "1");
      }

      const tripData = await loadTripByInviteCode(isPreviewInvite ? INVITE_CODE : inviteCode);
      if (!tripData && inviteCode !== INVITE_CODE && !isPreviewInvite) {
        if (isDemoInvite) {
          setNotFound(false);
          setTrip(DEMO_FALLBACK_TRIP);
          return;
        } else {
          setNotFound(true);
          return;
        }
      }
      setNotFound(false);
      setTrip(tripData ?? (isDemoInvite ? DEMO_FALLBACK_TRIP : FALLBACK_TRIP));
    }
    void load();
  }, [code]);

  // 2. Check if already logged in
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUser(data.user);
    });
  }, []);

  // 3. If logged in + trip loaded → check membership
  useEffect(() => {
    if (!currentUser || !trip || inviteMode === "preview") return;
    supabase
      .from("travelers")
      .select("id")
      .eq("trip_id", trip.id)
      .eq("user_id", currentUser.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          setError(`Could not check whether you're already on this trip: ${error.message}`);
          return;
        }
        setAlreadyMember(Boolean(data));
      });
  }, [currentUser, trip, inviteMode]);

  async function handleJoinAsLoggedIn() {
    if (!trip || !currentUser) return;
    setError(null);
    setJoining(true);
    try {
      if (inviteMode !== "preview") {
        localStorage.removeItem(PREVIEW_INVITE_KEY);
        await joinTrip(trip.id, currentUser, selectedAvatar);
        localStorage.setItem(ACTIVE_TRIP_KEY, trip.id);
        localStorage.removeItem(FAMILY_INVITE_KEY);
        router.replace("/chat");
        return;
      }
      localStorage.removeItem(FAMILY_INVITE_KEY);
      localStorage.setItem(PREVIEW_INVITE_KEY, "1");
      router.replace("/");
    } catch (err) {
      setError(formatJoinError(err));
      setJoining(false);
    }
  }

  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!trip) return;
    setError(null);
    setAuthLoading(true);

    let user: User | null = null;

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });
      if (error) { setError(error.message); setAuthLoading(false); return; }
      user = data.user ?? null;
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(error.message); setAuthLoading(false); return; }
      user = data.user ?? null;
    }

    if (user) {
      try {
        if (inviteMode !== "preview") {
          localStorage.removeItem(PREVIEW_INVITE_KEY);
          await joinTrip(trip.id, user, selectedAvatar);
          localStorage.setItem(ACTIVE_TRIP_KEY, trip.id);
          localStorage.removeItem(FAMILY_INVITE_KEY);
          router.replace("/chat");
          return;
        }
        localStorage.removeItem(FAMILY_INVITE_KEY);
        localStorage.setItem(PREVIEW_INVITE_KEY, "1");
        router.replace("/");
      } catch (err) {
        setError(formatJoinError(err));
      }
    }
    setAuthLoading(false);
  }

  // ── Not found ──────────────────────────────────────────────────────────────
  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="text-5xl">🤔</span>
        <h1 className="text-xl font-black text-slate-900">Invite not found</h1>
        <p className="text-sm text-slate-500">
          This link may have expired or the code is incorrect.
        </p>
      </div>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (!trip) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="text-3xl">🌺</span>
          <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const isDemo = inviteMode === "demo";
  const visibleTravelers = trip.travelers.slice(0, 5);
  const extraCount = trip.travelers.length - visibleTravelers.length;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-white">

      {/* ── Hero ── */}
      <div className="relative h-64 w-full overflow-hidden flex-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={trip.cover_photo ?? MAUI_FALLBACK}
          alt={trip.destination}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 px-6 pb-6">
          <p className="text-xs font-bold text-white/60 uppercase tracking-widest mb-1">
            {inviteMode === "family" ? "🌺 You're invited" : isDemo ? "✨ Demo Trip" : "✨ Preview TripFlow"}
          </p>
          <h1 className="text-2xl font-black text-white leading-tight">
            {inviteMode === "preview" ? "Try TripFlow" : trip.title}
          </h1>
          <p className="text-sm text-white/70 mt-1">
            {inviteMode === "family"
              ? `${formatDateRange(trip.start_date, trip.end_date)} · ${trip.destination}`
              : isDemo
              ? "A fully loaded sample trip with anonymized names, bookings, and group chat"
              : "A polished sample trip you can explore before joining a real group"}
          </p>
        </div>
      </div>

      {/* ── Travelers going ── */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
        <div className="flex -space-x-2">
          {visibleTravelers.map((t) => (
            <div
              key={t.id}
              className="w-9 h-9 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-lg shadow-sm"
            >
              {t.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.avatar_url} alt={t.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                t.avatar
              )}
            </div>
          ))}
          {extraCount > 0 && (
            <div className="w-9 h-9 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[11px] font-bold text-slate-600 shadow-sm">
              +{extraCount}
            </div>
          )}
        </div>
        <div>
          {inviteMode !== "preview" ? (
            <>
              <p className="text-sm font-bold text-slate-900">
                {trip.travelers.length} {isDemo ? "sample " : ""}traveler{trip.travelers.length !== 1 ? "s" : ""} going
              </p>
              <p className="text-xs text-slate-400">
                {visibleTravelers.map((t) => t.name).join(", ")}
                {extraCount > 0 ? ` +${extraCount} more` : ""}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-slate-900">Sample Maui trip</p>
              <p className="text-xs text-slate-400">Explore the app without joining Shaun&apos;s family trip</p>
            </>
          )}
        </div>
      </div>

      {/* ── Join section ── */}
      <div className="flex-1 px-6 pt-6 pb-10">

        <div className="mb-6 grid grid-cols-3 gap-2">
          {ONBOARDING_STEPS.map((step) => (
            <div key={step.title} className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3">
              <div className="text-xl">{step.icon}</div>
              <p className="mt-2 text-[11px] font-black leading-tight text-slate-900">{step.title}</p>
              <p className="mt-1 text-[10px] leading-snug text-slate-400">{step.body}</p>
            </div>
          ))}
        </div>

        {/* Already logged in */}
        {currentUser ? (
          <div className="flex flex-col items-center gap-4 pt-4 text-center">
            {inviteMode !== "preview" && alreadyMember ? (
              <>
                <span className="text-4xl">✅</span>
                <div>
                  <h2 className="text-lg font-black text-slate-900">You&apos;re already on this trip!</h2>
                  <p className="text-sm text-slate-400 mt-1">Head back to the app to see the plan.</p>
                </div>
                <button
                  onClick={() => {
                    localStorage.removeItem(PREVIEW_INVITE_KEY);
                    localStorage.removeItem(FAMILY_INVITE_KEY);
                    localStorage.setItem(ACTIVE_TRIP_KEY, trip.id);
                    router.replace("/");
                  }}
                  className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl text-sm"
                >
                  Open TripFlow
                </button>
              </>
            ) : (
              <>
                <span className="text-4xl">👋</span>
                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    {inviteMode === "preview" ? "Ready to try it?" : isDemo ? "Ready to open the demo?" : "Ready to join?"}
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Signed in as <span className="font-semibold text-slate-700">{currentUser.email}</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-2">
                    {inviteMode === "family"
                      ? "This adds this account as a traveler on Shaun's Maui family trip."
                      : isDemo
                      ? "This adds this account to the anonymized Maui demo trip. Your changes stay separate from Shaun's real family trip."
                      : "This opens a sample experience without joining Shaun's family trip."}
                  </p>
                </div>
                <div className="w-full">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Trip avatar</p>
                  <div className="grid grid-cols-6 gap-2">
                    {AVATARS.map((avatar) => (
                      <button
                        key={avatar}
                        onClick={() => setSelectedAvatar(avatar)}
                        className={`h-11 rounded-2xl text-xl transition-all ${
                          selectedAvatar === avatar
                            ? "bg-slate-900 shadow-sm"
                            : "bg-slate-100"
                        }`}
                      >
                        {avatar}
                      </button>
                    ))}
                  </div>
                </div>
                {error && (
                  <div className="w-full bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-start gap-2 text-left">
                    <span>⚠️</span>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}
                <button
                  onClick={handleJoinAsLoggedIn}
                  disabled={joining}
                  className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl text-sm disabled:opacity-50"
                >
                  {joining
                    ? (inviteMode === "preview" ? "Opening…" : "Joining…")
                    : (inviteMode === "preview" ? "Open TripFlow" : isDemo ? "Open Demo Trip" : `Join ${trip.title}`)}
                </button>
              </>
            )}
          </div>
        ) : (
          /* Auth form */
          <>
            <h2 className="text-xl font-black text-slate-900 mb-1">
              {mode === "signup" ? "Create your account" : "Welcome back"}
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              {mode === "signup"
                ? inviteMode === "family"
                  ? "You'll be added to the trip automatically."
                  : isDemo
                  ? "Create an account to explore the anonymized demo trip."
                  : "Create an account to explore the sample experience."
                : inviteMode === "family"
                  ? "Sign in and you'll be added to the trip."
                  : isDemo
                  ? "Sign in to open the anonymized Maui demo trip."
                  : "Sign in to preview TripFlow without joining the family trip."}
            </p>

            {/* Mode toggle */}
            <div className="flex bg-slate-100 rounded-2xl p-1 mb-6">
              <button
                onClick={() => { setMode("signup"); setError(null); }}
                className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${
                  mode === "signup" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"
                }`}
              >
                Create Account
              </button>
              <button
                onClick={() => { setMode("signin"); setError(null); }}
                className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${
                  mode === "signin" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"
                }`}
              >
                Sign In
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">
                  Choose your trip avatar
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {AVATARS.map((avatar) => (
                    <button
                      key={avatar}
                      type="button"
                      onClick={() => setSelectedAvatar(avatar)}
                      className={`h-11 rounded-2xl text-xl transition-all ${
                        selectedAvatar === avatar
                          ? "bg-slate-900 shadow-sm"
                          : "bg-slate-100"
                      }`}
                    >
                      {avatar}
                    </button>
                  ))}
                </div>
              </div>

              {mode === "signup" && (
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Kristin"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-slate-900 transition-all"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-slate-900 transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="6+ characters"
                  required
                  minLength={6}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-slate-900 transition-all"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-center gap-2">
                  <span>⚠️</span>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl text-sm mt-1 disabled:opacity-50 transition-opacity"
              >
                {authLoading
                  ? "Please wait…"
                  : mode === "signup"
                  ? inviteMode === "family" ? `Join ${trip.title}` : isDemo ? "Create Account & Open Demo" : "Create Account & Preview"
                  : inviteMode === "family" ? "Sign in & Join Trip" : isDemo ? "Sign in & Open Demo" : "Sign in & Preview"}
              </button>
            </form>
          </>
        )}
      </div>

      {/* TripFlow branding */}
      <div className="text-center pb-8">
        <p className="text-xs text-slate-300 font-medium">
          🌺 TripFlow · Family Travel, Together
        </p>
      </div>
    </div>
  );
}
