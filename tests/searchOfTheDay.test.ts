import { describe, expect, it } from "vitest";
import { pickSearchOfTheDay } from "../src/lib/searchOfTheDay";

const texts = [
  "The storm broke over the harbor and the lantern swayed.",
  "A storm of grief; the harbor was silent, the lantern dim.",
  "Clouds gathered above the harbor as the storm approached the lantern.",
  "Nothing here but the weight of announced things.",
];

describe("pickSearchOfTheDay", () => {
  it("returns null for no quotes", () => {
    expect(pickSearchOfTheDay([])).toBeNull();
  });

  it("picks only curated words that appear in 3+ quotes", () => {
    for (let i = 0; i < 30; i++) {
      expect(["storm", "harbor", "lantern"]).toContain(pickSearchOfTheDay(texts, null, 3));
    }
  });

  it("never repeats the avoided word when another exists", () => {
    for (let i = 0; i < 30; i++) {
      expect(pickSearchOfTheDay(texts, "storm", 3)).not.toBe("storm");
    }
  });
});
