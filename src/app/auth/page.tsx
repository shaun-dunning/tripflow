"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock, Mail } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { FAMILY_INVITE_KEY, PREVIEW_INVITE_KEY, START_OWN_TRIP_KEY, getDaywaveOrigin } from "@/lib/tripConfig";

function formatAuthError(message: string) {
  if (/email rate limit exceeded/i.test(message)) {
    return "Supabase has temporarily paused new account emails for this project. Wait a few minutes, then try again, or sign in with an account you already created.";
  }
  if (/user already registered|already been registered|already exists/i.test(message)) {
    return "That email already has an account. Switch to Sign In and use the same password.";
  }
  return message;
}

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    localStorage.removeItem(FAMILY_INVITE_KEY);
    localStorage.removeItem(PREVIEW_INVITE_KEY);
    localStorage.removeItem(START_OWN_TRIP_KEY);

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryMode(true);
        setMode("signin");
        setError(null);
        setSuccess(null);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });
      if (error) {
        setError(formatAuthError(error.message));
        if (/email rate limit exceeded|user already registered|already been registered|already exists/i.test(error.message)) {
          setMode("signin");
        }
      } else if (data.session) {
        setSuccess("Account created. Opening Daywave...");
        router.replace("/");
      } else {
        setSuccess("Account created. Check your email to confirm it, then sign in.");
        setMode("signin");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(formatAuthError(error.message));
      } else {
        router.replace("/");
      }
    }

    setLoading(false);
  }

  async function handleForgotPassword() {
    setError(null);
    setSuccess(null);
    setResetSent(false);
    if (!email.trim()) {
      setError("Enter your email first, then tap Forgot password.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${getDaywaveOrigin()}/auth`,
    });
    if (error) {
      setError(formatAuthError(error.message));
      return;
    }
    setResetSent(true);
  }

  async function handleRecoverySubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (newPassword.length < 6) {
      setError("Choose a password with at least 6 characters.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) {
      setError(formatAuthError(error.message));
      return;
    }
    setRecoveryMode(false);
    setNewPassword("");
    setPassword("");
    setSuccess("Password updated. Sign in to continue.");
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">

      {/* ── Hero ── */}
      <div className="relative min-h-[40dvh] w-full overflow-hidden flex-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&h=720&fit=crop&q=85"
          alt="Maui beach"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#061832]/92 via-[#061832]/34 to-[#061832]/10" />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/30 to-transparent" />
        <div className="absolute left-6 top-6">
          <p className="font-serif text-2xl font-light leading-none text-white drop-shadow-sm">
            daywave
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-8">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-white/62">
            Your trip, in flow
          </p>
          <h1 className="max-w-[18rem] text-[2.65rem] font-black leading-[0.94] text-white">
            Plan each day beautifully.
          </h1>
          <p className="mt-3 max-w-[20rem] text-sm leading-relaxed text-white/74">
            Reservations, people, plans, and day-of decisions in one calm place.
          </p>
        </div>
      </div>

      {/* ── Form card ── */}
      <div className="flex-1 bg-white px-5 pt-5 pb-8">

        {/* Toggle */}
        {!recoveryMode && (
          <div className="flex bg-slate-100 rounded-2xl p-1 mb-5">
            <button
              onClick={() => { setMode("signin"); setError(null); }}
              className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${
                mode === "signin" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode("signup"); setError(null); }}
              className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${
                mode === "signup" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        <form onSubmit={recoveryMode ? handleRecoverySubmit : handleSubmit} className="flex flex-col gap-4">

          {recoveryMode ? (
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5 block">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="6+ characters"
                required
                minLength={6}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-200 transition-all"
              />
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                Set a new password for your Daywave account.
              </p>
            </div>
          ) : mode === "signup" && (
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5 block">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-200 transition-all"
              />
            </div>
          )}

          {!recoveryMode && (
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5 block">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-200 transition-all"
              />
            </div>
          )}

          {!recoveryMode && (
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5 block">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6+ characters"
                required
                minLength={6}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-200 transition-all"
              />
              {mode === "signin" && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="mt-2 text-xs font-bold text-slate-500"
                >
                  Forgot password?
                </button>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 flex items-center gap-2">
              <span className="text-base">✅</span>
              <p className="text-sm text-emerald-700">{success}</p>
            </div>
          )}

          {resetSent && (
            <div className="bg-sky-50 border border-sky-200 rounded-2xl px-4 py-3 flex items-center gap-2">
              <span className="text-base">✉️</span>
              <p className="text-sm text-sky-800">Password reset sent. Open the email to choose a new password.</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 text-sm font-bold text-white shadow-[0_12px_28px_rgba(15,23,42,0.22)] transition-all active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? "Please wait…" : recoveryMode ? "Update Password" : mode === "signin" ? "Sign In" : "Create Account"}
            {!loading && !recoveryMode && <ArrowRight className="size-4" />}
          </button>

        </form>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3">
            <Mail className="mb-2 size-4 text-sky-600" />
            <p className="text-[11px] font-bold text-slate-700">Invite-ready</p>
            <p className="mt-0.5 text-[10px] leading-snug text-slate-400">Bring the family in with one shared trip.</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3">
            <Lock className="mb-2 size-4 text-emerald-600" />
            <p className="text-[11px] font-bold text-slate-700">Private by default</p>
            <p className="mt-0.5 text-[10px] leading-snug text-slate-400">Plans, docs, and chat stay with your group.</p>
          </div>
        </div>

      </div>
    </div>
  );
}
