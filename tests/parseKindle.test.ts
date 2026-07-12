import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseKindleClippings } from "../src/lib/parseKindle.js";

function fixture(name: string): string {
  return readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");
}

describe("parseKindleClippings", () => {
  const entries = parseKindleClippings(fixture("clippings-basic.txt"));

  it("keeps highlights and notes but skips bookmarks and empty entries", () => {
    expect(entries).toHaveLength(4);
    expect(entries.map((e) => e.kind)).toEqual(["highlight", "highlight", "note", "highlight"]);
  });

  it("parses title and author", () => {
    expect(entries[0]).toMatchObject({
      title: "The Great Gatsby",
      author: "F. Scott Fitzgerald",
    });
  });

  it("uses page when present and falls back to location", () => {
    expect(entries[0]!.page).toBe("page 42");
    expect(entries[1]!.page).toBe("location 500-501");
  });

  it("captures the passage text", () => {
    expect(entries[0]!.text).toBe(
      "So we beat on, boats against the current, borne back ceaselessly into the past.",
    );
  });

  it("handles titles that themselves contain parentheses", () => {
    const entry = entries[3]!;
    expect(entry.title).toBe("A Book With (Parentheses) In Title");
    expect(entry.author).toBe("Jane Doe");
  });

  it("preserves multi-line passages", () => {
    expect(entries[3]!.text).toBe("Multi-line quote line one.\nLine two continues here.");
  });

  it("returns an empty array for empty or whitespace input", () => {
    expect(parseKindleClippings("")).toEqual([]);
    expect(parseKindleClippings("\n\n   \n")).toEqual([]);
  });

  it("tolerates a leading byte-order mark", () => {
    const withBom = "﻿" + fixture("clippings-basic.txt");
    expect(parseKindleClippings(withBom)).toHaveLength(4);
  });

  // Localized (non-English) Kindles: en-dash meta prefix, a BOM before every entry,
  // and localized "location" wording. See the parser header for details.
  it("parses a localized clippings file (en-dash meta, per-entry BOM, foreign wording)", () => {
    const BOM = "﻿";
    const raw = [
      `${BOM}Айвенго (с иллюстрациями) (Вальтер Скотт)`,
      "– Ваш выделенный отрывок в месте 12148–12149 | Добавлено: воскресенье, 12 июля 2026 г.",
      "",
      "Рукой презренной он сражён в бою.",
      "==========",
      `${BOM}Айвенго (с иллюстрациями) (Вальтер Скотт)`,
      "– Ваша заметка в месте 500 | Добавлено: воскресенье, 12 июля 2026 г.",
      "",
      "K",
      "==========",
      "",
    ].join("\n");

    const out = parseKindleClippings(raw);
    expect(out).toHaveLength(2);
    // BOM stripped from the title; author is the final parenthesized group.
    expect(out[0]).toMatchObject({
      title: "Айвенго (с иллюстрациями)",
      author: "Вальтер Скотт",
      // Body is only the passage — the meta line is NOT dumped into it.
      text: "Рукой презренной он сражён в бою.",
      page: "12148-12149",
    });
    expect(out[1]).toMatchObject({ text: "K", page: "500" });
  });

  it("normalizes en-dash location ranges (seen even on English firmware)", () => {
    const raw = [
      "The Story of Philosophy (Will Durant)",
      "- Your Highlight on Location 429–430 | Added on Friday, 7 June 2024",
      "",
      "Passage text.",
      "==========",
    ].join("\n");
    expect(parseKindleClippings(raw)[0]!.page).toBe("location 429-430");
  });

  it("tolerates CJK fullwidth punctuation in the title and meta line", () => {
    // Fullwidth parentheses （） around the author and a fullwidth pipe ｜ separator.
    const raw = [
      "本のタイトル（著者）",
      "- ハイライト 位置No. 1234-1235 ｜ 追加日：2024年1月1日",
      "",
      "ハイライトされた文章。",
      "==========",
    ].join("\n");
    const [entry] = parseKindleClippings(raw);
    expect(entry).toMatchObject({
      title: "本のタイトル",
      author: "著者",
      text: "ハイライトされた文章。",
      page: "1234-1235",
    });
  });
});
