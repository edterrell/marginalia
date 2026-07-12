import { describe, expect, it } from "vitest";
import {
  allTags,
  createQuote,
  dedupe,
  normalizeTags,
  tidy,
  updateQuote,
  type Quote,
} from "../src/lib/quotes.js";
import { fakeDeps } from "./helpers/deps.js";

describe("tidy", () => {
  it("collapses whitespace and trims", () => {
    expect(tidy("  hello   world \n")).toBe("hello world");
  });
});

describe("normalizeTags", () => {
  it("trims, drops empties, and removes case-insensitive duplicates", () => {
    expect(normalizeTags([" Stoic ", "stoic", "", "Life", "life"])).toEqual([
      "Stoic",
      "Life",
    ]);
  });
});

describe("createQuote", () => {
  it("builds a normalized quote with injected id and timestamp", () => {
    const quote = createQuote(
      { text: "  be here now  ", title: " The Book ", tags: ["Zen", "zen"] },
      fakeDeps(),
    );
    expect(quote).toEqual<Quote>({
      id: "id-1",
      text: "be here now",
      title: "The Book",
      author: "",
      page: "",
      tags: ["Zen"],
      note: "",
      source: "manual",
      addedAt: "2024-01-01T00:00:00.000Z",
    });
  });

  it("rejects empty text", () => {
    expect(() => createQuote({ text: "   " }, fakeDeps())).toThrow(/non-empty/);
  });
});

describe("updateQuote", () => {
  const base = () =>
    createQuote(
      { text: "old text", title: "Old", author: "A", tags: ["one"], note: "n", source: "kindle" },
      fakeDeps(),
    );

  it("applies a patch while preserving id, source, and addedAt", () => {
    const original = base();
    const edited = updateQuote(original, {
      text: "  new  text ",
      tags: ["two", "Two", "three"],
    });
    expect(edited.id).toBe(original.id);
    expect(edited.source).toBe("kindle");
    expect(edited.addedAt).toBe(original.addedAt);
    expect(edited.text).toBe("new text");
    expect(edited.tags).toEqual(["two", "three"]);
    // Untouched fields carry over unchanged.
    expect(edited.title).toBe("Old");
    expect(edited.note).toBe("n");
  });

  it("does not mutate the original quote", () => {
    const original = base();
    updateQuote(original, { text: "changed" });
    expect(original.text).toBe("old text");
  });

  it("rejects clearing the text", () => {
    expect(() => updateQuote(base(), { text: "   " })).toThrow(/non-empty/);
  });
});

describe("dedupe", () => {
  it("removes the same passage from the same book, keeping the first", () => {
    const deps = fakeDeps();
    const a = createQuote({ text: "Same line.", title: "Book" }, deps);
    const b = createQuote({ text: "same line.", title: "book" }, deps); // case-insensitive
    const c = createQuote({ text: "Same line.", title: "Other book" }, deps);
    const result = dedupe([a, b, c]);
    expect(result.map((q) => q.id)).toEqual(["id-1", "id-3"]);
  });
});

describe("allTags", () => {
  it("returns distinct tags sorted case-insensitively", () => {
    const deps = fakeDeps();
    const quotes = [
      createQuote({ text: "a", tags: ["Zen", "life"] }, deps),
      createQuote({ text: "b", tags: ["Art", "zen"] }, deps),
    ];
    expect(allTags(quotes)).toEqual(["Art", "life", "Zen"]);
  });
});
