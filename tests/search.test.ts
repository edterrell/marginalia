import { describe, expect, it } from "vitest";
import { filterQuotes } from "../src/lib/search.js";
import { createQuote, type Quote } from "../src/lib/quotes.js";
import { fakeDeps } from "./helpers/deps.js";

function sample(): Quote[] {
  const deps = fakeDeps();
  return [
    createQuote(
      { text: "So we beat on", title: "The Great Gatsby", author: "Fitzgerald", tags: ["classic"] },
      deps,
    ),
    createQuote(
      { text: "You have power over your mind", title: "Meditations", author: "Marcus Aurelius", tags: ["Stoic"] },
      deps,
    ),
    createQuote(
      { text: "The unexamined life", title: "Apology", author: "Plato", note: "on Stoic virtue" },
      deps,
    ),
  ];
}

describe("filterQuotes", () => {
  const quotes = sample();

  it("returns everything when no filter is given", () => {
    expect(filterQuotes(quotes)).toHaveLength(3);
  });

  it("matches free text across text, title, author, note, and tags", () => {
    expect(filterQuotes(quotes, { text: "power" }).map((q) => q.id)).toEqual(["id-2"]);
    expect(filterQuotes(quotes, { text: "stoic" }).map((q) => q.id)).toEqual(["id-2", "id-3"]);
  });

  it("matches a tag typed with a leading # in free-text search", () => {
    expect(filterQuotes(quotes, { text: "#classic" }).map((q) => q.id)).toEqual(["id-1"]);
    expect(filterQuotes(quotes, { text: "#Stoic" }).map((q) => q.id)).toEqual(["id-2"]);
  });

  it("matches tag exactly and case-insensitively", () => {
    expect(filterQuotes(quotes, { tag: "stoic" }).map((q) => q.id)).toEqual(["id-2"]);
    expect(filterQuotes(quotes, { tag: "nope" })).toEqual([]);
  });

  it("filters by book and author substrings", () => {
    expect(filterQuotes(quotes, { book: "gatsby" }).map((q) => q.id)).toEqual(["id-1"]);
    expect(filterQuotes(quotes, { author: "aurelius" }).map((q) => q.id)).toEqual(["id-2"]);
  });

  it("combines filters with AND", () => {
    expect(filterQuotes(quotes, { text: "life", author: "plato" }).map((q) => q.id)).toEqual([
      "id-3",
    ]);
    expect(filterQuotes(quotes, { text: "life", author: "fitzgerald" })).toEqual([]);
  });
});
