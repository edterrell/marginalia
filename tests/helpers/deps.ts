// Shared deterministic dependencies for tests: ids count up (id-1, id-2, …) and
// the clock is frozen, so createQuote/updateQuote output is fully predictable.

import type { CreateDeps } from "../../src/lib/quotes.js";

export function fakeDeps(): CreateDeps {
  let n = 0;
  return {
    id: () => `id-${++n}`,
    now: () => new Date("2024-01-01T00:00:00.000Z"),
  };
}
