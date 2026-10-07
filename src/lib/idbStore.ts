// IndexedDB-backed KeyValueStore. localStorage caps out around 5 MB per site, which a
// large My Clippings.txt (thousands of highlights) can exceed, so the import would
// fail. IndexedDB has no such small cap.
//
// The rest of the app reads storage synchronously, so this store loads every key into
// memory once at startup (async) and then serves reads from that cache. Writes update
// the cache immediately and are persisted to IndexedDB in the background. A failed
// write is reported through STORAGE_ERROR_EVENT so the UI can say so instead of
// silently losing data.

import type { KeyValueStore } from "./storage.js";

const DB_NAME = "marginalia";
const STORE_NAME = "kv";

/** Fired on `window` when a background write to IndexedDB fails. */
export const STORAGE_ERROR_EVENT = "marginalia:storage-error";

/** Keys the app used to keep in localStorage, migrated to IndexedDB on first run. */
export const LEGACY_KEYS = [
  "marginalia.quotes.v1",
  "marginalia.wotd.applied",
  "marginalia.wotd.last",
] as const;

export interface LegacyStore extends KeyValueStore {
  removeItem?(key: string): void;
}

/**
 * Copy any `keys` that exist in `legacy` but not in `cache` into `cache`.
 * Pure, so it can be tested without a browser. Returns the keys it copied.
 */
export function migrateLegacyKeys(
  cache: Map<string, string>,
  legacy: KeyValueStore,
  keys: readonly string[],
): string[] {
  const migrated: string[] = [];
  for (const key of keys) {
    if (cache.has(key)) continue;
    const value = legacy.getItem(key);
    if (value === null) continue;
    cache.set(key, value);
    migrated.push(key);
  }
  return migrated;
}

function promisify<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error("IndexedDB is blocked by another tab."));
  });
}

async function loadAll(db: IDBDatabase): Promise<Map<string, string>> {
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const [keys, values] = await Promise.all([
    promisify(store.getAllKeys()),
    promisify(store.getAll()),
  ]);
  const cache = new Map<string, string>();
  keys.forEach((key, i) => {
    const value = values[i];
    if (typeof key === "string" && typeof value === "string") cache.set(key, value);
  });
  return cache;
}

async function put(db: IDBDatabase, key: string, value: string): Promise<void> {
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).put(value, key);
  await txDone(tx);
}

function reportWriteError(err: unknown): void {
  const reason = err instanceof Error ? err.message : "unknown error";
  window.dispatchEvent(
    new CustomEvent(STORAGE_ERROR_EVENT, {
      detail: `Could not save your quotes (${reason}). Export a backup before closing this tab.`,
    }),
  );
}

/**
 * Open the IndexedDB store, load it into memory, and migrate anything left in the old
 * localStorage. Rejects if IndexedDB is unavailable, so the caller can fall back.
 */
export async function createIdbStore(legacy?: LegacyStore): Promise<KeyValueStore> {
  const db = await openDb();
  const cache = await loadAll(db);

  if (legacy) {
    for (const key of migrateLegacyKeys(cache, legacy, LEGACY_KEYS)) {
      try {
        await put(db, key, cache.get(key)!);
        legacy.removeItem?.(key); // only after the copy is safely written
      } catch (err) {
        reportWriteError(err);
      }
    }
  }

  return {
    getItem: (key) => cache.get(key) ?? null,
    setItem: (key, value) => {
      cache.set(key, value);
      put(db, key, value).catch(reportWriteError);
    },
  };
}
