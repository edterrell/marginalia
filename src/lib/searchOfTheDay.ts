// src/lib/searchOfTheDay.ts
// Picks a random word from the user's own quotes, so the search box can be
// pre-filled with a "search of the day" that is guaranteed to return results.

import { EVOCATIVE_WORDS } from "./evocativeWords.js";

// Below this many qualifying curated words, fall back to the generic pool.
const MIN_CURATED_POOL = 5;

const STOPWORDS = new Set([
  "about", "above", "after", "again", "against", "almost", "also", "although", "always",
  "another", "because", "before", "being", "between", "cannot", "could", "doesn",
  "during", "either", "enough", "every", "everything", "first", "found", "having",
  "himself", "however", "itself", "little", "might", "myself", "never", "nothing",
  "other", "others", "perhaps", "rather", "really", "should", "since", "something",
  "still", "their", "themselves", "there", "these", "thing", "things", "think",
  "those", "though", "through", "together", "toward", "under", "until", "wasn",
  "weren", "which", "while", "whose", "within", "without", "would", "yourself",
]);

// Endings that mark verb forms and abstractions — used only by the fallback pool.
const DULL_ENDINGS = /(ed|ing|ly|tion|sion|ness|ment|ity)$/;

// Map a token to the curated word it represents (handles simple plurals), or null.
function curatedForm(token: string): string | null {
  if (EVOCATIVE_WORDS.has(token)) return token;
  if (token.endsWith("s") && EVOCATIVE_WORDS.has(token.slice(0, -1))) return token.slice(0, -1);
  if (token.endsWith("es") && EVOCATIVE_WORDS.has(token.slice(0, -2))) return token.slice(0, -2);
  return null;
}

// Count how many highlights each word appears in (once per highlight).
function countWords(texts: string[], pick: (token: string) => string | null): Map<string, number> {
  const counts = new Map<string, number>();
  for (const text of texts) {
    const seen = new Set<string>();
    for (const token of text.toLowerCase().match(/[a-z]{4,}/g) ?? []) {
      const w = pick(token);
      if (!w || seen.has(w)) continue;
      seen.add(w);
      counts.set(w, (counts.get(w) ?? 0) + 1);
    }
  }
  return counts;
}

/**
 * Choose a random evocative word (concrete nouns, places, weather, emotions, vivid
 * adjectives) that appears in at least `minMatches` of the given highlight texts, so the
 * search always returns results. If too few curated words qualify (a small library),
 * falls back to any 6+ letter word that isn't filler or an obvious verb/abstract form.
 * `avoid` (typically the previous word) is skipped when any other candidate exists.
 */
export function pickSearchOfTheDay(
  texts: string[],
  avoid: string | null = null,
  minMatches = 3
): string | null {
  if (texts.length === 0) return null;

  const qualifying = (counts: Map<string, number>) =>
    [...counts.entries()].filter(([, n]) => n >= minMatches).map(([w]) => w);

  let candidates = qualifying(countWords(texts, curatedForm));
  if (candidates.length < MIN_CURATED_POOL) {
    candidates = qualifying(
      countWords(texts, (t) =>
        t.length >= 6 && !STOPWORDS.has(t) && !DULL_ENDINGS.test(t) ? t : null
      )
    );
  }
  if (candidates.length === 0) return null;

  if (avoid && candidates.length > 1) {
    candidates = candidates.filter((w) => w !== avoid);
  }
  return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
}
