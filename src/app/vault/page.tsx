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

export default function VaultPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("All");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<Partial<Doc>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDoc, setNewDoc] = useState<NewDoc>({ ...BLANK_DOC });
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadingDocId = useRef<string | null>(null);

  useEffect(() => {
    fetchDocs();
  }, []);

  async function fetchDocs() {
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("trip_id", TRIP_ID)
      .order("created_at", { ascending: true });
    if (error) setError(error.message);
    else setDocs(data as Doc[]);
    setLoading(false);
  }

  async function copyConfirmation(doc: Doc) {
    await navigator.clipboard.writeText(doc.confirmation);
    setCopiedId(doc.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function startEdit(doc: Doc) {
    setEditingId(doc.id);
    setEditFields({ ...doc });
  }

  async function saveEdit(id: string) {
    setSaving(true);
    await supabase.from("documents").update(editFields).eq("id", id);
    setDocs((prev) => prev.map((d) => d.id === id ? { ...d, ...editFields } as Doc : d));
    setEditingId(null);
    setSaving(false);
  }

  async function deleteDoc(id: string) {
    await supabase.from("documents").delete().eq("id", id);
    setDocs((prev) => prev.filter((d) => d.id !== id));
    setExpanded(null);
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
      setExpanded(data.id);
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
      <p className="text-sm text-slate-400">Loading docs…</p>
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
    <div className="flex flex-col bg-white">

      {/* Hidden file input for uploads */}
      <input type="file" accept="image/*,.pdf" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />

      {/* ── Header ── */}
      <div className="px-4 pt-5 pb-4 border-b border-slate-100">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-0.5">Maui Family Trip</p>
        <h1 className="text-2xl font-bold text-slate-900">Docs & Reservations</h1>
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
            <p className="text-xl font-black text-slate-900">{docs.length}</p>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Total</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 px-4 pt-4 pb-6">

        {/* ── Category filter ── */}
        <div className="flex gap-1 border-b border-slate-100 -mx-4 px-4 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat;
            return (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={`flex-none flex items-center gap-1.5 text-xs font-semibold pb-2.5 pt-1 px-2 whitespace-nowrap border-b-2 transition-all ${
                  active ? "border-slate-900 text-slate-900" : "border-transparent text-slate-400"
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
                const isEditing = editingId === doc.id;
                const accentColor = doc.status === "confirmed" ? "bg-emerald-400" : doc.status === "pending" ? "bg-amber-400" : "bg-slate-200";

                return (
                  <div key={doc.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    {/* Row */}
                    <button onClick={() => { setExpanded(isOpen ? null : doc.id); setEditingId(null); }}
                      className="w-full text-left flex items-stretch"
                    >
                      <div className={`w-1 ${accentColor} flex-none rounded-l-2xl`} />
                      <div className="flex-1 flex items-center gap-3 px-4 py-3.5">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-xl flex-none">
                          {doc.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold text-sm truncate ${doc.status === "completed" ? "text-slate-400" : "text-slate-900"}`}>
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
                            {doc.status === "confirmed" ? "Confirmed" : doc.status === "pending" ? "⏳ Pending" : "Done"}
                          </span>
                          <span className="text-[10px] text-slate-300">{isOpen ? "▲" : "▼"}</span>
                        </div>
                      </div>
                    </button>

                    {/* Expanded — view or edit */}
                    {isOpen && (
                      <div className="border-t border-slate-100 px-5 py-4 flex flex-col gap-4">
                        {isEditing ? (
                          /* ── Edit mode ── */
                          <div className="flex flex-col gap-3">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Edit details</p>

                            {[
                              { label: "Name", key: "name" as const, placeholder: "e.g. LAX → OGG" },
                              { label: "Provider", key: "provider" as const, placeholder: "e.g. American Airlines" },
                              { label: "Confirmation #", key: "confirmation" as const, placeholder: "e.g. LSKUAS" },
                              { label: "Date / Time", key: "date" as const, placeholder: "e.g. Jun 5 · 8:53 AM" },
                              { label: "Notes", key: "notes" as const, placeholder: "Any extra info…" },
                            ].map(({ label, key, placeholder }) => (
                              <div key={key}>
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                                <input
                                  type="text"
                                  value={(editFields[key] as string) ?? ""}
                                  onChange={(e) => setEditFields({ ...editFields, [key]: e.target.value })}
                                  placeholder={placeholder}
                                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-slate-900 bg-white"
                                />
                              </div>
                            ))}

                            <div>
                              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Status</p>
                              <div className="flex gap-2">
                                {(["confirmed", "pending", "completed"] as const).map((s) => (
                                  <button key={s} onClick={() => setEditFields({ ...editFields, status: s })}
                                    className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                                      editFields.status === s ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-200"
                                    }`}
                                  >
                                    {s.charAt(0).toUpperCase() + s.slice(1)}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="flex gap-2 pt-1">
                              <button onClick={() => saveEdit(doc.id)} disabled={saving}
                                className="flex-1 bg-slate-900 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-50"
                              >
                                {saving ? "Saving…" : "Save changes"}
                              </button>
                              <button onClick={() => setEditingId(null)}
                                className="px-4 text-sm font-semibold text-slate-400 border border-slate-200 rounded-xl"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* ── View mode ── */
                          <>
                            {/* Confirmation # */}
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Confirmation #</p>
                                <p className="text-base font-black text-slate-900 font-mono tracking-wide">{doc.confirmation || "—"}</p>
                              </div>
                              {doc.confirmation && (
                                <button onClick={() => copyConfirmation(doc)}
                                  className={`text-xs font-bold px-4 py-2 rounded-xl border-2 transition-all ${
                                    copiedId === doc.id ? "bg-emerald-500 text-white border-emerald-500" : "border-slate-900 text-slate-900"
                                  }`}
                                >
                                  {copiedId === doc.id ? "✓ Copied!" : "Copy"}
                                </button>
                              )}
                            </div>

                            {/* Provider */}
                            {doc.provider && (
                              <div>
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Provider</p>
                                <p className="text-sm text-slate-700">{doc.provider}</p>
                              </div>
                            )}

                            {/* Notes */}
                            {doc.notes && (
                              <div>
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Notes</p>
                                <p className="text-sm text-slate-600 leading-relaxed">{doc.notes}</p>
                              </div>
                            )}

                            {/* File section */}
                            <div>
                              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Attachment</p>
                              {doc.file_url ? (
                                <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                                  className="flex items-center gap-2 bg-sky-50 border border-sky-100 rounded-xl px-3 py-2.5"
                                >
                                  <span className="text-lg">{doc.file_type === "pdf" ? "📄" : "🖼️"}</span>
                                  <span className="text-xs font-bold text-sky-700 flex-1">View {doc.file_type === "pdf" ? "PDF" : "file"}</span>
                                  <span className="text-xs text-sky-400">↗</span>
                                </a>
                              ) : (
                                <button
                                  onClick={() => {
                                    uploadingDocId.current = doc.id;
                                    fileInputRef.current?.click();
                                  }}
                                  disabled={uploadingId === doc.id}
                                  className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl py-3 text-xs font-semibold text-slate-400 hover:border-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
                                >
                                  {uploadingId === doc.id ? (
                                    <><div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" /> Uploading…</>
                                  ) : (
                                    <>📎 Attach PDF or screenshot</>
                                  )}
                                </button>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                              <button onClick={() => startEdit(doc)}
                                className="flex-1 bg-slate-900 text-white text-xs font-bold py-3 rounded-xl"
                              >
                                Edit
                              </button>
                              <button onClick={() => deleteDoc(doc.id)}
                                className="px-4 bg-red-50 border border-red-200 text-red-500 text-xs font-bold py-3 rounded-xl"
                              >
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* ── Add document form or button ── */}
        {showAddForm ? (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col gap-3">
            <p className="text-sm font-black text-slate-900">Add reservation or document</p>

            {/* Category + Emoji row */}
            <div className="flex gap-2">
              <div className="flex-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Category</p>
                <select
                  value={newDoc.category}
                  onChange={(e) => {
                    const cat = e.target.value;
                    setNewDoc({ ...newDoc, category: cat, emoji: CATEGORY_EMOJIS[cat] ?? "📄" });
                  }}
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-slate-900 bg-white"
                >
                  {CATEGORIES.slice(1).map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="w-20">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Emoji</p>
                <input
                  type="text"
                  value={newDoc.emoji}
                  onChange={(e) => setNewDoc({ ...newDoc, emoji: e.target.value })}
                  className="w-full text-center text-xl border border-slate-200 rounded-xl px-2 py-2 outline-none focus:border-slate-900 bg-white"
                />
              </div>
            </div>

            {[
              { label: "Name *", key: "name" as const, placeholder: "e.g. LAX → OGG", required: true },
              { label: "Provider", key: "provider" as const, placeholder: "e.g. American Airlines" },
              { label: "Confirmation #", key: "confirmation" as const, placeholder: "e.g. LSKUAS" },
              { label: "Date / Time", key: "date" as const, placeholder: "e.g. Jun 5 · 8:53 AM" },
              { label: "Notes", key: "notes" as const, placeholder: "Any extra details…" },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{label}</p>
                <input
                  type="text"
                  value={(newDoc[key] as string) ?? ""}
                  onChange={(e) => setNewDoc({ ...newDoc, [key]: e.target.value })}
                  placeholder={placeholder}
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-slate-900 bg-white"
                />
              </div>
            ))}

            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Status</p>
              <div className="flex gap-2 flex-wrap">
                {(["confirmed", "pending", "completed"] as const).map((s) => (
                  <button key={s} onClick={() => setNewDoc({ ...newDoc, status: s })}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                      newDoc.status === s ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-200"
                    }`}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={addDoc} disabled={saving || !newDoc.name.trim()}
                className="flex-1 bg-slate-900 text-white font-bold py-3.5 rounded-2xl text-sm disabled:opacity-50"
              >
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
            className="flex items-center justify-center gap-2 w-full border-2 border-dashed border-slate-200 rounded-2xl py-4 text-sm font-semibold text-slate-400 hover:border-slate-400 hover:text-slate-600 transition-colors"
          >
            <span className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center text-xs leading-none font-bold">+</span>
            Add reservation or document
          </button>
        )}

      </div>
    </div>
  );
}
