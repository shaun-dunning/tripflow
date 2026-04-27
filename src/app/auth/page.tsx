"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AuthPage() {
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
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });
      if (error) {
        setError(error.message);
      } else {
        // Supabase auto-signs-in after signup (email confirm is off)
        // AuthGuard's onAuthStateChange listener will redirect automatically
        setSuccess("Account created! Taking you in…");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      }
      // On success, AuthGuard's onAuthStateChange listener handles the redirect
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen flex flex-col">

      {/* ── Hero ── */}
      <div className="relative h-56 w-full overflow-hidden flex-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=400&fit=crop&q=80"
          alt="Maui beach"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🌺</span>
            <span className="text-xl font-black text-white tracking-tight">TripFlow</span>
          </div>
          <p className="text-sm text-white/70">Your family travel command center</p>
        </div>
      </div>

      {/* ── Form card ── */}
      <div className="flex-1 bg-white px-6 pt-8 pb-10">

        {/* Toggle */}
        <div className="flex bg-slate-100 rounded-2xl p-1 mb-8">
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
                placeholder="e.g. Shaun"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-200 transition-all"
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
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-200 transition-all"
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
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-200 transition-all"
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
            className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl text-sm mt-2 disabled:opacity-50 transition-opacity"
          >
            {loading ? "Please wait…" : mode === "signin" ? "Sign In" : "Create Account"}
          </button>

        </form>

        {/* Apple / Google — coming soon placeholders */}
        <div className="mt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-xs text-slate-400 font-medium">or continue with</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>
          <button
            disabled
            className="w-full flex items-center justify-center gap-2.5 border-2 border-slate-200 rounded-2xl py-3.5 text-sm font-semibold text-slate-400 cursor-not-allowed"
          >
            {/* Apple logo SVG */}
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.42c1.29.07 2.17.76 2.94.8.93-.18 1.82-.87 3-.91 1.52.06 2.64.72 3.37 1.88a5.3 5.3 0 0 0-1.98 4.14c.07 2.44 1.55 3.99 2.67 4.95zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            Sign in with Apple
            <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full ml-1">Soon</span>
          </button>
        </div>

      </div>
    </div>
  );
}
