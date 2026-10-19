// Classic scripts work in Lavish's opaque-origin sandbox without CORS headers.
(() => {
  const mermaid = globalThis.mermaid;
  const pending = new Set(document.querySelectorAll(".diagram"));
  let running = false;
  let again = false;
  mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "default", flowchart: { htmlLabels: false } });

  // A diagram in a hidden tab has no size to lay out, so it waits for tabs.js to show its tab.
  async function render() {
    if (running) { again = true; return; }
    running = true;
    try {
      do {
        again = false;
        for (const element of pending) {
          if (element.closest("[hidden]")) continue;
          pending.delete(element);
          const source = element.textContent;
          try { await mermaid.run({ nodes: [element], suppressErrors: false }); }
          catch {
            element.textContent = source;
            const warning = document.createElement("p");
            warning.className = "review-warning";
            warning.textContent = "This diagram did not render. Its source is preserved above; ask the planner to repair it.";
            element.after(warning);
          }
        }
      } while (again);
    } finally { running = false; }
  }

  document.addEventListener("plan-tab-shown", render);
  void render();
})();
