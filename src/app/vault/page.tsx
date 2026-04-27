"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

type Doc = {
  id: string;
  category: string;
  name: string;
  provider: string;
  confirmation: string;
  date: string;
  status: "confirmed" | "pending" | "completed";
  notes?: string;
  emoji: string;
  file_type: "pdf" | "screenshot" | "booking";
};

const CATEGORIES = ["All", "Flights", "Hotel", "Car", "Activities", "Dining"];

const CATEGORY_EMOJIS: Record<string, string> = {
  Flights: "✈️", Hotel: "🏨", Car: "🚙", Activities: "🎯", Dining: "🐟",
};

const FILE_ICONS = {
  pdf: "PDF",
  screenshot: "Screenshot",
  booking: "Booking",
};

const TRIP_ID = "a1b2c3d4-0000-0000-0000-000000000001";

export default function VaultPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("All");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDocs() {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("trip_id", TRIP_ID)
        .order("created_at", { ascending: true });

      if (error) {
        setError(error.message);
      } else {
        setDocs(data as Doc[]);
      }
      setLoading(false);
    }
    fetchDocs();
  }, []);

  const filtered = docs.filter(
    (d) => activeCategory === "All" || d.category === activeCategory
  );

  const grouped = CATEGORIES.slice(1).reduce<Record<string, Doc[]>>((acc, cat) => {
    const items = filtered.filter((d) => d.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});

  const confirmedCount = docs.filter((d) => d.status === "confirmed").length;
  const pendingCount = docs.filter((d) => d.status === "pending").length;
  const completedCount = docs.filter((d) => d.status === "completed").length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Loading docs…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 px-6 text-center">
        <span className="text-3xl">⚠️</span>
        <p className="text-sm font-semibold text-slate-700">Couldn't load docs</p>
        <p className="text-xs text-slate-400 font-mono">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-white">

      {/* ── Header ── */}
      <div className="px-4 pt-5 pb-4 border-b border-slate-100">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-0.5">Maui Family Trip</p>
        <h1 className="text-2xl font-bold text-slate-900">Docs</h1>

        <div className="flex items-center gap-5 mt-3">
          <div>
            <p className="text-xl font-black text-slate-900">{confirmedCount}</p>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Confirmed</p>
          </div>
          <div className="w-px h-8 bg-slate-100" />
          <div>
            <p className="text-xl font-black text-amber-500">{pendingCount}</p>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Pending</p>
          </div>
          <div className="w-px h-8 bg-slate-100" />
          <div>
            <p className="text-xl font-black text-slate-400">{completedCount}</p>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Completed</p>
          </div>
          <div className="w-px h-8 bg-slate-100" />
          <div>
            <p className="text-xl font-black text-slate-900">{docs.length}</p>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Total</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 px-4 pt-4 pb-4">

        {/* ── Pending alert ── */}
        {pendingCount > 0 && (
          <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-none">
              <span className="text-base">⚠️</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900">Action needed</p>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {pendingCount} reservation{pendingCount > 1 ? "s" : ""} still need confirmation
              </p>
            </div>
            <span className="text-[10px] font-bold text-slate-900 border border-slate-900 px-2 py-1 rounded-full flex-none">
              Review
            </span>
          </div>
        )}

        {/* ── Category filter ── */}
        <div className="flex gap-1 border-b border-slate-100 -mx-4 px-4 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex-none flex items-center gap-1.5 text-xs font-semibold pb-2.5 pt-1 px-2 whitespace-nowrap border-b-2 transition-all ${
                  active
                    ? "border-slate-900 text-slate-900"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                {cat !== "All" && <span>{CATEGORY_EMOJIS[cat]}</span>}
                {cat}
              </button>
            );
          })}
        </div>

        {/* ── Grouped docs ── */}
        {Object.entries(grouped).map(([cat, items]) => (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-3">
              <span>{CATEGORY_EMOJIS[cat]}</span>
              <p className="text-sm font-bold text-slate-800">{cat}</p>
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-xs text-slate-400">{items.length}</span>
            </div>

            <div className="flex flex-col gap-2">
              {items.map((doc) => {
                const isOpen = expanded === doc.id;
                const accentColor =
                  doc.status === "confirmed" ? "bg-emerald-400" :
                  doc.status === "pending"   ? "bg-amber-400" :
                                               "bg-slate-200";

                return (
                  <div key={doc.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <button
                      onClick={() => setExpanded(isOpen ? null : doc.id)}
                      className="w-full text-left flex items-stretch"
                    >
                      <div className={`w-1 ${accentColor} flex-none rounded-l-2xl`} />
                      <div className="flex-1 flex items-center gap-3 px-4 py-3.5">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-xl flex-none">
                          {doc.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold text-sm truncate ${
                            doc.status === "completed" ? "text-slate-400" : "text-slate-900"
                          }`}>
                            {doc.name}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">{doc.date}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 flex-none">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            doc.status === "confirmed" ? "bg-slate-100 text-slate-600" :
                            doc.status === "pending"   ? "bg-amber-50 text-amber-600 border border-amber-200" :
                                                         "bg-slate-50 text-slate-400"
                          }`}>
                            {doc.status === "confirmed" ? "Confirmed" :
                             doc.status === "pending"   ? "⏳ Pending" : "Done"}
                          </span>
                          <span className="text-[10px] text-slate-300">{isOpen ? "▲" : "▼"}</span>
                        </div>
                      </div>
                    </button>

                    {isOpen && (
                      <div className="border-t border-slate-100 px-5 py-4 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Confirmation #</p>
                            <p className="text-base font-black text-slate-900 font-mono tracking-wide">{doc.confirmation}</p>
                          </div>
                          <button className="text-xs font-bold text-slate-900 border-2 border-slate-900 px-4 py-2 rounded-xl hover:bg-slate-50 transition-colors">
                            Copy
                          </button>
                        </div>
                        {doc.notes && (
                          <div>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Notes</p>
                            <p className="text-sm text-slate-600 leading-relaxed">{doc.notes}</p>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button className="flex-1 bg-slate-900 text-white text-xs font-bold py-3 rounded-xl hover:bg-slate-800 transition-colors">
                            View {FILE_ICONS[doc.file_type]}
                          </button>
                          <button className="px-5 bg-white border border-slate-200 text-slate-700 text-xs font-bold py-3 rounded-xl hover:bg-slate-50 transition-colors">
                            Share
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <button className="flex items-center justify-center gap-2 w-full border-2 border-dashed border-slate-200 rounded-2xl py-4 text-sm font-semibold text-slate-400 hover:border-slate-400 hover:text-slate-600 transition-colors">
          <span className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center text-xs leading-none font-bold">+</span>
          Add document or reservation
        </button>

      </div>
    </div>
  );
}
