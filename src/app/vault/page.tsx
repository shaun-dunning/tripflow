"use client";

import { useState, useEffect, useRef } from "react";
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
  file_url?: string | null;
};

type NewDoc = Omit<Doc, "id" | "file_url">;

const CATEGORIES = ["All", "Flights", "Hotel", "Car", "Activities", "Dining"];
const CATEGORY_EMOJIS: Record<string, string> = {
  Flights: "✈️", Hotel: "🏨", Car: "🚙", Activities: "🎯", Dining: "🍽️",
};
const TRIP_ID = "a1b2c3d4-0000-0000-0000-000000000001";

const BLANK_DOC: NewDoc = {
  category: "Flights", name: "", provider: "", confirmation: "",
  date: "", status: "confirmed", notes: "", emoji: "✈️", file_type: "booking",
};

// Airport city names for boarding pass display
const AIRPORT_CITIES: Record<string, string> = {
  LAX: "Los Angeles", OGG: "Maui", SEA: "Seattle", SFO: "San Francisco",
  JFK: "New York", ORD: "Chicago", HNL: "Honolulu", KOA: "Kona",
  DEN: "Denver", ATL: "Atlanta", LAS: "Las Vegas", PHX: "Phoenix",
  MIA: "Miami", BOS: "Boston", DFW: "Dallas", LHR: "London",
};

// Airline brand identities
const AIRLINE_BRANDS: Record<string, { bg: string; code: string; fullName: string }> = {
  "American Airlines": { bg: "from-[#B60000] to-[#7A0000]", code: "AA", fullName: "American Airlines" },
  "Alaska Airlines":   { bg: "from-[#005DAA] to-[#003875]", code: "AS", fullName: "Alaska Airlines" },
  "Delta Air Lines":   { bg: "from-[#003366] to-[#001833]", code: "DL", fullName: "Delta Air Lines" },
  "United Airlines":   { bg: "from-[#002244] to-[#000F1F]", code: "UA", fullName: "United Airlines" },
  "Southwest Airlines":{ bg: "from-[#304CB2] to-[#1D3080]", code: "WN", fullName: "Southwest Airlines" },
  "Hawaiian Airlines": { bg: "from-[#7B3F9E] to-[#4A1070]", code: "HA", fullName: "Hawaiian Airlines" },
};

function getAirlineBrand(provider: string) {
  for (const [key, brand] of Object.entries(AIRLINE_BRANDS)) {
    if (provider?.toLowerCase().includes(key.split(" ")[0].toLowerCase())) return brand;
  }
  return { bg: "from-slate-700 to-slate-900", code: "✈", fullName: provider ?? "" };
}

function parseRoute(name: string) {
  const parts = (name ?? "").split("→").map((s) => s.trim()).filter(Boolean);
  return {
    origin: parts[0] ?? "",
    destination: parts[parts.length - 1] ?? "",
    hasRoute: parts.length >= 2,
  };
}

// Hotel photos by provider keyword
function hotelPhoto(provider: string, name: string): string {
  const key = (provider + name).toLowerCase();
  if (key.includes("sheraton") || key.includes("marriott"))
    return "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&h=400&fit=crop&q=85";
  if (key.includes("four seasons") || key.includes("ritz"))
    return "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&h=400&fit=crop&q=85";
  if (key.includes("andaz") || key.includes("hyatt"))
    return "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&h=400&fit=crop&q=85";
  return "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&h=400&fit=crop&q=85";
}

// Status pill
function StatusPill({ status }: { status: Doc["status"] }) {
  if (status === "confirmed")
    return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">● Confirmed</span>;
  if (status === "pending")
    return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">● Pending</span>;
  return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">● Done</span>;
}

export default function VaultPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("All");

  // Bottom-sheet detail/edit
  const [detailDoc, setDetailDoc] = useState<Doc | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFields, setEditFields] = useState<Partial<Doc>>({});
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Add form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDoc, setNewDoc] = useState<NewDoc>({ ...BLANK_DOC });

  // File upload
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadingDocId = useRef<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("trip_id", TRIP_ID)
        .order("created_at", { ascending: true });
      if (error) setError(error.message);
      else setDocs(data as Doc[]);
      setLoading(false);
    })();
  }, []);

  // ── Sheet helpers ──────────────────────────────────────────────────────────
  function openDetail(doc: Doc) {
    setDetailDoc(doc);
    setIsEditing(false);
    setDeleteConfirm(false);
  }
  function closeSheet() {
    setDetailDoc(null);
    setIsEditing(false);
    setDeleteConfirm(false);
  }
  function startEdit() {
    if (!detailDoc) return;
    setEditFields({ ...detailDoc });
    setIsEditing(true);
  }

  // ── Supabase actions ───────────────────────────────────────────────────────
  async function copyConfirmation(confirmation: string, id: string) {
    await navigator.clipboard.writeText(confirmation);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function saveEdit() {
    if (!detailDoc) return;
    setSaving(true);
    await supabase.from("documents").update(editFields).eq("id", detailDoc.id);
    const updated = { ...detailDoc, ...editFields } as Doc;
    setDocs((prev) => prev.map((d) => d.id === detailDoc.id ? updated : d));
    setDetailDoc(updated);
    setIsEditing(false);
    setSaving(false);
  }

  async function deleteDoc() {
    if (!detailDoc) return;
    setSaving(true);
    await supabase.from("documents").delete().eq("id", detailDoc.id);
    setDocs((prev) => prev.filter((d) => d.id !== detailDoc.id));
    setSaving(false);
    closeSheet();
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const docId = uploadingDocId.current;
    if (!file || !docId) return;
    setUploadingId(docId);
    const ext = file.name.split(".").pop() ?? "pdf";
    const path = `${TRIP_ID}/${docId}.${ext}`;
    const { error } = await supabase.storage.from("documents").upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from("documents").getPublicUrl(path);
      await supabase.from("documents").update({ file_url: data.publicUrl, file_type: ext === "pdf" ? "pdf" : "screenshot" }).eq("id", docId);
      setDocs((prev) => prev.map((d) => d.id === docId ? { ...d, file_url: data.publicUrl } : d));
      if (detailDoc?.id === docId) setDetailDoc((d) => d ? { ...d, file_url: data.publicUrl } : d);
    }
    setUploadingId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function addDoc() {
    if (!newDoc.name.trim()) return;
    setSaving(true);
    const { data } = await supabase
      .from("documents")
      .insert({ ...newDoc, trip_id: TRIP_ID })
      .select()
      .single();
    if (data) {
      setDocs((prev) => [...prev, data as Doc]);
      openDetail(data as Doc);
    }
    setNewDoc({ ...BLANK_DOC });
    setShowAddForm(false);
    setSaving(false);
  }

  const filtered = docs.filter((d) => activeCategory === "All" || d.category === activeCategory);
  const grouped = CATEGORIES.slice(1).reduce<Record<string, Doc[]>>((acc, cat) => {
    const items = filtered.filter((d) => d.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});
  const confirmedCount = docs.filter((d) => d.status === "confirmed").length;
  const pendingCount = docs.filter((d) => d.status === "pending").length;

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
      <p className="text-sm text-slate-400">Loading…</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 px-6 text-center">
      <span className="text-3xl">⚠️</span>
      <p className="text-sm font-semibold text-slate-700">Couldn&apos;t load docs</p>
      <p className="text-xs text-slate-400 font-mono">{error}</p>
    </div>
  );

  return (
    <div className="flex flex-col bg-slate-50 min-h-screen">

      {/* Hidden file input */}
      <input type="file" accept="image/*,.pdf" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />

      {/* ══════════════════════════════════════
          BOTTOM SHEET — detail / edit
      ══════════════════════════════════════ */}
      <div className={`fixed inset-0 z-50 flex flex-col justify-end max-w-md mx-auto transition-opacity duration-200 ${detailDoc ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeSheet} />
        <div className={`relative bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out max-h-[90vh] flex flex-col ${detailDoc ? "translate-y-0" : "translate-y-full"}`}>

          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1 flex-none">
            <div className="w-10 h-1 bg-slate-200 rounded-full" />
          </div>

          {/* Sheet header — category-aware color */}
          {detailDoc && (() => {
            const isFlights = detailDoc.category === "Flights";
            const isHotel = detailDoc.category === "Hotel";
            const brand = isFlights ? getAirlineBrand(detailDoc.provider ?? "") : null;
            const bg = brand?.bg ?? "from-slate-800 to-slate-900";

            return (
              <div className={`mx-4 mb-4 rounded-2xl overflow-hidden flex-none bg-gradient-to-r ${isHotel ? "" : bg}`}>
                {isHotel ? (
                  <div className="relative h-24">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={hotelPhoto(detailDoc.provider, detailDoc.name)} alt="Hotel" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-700/80 to-amber-900/60" />
                    <div className="absolute inset-0 flex items-center px-4 gap-3">
                      <span className="text-3xl">🏨</span>
                      <div>
                        <p className="text-xs font-bold text-white/70">{detailDoc.provider}</p>
                        <p className="text-base font-black text-white leading-tight">{detailDoc.name || detailDoc.provider}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="px-4 py-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-none">
                      <span className="text-white font-black text-sm">{brand?.code ?? detailDoc.emoji}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">{detailDoc.category}</p>
                      <p className="text-sm font-black text-white leading-tight truncate">{detailDoc.name || detailDoc.provider}</p>
                    </div>
                    <StatusPill status={detailDoc.status} />
                  </div>
                )}
              </div>
            );
          })()}

          {/* Sheet body */}
          <div className="flex-1 overflow-y-auto px-5 pb-2">
            {detailDoc && (isEditing ? (
              /* ── Edit mode ── */
              <div className="flex flex-col gap-3 pb-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Edit details</p>
                {([
                  { label: "Name", key: "name" as const, placeholder: "e.g. LAX → OGG" },
                  { label: "Provider", key: "provider" as const, placeholder: "e.g. American Airlines" },
                  { label: "Confirmation #", key: "confirmation" as const, placeholder: "e.g. LSKUAS" },
                  { label: "Date / Time", key: "date" as const, placeholder: "e.g. Jun 5 · 8:05 AM" },
                  { label: "Notes", key: "notes" as const, placeholder: "Any extra info…" },
                ] as const).map(({ label, key, placeholder }) => (
                  <div key={key}>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                    <input type="text" value={(editFields[key] as string) ?? ""} onChange={(e) => setEditFields({ ...editFields, [key]: e.target.value })}
                      placeholder={placeholder} className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-slate-900 bg-white"
                    />
                  </div>
                ))}
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Status</p>
                  <div className="flex gap-2">
                    {(["confirmed", "pending", "completed"] as const).map((s) => (
                      <button key={s} onClick={() => setEditFields({ ...editFields, status: s })}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${editFields.status === s ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-200"}`}
                      >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* ── View mode ── */
              <div className="flex flex-col gap-4 pb-4">

                {/* Confirmation — the star of the show */}
                {detailDoc.confirmation && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Confirmation #</p>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-2xl font-black text-slate-900 font-mono tracking-wider leading-none">{detailDoc.confirmation}</p>
                      <button
                        onClick={() => copyConfirmation(detailDoc.confirmation, detailDoc.id)}
                        className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-xl border-2 transition-all flex-none ${
                          copiedId === detailDoc.id ? "bg-emerald-500 text-white border-emerald-500" : "border-slate-900 text-slate-900 hover:bg-slate-50"
                        }`}
                      >
                        {copiedId === detailDoc.id ? "✓ Copied!" : "Copy"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Details grid */}
                <div className="grid grid-cols-2 gap-3">
                  {detailDoc.date && (
                    <div className="bg-white border border-slate-100 rounded-xl px-3 py-3">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Date & Time</p>
                      <p className="text-sm font-semibold text-slate-800">{detailDoc.date}</p>
                    </div>
                  )}
                  {detailDoc.provider && (
                    <div className="bg-white border border-slate-100 rounded-xl px-3 py-3">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Provider</p>
                      <p className="text-sm font-semibold text-slate-800 leading-snug">{detailDoc.provider}</p>
                    </div>
                  )}
                </div>

                {/* Notes */}
                {detailDoc.notes && (
                  <div className="bg-white border border-slate-100 rounded-xl px-3 py-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Notes</p>
                    <p className="text-sm text-slate-600 leading-relaxed">{detailDoc.notes}</p>
                  </div>
                )}

                {/* File attachment */}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Attachment</p>
                  {detailDoc.file_url ? (
                    <a href={detailDoc.file_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 bg-sky-50 border border-sky-100 rounded-xl px-4 py-3"
                    >
                      <span className="text-xl">{detailDoc.file_type === "pdf" ? "📄" : "🖼️"}</span>
                      <span className="text-sm font-semibold text-sky-700 flex-1">View {detailDoc.file_type === "pdf" ? "PDF" : "file"}</span>
                      <span className="text-sky-400">↗</span>
                    </a>
                  ) : (
                    <button
                      onClick={() => { uploadingDocId.current = detailDoc.id; fileInputRef.current?.click(); }}
                      disabled={uploadingId === detailDoc.id}
                      className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl py-3.5 text-xs font-semibold text-slate-400 hover:border-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
                    >
                      {uploadingId === detailDoc.id
                        ? <><div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" /> Uploading…</>
                        : <>📎 Attach confirmation PDF or screenshot</>
                      }
                    </button>
                  )}
                </div>

                {/* Delete confirm */}
                {deleteConfirm && (
                  <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex flex-col gap-2">
                    <p className="text-sm font-bold text-red-700">Delete this document?</p>
                    <div className="flex gap-2">
                      <button onClick={deleteDoc} disabled={saving} className="flex-1 bg-red-500 text-white text-sm font-bold py-2.5 rounded-xl disabled:opacity-50">
                        {saving ? "Deleting…" : "Yes, delete"}
                      </button>
                      <button onClick={() => setDeleteConfirm(false)} className="px-4 text-sm font-semibold text-slate-500 border border-slate-200 rounded-xl">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Sheet action bar */}
          <div className="flex-none px-5 pt-3 pb-8 border-t border-slate-100 flex gap-3">
            {isEditing ? (
              <>
                <button onClick={() => setIsEditing(false)} className="px-4 py-3 text-sm font-semibold text-slate-400 border border-slate-200 rounded-2xl">
                  Cancel
                </button>
                <button onClick={saveEdit} disabled={saving} className="flex-1 bg-slate-900 text-white font-bold py-3.5 rounded-2xl text-sm disabled:opacity-50">
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </>
            ) : (
              <>
                {!deleteConfirm && (
                  <button onClick={() => setDeleteConfirm(true)} className="px-4 py-3 text-sm font-bold text-red-400 border border-red-100 rounded-2xl hover:bg-red-50 transition-colors">
                    Delete
                  </button>
                )}
                <button onClick={startEdit} className="flex-1 bg-slate-900 text-white font-bold py-3.5 rounded-2xl text-sm">
                  Edit Details
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          HERO HEADER
      ══════════════════════════════════════ */}
      <div className="relative h-52 w-full overflow-hidden flex-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=500&fit=crop&q=85"
          alt="Maui"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />

        {/* Trip label */}
        <div className="absolute top-4 left-4">
          <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Maui Family Trip · Jun 5–11</p>
        </div>

        {/* Title + stats */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-5">
          <h1 className="text-2xl font-black text-white mb-3">Docs & Reservations</h1>

          {/* Frosted glass stat pills */}
          <div className="flex gap-2">
            <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-md border border-white/20 rounded-full px-3 py-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-bold text-white">{confirmedCount} confirmed</span>
            </div>
            {pendingCount > 0 && (
              <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-md border border-white/20 rounded-full px-3 py-1.5">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-xs font-bold text-white">{pendingCount} pending</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-md border border-white/20 rounded-full px-3 py-1.5">
              <span className="text-xs font-bold text-white">{docs.length} total</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Category filter ── */}
      <div className="bg-white border-b border-slate-100 flex-none">
        <div className="flex overflow-x-auto px-3 gap-1 py-2" style={{ scrollbarWidth: "none" }}>
          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat;
            return (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={`flex-none flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                  active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {cat !== "All" && <span className="text-sm">{CATEGORY_EMOJIS[cat]}</span>}
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════
          DOC CARDS
      ══════════════════════════════════════ */}
      <div className="flex flex-col gap-6 px-4 pt-5 pb-8">
        {Object.entries(grouped).map(([cat, items]) => (
          <div key={cat}>
            {/* Section label */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">{CATEGORY_EMOJIS[cat]}</span>
              <p className="text-sm font-bold text-slate-700">{cat}</p>
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-[11px] text-slate-400 font-medium">{items.length}</span>
            </div>

            <div className="flex flex-col gap-3">
              {items.map((doc) => {

                /* ── FLIGHT: Boarding-pass card ── */
                if (doc.category === "Flights") {
                  const brand = getAirlineBrand(doc.provider ?? "");
                  const { origin, destination, hasRoute } = parseRoute(doc.name ?? "");
                  const originCity = AIRPORT_CITIES[origin] ?? origin;
                  const destCity = AIRPORT_CITIES[destination] ?? destination;
                  return (
                    <button
                      key={doc.id}
                      onClick={() => openDetail(doc)}
                      className={`w-full text-left rounded-2xl overflow-hidden shadow-lg bg-gradient-to-br ${brand.bg} active:scale-[0.98] transition-transform`}
                    >
                      {/* Top: airline identity */}
                      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                            <span className="text-white text-xs font-black">{brand.code}</span>
                          </div>
                          <span className="text-[11px] font-bold text-white/70 tracking-wide">{brand.fullName.toUpperCase()}</span>
                        </div>
                        <StatusPill status={doc.status} />
                      </div>

                      {/* Middle: route */}
                      {hasRoute ? (
                        <div className="px-5 pb-4 flex items-center gap-3">
                          <div className="text-left">
                            <p className="text-4xl font-black text-white tracking-tight leading-none font-mono">{origin}</p>
                            <p className="text-[11px] text-white/60 font-medium mt-1 leading-tight">{originCity}</p>
                          </div>
                          <div className="flex-1 flex items-center gap-1.5 mx-1 pb-3">
                            <div className="flex-1 h-px bg-white/25" />
                            <span className="text-white/50 text-base">✈</span>
                            <div className="flex-1 h-px bg-white/25" />
                          </div>
                          <div className="text-right">
                            <p className="text-4xl font-black text-white tracking-tight leading-none font-mono">{destination}</p>
                            <p className="text-[11px] text-white/60 font-medium mt-1 leading-tight">{destCity}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="px-5 pb-4">
                          <p className="text-xl font-black text-white">{doc.name}</p>
                        </div>
                      )}

                      {/* Perforation divider */}
                      <div className="mx-4 border-t border-dashed border-white/20" />

                      {/* Bottom: date + confirmation */}
                      <div className="px-5 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-white/50 font-semibold uppercase tracking-widest">Departure</p>
                          <p className="text-xs font-bold text-white mt-0.5">{doc.date || "—"}</p>
                        </div>
                        {doc.confirmation && (
                          <div className="text-right">
                            <p className="text-[10px] text-white/50 font-semibold uppercase tracking-widest">Confirmation</p>
                            <p className="text-sm font-black text-white font-mono mt-0.5 tracking-wider">{doc.confirmation}</p>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                }

                /* ── HOTEL: Property photo card ── */
                if (doc.category === "Hotel") {
                  return (
                    <button
                      key={doc.id}
                      onClick={() => openDetail(doc)}
                      className="w-full text-left rounded-2xl overflow-hidden shadow-lg bg-white active:scale-[0.98] transition-transform"
                    >
                      {/* Photo header */}
                      <div className="relative h-36 w-full overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={hotelPhoto(doc.provider ?? "", doc.name ?? "")}
                          alt={doc.name || "Hotel"}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                        <div className="absolute top-3 right-3">
                          <StatusPill status={doc.status} />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 px-4 pb-3">
                          <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">{doc.provider}</p>
                          <p className="text-lg font-black text-white leading-tight">{doc.name || doc.provider}</p>
                        </div>
                      </div>

                      {/* Details row */}
                      <div className="px-4 py-3.5 flex items-center justify-between border-t border-slate-100">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</p>
                          <p className="text-sm font-semibold text-slate-800 mt-0.5">{doc.date || "—"}</p>
                        </div>
                        {doc.confirmation && (
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Confirmation</p>
                            <p className="text-sm font-black text-slate-900 font-mono mt-0.5 tracking-wide">{doc.confirmation}</p>
                          </div>
                        )}
                        <div className="text-slate-300 text-sm ml-2">›</div>
                      </div>
                    </button>
                  );
                }

                /* ── ACTIVITY / DINING / CAR: Event ticket card ── */
                const accentGradients: Record<string, string> = {
                  Activities: "from-emerald-500 to-teal-600",
                  Dining: "from-rose-500 to-pink-600",
                  Car: "from-slate-500 to-slate-700",
                };
                const accentBg = accentGradients[doc.category] ?? "from-indigo-500 to-indigo-700";

                return (
                  <button
                    key={doc.id}
                    onClick={() => openDetail(doc)}
                    className="w-full text-left bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 flex active:scale-[0.98] transition-transform"
                  >
                    {/* Left accent strip with emoji */}
                    <div className={`w-14 flex-none bg-gradient-to-b ${accentBg} flex flex-col items-center justify-center gap-1`}>
                      <span className="text-xl">{doc.emoji}</span>
                      <p className="text-[9px] font-bold text-white/70 uppercase tracking-wider px-1 text-center leading-tight">{doc.category}</p>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 px-4 py-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 text-sm leading-tight truncate">{doc.name}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{doc.date || doc.provider || "—"}</p>
                        </div>
                        <div className="flex-none mt-0.5">
                          <StatusPill status={doc.status} />
                        </div>
                      </div>
                      {doc.confirmation && (
                        <div className="mt-2 flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 font-medium">Conf:</span>
                          <span className="text-[11px] font-black text-slate-700 font-mono tracking-wide">{doc.confirmation}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center pr-3 text-slate-300">›</div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {filtered.length === 0 && !showAddForm && (
          <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
            <span className="text-4xl">📭</span>
            <p className="text-sm font-medium">No documents yet</p>
            <p className="text-xs text-slate-300">Add your flights, hotel, and bookings below</p>
          </div>
        )}

        {/* ── Add form ── */}
        {showAddForm ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-3 shadow-sm">
            <p className="text-sm font-black text-slate-900">Add reservation or document</p>

            <div className="flex gap-2">
              <div className="flex-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Category</p>
                <select value={newDoc.category} onChange={(e) => { const cat = e.target.value; setNewDoc({ ...newDoc, category: cat, emoji: CATEGORY_EMOJIS[cat] ?? "📄" }); }}
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-slate-900 bg-white"
                >
                  {CATEGORIES.slice(1).map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="w-20">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Emoji</p>
                <input type="text" value={newDoc.emoji} onChange={(e) => setNewDoc({ ...newDoc, emoji: e.target.value })}
                  className="w-full text-center text-xl border border-slate-200 rounded-xl px-2 py-2 outline-none focus:border-slate-900 bg-white"
                />
              </div>
            </div>

            {([
              { label: "Name *", key: "name" as const, placeholder: "e.g. LAX → OGG" },
              { label: "Provider", key: "provider" as const, placeholder: "e.g. American Airlines" },
              { label: "Confirmation #", key: "confirmation" as const, placeholder: "e.g. LSKUAS" },
              { label: "Date / Time", key: "date" as const, placeholder: "e.g. Jun 5 · 8:05 AM" },
              { label: "Notes", key: "notes" as const, placeholder: "Any extra details…" },
            ] as const).map(({ label, key, placeholder }) => (
              <div key={key}>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{label}</p>
                <input type="text" value={(newDoc[key] as string) ?? ""} onChange={(e) => setNewDoc({ ...newDoc, [key]: e.target.value })}
                  placeholder={placeholder} className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-slate-900 bg-white"
                />
              </div>
            ))}

            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Status</p>
              <div className="flex gap-2 flex-wrap">
                {(["confirmed", "pending", "completed"] as const).map((s) => (
                  <button key={s} onClick={() => setNewDoc({ ...newDoc, status: s })}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${newDoc.status === s ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-200"}`}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={addDoc} disabled={saving || !newDoc.name.trim()} className="flex-1 bg-slate-900 text-white font-bold py-3.5 rounded-2xl text-sm disabled:opacity-50">
                {saving ? "Adding…" : "Add to Docs"}
              </button>
              <button onClick={() => { setShowAddForm(false); setNewDoc({ ...BLANK_DOC }); }}
                className="px-4 text-sm font-semibold text-slate-400 border border-slate-200 rounded-2xl"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center justify-center gap-2 w-full border-2 border-dashed border-slate-200 rounded-2xl py-4 text-sm font-semibold text-slate-400 hover:border-slate-400 hover:text-slate-600 transition-colors bg-white"
          >
            <span className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center text-xs font-bold">+</span>
            Add reservation or document
          </button>
        )}
      </div>
    </div>
  );
}
