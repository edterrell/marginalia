// The only stateful seam in the app. Everything goes through a tiny key/value
// interface so tests can inject an in-memory fake instead of real localStorage.

import type { Quote } from "./quotes.js";
import { fromJSON } from "./exporters.js";

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const STORAGE_KEY = "marginalia.quotes.v1";

/** Load quotes, tolerating a missing or corrupt store (returns []). */
export function loadQuotes(store: KeyValueStore): Quote[] {
  const raw = store.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return fromJSON(raw);
  } catch {
    return [];
  }
}

/** Persist the full collection. */
export function saveQuotes(store: KeyValueStore, quotes: readonly Quote[]): void {
  store.setItem(STORAGE_KEY, JSON.stringify([...quotes]));
}

/** In-memory KeyValueStore, used by tests and as a fallback. */
export function createMemoryStore(): KeyValueStore {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
  };
}
