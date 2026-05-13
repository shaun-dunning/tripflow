"use client";

import { useState } from "react";

type FirstTripSetupProps = {
  defaultName?: string;
  onCreate: (input: {
    title: string;
    destination: string;
    startDate: string;
    endDate: string;
    travelerName: string;
    avatar?: string;
  }) => Promise<unknown>;
};

function defaultDate(daysFromNow: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().slice(0, 10);
}

export default function FirstTripSetup({ defaultName = "", onCreate }: FirstTripSetupProps) {
  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState(defaultDate(30));
  const [endDate, setEndDate] = useState(defaultDate(36));
  const [travelerName, setTravelerName] = useState(defaultName);
  const [avatar, setAvatar] = useState("🧳");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      await onCreate({ title, destination, startDate, endDate, travelerName, avatar });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Trip could not be created.");
      setCreating(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-9rem)] px-5 py-8">
      <div className="mx-auto w-full max-w-md overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="relative h-52 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1488085061387-422e29b40080?w=900&h=520&fit=crop&q=85"
            alt="Travel planning"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
          <div className="absolute bottom-5 left-5 right-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/65">Start your space</p>
            <h1 className="mt-1 max-w-[16rem] text-3xl font-black leading-none text-white">
              Create your first trip.
            </h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Trip name</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Spring Break in Cabo"
              required
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none focus:border-slate-900"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Destination</label>
            <input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g. Cabo San Lucas"
              required
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none focus:border-slate-900"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Starts</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3.5 text-sm outline-none focus:border-slate-900"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Ends</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3.5 text-sm outline-none focus:border-slate-900"
              />
            </div>
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Your name</label>
              <input
                value={travelerName}
                onChange={(e) => setTravelerName(e.target.value)}
                placeholder="e.g. Shaun"
                required
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none focus:border-slate-900"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Avatar</label>
              <select
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                className="h-[50px] rounded-2xl border border-slate-200 bg-slate-50 px-3 text-xl outline-none focus:border-slate-900"
              >
                {["🧳", "🌺", "✈️", "🏖️", "🗺️", "🚗"].map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
          )}

          <button
            type="submit"
            disabled={creating}
            className="mt-1 rounded-2xl bg-slate-950 py-4 text-sm font-bold text-white disabled:opacity-50"
          >
            {creating ? "Creating trip..." : "Create Trip"}
          </button>
        </form>
      </div>
    </div>
  );
}
