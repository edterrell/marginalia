import { describe, expect, it } from "vitest";
import { migrateLegacyKeys } from "../src/lib/idbStore.js";
import { createMemoryStore } from "../src/lib/storage.js";

describe("migrateLegacyKeys", () => {
  it("copies keys that exist only in the legacy store", () => {
    const legacy = createMemoryStore();
    legacy.setItem("a", "1");
    legacy.setItem("b", "2");
    const cache = new Map<string, string>();

    expect(migrateLegacyKeys(cache, legacy, ["a", "b", "c"])).toEqual(["a", "b"]);
    expect(cache.get("a")).toBe("1");
    expect(cache.get("b")).toBe("2");
    expect(cache.has("c")).toBe(false);
  });

  it("never overwrites data already in IndexedDB", () => {
    const legacy = createMemoryStore();
    legacy.setItem("a", "old");
    const cache = new Map([["a", "new"]]);

    expect(migrateLegacyKeys(cache, legacy, ["a"])).toEqual([]);
    expect(cache.get("a")).toBe("new");
  });
});
