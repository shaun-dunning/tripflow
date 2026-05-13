"use client";

import { useState, useEffect, useCallback } from "react";

const STORE_KEY = "tf-item-presence-v1";

// Module-level subscriber set so all mounted cards re-render on any toggle
// (avoids a context while giving cross-component reactivity within the tab).
const subscribers = new Set<() => void>();

function readStore(): Record<string, string[]> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) ?? "{}") as Record<string, string[]>;
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, string[]>) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch { /* quota */ }
}

// Returns the stable per-device "me" ID (generated once, persisted).
function getMyId(): string {
  if (typeof window === "undefined") return "me";
  let id = localStorage.getItem("tf-presence-my-id");
  if (!id) {
    id = typeof crypto !== "undefined" ? crypto.randomUUID() : `me-${Date.now()}`;
    localStorage.setItem("tf-presence-my-id", id);
  }
  return id;
}

/**
 * Per-item attendance hook.
 *
 * Returns the list of attendee IDs for `itemId`, whether the current device's
 * user is attending, and a toggle to flip their own attendance.
 *
 * State is persisted in localStorage and shared across all mounted instances
 * via a module-level subscriber set, so toggling one card updates all cards.
 * A `storage` event listener also syncs across browser tabs.
 */
export function useItemPresence(itemId: string) {
  const [store, setStore] = useState<Record<string, string[]>>({});
  const [myId, setMyId] = useState<string>("me");

  useEffect(() => {
    const id = getMyId();
    setMyId(id);
    setStore(readStore());

    function refresh() { setStore(readStore()); }
    subscribers.add(refresh);

    function onStorage(e: StorageEvent) {
      if (e.key === STORE_KEY) refresh();
    }
    window.addEventListener("storage", onStorage);

    return () => {
      subscribers.delete(refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const attendees = store[itemId] ?? [];
  const iAmGoing = attendees.includes(myId);

  const toggle = useCallback(() => {
    const current = readStore();
    const list = current[itemId] ?? [];
    const next = {
      ...current,
      [itemId]: list.includes(myId)
        ? list.filter((id) => id !== myId)
        : [...list, myId],
    };
    writeStore(next);
    // Notify all mounted instances (including self) to re-read from localStorage
    subscribers.forEach((fn) => fn());
    if (typeof navigator !== "undefined") navigator.vibrate?.(10);
  }, [itemId, myId]);

  return { attendees, iAmGoing, toggle };
}
