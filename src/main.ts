import "./styles.css";
import { mountApp } from "./ui/render.js";
import { createMemoryStore, type KeyValueStore } from "./lib/storage.js";
import { createIdbStore } from "./lib/idbStore.js";

/** localStorage if usable, else null (blocked storage, private mode). */
function usableLocalStorage(): Storage | null {
  try {
    const probe = "__marginalia_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Prefer IndexedDB (no small size cap, so a large My Clippings.txt fits), migrating any
 * quotes left in localStorage. Fall back to localStorage, then to in-memory.
 */
async function pickStore(): Promise<KeyValueStore> {
  const local = usableLocalStorage();
  if ("indexedDB" in window) {
    try {
      return await createIdbStore(local ?? undefined);
    } catch {
      /* IndexedDB unavailable or blocked: fall through to localStorage */
    }
  }
  return local ?? createMemoryStore();
}

const root = document.getElementById("app");
if (root) {
  void pickStore().then((store) => mountApp(root, store));
}

// Progressive enhancement: offline support, production only.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {
      /* offline support is optional; ignore failures */
    });
  });
}
