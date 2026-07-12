// Pure search/filter over a quote collection. Case-insensitive substring match.

import type { Quote } from "./quotes.js";

export interface Filter {
  /** Free text matched against passage, title, author, note, and tags. */
  text?: string;
  /** Exact (case-insensitive) tag match. */
  tag?: string;
  /** Substring match against the book title. */
  book?: string;
  /** Substring match against the author. */
  author?: string;
}

function includesCI(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

function matchesText(quote: Quote, query: string): boolean {
  // Include both bare ("nature") and hashed ("#nature") tag forms so a search
  // like "#nature" matches even though the "#" is only a display prefix.
  const hashed = quote.tags.map((t) => `#${t}`);
  const hay = [quote.text, quote.title, quote.author, quote.note, ...quote.tags, ...hashed].join(
    "\n",
  );
  return includesCI(hay, query);
}

/** Return the subset of `quotes` matching every provided filter field. */
export function filterQuotes(quotes: readonly Quote[], filter: Filter = {}): Quote[] {
  const text = filter.text?.trim();
  const tag = filter.tag?.trim().toLowerCase();
  const book = filter.book?.trim();
  const author = filter.author?.trim();

  return quotes.filter((quote) => {
    if (text && !matchesText(quote, text)) return false;
    if (tag && !quote.tags.some((t) => t.toLowerCase() === tag)) return false;
    if (book && !includesCI(quote.title, book)) return false;
    if (author && !includesCI(quote.author, author)) return false;
    return true;
  });
}
