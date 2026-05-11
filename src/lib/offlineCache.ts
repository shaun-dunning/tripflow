/**
 * IndexedDB wrapper for TripFlow offline caching.
 *
 * Stores:
 *   agenda_cache  — key: "<tripId>-<dayNum>", value: { items, cachedAt }
 *   sync_queue    — autoincrement; pending mutations to flush when online
 */

const DB_NAME = "tripflow";
const DB_VERSION = 1;

export type SyncOp =
  | { type: "toggle"; tripId: string; itemId: string; done: boolean }
  | { type: "upsert"; tripId: string; dayNum: number; item: Record<string, unknown> }
  | { type: "delete"; tripId: string; itemId: string };

// ── Open DB (lazy singleton) ──────────────────────────────────────────────────

let _db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("agenda_cache")) {
        db.createObjectStore("agenda_cache"); // key: "<tripId>-<dayNum>"
      }
      if (!db.objectStoreNames.contains("sync_queue")) {
        db.createObjectStore("sync_queue", { autoIncrement: true });
      }
    };
    req.onsuccess = (e) => {
      _db = (e.target as IDBOpenDBRequest).result;
      resolve(_db);
    };
    req.onerror = () => reject(req.error);
  });
}

// ── agenda_cache ──────────────────────────────────────────────────────────────

export async function cacheAgendaItems(
  tripId: string,
  dayNum: number,
  items: unknown[]
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("agenda_cache", "readwrite");
    const store = tx.objectStore("agenda_cache");
    const req = store.put({ items, cachedAt: Date.now() }, `${tripId}-${dayNum}`);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getCachedAgendaItems(
  tripId: string,
  dayNum: number
): Promise<{ items: unknown[]; cachedAt: number } | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("agenda_cache", "readonly");
    const req = tx.objectStore("agenda_cache").get(`${tripId}-${dayNum}`);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

// ── sync_queue ────────────────────────────────────────────────────────────────

export async function enqueueSyncOp(op: SyncOp): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("sync_queue", "readwrite");
    const req = tx.objectStore("sync_queue").add({ ...op, createdAt: Date.now() });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function drainSyncQueue(): Promise<(SyncOp & { _key: IDBValidKey })[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const ops: (SyncOp & { _key: IDBValidKey })[] = [];
    const tx = db.transaction("sync_queue", "readwrite");
    const store = tx.objectStore("sync_queue");
    const cursorReq = store.openCursor();
    cursorReq.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        ops.push({ ...cursor.value, _key: cursor.key });
        cursor.continue();
      }
    };
    tx.oncomplete = () => resolve(ops);
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteSyncOp(key: IDBValidKey): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("sync_queue", "readwrite");
    const req = tx.objectStore("sync_queue").delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ── Connectivity helpers ──────────────────────────────────────────────────────

/** True when the browser believes it has network access. */
export function isOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

/**
 * Registers online/offline event listeners.
 * Returns an unsubscribe function.
 */
export function onConnectivityChange(
  handler: (online: boolean) => void
): () => void {
  const onOnline = () => handler(true);
  const onOffline = () => handler(false);
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);
  return () => {
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
  };
}
