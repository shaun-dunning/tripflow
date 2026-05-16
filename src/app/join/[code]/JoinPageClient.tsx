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
  START_OWN_TRIP_KEY,
  TRIP_ID,
  buildInviteUrl,
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
  title: "Family Trip",
  destination: "Loading…",
  start_date: "",
  end_date: "",
  cover_photo: MAUI_FALLBACK,
  travelers: [
    { id: "fallback-organizer", name: "Organizer", avatar: "🧳", avatar_url: null },
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
  { title: "Plans", body: "See each day in order.", icon: "🗓️" },
  { title: "Docs", body: "Find bookings fast.", icon: "📋" },
  { title: "Group", body: "Keep everyone aligned.", icon: "💬" },
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
    return "Daywave could not add this account to the trip because Supabase is missing the join-by-invite SQL function. Run the latest membership SQL, then try again.";
  }
  if (/function .*join_trip_by_invite|could not find.*join_trip_by_invite|schema cache/i.test(message)) {
    return "Daywave needs the latest join-by-invite SQL function. Run the SQL I provided, wait a few seconds, then try again.";
  }
  if (/foreign key|violates.*constraint|not present/i.test(message)) {
    return "The demo trip has not been installed in Supabase yet. Run supabase/demo-trip.sql in the SQL Editor, then try this link again.";
  }
  return message;
}

function formatAuthError(message: string) {
  if (/email rate limit exceeded/i.test(message)) {
    return "Supabase has temporarily paused new account emails for this project. Wait a few minutes, then try again, or use Sign In with an account you already created.";
  }
  if (/user already registered|already been registered|already exists/i.test(message)) {
    return "That email already has an account. Switch to Sign In and use the same password.";
  }
  return message;
}

async function joinTripByInvite(inviteCode: string, tripId: string, user: User, avatar = "🧑") {
  const name =
    user.user_metadata?.full_name?.split(" ")[0] ??
    user.email?.split("@")[0] ??
    "Traveler";

  const { data: existing } = await supabase
    .from("travelers")
    .select("id")
    .eq("trip_id", tripId)
    .eq("user_id", user.id)
    .limit(1);

  if (existing?.[0]) return;

  const { error: joinError } = await supabase.rpc("join_trip_by_invite", {
    target_invite_code: inviteCode,
    traveler_name: name,
    traveler_avatar: avatar,
  });

  if (joinError) {
    throw new Error(`Could not add you to this trip: ${joinError.message}`);
  }

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const { data: confirmed, error: confirmError } = await supabase
      .from("travelers")
      .select("id")
      .eq("trip_id", tripId)
      .eq("user_id", user.id)
      .limit(1);

    if (confirmed?.[0]) return;
    if (confirmError && attempt === 3) {
      throw new Error(confirmError.message);
    }
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
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
    .limit(1);

  if (byCode.data?.[0]) return byCode.data[0] as TripInfo;

  if (inviteCode === INVITE_CODE) {
    const byId = await supabase
      .from("trips")
      .select(select)
      .eq("id", TRIP_ID)
      .limit(1);
    if (byId.data?.[0]) return byId.data[0] as TripInfo;
  }

  if (inviteCode === DEMO_INVITE_CODE) {
    const byId = await supabase
      .from("trips")
      .select(select)
      .eq("id", DEMO_TRIP_ID)
      .limit(1);
    if (byId.data?.[0]) return byId.data[0] as TripInfo;
  }

  return null;
}

export default function JoinPageClient() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const inviteCode = (code ?? INVITE_CODE).toUpperCase();

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
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState<string | null>(null);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryPassword, setRecoveryPassword] = useState("");

  // 1. Load trip info
  useEffect(() => {
    async function load() {
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
  }, [inviteCode]);

  // 2. Check if already logged in
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUser(data.user);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryMode(true);
      }
      setCurrentUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // 3. If logged in + trip loaded → check membership
  useEffect(() => {
    if (!currentUser || !trip || inviteMode === "preview") return;
    supabase
      .from("travelers")
      .select("id")
      .eq("trip_id", trip.id)
      .eq("user_id", currentUser.id)
      .limit(1)
      .then(({ data, error }) => {
        if (error) {
          setAlreadyMember(false);
          return;
        }
        setError(null);
        setAlreadyMember(Boolean(data?.[0]));
      });
  }, [currentUser, trip, inviteMode]);

  async function handleJoinAsLoggedIn() {
    if (!trip || !currentUser) return;
    setError(null);
    setJoining(true);
    try {
      if (inviteMode !== "preview") {
        localStorage.removeItem(PREVIEW_INVITE_KEY);
        localStorage.removeItem(START_OWN_TRIP_KEY);
        await joinTripByInvite(inviteCode, trip.id, currentUser, selectedAvatar);
        localStorage.setItem(ACTIVE_TRIP_KEY, trip.id);
        localStorage.removeItem(FAMILY_INVITE_KEY);
        router.replace("/chat");
        return;
      }
      localStorage.removeItem(FAMILY_INVITE_KEY);
      localStorage.removeItem(START_OWN_TRIP_KEY);
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
    setConfirmEmail(null);
    setResetSent(null);
    setAuthLoading(true);

    let user: User | null = null;

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo: buildInviteUrl(inviteCode),
        },
      });
      if (error) {
        setError(formatAuthError(error.message));
        if (/email rate limit exceeded|user already registered|already been registered|already exists/i.test(error.message)) {
          setMode("signin");
        }
        setAuthLoading(false);
        return;
      }
      if (!data.session) {
        setConfirmEmail(email);
        setMode("signin");
        setAuthLoading(false);
        return;
      }
      user = data.user ?? null;
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(formatAuthError(error.message)); setAuthLoading(false); return; }
      user = data.user ?? null;
    }

    if (user) {
      try {
        if (inviteMode !== "preview") {
          localStorage.removeItem(PREVIEW_INVITE_KEY);
          localStorage.removeItem(START_OWN_TRIP_KEY);
          await joinTripByInvite(inviteCode, trip.id, user, selectedAvatar);
          localStorage.setItem(ACTIVE_TRIP_KEY, trip.id);
          localStorage.removeItem(FAMILY_INVITE_KEY);
          router.replace("/chat");
          return;
        }
        localStorage.removeItem(FAMILY_INVITE_KEY);
        localStorage.removeItem(START_OWN_TRIP_KEY);
        localStorage.setItem(PREVIEW_INVITE_KEY, "1");
        router.replace("/");
      } catch (err) {
        setError(formatJoinError(err));
      }
    }
    setAuthLoading(false);
  }

  function startOwnTrip() {
    localStorage.removeItem(PREVIEW_INVITE_KEY);
    localStorage.removeItem(FAMILY_INVITE_KEY);
    localStorage.removeItem(ACTIVE_TRIP_KEY);
    localStorage.setItem(START_OWN_TRIP_KEY, "1");
    router.replace("/");
  }

  async function switchAccount() {
    setError(null);
    setConfirmEmail(null);
    setResetSent(null);
    setAlreadyMember(false);
    localStorage.removeItem(PREVIEW_INVITE_KEY);
    localStorage.removeItem(FAMILY_INVITE_KEY);
    localStorage.removeItem(ACTIVE_TRIP_KEY);
    localStorage.removeItem(START_OWN_TRIP_KEY);
    await supabase.auth.signOut();
    setCurrentUser(null);
    setMode("signin");
    setEmail("");
    setPassword("");
  }

  async function handlePasswordReset() {
    setError(null);
    setResetSent(null);
    if (!email.trim()) {
      setError("Enter your email first, then tap Forgot password.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: buildInviteUrl(inviteCode),
    });
    if (error) {
      setError(formatAuthError(error.message));
      return;
    }
    setResetSent(email.trim());
  }

  async function handleRecoverySubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (recoveryPassword.length < 6) {
      setError("Choose a password with at least 6 characters.");
      return;
    }
    setAuthLoading(true);
    const { error } = await supabase.auth.updateUser({ password: recoveryPassword });
    setAuthLoading(false);
    if (error) {
      setError(formatAuthError(error.message));
      return;
    }
    setRecoveryMode(false);
    setPassword("");
    setRecoveryPassword("");
    setMode("signin");
    setConfirmEmail(null);
    setResetSent("Password updated. Sign in to continue.");
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
  const demoSelf = currentUser
    ? {
        id: `demo-self-${currentUser.id}`,
        name: currentUser.user_metadata?.full_name?.split(" ")[0] ?? currentUser.email?.split("@")[0] ?? "You",
        avatar: selectedAvatar,
        avatar_url: null,
      }
    : null;
  const visibleDemoTravelers = demoSelf
    ? [demoSelf, ...DEMO_FALLBACK_TRIP.travelers.slice(1, 4)]
    : DEMO_FALLBACK_TRIP.travelers;
  const displayTravelers = isDemo ? visibleDemoTravelers : visibleTravelers;
  const travelerCount = isDemo ? visibleDemoTravelers.length : trip.travelers.length;
  const extraCount = travelerCount - displayTravelers.length;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-white">

      {/* ── Hero ── */}
      <div className="relative min-h-[38dvh] w-full overflow-hidden flex-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={trip.cover_photo ?? MAUI_FALLBACK}
          alt={trip.destination}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#061832]/92 via-[#061832]/38 to-[#061832]/12" />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/30 to-transparent" />

        <div className="absolute left-6 top-6 flex items-center gap-2.5">
          <p className="font-serif text-2xl font-light leading-none text-white drop-shadow-sm">daywave</p>
          {isDemo && (
            <span className="rounded-full border border-white/18 bg-white/12 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-white/68 backdrop-blur-md">
              Sample trip
            </span>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 px-6 pb-6">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-white/62">
            {inviteMode === "family" ? "You're invited" : isDemo ? "Try the rhythm" : "Preview Daywave"}
          </p>
          <h1 className="max-w-[19rem] text-[2.35rem] font-black leading-[0.95] text-white">
            {inviteMode === "preview" ? "Plan each day beautifully." : isDemo ? "Explore a sample trip." : trip.title}
          </h1>
          <p className="mt-3 max-w-[20rem] text-sm leading-relaxed text-white/74">
            {inviteMode === "family"
              ? `${formatDateRange(trip.start_date, trip.end_date)} · ${trip.destination}`
              : isDemo
              ? "A fully loaded sample itinerary with bookings, chat, packing, and day-of flow."
              : "A polished sample trip you can explore before joining a real group"}
          </p>
        </div>
      </div>

      {/* ── Travelers going ── */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
        <div className="flex -space-x-2">
          {displayTravelers.map((t) => (
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
                {travelerCount} {isDemo ? "sample " : ""}traveler{travelerCount !== 1 ? "s" : ""} going
              </p>
              <p className="text-xs text-slate-400">
                {isDemo ? "Anonymized demo crew" : displayTravelers.map((t) => t.name).join(", ")}
                {extraCount > 0 ? ` +${extraCount} more` : ""}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-slate-900">Sample trip</p>
              <p className="text-xs text-slate-400">Explore the app without joining the organizer&apos;s trip</p>
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
        {recoveryMode ? (
          <form onSubmit={handleRecoverySubmit} className="flex flex-col gap-4 pt-4">
            <div className="text-center">
              <span className="text-4xl">🔐</span>
              <h2 className="mt-3 text-lg font-black text-slate-900">Set a new password</h2>
              <p className="mt-1 text-sm text-slate-400">Update your Daywave password, then continue into this trip.</p>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                New password
              </label>
              <input
                type="password"
                value={recoveryPassword}
                onChange={(e) => setRecoveryPassword(e.target.value)}
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
              {authLoading ? "Updating…" : "Update password"}
            </button>
          </form>
        ) : currentUser ? (
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
                    localStorage.removeItem(START_OWN_TRIP_KEY);
                    localStorage.setItem(ACTIVE_TRIP_KEY, trip.id);
                    router.replace("/");
                  }}
                  className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl text-sm"
                >
                  Open Daywave
                </button>
                {isDemo && (
                  <button
                    onClick={startOwnTrip}
                    className="w-full rounded-2xl border border-slate-200 bg-white py-4 text-sm font-bold text-slate-700"
                  >
                    Start my own trip
                  </button>
                )}
                <button
                  onClick={switchAccount}
                  className="text-sm font-bold text-slate-400"
                >
                  Use a different account
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
                      ? `This adds your account as a traveler on ${trip.title}.`
                      : isDemo
                      ? "This adds your account to the sample demo trip. Your changes stay separate from the organizer's real trip."
                      : "This opens a sample experience without joining the organizer's trip."}
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
                    : (inviteMode === "preview" ? "Open Daywave" : isDemo ? "Open Demo Trip" : `Join ${trip.title}`)}
                </button>
                {isDemo && (
                  <button
                    onClick={startOwnTrip}
                    className="w-full rounded-2xl border border-slate-200 bg-white py-4 text-sm font-bold text-slate-700"
                  >
                    Start my own trip instead
                  </button>
                )}
                <button
                  onClick={switchAccount}
                  className="text-sm font-bold text-slate-400"
                >
                  Use a different account
                </button>
              </>
            )}
          </div>
        ) : (
          /* Auth form */
          <>
            <h2 className="text-xl font-black text-slate-900 mb-1">
              {mode === "signup" ? (isDemo ? "Create your demo account" : "Create your account") : "Welcome back"}
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              {mode === "signup"
                ? inviteMode === "family"
                  ? "You'll be added to the trip automatically."
                  : isDemo
                  ? "Confirm your email, then Daywave will bring you back here to open the sample trip."
                  : "Create an account to explore the sample experience."
                : inviteMode === "family"
                  ? "Sign in and you'll be added to the trip."
                  : isDemo
                  ? "Sign in to continue into the sample trip."
                  : "Sign in to preview Daywave without joining the organizer's trip."}
            </p>

            {confirmEmail && (
              <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-xs font-black uppercase tracking-widest text-amber-700">Check your email</p>
                <p className="mt-1 text-sm leading-relaxed text-amber-900">
                  We sent a confirmation link to <span className="font-bold">{confirmEmail}</span>. Open that email to finish creating your Daywave account, then sign in here to open the sample trip.
                </p>
              </div>
            )}

            {resetSent && (
              <div className="mb-5 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3">
                <p className="text-xs font-black uppercase tracking-widest text-sky-700">Check your email</p>
                <p className="mt-1 text-sm leading-relaxed text-sky-900">
                  {resetSent.includes("@")
                    ? <>We sent a password reset link to <span className="font-bold">{resetSent}</span>. Open it to choose a new password, then Daywave will bring you back here.</>
                    : resetSent}
                </p>
              </div>
            )}

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
                {mode === "signin" && (
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    className="mt-2 text-xs font-bold text-slate-500"
                  >
                    Forgot password?
                  </button>
                )}
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
                  ? inviteMode === "family" ? `Join ${trip.title}` : "Create Account"
                  : inviteMode === "family" ? "Sign in & Join Trip" : "Sign In"}
              </button>
              {isDemo && (
                <button
                  type="button"
                  onClick={startOwnTrip}
                  className="text-center text-sm font-bold text-slate-500 py-2"
                >
                  I’m ready to start my own trip
                </button>
              )}
            </form>
          </>
        )}
      </div>

      {/* Daywave branding */}
      <div className="flex flex-col items-center pb-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/daywave-wordmark-light.png"
          alt="daywave"
          className="h-8 w-auto opacity-45"
        />
        <p className="mt-1 text-[11px] font-medium text-slate-300">
          A better way to move through your trip
        </p>
      </div>
    </div>
  );
}
