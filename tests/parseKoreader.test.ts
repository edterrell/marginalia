import { describe, expect, it } from "vitest";
import { parseKoreaderJson } from "../src/lib/parseKoreader.js";

describe("parseKoreaderJson", () => {
  it("parses a single-book export", () => {
    const raw = JSON.stringify({
      title: "Meditations",
      author: "Marcus Aurelius",
      entries: [
        { text: "You have power over your mind.", note: "favorite", page: 12 },
        { text: "The best revenge is to be unlike him who did the injury.", page: 34 },
      ],
      version: "v2024",
    });
    expect(parseKoreaderJson(raw)).toEqual([
      {
        text: "You have power over your mind.",
        title: "Meditations",
        author: "Marcus Aurelius",
        page: "page 12",
        note: "favorite",
      },
      {
        text: "The best revenge is to be unlike him who did the injury.",
        title: "Meditations",
        author: "Marcus Aurelius",
        page: "page 34",
        note: "",
      },
    ]);
  });

  it("parses a multi-book export (documents wrapper)", () => {
    const raw = JSON.stringify({
      created_on: 1,
      documents: [
        { title: "Book A", author: "A", entries: [{ text: "From A.", page: 1 }] },
        { title: "Book B", author: "B", entries: [{ text: "From B.", page: 2 }] },
      ],
    });
    const out = parseKoreaderJson(raw)!;
    expect(out.map((e) => [e.title, e.text])).toEqual([
      ["Book A", "From A."],
      ["Book B", "From B."],
    ]);
  });

  it("skips entries without highlighted text (e.g. bookmarks)", () => {
    const raw = JSON.stringify({
      title: "T",
      author: "A",
      entries: [{ text: "", page: 1 }, { text: "   ", page: 2 }, { text: "Real one.", page: 3 }],
    });
    const out = parseKoreaderJson(raw)!;
    expect(out).toHaveLength(1);
    expect(out[0]!.text).toBe("Real one.");
  });

  it("returns null for a Marginalia backup so it can fall back", () => {
    expect(parseKoreaderJson(JSON.stringify({ app: "marginalia", version: 1, quotes: [] }))).toBeNull();
    expect(parseKoreaderJson(JSON.stringify([{ id: "x", text: "hi", tags: [] }]))).toBeNull();
  });

  it("returns null for invalid JSON", () => {
    expect(parseKoreaderJson("{not json")).toBeNull();
  });
});
