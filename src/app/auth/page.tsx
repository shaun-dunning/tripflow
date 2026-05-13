"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock, Mail, MapPinned, ShieldCheck, Sparkles, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
        setError(error.message);
      } else if (data.session) {
        setSuccess("Account created. Opening TripFlow...");
        router.replace("/");
      } else {
        setSuccess("Account created. Check your email to confirm it, then sign in.");
        setMode("signin");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      } else {
        router.replace("/");
      }
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">

      {/* ── Hero ── */}
      <div className="relative min-h-[44dvh] w-full overflow-hidden flex-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&h=720&fit=crop&q=85"
          alt="Maui beach"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/88 via-slate-950/28 to-sky-950/10" />
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/35 to-transparent" />
        <div className="absolute top-5 left-5 right-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-2xl bg-white/18 backdrop-blur-md border border-white/25 flex items-center justify-center text-white">
              <MapPinned className="size-4" />
            </div>
            <span className="text-lg font-black text-white tracking-tight">TripFlow</span>
          </div>
          <div className="rounded-full bg-white/16 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white/80 backdrop-blur-md border border-white/20">
            Maui ready
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-7">
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-white/16 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white/80 backdrop-blur-md border border-white/20">
            <Sparkles className="size-3" />
            Family travel, organized
          </div>
          <h1 className="max-w-[18rem] text-4xl font-black leading-[0.95] tracking-tight text-white">
            Every plan, person, and reservation in flow.
          </h1>
          <p className="mt-3 max-w-[19rem] text-sm leading-relaxed text-white/72">
            A calm command center for the days before, during, and after the trip.
          </p>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {[
              { icon: ShieldCheck, label: "Docs" },
              { icon: Users, label: "Group" },
              { icon: MapPinned, label: "Today" },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/18 bg-white/13 px-3 py-2.5 text-white backdrop-blur-md">
                <item.icon className="mb-1.5 size-4" />
                <p className="text-[11px] font-bold leading-none">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Form card ── */}
      <div className="flex-1 bg-white px-5 pt-5 pb-8">

        {/* Toggle */}
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {mode === "signup" && (
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
          </div>

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

          <button
            type="submit"
            disabled={loading}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 text-sm font-bold text-white shadow-[0_12px_28px_rgba(15,23,42,0.22)] transition-all active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? "Please wait…" : mode === "signin" ? "Sign In" : "Create Account"}
            {!loading && <ArrowRight className="size-4" />}
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
