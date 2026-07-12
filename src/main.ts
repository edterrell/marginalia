import "./styles.css";
import { mountApp } from "./ui/render.js";
import { createMemoryStore, type KeyValueStore } from "./lib/storage.js";

/** Prefer localStorage; fall back to in-memory if it's unavailable (private mode). */
function pickStore(): KeyValueStore {
  try {
    const probe = "__marginalia_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return createMemoryStore();
  }
}

const root = document.getElementById("app");
if (root) {
  mountApp(root, pickStore());
}

// Progressive enhancement: offline support, production only.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {
      /* offline support is optional; ignore failures */
    });
  });
}
