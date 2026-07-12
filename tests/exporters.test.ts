import { describe, expect, it } from "vitest";
import { fromJSON, toJSON, toMarkdown } from "../src/lib/exporters.js";
import { createQuote, type Quote } from "../src/lib/quotes.js";
import { fakeDeps } from "./helpers/deps.js";

function sample(): Quote[] {
  const deps = fakeDeps();
  return [
    createQuote(
      { text: "So we beat on", title: "The Great Gatsby", author: "Fitzgerald", page: "page 42", tags: ["classic"], source: "kindle" },
      deps,
    ),
    createQuote(
      { text: "You have power over your mind", title: "Meditations", author: "Marcus Aurelius", tags: ["Stoic"], note: "favorite" },
      deps,
    ),
  ];
}

describe("toJSON / fromJSON", () => {
  it("round-trips losslessly", () => {
    const quotes = sample();
    expect(fromJSON(toJSON(quotes))).toEqual(quotes);
  });

  it("accepts a bare array of quotes too", () => {
    const quotes = sample();
    expect(fromJSON(JSON.stringify(quotes))).toEqual(quotes);
  });

  it("rejects invalid JSON", () => {
    expect(() => fromJSON("{not json")).toThrow(/valid JSON/);
  });

  it("rejects an unrecognized shape", () => {
    expect(() => fromJSON(JSON.stringify({ hello: "world" }))).toThrow(/Unrecognized/);
  });

  it("rejects quotes missing required fields", () => {
    expect(() => fromJSON(JSON.stringify([{ id: "x" }]))).toThrow(/non-empty text/);
    expect(() => fromJSON(JSON.stringify([{ id: "x", text: "hi", tags: [1] }]))).toThrow(
      /tags must be an array of strings/,
    );
  });
});

describe("toMarkdown", () => {
  it("groups quotes by book with blockquotes and metadata", () => {
    const md = toMarkdown(sample());
    expect(md).toContain("## The Great Gatsby — Fitzgerald");
    expect(md).toContain("> So we beat on");
    expect(md).toContain("#classic");
    expect(md).toContain("Note: favorite");
  });

  it("handles an empty collection", () => {
    expect(toMarkdown([])).toContain("_No quotes yet._");
  });
});
