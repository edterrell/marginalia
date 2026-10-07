// The only DOM-facing module. Security-critical rule: user-supplied text is only
// ever inserted through `textContent` / `createTextNode` (via the `el` helper),
// never `innerHTML`, so a hostile quote or import file can't inject markup.

import { loadQuotes, saveQuotes, type KeyValueStore } from "../lib/storage.js";
import {
  allTags,
  createQuote,
  dedupe,
  updateQuote,
  type CreateDeps,
  type Quote,
} from "../lib/quotes.js";
import { filterQuotes, type Filter } from "../lib/search.js";
import { pickSearchOfTheDay } from "../lib/searchOfTheDay.js";
import { STORAGE_ERROR_EVENT } from "../lib/idbStore.js";
import { fromJSON, toJSON, toMarkdown } from "../lib/exporters.js";
import { parseKindleClippings } from "../lib/parseKindle.js";
import { parseKoreaderJson } from "../lib/parseKoreader.js";
import { SOURCE_URL, TIP_URL, TIP_LABEL } from "../config.js";

const WOTD_APPLIED_KEY = "marginalia.wotd.applied";
const WOTD_LAST_KEY = "marginalia.wotd.last";

const deps: CreateDeps = {
  id: () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `q-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  now: () => new Date(),
};

type Handler = (e: Event) => void;
type Attrs = Record<string, string | number | boolean | Handler>;

/** Tiny element builder. Children are text or nodes; text is always inert. */
function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  children: Array<Node | string> = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (typeof value === "boolean") {
      if (value) node.setAttribute(key, "");
    } else {
      node.setAttribute(key, String(value));
    }
  }
  for (const child of children) {
    node.append(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
}

function download(filename: string, text: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = el("a", { href: url, download: filename });
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

const SOURCE_LABELS: Partial<Record<Quote["source"], string>> = {
  kindle: "Kindle",
  koreader: "KOReader",
};

/** A rubber-stamp badge for imported quotes, or "" for hand-typed ones. */
function sourceBadge(source: Quote["source"]): HTMLElement | string {
  const label = SOURCE_LABELS[source];
  return label ? el("span", { class: "badge", title: `Imported from ${label}` }, [label]) : "";
}

/** A small, CSP-safe footer: a privacy note plus optional source / tip links. */
function buildFooter(): HTMLElement {
  const link = (href: string, label: string, extra = "") =>
    el("a", { href, target: "_blank", rel: "noopener noreferrer", class: extra }, [label]);

  const links: Array<Node | string> = [];
  if (SOURCE_URL) links.push(link(SOURCE_URL, "View source"));
  if (TIP_URL) {
    if (links.length) links.push(el("span", { class: "sep" }, ["·"]));
    links.push(link(TIP_URL, TIP_LABEL, "tip"));
  }

  const children: Array<Node | string> = [
    el("p", { class: "footer-note" }, [
      "Private and offline. Your quotes live only in this browser.",
    ]),
  ];
  if (links.length) children.push(el("p", { class: "footer-links" }, links));
  return el("footer", { class: "site-footer" }, children);
}

/** Mount the whole app into `root`, persisting to `store`. */
export function mountApp(root: HTMLElement, store: KeyValueStore): void {
  let quotes = loadQuotes(store);
  const filter: Filter = {};
  let editingId: string | null = null;
  let formOpen = false;

  // --- persistent chrome (built once) ---
  const status = el("p", { class: "status", role: "status" });
  const searchInput = el("input", {
    type: "search",
    class: "search",
    placeholder: "Search quotes, books, authors, tags…",
    "aria-label": "Search",
    oninput: () => {
      filter.text = searchInput.value;
      renderList();
    },
  });

  const fileInput = el("input", {
    type: "file",
    accept: ".txt,.json,text/plain,application/json",
    multiple: true,
    class: "hidden-file",
    onchange: () => {
      if (fileInput.files) void handleFiles(fileInput.files);
      fileInput.value = "";
    },
  });

  const toolbar = el("div", { class: "toolbar" }, [
    searchInput,
    el("div", { class: "actions" }, [
      el("button", { type: "button", class: "btn primary", onclick: toggleForm }, ["+ Add quote"]),
      el("button", { type: "button", class: "btn", onclick: () => pickNewWord() }, ["New word"]),
      el("button", { type: "button", class: "btn", onclick: () => fileInput.click() }, ["Import…"]),
      el("button", { type: "button", class: "btn", onclick: exportMarkdown }, ["Export .md"]),
      el("button", { type: "button", class: "btn", onclick: exportJson }, ["Export .json"]),
      fileInput,
    ]),
  ]);

  const formSection = el("div", { class: "form-section" });
  const tagBar = el("div", { class: "tag-bar" });
  const list = el("div", { class: "card-grid" });

  root.replaceChildren(
    el("header", { class: "site-header" }, [
      el("h1", {}, ["Marginalia"]),
      el("p", { class: "tagline" }, ["a commonplace book for the quotes you want to keep"]),
    ]),
    toolbar,
    status,
    formSection,
    tagBar,
    list,
    buildFooter(),
  );

  // Background saves can fail (e.g. disk full); say so instead of failing silently.
  window.addEventListener(STORAGE_ERROR_EVENT, (e) => {
    setStatus(String((e as CustomEvent).detail ?? "Could not save your quotes."), true);
  });

  renderTagBar();
  renderList();
  applySearchOfTheDay();

  // --- drag-and-drop import ---
  // Drop a My Clippings.txt or .json anywhere on the app to import it. This uses
  // the same in-memory read path as the file picker: nothing is uploaded, and no
  // filesystem permission is requested.
  const dropZone = el("div", { class: "drop-zone" }, [
    el("div", { class: "drop-hint" }, ["Drop a My Clippings.txt or .json file to import"]),
  ]);
  root.append(dropZone);

  const hasFiles = (e: DragEvent): boolean =>
    Array.from(e.dataTransfer?.types ?? []).includes("Files");

  let dragDepth = 0;
  root.addEventListener("dragenter", (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepth += 1;
    root.classList.add("dragging");
  });
  root.addEventListener("dragover", (e) => {
    if (hasFiles(e)) e.preventDefault();
  });
  root.addEventListener("dragleave", (e) => {
    if (!hasFiles(e)) return;
    dragDepth -= 1;
    if (dragDepth <= 0) {
      dragDepth = 0;
      root.classList.remove("dragging");
    }
  });
  root.addEventListener("drop", (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepth = 0;
    root.classList.remove("dragging");
    const files = e.dataTransfer?.files;
    if (files && files.length) void handleFiles(files);
  });

  // --- rendering ---
  function refresh(message = ""): void {
    saveQuotes(store, quotes);
    renderTagBar();
    renderList();
    if (message) setStatus(message);
  }

  function setStatus(message: string, error = false): void {
    status.textContent = message;
    status.classList.toggle("error", error);
  }

  /** Apply a tag filter (or clear it) and repaint the tag bar + list. */
  function selectTag(tag: string | undefined): void {
    filter.tag = tag;
    renderTagBar();
    renderList();
  }

  function renderTagBar(): void {
    const tags = allTags(quotes);
    tagBar.replaceChildren();
    if (tags.length === 0) return;
    const chip = (label: string, value: string | undefined, active: boolean) =>
      el(
        "button",
        {
          type: "button",
          class: active ? "chip active" : "chip",
          onclick: () => selectTag(active ? undefined : value),
        },
        [label],
      );
    tagBar.append(chip("All", undefined, !filter.tag));
    for (const tag of tags) tagBar.append(chip(`#${tag}`, tag, filter.tag === tag));
  }

  /** First load each day: pre-fill the search with a random evocative word from the
   *  user's own quotes (never the same as last time). Once per day; skipped when the
   *  collection is empty or the browser can't persist the once-a-day flag. */
  function applySearchOfTheDay(): void {
    if (quotes.length === 0) return;
    const d = new Date();
    const today = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    try {
      if (store.getItem(WOTD_APPLIED_KEY) === today) return;
      store.setItem(WOTD_APPLIED_KEY, today);
    } catch {
      return; // storage unavailable: skip silently
    }
    pickNewWord();
  }

  /** Put a fresh random word in the search box (never the previous one). Used on the
   *  first load each day and by the "New word" button. */
  function pickNewWord(): void {
    if (quotes.length === 0) return setStatus("Add or import some quotes first.", true);
    const word = pickSearchOfTheDay(
      quotes.map((q) => [q.text, q.title, q.author].join(" ")),
      store.getItem(WOTD_LAST_KEY),
    );
    if (!word) return setStatus("No suitable word found in your quotes yet.", true);
    store.setItem(WOTD_LAST_KEY, word);
    searchInput.value = word;
    filter.text = word;
    renderList();
  }

  function renderList(): void {
    const shown = filterQuotes(quotes, filter);
    list.replaceChildren();

    if (quotes.length === 0) {
      list.append(
        el("div", { class: "empty" }, [
          "Your commonplace book is empty. Add a quote, or import your Kindle ",
          el("code", {}, ["My Clippings.txt"]),
          ".",
        ]),
      );
      return;
    }
    if (shown.length === 0) {
      list.append(el("div", { class: "empty" }, ["No quotes match your search."]));
      return;
    }
    for (const quote of shown) list.append(renderCard(quote));
  }

  function renderCard(quote: Quote): HTMLElement {
    const meta: Array<Node | string> = [];
    const cite = [quote.title, quote.author].filter(Boolean).join(" — ");
    if (cite) meta.push(el("cite", {}, [cite]));
    if (quote.page) meta.push(el("span", { class: "page" }, [quote.page]));

    const tags = el(
      "div",
      { class: "card-tags" },
      quote.tags.map((t) =>
        el(
          "button",
          {
            type: "button",
            class: "tag",
            title: `Filter by #${t}`,
            onclick: () => selectTag(filter.tag === t ? undefined : t),
          },
          [`#${t}`],
        ),
      ),
    );

    const children: Array<Node | string> = [
      el("blockquote", {}, [quote.text]),
      el("div", { class: "card-meta" }, meta),
    ];
    if (quote.tags.length) children.push(tags);
    if (quote.note) children.push(el("p", { class: "note" }, [quote.note]));
    children.push(
      el("div", { class: "card-footer" }, [
        sourceBadge(quote.source),
        el("div", { class: "card-actions" }, [
          el(
            "button",
            {
              type: "button",
              class: "btn tiny",
              title: "Edit this quote",
              onclick: () => openForm(quote),
            },
            ["Edit"],
          ),
          el(
            "button",
            {
              type: "button",
              class: "btn tiny danger",
              onclick: () => {
                if (confirm("Delete this quote?")) {
                  quotes = quotes.filter((q) => q.id !== quote.id);
                  refresh("Deleted.");
                }
              },
            },
            ["Delete"],
          ),
        ]),
      ]),
    );

    return el("article", { class: "card" }, children);
  }

  // --- add / edit form ---
  function closeForm(): void {
    formOpen = false;
    editingId = null;
    formSection.replaceChildren();
  }

  function toggleForm(): void {
    if (formOpen) closeForm();
    else openForm();
  }

  /** Open the form to add a new quote, or (with `editing`) to change one. */
  function openForm(editing?: Quote): void {
    formOpen = true;
    editingId = editing?.id ?? null;
    formSection.replaceChildren();

    const text = el("textarea", {
      class: "field",
      rows: 3,
      placeholder: "The passage…",
      "aria-label": "Quote text",
    });
    const title = el("input", { class: "field", type: "text", placeholder: "Book title" });
    const author = el("input", { class: "field", type: "text", placeholder: "Author" });
    const page = el("input", { class: "field", type: "text", placeholder: "Page / location (optional)" });
    const tagsField = el("input", { class: "field", type: "text", placeholder: "Tags, comma separated" });
    const note = el("textarea", { class: "field", rows: 2, placeholder: "A note (optional)" });

    if (editing) {
      text.value = editing.text;
      title.value = editing.title;
      author.value = editing.author;
      page.value = editing.page;
      tagsField.value = editing.tags.join(", ");
      note.value = editing.note;
    }

    const form = el("form", { class: "add-form" }, [
      el("p", { class: "form-title" }, [editing ? "Edit quote" : "New quote"]),
      text,
      el("div", { class: "field-row" }, [title, author]),
      el("div", { class: "field-row" }, [page, tagsField]),
      note,
      el("div", { class: "form-actions" }, [
        el("button", { type: "submit", class: "btn primary" }, [
          editing ? "Save changes" : "Save quote",
        ]),
        el("button", { type: "button", class: "btn", onclick: closeForm }, ["Cancel"]),
      ]),
    ]);

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const fields = {
        text: text.value,
        title: title.value,
        author: author.value,
        page: page.value,
        tags: tagsField.value.split(","),
        note: note.value,
      };
      try {
        if (editingId) {
          const id = editingId;
          quotes = quotes.map((q) => (q.id === id ? updateQuote(q, fields) : q));
          closeForm();
          refresh("Changes saved.");
        } else {
          const quote = createQuote({ ...fields, source: "manual" }, deps);
          quotes = [quote, ...quotes];
          closeForm();
          refresh("Quote saved.");
        }
      } catch (err) {
        setStatus(err instanceof Error ? err.message : "Could not save quote.", true);
      }
    });

    formSection.append(form);
    text.focus();
  }

  // --- import / export ---
  // Only .json backups and .txt (Kindle clippings) are imported. Anything else is
  // skipped: drag-and-drop bypasses the file picker's `accept` filter, so this is
  // the single place that decides what a file actually is.
  async function handleFiles(files: FileList): Promise<void> {
    const imported: Quote[] = [];
    const skipped: string[] = [];
    try {
      for (const file of Array.from(files)) {
        const name = file.name.toLowerCase();
        if (name.endsWith(".json")) {
          const content = await file.text();
          // A .json is either a KOReader export or a Marginalia backup; the two
          // shapes are distinct, so try KOReader first and fall back.
          const koreader = parseKoreaderJson(content);
          if (koreader) {
            for (const e of koreader) {
              imported.push(createQuote({ ...e, source: "koreader" }, deps));
            }
          } else {
            imported.push(...fromJSON(content));
          }
        } else if (name.endsWith(".txt")) {
          for (const entry of parseKindleClippings(await file.text())) {
            imported.push(
              createQuote(
                {
                  text: entry.text,
                  title: entry.title,
                  author: entry.author,
                  page: entry.page,
                  source: "kindle",
                },
                deps,
              ),
            );
          }
        } else {
          skipped.push(file.name);
        }
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Import failed.", true);
      return;
    }

    const before = quotes.length;
    quotes = dedupe([...quotes, ...imported]);
    const added = quotes.length - before;

    const messages: string[] = [];
    if (added > 0) messages.push(`Imported ${added} new quote${added === 1 ? "" : "s"}.`);
    if (skipped.length) {
      messages.push(
        `Skipped ${skipped.length} unsupported file${skipped.length === 1 ? "" : "s"}; import a .txt or .json.`,
      );
    }
    if (messages.length === 0) messages.push("Nothing new to import.");

    refresh();
    setStatus(messages.join(" "), added === 0 && skipped.length > 0);
  }

  function exportMarkdown(): void {
    if (quotes.length === 0) return setStatus("Nothing to export yet.", true);
    download("marginalia.md", toMarkdown(quotes), "text/markdown");
  }

  function exportJson(): void {
    if (quotes.length === 0) return setStatus("Nothing to export yet.", true);
    download("marginalia-backup.json", toJSON(quotes), "application/json");
  }
}
