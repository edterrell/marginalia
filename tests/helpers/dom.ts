// Small helpers for driving the app in jsdom. Not a test file itself.

export function clickButton(root: ParentNode, text: string): void {
  const btn = [...root.querySelectorAll("button")].find(
    (b) => b.textContent?.trim() === text,
  );
  if (!btn) throw new Error(`Button not found: ${text}`);
  (btn as HTMLButtonElement).click();
}

export function fill(root: ParentNode, selector: string, value: string): void {
  const field = root.querySelector(selector);
  if (!field) throw new Error(`Field not found: ${selector}`);
  (field as HTMLInputElement | HTMLTextAreaElement).value = value;
  field.dispatchEvent(new Event("input", { bubbles: true }));
}

export function submit(root: ParentNode, selector = "form"): void {
  const form = root.querySelector(selector);
  if (!form) throw new Error(`Form not found: ${selector}`);
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}
