// Parser for KOReader's JSON highlight export (Tools > Export highlights > Json).
// KOReader does NOT use Kindle's `My Clippings.txt`; this reads its own schema.
//
// Two shapes exist, depending on how many books were exported at once:
//   single book:  { title, author, entries: [ { text, note, page, ... }, ... ], ... }
//   multi book:   { documents: [ { title, author, entries: [...] }, ... ], ... }
//
// We keep only what Marginalia stores: text, title, author, page, note. Entries
// with no highlighted text (e.g. a bare bookmark) are skipped.

export interface KoreaderEntry {
  text: string;
  title: string;
  author: string;
  page: string;
  note: string;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/** KOReader's `page` is usually a number; present it like the Kindle entries. */
function pageLabel(v: unknown): string {
  if (typeof v === "number") return `page ${v}`;
  return str(v).trim();
}

interface KoBook {
  title?: unknown;
  author?: unknown;
  entries?: unknown;
}

/** Return the per-book records for either shape, or null if this isn't KOReader. */
function books(data: unknown): KoBook[] | null {
  if (typeof data !== "object" || data === null) return null;
  const d = data as Record<string, unknown>;
  if (Array.isArray(d.documents)) {
    return d.documents.filter((b): b is KoBook => typeof b === "object" && b !== null);
  }
  if (Array.isArray(d.entries)) return [d as KoBook];
  return null;
}

/**
 * Parse a KOReader JSON export into importable entries. Returns null when `raw`
 * is not valid JSON or not a KOReader export, so callers can fall back to another
 * format (e.g. a Marginalia backup, which uses a different shape).
 */
export function parseKoreaderJson(raw: string): KoreaderEntry[] | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  const list = books(data);
  if (!list) return null;

  const out: KoreaderEntry[] = [];
  for (const book of list) {
    const title = str(book.title);
    const author = str(book.author);
    const entries = Array.isArray(book.entries) ? book.entries : [];
    for (const entry of entries) {
      if (typeof entry !== "object" || entry === null) continue;
      const e = entry as Record<string, unknown>;
      const text = str(e.text);
      if (!text.trim()) continue; // no highlighted text (e.g. a bookmark)
      out.push({ text, title, author, page: pageLabel(e.page), note: str(e.note) });
    }
  }
  return out;
}
