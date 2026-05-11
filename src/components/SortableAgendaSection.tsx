"use client";

import React from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  UniqueIdentifier,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ── Types (mirrors page.tsx Item) ────────────────────────────────────────────
export type AgendaItem = {
  id: string;
  time: string;
  title: string;
  emoji: string;
  done: boolean;
  notes: string;
  reservation?: boolean;
  photo?: string;
  photoAlt?: string;
  fromSupabase?: boolean;
};

export type Section = {
  key: string;
  label: string;
  emoji: string;
  range: string;
  defaultTime: string;
  items: AgendaItem[];
};

// ── Helper ────────────────────────────────────────────────────────────────────
function timeToMinutes(t: string): number {
  if (!t || t === "TBD" || t === "tbd") return -1;
  const [time, mer] = t.split(" ");
  const parts = time.split(":").map(Number);
  let h = parts[0];
  const m = parts[1] ?? 0;
  if (isNaN(h) || isNaN(m)) return -1;
  if (mer === "PM" && h !== 12) h += 12;
  if (mer === "AM" && h === 12) h = 0;
  return h * 60 + m;
}

function formatGap(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h} hr ${m} min` : `${h} hr`;
}

// ── Maui place lookup (drive time + coords from Sheraton Ka'anapali) ──────────
const SHERATON = { lat: 20.9236, lng: -156.6941 };

const MAUI_PLACES: { keywords: string[]; driveMin: number; lat: number; lng: number }[] = [
  { keywords: ["molokini"],                  driveMin: 45, lat: 20.6317, lng: -156.4969 },
  { keywords: ["mama's fish", "mamas fish"], driveMin: 35, lat: 20.9394, lng: -156.3153 },
  { keywords: ["twin falls", "road to hana", "hana"],
                                             driveMin: 90, lat: 20.8980, lng: -156.2497 },
  { keywords: ["wai'anapanapa", "black sand"],driveMin:120, lat: 20.7617, lng: -156.0001 },
  { keywords: ["haleakala", "haleakalā"],    driveMin: 75, lat: 20.7097, lng: -156.2535 },
  { keywords: ["paia", "pāia"],              driveMin: 40, lat: 20.9158, lng: -156.3695 },
  { keywords: ["old lahaina luau", "luau"],  driveMin: 10, lat: 20.8786, lng: -156.6794 },
  { keywords: ["upcountry", "kula", "surfing goat"], driveMin: 55, lat: 20.7603, lng: -156.3317 },
  { keywords: ["kapalua"],                   driveMin:  8, lat: 20.9989, lng: -156.6703 },
  { keywords: ["monkeypod"],                 driveMin:  4, lat: 20.8896, lng: -156.6616 },
  { keywords: ["maui ocean center"],         driveMin: 20, lat: 20.7931, lng: -156.5017 },
  { keywords: ["ululani"],                   driveMin:  5, lat: 20.9158, lng: -156.6758 },
  { keywords: ["andaz", "wailea"],           driveMin: 30, lat: 20.6913, lng: -156.4427 },
  { keywords: ["down the hatch", "lahaina"], driveMin: 14, lat: 20.8786, lng: -156.6794 },
  { keywords: ["ka'anapali beach", "kaanapali beach"], driveMin: 2, lat: 20.9244, lng: -156.6927 },
  { keywords: ["sheraton"],                  driveMin:  0, lat: 20.9236, lng: -156.6941 },
  { keywords: ["airport", "ogg", "kahului"], driveMin: 25, lat: 20.8986, lng: -156.4305 },
];

function getMapsInfo(title: string): { driveMin: number; mapsUrl: string } | null {
  const lower = title.toLowerCase();
  const match = MAUI_PLACES.find((p) => p.keywords.some((k) => lower.includes(k)));
  if (!match) return null;
  const { lat, lng, driveMin } = match;
  const isApple = typeof navigator !== "undefined" && /iphone|ipad|mac/i.test(navigator.userAgent);
  const origin = `${SHERATON.lat},${SHERATON.lng}`;
  const dest = `${lat},${lng}`;
  const mapsUrl = isApple
    ? `maps://maps.apple.com/?saddr=${origin}&daddr=${dest}&dirflg=d`
    : `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&travelmode=driving`;
  return { driveMin, mapsUrl };
}

// ── Drag handle icon ──────────────────────────────────────────────────────────
function DragHandle({ listeners, attributes }: { listeners?: object; attributes?: object }) {
  return (
    <div
      {...listeners}
      {...attributes}
      className="flex flex-col items-center justify-center gap-[3px] px-2 cursor-grab active:cursor-grabbing touch-none"
      aria-label="Drag to reorder"
    >
      <span className="w-3.5 h-[1.5px] rounded-full bg-slate-300" />
      <span className="w-3.5 h-[1.5px] rounded-full bg-slate-300" />
      <span className="w-3.5 h-[1.5px] rounded-full bg-slate-300" />
    </div>
  );
}

// ── Item card (shared between sortable row and drag overlay) ─────────────────
export function AgendaItemCard({
  item,
  isToday,
  isPast,
  isEditable,
  isDragging = false,
  showHandle = false,
  handleListeners,
  handleAttributes,
  onEdit,
  onToggle,
}: {
  item: AgendaItem;
  isToday: boolean;
  isPast: boolean;
  isEditable: boolean;
  isDragging?: boolean;
  showHandle?: boolean;
  handleListeners?: object;
  handleAttributes?: object;
  onEdit: (item: AgendaItem) => void;
  onToggle: (id: string) => void;
}) {
  return (
    <div
      className={`flex items-stretch bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
        isDragging
          ? "opacity-50 border-sky-300 shadow-lg"
          : item.done
          ? "opacity-50 border-slate-100"
          : "border-slate-100 hover:border-slate-200 hover:shadow-md"
      } ${item.reservation && !isDragging ? "ring-1 ring-slate-900" : ""}`}
    >
      {/* Drag handle — shown when editable */}
      {showHandle && isEditable && (
        <DragHandle listeners={handleListeners} attributes={handleAttributes} />
      )}

      {/* Left + Center: tap to edit */}
      <button
        onClick={() => (isEditable ? onEdit(item) : undefined)}
        disabled={!isEditable}
        className={`flex-1 min-w-0 flex items-stretch gap-3 text-left ${
          isEditable ? "cursor-pointer" : "cursor-default"
        }`}
      >
        <div className="flex flex-col items-center justify-start pt-3 pl-3 w-14 flex-none">
          <span className="text-xl">{item.emoji}</span>
          <span className="text-[10px] text-slate-400 mt-1 text-center leading-tight font-medium">
            {item.time}
          </span>
        </div>
        <div className="flex-1 min-w-0 py-3 pr-2">
          <p
            className={`font-semibold text-sm ${
              item.done ? "line-through text-slate-400" : "text-slate-900"
            }`}
          >
            {item.title}
          </p>
          {item.notes && (
            <p className="text-xs text-slate-400 mt-0.5 leading-snug">{item.notes}</p>
          )}
          {(() => {
            const info = getMapsInfo(item.title);
            if (!info) return null;
            const label = info.driveMin === 0 ? "On-site" : `${info.driveMin} min drive`;
            return (
              <a
                href={info.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-semibold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full hover:bg-sky-100 transition-colors"
              >
                🗺 {label}
              </a>
            );
          })()}
          {item.reservation && !item.done && (
            <span className="inline-block mt-1.5 text-[10px] font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-full">
              🗓 Reserved
            </span>
          )}
        </div>
      </button>

      {/* Right: photo or done-toggle */}
      {item.photo ? (
        <button
          onClick={() => onToggle(item.id)}
          disabled={!isToday}
          className={`relative w-20 h-[72px] flex-none overflow-hidden ${
            isToday ? "cursor-pointer" : "cursor-default"
          }`}
          title={isToday ? (item.done ? "Mark undone" : "Mark done") : undefined}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.photo}
            alt={item.photoAlt ?? item.title}
            className={`w-full h-full object-cover transition-all ${
              item.done || isPast ? "grayscale" : ""
            }`}
          />
          {isToday && (
            <div
              className={`absolute inset-0 flex items-center justify-center transition-opacity ${
                item.done
                  ? "opacity-100 bg-black/40"
                  : "opacity-0 hover:opacity-100 bg-black/20"
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full border-2 border-white flex items-center justify-center ${
                  item.done ? "bg-white" : "bg-transparent"
                }`}
              >
                {item.done && (
                  <span className="text-slate-900 text-xs font-bold">✓</span>
                )}
              </div>
            </div>
          )}
        </button>
      ) : (
        <button
          onClick={() => onToggle(item.id)}
          disabled={!isToday}
          className={`flex items-center pr-4 pl-2 ${
            isToday ? "cursor-pointer" : "cursor-default"
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-none transition-colors ${
              item.done ? "bg-slate-900 border-slate-900" : "border-slate-300"
            }`}
          >
            {item.done && (
              <span className="text-white text-[10px] leading-none">✓</span>
            )}
          </div>
        </button>
      )}
    </div>
  );
}

// ── Sortable row wrapper ──────────────────────────────────────────────────────
function SortableItem({
  item,
  isToday,
  isPast,
  isEditable,
  nextItem,
  onEdit,
  onToggle,
  wishlistSuggestion,
  onSuggestionClick,
}: {
  item: AgendaItem;
  isToday: boolean;
  isPast: boolean;
  isEditable: boolean;
  nextItem: AgendaItem | undefined;
  onEdit: (item: AgendaItem) => void;
  onToggle: (id: string) => void;
  wishlistSuggestion: { emoji: string; name: string; note: string; fromWishlist?: boolean } | null;
  onSuggestionClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    position: isDragging ? "relative" : undefined,
  };

  const gap =
    nextItem ? timeToMinutes(nextItem.time) - timeToMinutes(item.time) : null;

  return (
    <div ref={setNodeRef} style={style} className="flex flex-col">
      <AgendaItemCard
        item={item}
        isToday={isToday}
        isPast={isPast}
        isEditable={isEditable}
        isDragging={isDragging}
        showHandle={isEditable}
        handleListeners={listeners}
        handleAttributes={attributes}
        onEdit={onEdit}
        onToggle={onToggle}
      />

      {/* Gap connector + suggestion (hidden while dragging) */}
      {!isDragging && gap !== null && nextItem && (
        <div className="flex flex-col">
          <div className="flex items-center gap-2 px-4 py-1.5">
            <div className="flex flex-col items-center gap-0.5">
              <div className="w-0.5 h-2 rounded-full bg-slate-300" />
              <div className="w-0.5 h-2 rounded-full bg-slate-200" />
              <div className="w-0.5 h-2 rounded-full bg-slate-100" />
            </div>
            <span className="text-xs font-medium text-slate-400">
              {formatGap(gap)} until {nextItem.title.split("–")[0].trim()}
            </span>
          </div>
          {wishlistSuggestion && (
            <button
              onClick={onSuggestionClick}
              className={`mx-4 mb-1.5 flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-left transition-colors ${
                wishlistSuggestion.fromWishlist
                  ? "bg-amber-50 border border-amber-100 hover:bg-amber-100"
                  : "bg-sky-50 border border-sky-100 hover:bg-sky-100"
              }`}
            >
              <span className="text-lg flex-none">{wishlistSuggestion.emoji}</span>
              <div className="flex-1 min-w-0">
                {wishlistSuggestion.fromWishlist && (
                  <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest mb-0.5">
                    From your saved list
                  </p>
                )}
                <p
                  className={`text-[11px] font-bold leading-tight ${
                    wishlistSuggestion.fromWishlist ? "text-amber-900" : "text-sky-800"
                  }`}
                >
                  {wishlistSuggestion.fromWishlist
                    ? wishlistSuggestion.name
                    : `Perfect gap for ${wishlistSuggestion.name}`}
                </p>
                <p
                  className={`text-[10px] mt-0.5 ${
                    wishlistSuggestion.fromWishlist ? "text-amber-600" : "text-sky-500"
                  }`}
                >
                  {wishlistSuggestion.note}
                </p>
              </div>
              <span
                className={`text-sm flex-none ${
                  wishlistSuggestion.fromWishlist ? "text-amber-300" : "text-sky-300"
                }`}
              >
                →
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── SortableAgendaSections ────────────────────────────────────────────────────
// The main exported component: wraps all sections in a single DndContext so
// items can also be dragged *between* sections.

export type WishlistEntry = {
  placeId: number;
  name: string;
  category: string;
  drive: string;
  photo: string;
  photoAlt: string;
  savedAt: number;
};

type GapSuggestion = { emoji: string; name: string; note: string; fromWishlist?: boolean };

const CATEGORY_EMOJI: Record<string, string> = {
  Beach: "🏖️", Food: "🍽️", Activity: "📍", Spa: "💆",
};

function getGapSuggestion(
  afterTime: string,
  gapMins: number,
  wishlist: WishlistEntry[],
): GapSuggestion | null {
  if (gapMins < 90) return null;
  const mins = timeToMinutes(afterTime);
  if (isNaN(mins)) return null;

  if (wishlist.length > 0) {
    const preferFood = mins >= 660 && mins < 840;
    const preferSpa = mins >= 840 && mins < 1020;
    const match =
      wishlist.find((e) => preferFood && e.category === "Food") ??
      wishlist.find((e) => preferSpa && e.category === "Spa") ??
      wishlist.find((e) => e.category === "Beach") ??
      wishlist.find((e) => e.category === "Activity") ??
      wishlist[0];
    if (match)
      return {
        emoji: CATEGORY_EMOJI[match.category] ?? "📍",
        name: match.name,
        note: `${match.drive} · saved by you`,
        fromWishlist: true,
      };
  }

  if (mins < 720) return { emoji: "🚶", name: "Wailea Beach Path", note: "Free · 5 min walk · stunning views" };
  if (mins < 840) return { emoji: "🍜", name: "Monkeypod Kitchen", note: "Farm-to-table · 4 min drive" };
  if (mins < 1020) {
    return gapMins >= 120
      ? { emoji: "🏖️", name: "Kapalua Beach", note: "Calm bay · 8 min drive · kids love it" }
      : { emoji: "🍧", name: "Ululani's Shave Ice", note: "Best on the island · 5 min drive" };
  }
  return { emoji: "🍹", name: "Down the Hatch", note: "Waterfront happy hour · 14 min drive" };
}

export function SortableAgendaSections({
  sections,
  isToday,
  isPast,
  isEditable,
  wishlist,
  onReorder,
  onEdit,
  onToggle,
  onAddClick,
  onSuggestionClick,
}: {
  sections: Section[];
  isToday: boolean;
  isPast: boolean;
  isEditable: boolean;
  wishlist: WishlistEntry[];
  onReorder: (newSections: Section[]) => void;
  onEdit: (item: AgendaItem) => void;
  onToggle: (id: string) => void;
  onAddClick: (defaultTime: string) => void;
  onSuggestionClick: () => void;
}) {
  const [activeId, setActiveId] = React.useState<UniqueIdentifier | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Flatten all items so we can find the active item for the overlay
  const allItems = sections.flatMap((s) => s.items);
  const activeItem = activeId ? allItems.find((i) => i.id === activeId) ?? null : null;

  // Map: id → sectionKey
  function getSectionKey(id: UniqueIdentifier): string | null {
    for (const s of sections) {
      if (s.items.some((i) => i.id === id)) return s.key;
    }
    return null;
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeSection = getSectionKey(active.id);
    const overSection = getSectionKey(over.id);
    if (!activeSection || !overSection || activeSection === overSection) return;

    // Moving between sections — reorder optimistically
    const newSections = sections.map((s) => ({ ...s, items: [...s.items] }));
    const sourceSec = newSections.find((s) => s.key === activeSection)!;
    const targetSec = newSections.find((s) => s.key === overSection)!;

    const movingItem = sourceSec.items.find((i) => i.id === active.id)!;
    sourceSec.items = sourceSec.items.filter((i) => i.id !== active.id);

    const overIdx = targetSec.items.findIndex((i) => i.id === over.id);
    if (overIdx >= 0) {
      targetSec.items.splice(overIdx, 0, movingItem);
    } else {
      targetSec.items.push(movingItem);
    }

    onReorder(newSections);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const activeSection = getSectionKey(active.id);
    const overSection = getSectionKey(over.id);
    if (!activeSection || !overSection) return;

    const newSections = sections.map((s) => ({ ...s, items: [...s.items] }));

    if (activeSection === overSection) {
      // Reorder within same section
      const sec = newSections.find((s) => s.key === activeSection)!;
      const oldIdx = sec.items.findIndex((i) => i.id === active.id);
      const newIdx = sec.items.findIndex((i) => i.id === over.id);
      if (oldIdx === -1 || newIdx === -1) return;
      const [moved] = sec.items.splice(oldIdx, 1);
      sec.items.splice(newIdx, 0, moved);
    }
    // Cross-section moves were already handled in dragOver; just persist below.

    onReorder(newSections);
  }

  // Per-section progress
  function sectionStats(s: Section) {
    const doneCount = s.items.filter((i) => i.done).length;
    const progress = s.items.length > 0 ? doneCount / s.items.length : 0;
    const allDone = doneCount === s.items.length && s.items.length > 0;
    return { doneCount, progress, allDone };
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      {sections.map((section) => {
        const { doneCount, progress, allDone } = sectionStats(section);
        const sectionColor =
          section.key === "morning"
            ? "bg-amber-400"
            : section.key === "afternoon"
            ? "bg-sky-400"
            : "bg-indigo-400";

        return (
          <div key={section.key}>
            {/* Section header */}
            <div className="flex items-center gap-2.5 mb-3">
              <span className="text-base">{section.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-800">{section.label}</span>
                    <span className="text-[11px] text-slate-400">{section.range}</span>
                  </div>
                  <span className={`text-[10px] font-bold ${allDone ? "text-emerald-600" : "text-slate-400"}`}>
                    {allDone ? "✓ Done" : `${doneCount}/${section.items.length}`}
                  </span>
                </div>
                {isToday && section.items.length > 0 && (
                  <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        allDone ? "bg-emerald-500" : sectionColor
                      }`}
                      style={{ width: `${progress * 100}%` }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Items list */}
            <SortableContext
              items={section.items.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col">
                {section.items.map((item, idx) => {
                  const nextItem = section.items[idx + 1];
                  const gap = nextItem
                    ? timeToMinutes(nextItem.time) - timeToMinutes(item.time)
                    : null;
                  const suggestion =
                    gap !== null ? getGapSuggestion(item.time, gap, wishlist) : null;

                  return (
                    <SortableItem
                      key={item.id}
                      item={item}
                      isToday={isToday}
                      isPast={isPast}
                      isEditable={isEditable}
                      nextItem={nextItem}
                      onEdit={onEdit}
                      onToggle={onToggle}
                      wishlistSuggestion={suggestion}
                      onSuggestionClick={onSuggestionClick}
                    />
                  );
                })}
              </div>
            </SortableContext>

            {/* Add activity CTA */}
            {isEditable && (
              <button
                onClick={() => onAddClick(section.defaultTime)}
                className="mt-2 w-full flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-600 py-2 px-2 rounded-xl hover:bg-slate-50 transition-all group"
              >
                <div className="w-5 h-5 rounded-full border-[1.5px] border-slate-300 group-hover:border-slate-500 flex items-center justify-center text-xs leading-none font-bold transition-colors">
                  +
                </div>
                Add to {section.label.toLowerCase()}
              </button>
            )}
          </div>
        );
      })}

      {/* Drag overlay — renders above everything while dragging */}
      <DragOverlay>
        {activeItem ? (
          <div className="shadow-xl rounded-2xl opacity-95 rotate-1">
            <AgendaItemCard
              item={activeItem}
              isToday={isToday}
              isPast={isPast}
              isEditable={isEditable}
              onEdit={() => {}}
              onToggle={() => {}}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
