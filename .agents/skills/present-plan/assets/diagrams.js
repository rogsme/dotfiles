// Renders each .diagram with Mermaid, in the current theme, once its tab is visible.
(() => {
  const mermaid = globalThis.mermaid;
  const diagrams = [...document.querySelectorAll(".diagram")];
  for (const element of diagrams) element.dataset.source = element.textContent;
  if (!mermaid) {
    for (const element of diagrams) warn(element, "Diagrams load Mermaid from the CDN, which is unreachable. The source stays above.");
    return;
  }
  let pending = new Set(diagrams);
  let running = false;
  let again = false;

  function warn(element, text) {
    if (element.nextElementSibling?.classList.contains("review-warning")) return;
    const warning = document.createElement("p");
    warning.className = "review-warning";
    warning.textContent = text;
    element.after(warning);
  }

  const dark = () => document.documentElement.dataset.theme === "dark" ||
    (!document.documentElement.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);

  // A diagram in a hidden tab has no size to lay out, so it waits for tabs.js to show its tab.
  async function render() {
    if (running) { again = true; return; }
    running = true;
    try {
      do {
        again = false;
        mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: dark() ? "dark" : "default", flowchart: { htmlLabels: false } });
        for (const element of pending) {
          if (element.closest("[hidden]")) continue;
          pending.delete(element);
          element.removeAttribute("data-processed");
          element.textContent = element.dataset.source;
          try { await mermaid.run({ nodes: [element], suppressErrors: false }); }
          catch {
            element.textContent = element.dataset.source;
            warn(element, "This diagram did not render. Its source is preserved above; ask the planner to repair it.");
          }
        }
      } while (again);
    } finally { running = false; }
    document.dispatchEvent(new Event("plan-diagrams-rendered"));
  }

  // A theme change redraws every diagram in the new colors.
  document.addEventListener("plan-theme-changed", () => { pending = new Set(diagrams); void render(); });
  document.addEventListener("plan-tab-shown", render);
  void render();
})();
