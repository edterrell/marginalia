// Serialize quotes to Markdown (for reading/sharing) and JSON (for backup and
// lossless re-import). `fromJSON` validates untrusted input before trusting it.

import type { Quote, QuoteSource } from "./quotes.js";

const JSON_VERSION = 1;

interface Backup {
  app: "marginalia";
  version: number;
  quotes: Quote[];
}

/** Human-readable Markdown, grouped by book. */
export function toMarkdown(quotes: readonly Quote[]): string {
  if (quotes.length === 0) return "# Marginalia\n\n_No quotes yet._\n";

  const groups = new Map<string, Quote[]>();
  for (const quote of quotes) {
    const heading = quote.author
      ? `${quote.title || "Untitled"} — ${quote.author}`
      : quote.title || "Untitled";
    const list = groups.get(heading) ?? [];
    list.push(quote);
    groups.set(heading, list);
  }

  const parts: string[] = ["# Marginalia\n"];
  for (const [heading, list] of groups) {
    parts.push(`## ${heading}\n`);
    for (const quote of list) {
      parts.push(`> ${quote.text.replace(/\n/g, "\n> ")}\n`);
      const meta: string[] = [];
      if (quote.page) meta.push(quote.page);
      if (quote.tags.length) meta.push(quote.tags.map((t) => `#${t}`).join(" "));
      if (meta.length) parts.push(`— ${meta.join(" · ")}\n`);
      if (quote.note) parts.push(`Note: ${quote.note}\n`);
      parts.push("");
    }
  }
  return parts.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

/** Pretty-printed JSON backup. */
export function toJSON(quotes: readonly Quote[]): string {
  const backup: Backup = { app: "marginalia", version: JSON_VERSION, quotes: [...quotes] };
  return JSON.stringify(backup, null, 2);
}

function isString(v: unknown): v is string {
  return typeof v === "string";
}

function asQuote(value: unknown): Quote {
  if (typeof value !== "object" || value === null) {
    throw new Error("Each quote must be an object.");
  }
  const q = value as Record<string, unknown>;
  if (!isString(q.id) || !isString(q.text) || !q.text.trim()) {
    throw new Error("Each quote needs a string id and non-empty text.");
  }
  if (!Array.isArray(q.tags) || !q.tags.every(isString)) {
    throw new Error("Quote tags must be an array of strings.");
  }
  const source: QuoteSource =
    q.source === "kindle" || q.source === "koreader" ? q.source : "manual";
  return {
    id: q.id,
    text: q.text,
    title: isString(q.title) ? q.title : "",
    author: isString(q.author) ? q.author : "",
    page: isString(q.page) ? q.page : "",
    tags: q.tags,
    note: isString(q.note) ? q.note : "",
    source,
    addedAt: isString(q.addedAt) ? q.addedAt : new Date(0).toISOString(),
  };
}

/**
 * Parse a JSON backup, validating its shape. Throws on anything malformed so a
 * corrupt or hostile file can never inject unexpected data into the app.
 */
export function fromJSON(text: string): Quote[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }

  // Accept either a full backup object or a bare array of quotes.
  const rawQuotes = Array.isArray(data)
    ? data
    : typeof data === "object" && data !== null && Array.isArray((data as Backup).quotes)
      ? (data as Backup).quotes
      : null;

  if (!rawQuotes) {
    throw new Error("Unrecognized backup format.");
  }
  return rawQuotes.map(asQuote);
}
