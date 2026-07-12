// @vitest-environment jsdom
// Regression guard for the app's core safety property: untrusted quote text must
// render as inert TEXT, never as live markup. If someone ever swaps a textContent
// assignment for innerHTML, this test fails.
import { describe, expect, it } from "vitest";
import { mountApp } from "../src/ui/render.js";
import { createMemoryStore } from "../src/lib/storage.js";
import { clickButton, fill, submit } from "./helpers/dom.js";

describe("XSS safety", () => {
  it("renders a malicious passage as text, not executable markup", () => {
    document.body.innerHTML = '<div id="app"></div>';
    const root = document.getElementById("app")!;
    mountApp(root, createMemoryStore());

    const payload = `<img src=x onerror="globalThis.__pwned=true"><script>globalThis.__pwned=true</script>`;
    clickButton(root, "+ Add quote");
    fill(root, 'textarea[aria-label="Quote text"]', payload);
    fill(root, 'input[placeholder="Book title"]', `<b>Injected</b>`);
    submit(root, "form.add-form");

    const blockquote = root.querySelector(".card blockquote")!;
    // The payload is present verbatim as text...
    expect(blockquote.textContent).toContain("<img");
    expect(blockquote.textContent).toContain("<script>");
    // ...but produced zero real elements, and nothing executed.
    expect(blockquote.childElementCount).toBe(0);
    expect(document.querySelectorAll("img").length).toBe(0);
    expect(document.querySelectorAll(".card script").length).toBe(0);
    expect((globalThis as Record<string, unknown>).__pwned).toBeUndefined();
    // The title is inert too.
    expect(root.querySelector(".card cite")!.querySelector("b")).toBeNull();
  });
});
