import { describe, expect, it } from "vitest";
import { createMemoryStore, loadQuotes, saveQuotes } from "../src/lib/storage.js";
import { createQuote } from "../src/lib/quotes.js";
import { fakeDeps } from "./helpers/deps.js";

describe("storage", () => {
  it("returns [] when nothing is stored", () => {
    expect(loadQuotes(createMemoryStore())).toEqual([]);
  });

  it("round-trips quotes through the store", () => {
    const store = createMemoryStore();
    const quotes = [createQuote({ text: "hello", title: "Book" }, fakeDeps())];
    saveQuotes(store, quotes);
    expect(loadQuotes(store)).toEqual(quotes);
  });

  it("returns [] for a corrupt store instead of throwing", () => {
    const store = createMemoryStore();
    store.setItem("marginalia.quotes.v1", "{ broken");
    expect(loadQuotes(store)).toEqual([]);
  });
});
