"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

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

// ── Seeded on first load ───────────────────────────────────────────────────
const SEED_DOCS: NewDoc[] = [
  { category: "Flights", name: "LAX → SEA", provider: "American Airlines", confirmation: "LSKUAS", date: "Jun 5 · 8:05 AM", status: "confirmed", notes: "AA271 · Departs LAX · Arrives Seattle 10:56am", emoji: "✈️", file_type: "booking" },
  { category: "Flights", name: "SEA → OGG", provider: "Alaska Airlines", confirmation: "AS9K2M", date: "Jun 5 · 12:45 PM", status: "confirmed", notes: "AS845 · Departs Seattle · Arrives Maui OGG 5:11pm", emoji: "✈️", file_type: "booking" },
  { category: "Flights", name: "OGG → LAX", provider: "Alaska Airlines", confirmation: "AS1R7P", date: "Jun 11 · 10:30 AM", status: "confirmed", notes: "Return flight · AS844 · Arrives LAX 6:45pm", emoji: "✈️", file_type: "booking" },
  { category: "Hotel", name: "Sheraton Maui Resort & Spa", provider: "Sheraton", confirmation: "SHR4892K", date: "Jun 5–11 · 6 nights", status: "confirmed", notes: "Ka'anapali Beach · Ocean view rooms · Check-in 3pm · Check-out noon", emoji: "🏨", file_type: "booking" },
  { category: "Car", name: "Intermediate SUV", provider: "Alamo", confirmation: "ALM77291", date: "Jun 5 · Airport pickup", status: "confirmed", notes: "Pick up OGG arrivals level · Return Jun 11 by 9am", emoji: "🚙", file_type: "booking" },
  { category: "Activities", name: "Haleakalā Sunrise", provider: "recreation.gov", confirmation: "HALE-2698", date: "Jun 10 · 2:30 AM departure", status: "confirmed", notes: "Timed entry reservation required · Summit 10,023 ft · Leave hotel at 2:30am", emoji: "🌋", file_type: "booking" },
  { category: "Activities", name: "Old Lahaina Luau", provider: "Old Lahaina Luau", confirmation: "OLL-45821", date: "Jun 9 · 5:45 PM", status: "confirmed", notes: "4 tickets · Front of house seating · Lei greeting included", emoji: "🌺", file_type: "booking" },
  { category: "Dining", name: "Mama's Fish House", provider: "OpenTable", confirmation: "OT-889231", date: "Jun 6 · 7:00 PM", status: "confirmed", notes: "Party of 4 · Oceanfront table requested · Dress code: resort casual", emoji: "🐟", file_type: "booking" },
];

// ── Add form shape ─────────────────────────────────────────────────────────
type AddForm = {
  category: string;
  emoji: string;
  // Flights
  origin: string;
  destination: string;
  airline: string;
  flightNumber: string;
  // Hotel / Car
  propertyName: string;
  dateFrom: string;   // ISO YYYY-MM-DD
  dateTo: string;     // ISO YYYY-MM-DD (checkout / return)
  // Activities / Dining / Car
  venueName: string;
  date: string;       // ISO YYYY-MM-DD
  time: string;       // HH:MM 24h
  // All
  provider: string;
  confirmation: string;
  notes: string;
  status: "confirmed" | "pending" | "completed";
};

const BLANK_ADD: AddForm = {
  category: "Flights", emoji: "✈️",
  origin: "", destination: "", airline: "", flightNumber: "",
  propertyName: "", dateFrom: "", dateTo: "",
  venueName: "", date: "", time: "",
  provider: "", confirmation: "", notes: "", status: "confirmed",
};

// ── Display helpers ────────────────────────────────────────────────────────
function fmtDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtTime(t: string): string {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

function buildDateString(form: AddForm): string {
  const { category } = form;
  if (category === "Flights") {
    const d = form.dateFrom ? fmtDate(form.dateFrom) : "";
    const t = form.time ? ` · ${fmtTime(form.time)}` : "";
    return d ? `${d}${t}` : "";
  }
  if (category === "Hotel") {
    if (!form.dateFrom) return "";
    const d1 = new Date(form.dateFrom + "T12:00:00");
    const d2 = form.dateTo ? new Date(form.dateTo + "T12:00:00") : null;
    if (d2 && d2 > d1) {
      const nights = Math.round((d2.getTime() - d1.getTime()) / 86_400_000);
      const day2 = d2.getDate();
      return `${fmtDate(form.dateFrom)}–${day2} · ${nights} night${nights !== 1 ? "s" : ""}`;
    }
    return fmtDate(form.dateFrom);
  }
  if (category === "Car") {
    if (!form.dateFrom) return "";
    const pickup = `${fmtDate(form.dateFrom)}${form.time ? ` · ${fmtTime(form.time)}` : ""}`;
    const ret = form.dateTo ? ` – return ${fmtDate(form.dateTo)}` : "";
    return `${pickup}${ret}`;
  }
  // Activities / Dining
  const d = form.date ? fmtDate(form.date) : "";
  const t = form.time ? ` · ${fmtTime(form.time)}` : "";
  return d ? `${d}${t}` : "";
}

function formToDoc(form: AddForm): NewDoc {
  let name = "";
  let provider = form.provider;

  if (form.category === "Flights") {
    name = [form.origin.trim().toUpperCase(), form.destination.trim().toUpperCase()]
      .filter(Boolean).join(" → ");
    if (!provider && form.airline) provider = form.airline;
  } else if (form.category === "Hotel") {
    name = form.propertyName.trim() || form.provider.trim();
  } else {
    name = form.venueName.trim();
  }

  return {
    category: form.category,
    name: name || "Untitled",
    provider,
    confirmation: form.confirmation.trim(),
    date: buildDateString(form),
    status: form.status,
    notes: form.notes.trim(),
    emoji: form.emoji,
    file_type: "booking",
  };
}

// Try to parse a stored date string back into date/time/dateTo for edit mode
function parseStoredDate(s: string): { date: string; time: string; dateTo: string } {
  const r = { date: "", time: "", dateTo: "" };
  if (!s) return r;
  const MONTHS: Record<string, number> = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  const mMatch = s.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d+)/);
  if (mMatch) {
    const month = MONTHS[mMatch[1]];
    const day = parseInt(mMatch[2]);
    r.date = new Date(2026, month, day).toISOString().slice(0, 10);
    const endDay = s.match(/[–-](\d+)/);
    if (endDay) r.dateTo = new Date(2026, month, parseInt(endDay[1])).toISOString().slice(0, 10);
    const tMatch = s.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (tMatch) {
      let h = parseInt(tMatch[1]);
      const m = parseInt(tMatch[2]);
      if (tMatch[3].toUpperCase() === "PM" && h !== 12) h += 12;
      if (tMatch[3].toUpperCase() === "AM" && h === 12) h = 0;
      r.time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
  }
  return r;
}

// Airport city names
const AIRPORT_CITIES: Record<string, string> = {
  LAX: "Los Angeles", OGG: "Maui", SEA: "Seattle", SFO: "San Francisco",
  JFK: "New York", ORD: "Chicago", HNL: "Honolulu", KOA: "Kona",
  DEN: "Denver", ATL: "Atlanta", LAS: "Las Vegas", PHX: "Phoenix",
  MIA: "Miami", BOS: "Boston", DFW: "Dallas", LHR: "London",
};

// Airline brand identities
const AIRLINE_BRANDS: Record<string, { bg: string; code: string; fullName: string }> = {
  "American Airlines":  { bg: "from-[#B60000] to-[#7A0000]", code: "AA", fullName: "American Airlines" },
  "Alaska Airlines":    { bg: "from-[#005DAA] to-[#003875]", code: "AS", fullName: "Alaska Airlines" },
  "Delta Air Lines":    { bg: "from-[#003366] to-[#001833]", code: "DL", fullName: "Delta Air Lines" },
  "United Airlines":    { bg: "from-[#002244] to-[#000F1F]", code: "UA", fullName: "United Airlines" },
  "Southwest Airlines": { bg: "from-[#304CB2] to-[#1D3080]", code: "WN", fullName: "Southwest Airlines" },
  "Hawaiian Airlines":  { bg: "from-[#7B3F9E] to-[#4A1070]", code: "HA", fullName: "Hawaiian Airlines" },
};

function getAirlineBrand(provider: string) {
  for (const [key, brand] of Object.entries(AIRLINE_BRANDS)) {
    if (provider?.toLowerCase().includes(key.split(" ")[0].toLowerCase())) return brand;
  }
  return { bg: "from-slate-700 to-slate-900", code: "✈", fullName: provider ?? "" };
}

function parseRoute(name: string) {
  const parts = (name ?? "").split("→").map((s) => s.trim()).filter(Boolean);
  return { origin: parts[0] ?? "", destination: parts[parts.length - 1] ?? "", hasRoute: parts.length >= 2 };
}

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

function StatusPill({ status }: { status: Doc["status"] }) {
  if (status === "confirmed")
    return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">● Confirmed</span>;
  if (status === "pending")
    return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">● Pending</span>;
  return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">● Done</span>;
}

// ── Input field component ──────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{label}</p>
      {children}
    </div>
  );
}

const inputCls = "w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-slate-900 bg-white";

// ── Category-specific add fields ───────────────────────────────────────────
function AddFields({ form, set }: { form: AddForm; set: (f: AddForm) => void }) {
  const upd = (patch: Partial<AddForm>) => set({ ...form, ...patch });

  if (form.category === "Flights") return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Field label="From">
          <input className={inputCls} placeholder="LAX" value={form.origin}
            onChange={(e) => upd({ origin: e.target.value.toUpperCase() })} maxLength={4} />
        </Field>
        <Field label="To">
          <input className={inputCls} placeholder="OGG" value={form.destination}
            onChange={(e) => upd({ destination: e.target.value.toUpperCase() })} maxLength={4} />
        </Field>
      </div>
      <Field label="Airline">
        <input className={inputCls} placeholder="e.g. Alaska Airlines" value={form.airline}
          onChange={(e) => upd({ airline: e.target.value })} />
      </Field>
      <Field label="Flight #">
        <input className={inputCls} placeholder="e.g. AS845" value={form.flightNumber}
          onChange={(e) => upd({ flightNumber: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Departure date">
          <input type="date" className={inputCls} value={form.dateFrom}
            onChange={(e) => upd({ dateFrom: e.target.value })} />
        </Field>
        <Field label="Departure time">
          <input type="time" className={inputCls} value={form.time}
            onChange={(e) => upd({ time: e.target.value })} />
        </Field>
      </div>
    </>
  );

  if (form.category === "Hotel") return (
    <>
      <Field label="Property name">
        <input className={inputCls} placeholder="e.g. Sheraton Maui Resort" value={form.propertyName}
          onChange={(e) => upd({ propertyName: e.target.value })} />
      </Field>
      <Field label="Provider / Booked via">
        <input className={inputCls} placeholder="e.g. Marriott, Expedia" value={form.provider}
          onChange={(e) => upd({ provider: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Check-in">
          <input type="date" className={inputCls} value={form.dateFrom}
            onChange={(e) => upd({ dateFrom: e.target.value })} />
        </Field>
        <Field label="Check-out">
          <input type="date" className={inputCls} value={form.dateTo}
            onChange={(e) => upd({ dateTo: e.target.value })} />
        </Field>
      </div>
    </>
  );

  if (form.category === "Car") return (
    <>
      <Field label="Rental company">
        <input className={inputCls} placeholder="e.g. Alamo, Hertz" value={form.provider}
          onChange={(e) => upd({ provider: e.target.value })} />
      </Field>
      <Field label="Vehicle type">
        <input className={inputCls} placeholder="e.g. Intermediate SUV" value={form.venueName}
          onChange={(e) => upd({ venueName: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Pick-up date">
          <input type="date" className={inputCls} value={form.dateFrom}
            onChange={(e) => upd({ dateFrom: e.target.value })} />
        </Field>
        <Field label="Return date">
          <input type="date" className={inputCls} value={form.dateTo}
            onChange={(e) => upd({ dateTo: e.target.value })} />
        </Field>
      </div>
      <Field label="Pick-up time">
        <input type="time" className={inputCls} value={form.time}
          onChange={(e) => upd({ time: e.target.value })} />
      </Field>
    </>
  );

  // Activities / Dining
  const label = form.category === "Dining" ? "Restaurant name" : "Activity name";
  const placeholder = form.category === "Dining" ? "e.g. Mama's Fish House" : "e.g. Haleakalā Sunrise";
  return (
    <>
      <Field label={label}>
        <input className={inputCls} placeholder={placeholder} value={form.venueName}
          onChange={(e) => upd({ venueName: e.target.value })} />
      </Field>
      <Field label="Provider / Booked via">
        <input className={inputCls} placeholder="e.g. OpenTable, recreation.gov" value={form.provider}
          onChange={(e) => upd({ provider: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date">
          <input type="date" className={inputCls} value={form.date}
            onChange={(e) => upd({ date: e.target.value })} />
        </Field>
        <Field label="Time">
          <input type="time" className={inputCls} value={form.time}
            onChange={(e) => upd({ time: e.target.value })} />
        </Field>
      </div>
    </>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function VaultPage() {
  const { user } = useAuth();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("All");

  // Detail / edit sheet
  const [detailDoc, setDetailDoc] = useState<Doc | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFields, setEditFields] = useState<Partial<Doc>>({});
  const [editDate, setEditDate] = useState("");   // ISO
  const [editTime, setEditTime] = useState("");   // HH:MM
  const [editDateTo, setEditDateTo] = useState(""); // ISO
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Add sheet
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [addForm, setAddForm] = useState<AddForm>({ ...BLANK_ADD });
  const [addError, setAddError] = useState<string | null>(null);

  // File upload
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadingDocId = useRef<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("documents").select("*").eq("trip_id", TRIP_ID)
        .order("created_at", { ascending: true });
      if (error) { setError(error.message); setLoading(false); return; }
      if (!data || data.length === 0) {
        const uid = (await supabase.auth.getUser()).data.user?.id;
        const { data: seeded, error: seedError } = await supabase
          .from("documents")
          .insert(SEED_DOCS.map((d) => ({ ...d, trip_id: TRIP_ID, ...(uid ? { user_id: uid } : {}) })))
          .select();
        if (seedError) setError(seedError.message);
        else if (seeded) setDocs(seeded as Doc[]);
      } else {
        setDocs(data as Doc[]);
      }
      setLoading(false);
    })();
  }, []);

  // ── Sheet helpers ──────────────────────────────────────────────────────
  function openDetail(doc: Doc) { setDetailDoc(doc); setIsEditing(false); setDeleteConfirm(false); setSaveError(null); }
  function closeSheet() { setDetailDoc(null); setIsEditing(false); setDeleteConfirm(false); setSaveError(null); }
  function startEdit() {
    if (!detailDoc) return;
    const parsed = parseStoredDate(detailDoc.date ?? "");
    setEditFields({ ...detailDoc });
    setEditDate(parsed.date);
    setEditTime(parsed.time);
    setEditDateTo(parsed.dateTo);
    setIsEditing(true);
    setSaveError(null);
  }

  // ── Supabase actions ───────────────────────────────────────────────────
  async function copyConfirmation(confirmation: string, id: string) {
    await navigator.clipboard.writeText(confirmation);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function saveEdit() {
    if (!detailDoc) return;
    setSaving(true);
    setSaveError(null);

    // Build date string from pickers if user touched them
    const newDate = editDate
      ? (() => {
          const base = fmtDate(editDate);
          const t = editTime ? ` · ${fmtTime(editTime)}` : "";
          const end = editDateTo && editDateTo !== editDate
            ? (() => {
                const d2 = new Date(editDateTo + "T12:00:00");
                const nights = Math.round((d2.getTime() - new Date(editDate + "T12:00:00").getTime()) / 86_400_000);
                return detailDoc.category === "Hotel"
                  ? `–${d2.getDate()} · ${nights} night${nights !== 1 ? "s" : ""}`
                  : ` – ${fmtDate(editDateTo)}`;
              })()
            : "";
          return `${base}${end || t}`;
        })()
      : (editFields.date ?? detailDoc.date);

    const payload = {
      ...editFields,
      date: newDate,
      ...(user?.id ? { user_id: user.id } : {}),
    };
    const { error } = await supabase.from("documents").update(payload).eq("id", detailDoc.id);
    if (error) { setSaveError(error.message); setSaving(false); return; }
    const updated = { ...detailDoc, ...payload } as Doc;
    setDocs((prev) => prev.map((d) => d.id === detailDoc.id ? updated : d));
    setDetailDoc(updated);
    setIsEditing(false);
    setSaving(false);
  }

  async function deleteDoc() {
    if (!detailDoc) return;
    setSaving(true);
    const { error } = await supabase.from("documents").delete().eq("id", detailDoc.id);
    if (error) { setSaveError(error.message); setSaving(false); return; }
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
    // Validate: need at least one meaningful name field
    const nameValue = addForm.category === "Flights"
      ? addForm.origin || addForm.destination
      : addForm.category === "Hotel"
      ? addForm.propertyName || addForm.provider
      : addForm.venueName;
    if (!nameValue?.trim()) return;

    setAddError(null);
    setSaving(true);
    const docPayload = formToDoc(addForm);

    // Augment notes with flight number if provided
    if (addForm.category === "Flights" && addForm.flightNumber) {
      docPayload.notes = [addForm.flightNumber, docPayload.notes].filter(Boolean).join(" · ");
    }

    const { data, error } = await supabase
      .from("documents")
      .insert({ ...docPayload, trip_id: TRIP_ID, ...(user?.id ? { user_id: user.id } : {}) })
      .select()
      .single();

    setSaving(false);

    if (error) {
      setAddError(error.message);
      return;
    }

    if (data) {
      setDocs((prev) => [...prev, data as Doc]);
      setShowAddSheet(false);
      setAddForm({ ...BLANK_ADD });
      setAddError(null);
      openDetail(data as Doc);
    }
  }

  function openAddSheet() {
    setAddForm({ ...BLANK_ADD });
    setAddError(null);
    setShowAddSheet(true);
  }

  // ── Derived ────────────────────────────────────────────────────────────
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

      {/* ════════════════════════════════════════
          ADD SHEET
      ════════════════════════════════════════ */}
      <div className={`fixed inset-0 z-[60] flex flex-col justify-end max-w-md mx-auto transition-opacity duration-200 ${showAddSheet ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddSheet(false)} />
        <div className={`relative bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out flex flex-col ${showAddSheet ? "translate-y-0" : "translate-y-full"}`}
          style={{ maxHeight: "calc(100dvh - 72px)" }}>

          <div className="flex justify-center pt-3 pb-1 flex-none"><div className="w-10 h-1 bg-slate-200 rounded-full" /></div>

          {/* Header */}
          <div className="px-5 pt-2 pb-3 border-b border-slate-100 flex-none">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900">Add reservation</h3>
              <button onClick={() => setShowAddSheet(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-sm font-bold">✕</button>
            </div>
            {/* Category pills */}
            <div className="flex gap-1.5 mt-3 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
              {CATEGORIES.slice(1).map((cat) => (
                <button key={cat}
                  onClick={() => setAddForm({ ...BLANK_ADD, category: cat, emoji: CATEGORY_EMOJIS[cat] ?? "📄" })}
                  className={`flex-none flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full transition-all ${
                    addForm.category === cat ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <span>{CATEGORY_EMOJIS[cat]}</span> {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable fields */}
          <div className="flex-1 min-h-0 overflow-y-auto px-5 pt-4 pb-2">
            <div className="flex flex-col gap-3.5 pb-4">
              <AddFields form={addForm} set={setAddForm} />

              <Field label="Confirmation #">
                <input className={inputCls} placeholder="e.g. LSKUAS" value={addForm.confirmation}
                  onChange={(e) => setAddForm({ ...addForm, confirmation: e.target.value })} />
              </Field>

              <Field label="Notes">
                <textarea className={`${inputCls} resize-none`} rows={2}
                  placeholder="Any extra details, tips, reminders…" value={addForm.notes}
                  onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })} />
              </Field>

              <Field label="Status">
                <div className="flex gap-2">
                  {(["confirmed", "pending", "completed"] as const).map((s) => (
                    <button key={s}
                      onClick={() => setAddForm({ ...addForm, status: s })}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                        addForm.status === s ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-200"
                      }`}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </Field>

              {addError && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                  <p className="text-xs font-semibold text-red-700">⚠ {addError}</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex-none px-5 pt-3 border-t border-slate-100 flex gap-3"
            style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom, 24px))" }}>
            <button onClick={() => setShowAddSheet(false)}
              className="px-5 py-3.5 text-sm font-semibold text-slate-400 border border-slate-200 rounded-2xl">
              Cancel
            </button>
            <button onClick={addDoc} disabled={saving}
              className="flex-1 bg-slate-900 text-white font-bold py-3.5 rounded-2xl text-sm disabled:opacity-50">
              {saving ? "Saving…" : "Add to Docs"}
            </button>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════
          DETAIL / EDIT SHEET
      ════════════════════════════════════════ */}
      <div className={`fixed inset-0 z-50 flex flex-col justify-end max-w-md mx-auto transition-opacity duration-200 ${detailDoc ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeSheet} />
        <div className={`relative bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out max-h-[90vh] flex flex-col ${detailDoc ? "translate-y-0" : "translate-y-full"}`}>

          <div className="flex justify-center pt-3 pb-1 flex-none"><div className="w-10 h-1 bg-slate-200 rounded-full" /></div>

          {/* Category-aware header card */}
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

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 pb-2">
            {detailDoc && (isEditing ? (
              /* ── Edit mode ── */
              <div className="flex flex-col gap-3.5 pb-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Edit details</p>

                <Field label="Name / Route">
                  <input type="text" value={(editFields.name as string) ?? ""}
                    onChange={(e) => setEditFields({ ...editFields, name: e.target.value })}
                    placeholder={detailDoc.category === "Flights" ? "e.g. LAX → OGG" : ""}
                    className={inputCls} />
                </Field>

                <Field label="Provider">
                  <input type="text" value={(editFields.provider as string) ?? ""}
                    onChange={(e) => setEditFields({ ...editFields, provider: e.target.value })}
                    className={inputCls} />
                </Field>

                <Field label="Confirmation #">
                  <input type="text" value={(editFields.confirmation as string) ?? ""}
                    onChange={(e) => setEditFields({ ...editFields, confirmation: e.target.value })}
                    className={inputCls} />
                </Field>

                {/* Structured date/time */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 flex flex-col gap-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date & time</p>
                  {detailDoc.category === "Hotel" ? (
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Check-in">
                        <input type="date" className={inputCls} value={editDate}
                          onChange={(e) => setEditDate(e.target.value)} />
                      </Field>
                      <Field label="Check-out">
                        <input type="date" className={inputCls} value={editDateTo}
                          onChange={(e) => setEditDateTo(e.target.value)} />
                      </Field>
                    </div>
                  ) : detailDoc.category === "Car" ? (
                    <div className="flex flex-col gap-3">
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Pick-up">
                          <input type="date" className={inputCls} value={editDate}
                            onChange={(e) => setEditDate(e.target.value)} />
                        </Field>
                        <Field label="Return">
                          <input type="date" className={inputCls} value={editDateTo}
                            onChange={(e) => setEditDateTo(e.target.value)} />
                        </Field>
                      </div>
                      <Field label="Time">
                        <input type="time" className={inputCls} value={editTime}
                          onChange={(e) => setEditTime(e.target.value)} />
                      </Field>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Date">
                        <input type="date" className={inputCls} value={editDate}
                          onChange={(e) => setEditDate(e.target.value)} />
                      </Field>
                      <Field label="Time">
                        <input type="time" className={inputCls} value={editTime}
                          onChange={(e) => setEditTime(e.target.value)} />
                      </Field>
                    </div>
                  )}
                </div>

                <Field label="Notes">
                  <textarea value={(editFields.notes as string) ?? ""}
                    onChange={(e) => setEditFields({ ...editFields, notes: e.target.value })}
                    rows={2} className={`${inputCls} resize-none`} placeholder="Any extra details…" />
                </Field>

                <Field label="Status">
                  <div className="flex gap-2">
                    {(["confirmed", "pending", "completed"] as const).map((s) => (
                      <button key={s} onClick={() => setEditFields({ ...editFields, status: s })}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${editFields.status === s ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-200"}`}
                      >{s.charAt(0).toUpperCase() + s.slice(1)}</button>
                    ))}
                  </div>
                </Field>

                {saveError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                    <p className="text-xs font-semibold text-red-700">⚠ {saveError}</p>
                  </div>
                )}
              </div>
            ) : (
              /* ── View mode ── */
              <div className="flex flex-col gap-4 pb-4">

                {/* Confirmation — the star */}
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
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                        {detailDoc.category === "Hotel" ? "Stay" : "Date & Time"}
                      </p>
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

                {/* Attachment */}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Attachment</p>
                  {detailDoc.file_url ? (
                    <a href={detailDoc.file_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 bg-sky-50 border border-sky-100 rounded-xl px-4 py-3">
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
                      <button onClick={deleteDoc} disabled={saving}
                        className="flex-1 bg-red-500 text-white text-sm font-bold py-2.5 rounded-xl disabled:opacity-50">
                        {saving ? "Deleting…" : "Yes, delete"}
                      </button>
                      <button onClick={() => setDeleteConfirm(false)}
                        className="px-4 text-sm font-semibold text-slate-500 border border-slate-200 rounded-xl">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Action bar */}
          <div className="flex-none px-5 pt-3 border-t border-slate-100 flex gap-3"
            style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom, 24px))" }}>
            {isEditing ? (
              <>
                <button onClick={() => { setIsEditing(false); setSaveError(null); }}
                  className="px-4 py-3 text-sm font-semibold text-slate-400 border border-slate-200 rounded-2xl">Cancel</button>
                <button onClick={saveEdit} disabled={saving}
                  className="flex-1 bg-slate-900 text-white font-bold py-3.5 rounded-2xl text-sm disabled:opacity-50">
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </>
            ) : (
              <>
                {!deleteConfirm && (
                  <button onClick={() => setDeleteConfirm(true)}
                    className="px-4 py-3 text-sm font-bold text-red-400 border border-red-100 rounded-2xl hover:bg-red-50 transition-colors">
                    Delete
                  </button>
                )}
                <button onClick={startEdit}
                  className="flex-1 bg-slate-900 text-white font-bold py-3.5 rounded-2xl text-sm">
                  Edit Details
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════
          HERO HEADER
      ════════════════════════════════════════ */}
      <div className="relative h-52 w-full overflow-hidden flex-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=500&fit=crop&q=85"
          alt="Maui" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
        <div className="absolute top-4 left-4">
          <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Maui Family Trip · Jun 5–11</p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-5">
          <div className="flex items-end justify-between mb-3">
            <h1 className="text-2xl font-black text-white">Docs & Reservations</h1>
            <button onClick={openAddSheet}
              className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm border border-white/30 text-white text-xs font-bold px-3 py-2 rounded-full">
              + Add
            </button>
          </div>
          {docs.length > 0 && (
            <div className="mb-2">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Trip readiness</span>
                <span className="text-[10px] font-bold text-white/80">{Math.round((confirmedCount / docs.length) * 100)}%</span>
              </div>
              <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full transition-all duration-700"
                  style={{ width: `${(confirmedCount / docs.length) * 100}%` }} />
              </div>
            </div>
          )}
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
              <span className="text-xs font-bold text-white">{docs.length} docs</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Category filter ── */}
      <div className="bg-white border-b border-slate-100 flex-none">
        <div className="flex overflow-x-auto px-3 gap-1 py-2" style={{ scrollbarWidth: "none" }}>
          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat;
            const count = cat === "All" ? docs.length : docs.filter(d => d.category === cat).length;
            return (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={`flex-none flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-full whitespace-nowrap transition-all ${
                  active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {cat !== "All" && <span className="text-sm">{CATEGORY_EMOJIS[cat]}</span>}
                {cat}
                {count > 0 && <span className={`text-[10px] font-black ${active ? "text-white/60" : "text-slate-400"}`}>{count}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Quick Access strip ── */}
      {docs.length > 0 && (() => {
        const quickDocs = docs.filter((d) => d.status === "confirmed")
          .sort((a, b) => { const order = ["Flights","Hotel","Car","Activities","Dining"]; return order.indexOf(a.category) - order.indexOf(b.category); })
          .slice(0, 4);
        if (!quickDocs.length) return null;
        return (
          <div className="px-4 pt-4 pb-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Quick Access</p>
            <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {quickDocs.map((doc) => {
                const brand = doc.category === "Flights" ? getAirlineBrand(doc.provider ?? "") : null;
                const gradFrom = brand?.bg.split(" ")[0].replace("from-[","").replace("]","") ?? "";
                const gradTo = brand?.bg.split(" ")[1].replace("to-[","").replace("]","") ?? "";
                return (
                  <button key={doc.id} onClick={() => openDetail(doc)}
                    className={`flex-none flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border text-left active:scale-[0.97] transition-transform ${
                      doc.category === "Flights" ? "text-white border-transparent" : "bg-white border-slate-100 shadow-sm"
                    }`}
                    style={doc.category === "Flights" && gradFrom ? { background: `linear-gradient(135deg, ${gradFrom} 0%, ${gradTo} 100%)` } : {}}
                  >
                    <span className="text-xl flex-none">{doc.category === "Flights" ? brand?.code ?? "✈️" : CATEGORY_EMOJIS[doc.category] ?? doc.emoji}</span>
                    <div className="min-w-0">
                      <p className={`text-[11px] font-bold truncate max-w-[90px] ${doc.category === "Flights" ? "text-white" : "text-slate-900"}`}>
                        {doc.name.split("→").map(s => s.trim()).join(" → ")}
                      </p>
                      <p className={`text-[9px] font-semibold mt-0.5 truncate max-w-[90px] ${doc.category === "Flights" ? "text-white/60" : "text-slate-400"}`}>
                        {doc.confirmation || doc.date}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ════════════════════════════════════════
          DOC CARDS
      ════════════════════════════════════════ */}
      <div className="flex flex-col gap-6 px-4 pt-5 pb-8">
        {Object.entries(grouped).map(([cat, items]) => (
          <div key={cat}>
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
                    <button key={doc.id} onClick={() => openDetail(doc)}
                      className={`w-full text-left rounded-2xl overflow-hidden shadow-lg bg-gradient-to-br ${brand.bg} active:scale-[0.98] transition-transform`}>
                      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                            <span className="text-white text-xs font-black">{brand.code}</span>
                          </div>
                          <span className="text-[11px] font-bold text-white/70 tracking-wide">{brand.fullName.toUpperCase()}</span>
                        </div>
                        <StatusPill status={doc.status} />
                      </div>
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
                        <div className="px-5 pb-4"><p className="text-xl font-black text-white">{doc.name}</p></div>
                      )}
                      <div className="mx-4 border-t border-dashed border-white/20" />
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
                    <button key={doc.id} onClick={() => openDetail(doc)}
                      className="w-full text-left rounded-2xl overflow-hidden shadow-lg bg-white active:scale-[0.98] transition-transform">
                      <div className="relative h-36 w-full overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={hotelPhoto(doc.provider ?? "", doc.name ?? "")} alt={doc.name || "Hotel"} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                        <div className="absolute top-3 right-3"><StatusPill status={doc.status} /></div>
                        <div className="absolute bottom-0 left-0 right-0 px-4 pb-3">
                          <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">{doc.provider}</p>
                          <p className="text-lg font-black text-white leading-tight">{doc.name || doc.provider}</p>
                        </div>
                      </div>
                      <div className="px-4 py-3.5 flex items-center justify-between border-t border-slate-100">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stay</p>
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
                  <button key={doc.id} onClick={() => openDetail(doc)}
                    className="w-full text-left bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 flex active:scale-[0.98] transition-transform">
                    <div className={`w-14 flex-none bg-gradient-to-b ${accentBg} flex flex-col items-center justify-center gap-1`}>
                      <span className="text-xl">{doc.emoji}</span>
                      <p className="text-[9px] font-bold text-white/70 uppercase tracking-wider px-1 text-center leading-tight">{doc.category}</p>
                    </div>
                    <div className="flex-1 min-w-0 px-4 py-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 text-sm leading-tight truncate">{doc.name}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{doc.date || doc.provider || "—"}</p>
                        </div>
                        <div className="flex-none mt-0.5"><StatusPill status={doc.status} /></div>
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

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
            <span className="text-4xl">📭</span>
            <p className="text-sm font-medium">No documents yet</p>
            <p className="text-xs text-slate-300">
              {activeCategory === "All" ? "Add your flights, hotel, and bookings below" : `No ${activeCategory.toLowerCase()} added yet`}
            </p>
          </div>
        )}

        {/* Add CTA */}
        <button onClick={openAddSheet}
          className="flex items-center gap-3 w-full bg-white border border-slate-100 rounded-2xl px-4 py-4 text-left shadow-sm hover:shadow-md transition-shadow group">
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-lg flex-none group-hover:bg-sky-600 transition-colors">
            <span className="text-white font-black text-base">+</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-900">Add reservation or document</p>
            <p className="text-xs text-slate-400 mt-0.5">Flights, hotel, activities, dining</p>
          </div>
          <span className="text-slate-300 text-lg group-hover:text-slate-500 transition-colors">→</span>
        </button>
      </div>
    </div>
  );
}
