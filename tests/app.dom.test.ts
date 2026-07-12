// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mountApp } from "../src/ui/render.js";
import { createMemoryStore, loadQuotes, type KeyValueStore } from "../src/lib/storage.js";
import { clickButton, fill, submit } from "./helpers/dom.js";

function mount(store: KeyValueStore) {
  document.body.innerHTML = '<div id="app"></div>';
  const root = document.getElementById("app")!;
  mountApp(root, store);
  return root;
}

describe("add-quote flow", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("adds a quote via the form, renders a card, and persists it", () => {
    const store = createMemoryStore();
    const root = mount(store);

    clickButton(root, "+ Add quote");
    fill(root, 'textarea[aria-label="Quote text"]', "Stay hungry, stay foolish.");
    fill(root, 'input[placeholder="Book title"]', "Whole Earth Catalog");
    fill(root, 'input[placeholder="Author"]', "Stewart Brand");
    fill(root, 'input[placeholder="Tags, comma separated"]', "wisdom, life");
    submit(root, "form.add-form");

    const card = root.querySelector(".card");
    expect(card).not.toBeNull();
    expect(card!.querySelector("blockquote")!.textContent).toBe("Stay hungry, stay foolish.");
    expect(card!.querySelector("cite")!.textContent).toContain("Whole Earth Catalog");
    expect([...card!.querySelectorAll(".tag")].map((t) => t.textContent)).toEqual([
      "#wisdom",
      "#life",
    ]);

    // Persisted to the store, and survives a fresh mount.
    expect(loadQuotes(store)).toHaveLength(1);
    const root2 = mount(store);
    expect(root2.querySelector(".card blockquote")!.textContent).toBe(
      "Stay hungry, stay foolish.",
    );
  });

  it("filters via the search box", () => {
    const store = createMemoryStore();
    const root = mount(store);

    const add = (text: string) => {
      clickButton(root, "+ Add quote");
      fill(root, 'textarea[aria-label="Quote text"]', text);
      submit(root, "form.add-form");
    };
    add("The sea, once it casts its spell.");
    add("Not all those who wander are lost.");
    expect(root.querySelectorAll(".card")).toHaveLength(2);

    fill(root, "input.search", "wander");
    expect(root.querySelectorAll(".card")).toHaveLength(1);
    expect(root.querySelector(".card blockquote")!.textContent).toContain("wander");
  });

  it("filters by clicking a tag inside a card", () => {
    const store = createMemoryStore();
    const root = mount(store);

    const add = (text: string, tags: string) => {
      clickButton(root, "+ Add quote");
      fill(root, 'textarea[aria-label="Quote text"]', text);
      fill(root, 'input[placeholder="Tags, comma separated"]', tags);
      submit(root, "form.add-form");
    };
    add("Curiosity keeps leading us.", "curiosity");
    add("Into the woods.", "nature");
    expect(root.querySelectorAll(".card")).toHaveLength(2);

    // Click the "#nature" tag that lives inside the Walden card.
    const natureTag = [...root.querySelectorAll(".card .tag")].find(
      (t) => t.textContent === "#nature",
    ) as HTMLButtonElement;
    natureTag.click();

    const cards = root.querySelectorAll(".card");
    expect(cards).toHaveLength(1);
    expect(cards[0]!.querySelector("blockquote")!.textContent).toContain("woods");
  });

  it("edits a quote in place via the Edit button", () => {
    const store = createMemoryStore();
    const root = mount(store);

    clickButton(root, "+ Add quote");
    fill(root, 'textarea[aria-label="Quote text"]', "Curiosity keeps leading us.");
    fill(root, 'input[placeholder="Tags, comma separated"]', "curiosity");
    submit(root, "form.add-form");

    // Open the editor: fields are pre-filled from the existing quote.
    clickButton(root, "Edit");
    const tagField = root.querySelector<HTMLInputElement>(
      'input[placeholder="Tags, comma separated"]',
    )!;
    expect(tagField.value).toBe("curiosity");

    fill(root, 'textarea[aria-label="Quote text"]', "Curiosity keeps leading us onward.");
    fill(root, 'input[placeholder="Tags, comma separated"]', "curiosity, wonder");
    submit(root, "form.add-form");

    // Same single card, now with edited text and tags.
    expect(root.querySelectorAll(".card")).toHaveLength(1);
    const card = root.querySelector(".card")!;
    expect(card.querySelector("blockquote")!.textContent).toBe("Curiosity keeps leading us onward.");
    expect([...card.querySelectorAll(".tag")].map((t) => t.textContent)).toEqual([
      "#curiosity",
      "#wonder",
    ]);

    const stored = loadQuotes(store);
    expect(stored).toHaveLength(1);
    expect(stored[0]!.tags).toEqual(["curiosity", "wonder"]);
  });

  it("imports quotes from a dropped file", async () => {
    const store = createMemoryStore();
    const root = mount(store);

    const clippings = [
      "The Republic (Plato)",
      "- Your Highlight on page 5 | location 40-42 | Added on Monday",
      "",
      "Justice is the excellence of the soul.",
      "==========",
    ].join("\n");
    // jsdom's File has no .text(); the app only needs .name and .text(), so a
    // file-like stub exercises the same drop -> parse -> render path.
    const file = { name: "My Clippings.txt", text: async () => clippings };

    const drop = new Event("drop", { bubbles: true, cancelable: true });
    Object.defineProperty(drop, "dataTransfer", {
      value: { types: ["Files"], files: [file] },
    });
    root.dispatchEvent(drop);

    // handleFiles reads the file asynchronously.
    await vi.waitFor(() => {
      expect(root.querySelectorAll(".card")).toHaveLength(1);
    });
    expect(root.querySelector(".card blockquote")!.textContent).toContain("Justice");
    expect(loadQuotes(store)).toHaveLength(1);
    expect(loadQuotes(store)[0]!.source).toBe("kindle");
  });

  it("imports a dropped KOReader .json export with a KOReader badge", async () => {
    const store = createMemoryStore();
    const root = mount(store);

    const json = JSON.stringify({
      title: "Walden",
      author: "Thoreau",
      entries: [{ text: "I went to the woods.", note: "opening", page: 90 }],
    });
    const file = { name: "koreader-export.json", text: async () => json };
    const drop = new Event("drop", { bubbles: true, cancelable: true });
    Object.defineProperty(drop, "dataTransfer", { value: { types: ["Files"], files: [file] } });
    root.dispatchEvent(drop);

    await vi.waitFor(() => {
      expect(root.querySelectorAll(".card")).toHaveLength(1);
    });
    const card = root.querySelector(".card")!;
    expect(card.querySelector("blockquote")!.textContent).toBe("I went to the woods.");
    expect(card.querySelector("cite")!.textContent).toContain("Walden");
    expect(card.querySelector(".badge")!.textContent).toBe("KOReader");
    expect(loadQuotes(store)[0]!.source).toBe("koreader");
  });

  it("skips a dropped file that is neither .txt nor .json", async () => {
    const store = createMemoryStore();
    const root = mount(store);

    // A Markdown file must not be force-parsed as Kindle clippings.
    const file = { name: "notes.md", text: async () => "# Heading\n\nSome prose." };
    const drop = new Event("drop", { bubbles: true, cancelable: true });
    Object.defineProperty(drop, "dataTransfer", {
      value: { types: ["Files"], files: [file] },
    });
    root.dispatchEvent(drop);

    await vi.waitFor(() => {
      expect(root.querySelector(".status")!.textContent).toMatch(/unsupported/i);
    });
    expect(root.querySelectorAll(".card")).toHaveLength(0);
    expect(loadQuotes(store)).toHaveLength(0);
  });

  it("deletes a quote when confirmed", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const store = createMemoryStore();
    const root = mount(store);

    clickButton(root, "+ Add quote");
    fill(root, 'textarea[aria-label="Quote text"]', "Delete me.");
    submit(root, "form.add-form");
    expect(root.querySelectorAll(".card")).toHaveLength(1);

    clickButton(root, "Delete");
    expect(root.querySelectorAll(".card")).toHaveLength(0);
    expect(loadQuotes(store)).toHaveLength(0);
    vi.restoreAllMocks();
  });
});
