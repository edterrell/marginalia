// Parser for Kindle's `My Clippings.txt`. Pure and dependency-free so it can be
// exhaustively unit-tested against fixtures.
//
// The file is a sequence of entries separated by a line of "=" characters. A
// typical entry looks like:
//
//   The Great Gatsby (F. Scott Fitzgerald)
//   - Your Highlight on page 42 | location 1234-1235 | Added on Monday, ...
//   <blank line>
//   So we beat on, boats against the current...
//   ==========
//
// Real-world quirks this handles, learned from localized (non-English) devices:
//   - the meta line's leading dash may be "-", "–" (en dash) or "—" (em dash);
//   - some Kindles write a BOM at the start of *every* entry, not just the file;
//   - "page"/"location" are localized, so we fall back to the bare number.
// Notes/highlights carry text; bookmarks do not and are skipped.

export type KindleKind = "highlight" | "note";

export interface KindleEntry {
  title: string;
  author: string;
  /** Friendly location label, e.g. "page 42" or "location 1234-1235". */
  page: string;
  kind: KindleKind;
  text: string;
}

// Dash characters Kindle uses to prefix the meta line, and the range separator in
// location numbers, across firmwares/locales: ASCII hyphen, Unicode hyphen, en/em dash.
const DASH = "-\\u2010\\u2013\\u2014";
// Field separator before "Added on ...": ASCII "|" or CJK fullwidth "｜".
const PIPE = /[|｜]/;

/** Split "Title (Author)"; author is the final parenthesized group. */
function parseTitleLine(line: string): { title: string; author: string } {
  // Accept ASCII "( )" and CJK fullwidth "（ ）" parentheses.
  const match = line.match(/^(.*)[(（]([^)）]*)[)）]\s*$/);
  if (match && match[1]!.trim()) {
    return { title: match[1]!.trim(), author: match[2]!.trim() };
  }
  return { title: line.trim(), author: "" };
}

// The meta line is the entry's second line: a localized dash, then text, then at
// least one pipe (before the "Added on ..." timestamp). Used to tell it apart from
// a body that merely happens to start with a dash.
const META_LINE = new RegExp(`^\\s*[${DASH}].*[|\\uFF5C]`);

/** Derive kind + page label from the "- Your Highlight on page ..." meta line. */
function parseMetaLine(line: string): { kind: KindleKind | "bookmark"; page: string } {
  const lower = line.toLowerCase();
  const kind: KindleKind | "bookmark" = lower.includes("bookmark")
    ? "bookmark"
    : lower.includes("note")
      ? "note"
      : "highlight";

  // Prefer a labeled "page N" / "location N" when the device speaks English...
  const range = `[0-9ivxlcdm]+(?:[${DASH}][0-9ivxlcdm]+)?`;
  const pageMatch = line.match(new RegExp(`page (${range})`, "i"));
  const locMatch = line.match(new RegExp(`location (${range})`, "i"));
  const labeled = pageMatch ? `page ${pageMatch[1]}` : locMatch ? `location ${locMatch[1]}` : "";
  let page = labeled.replace(/[‐–—]/g, "-");

  // ...otherwise fall back to the last number range before the first pipe, which is
  // where the page/location sits regardless of language.
  if (!page) {
    const head = line.split(PIPE)[0] ?? "";
    const numbers = head.match(new RegExp(`[0-9]+(?:[${DASH}][0-9]+)?`, "g"));
    if (numbers && numbers.length) {
      page = numbers[numbers.length - 1]!.replace(/[‐–—]/g, "-");
    }
  }

  return { kind, page };
}

/** Parse the full `My Clippings.txt` contents into usable entries. */
export function parseKindleClippings(raw: string): KindleEntry[] {
  const text = raw.replace(/﻿/g, ""); // strip BOMs (some Kindles write one per entry)
  const blocks = text.split(/^\s*={3,}\s*$/m);
  const entries: KindleEntry[] = [];

  for (const block of blocks) {
    const lines = block.split(/\r?\n/);
    // Drop leading/trailing blank lines while keeping interior structure.
    while (lines.length && lines[0]!.trim() === "") lines.shift();
    while (lines.length && lines[lines.length - 1]!.trim() === "") lines.pop();
    if (lines.length === 0) continue;

    const { title, author } = parseTitleLine(lines[0]!);

    let kind: KindleKind = "highlight";
    let page = "";
    let bodyStart = 1;

    if (lines.length > 1 && META_LINE.test(lines[1]!)) {
      const meta = parseMetaLine(lines[1]!);
      if (meta.kind === "bookmark") continue; // no content worth keeping
      kind = meta.kind;
      page = meta.page;
      bodyStart = 2;
    }

    const body = lines.slice(bodyStart).join("\n").trim();
    if (!body) continue; // empty highlight/note, skip

    entries.push({ title, author, page, kind, text: body });
  }

  return entries;
}
