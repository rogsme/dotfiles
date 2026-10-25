// Switches the Overview and Full plan tabs. Without this script both views stay visible, one after the other.
(() => {
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  if (!tabs.length) return;
  const views = [...document.querySelectorAll("[data-panel]:not([role=tab])")];

  function show(name, focus = false) {
    for (const tab of tabs) {
      const selected = tab.dataset.panel === name;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected && focus) tab.focus();
    }
    for (const view of views) view.hidden = view.dataset.panel !== name;
    document.dispatchEvent(new Event("plan-tab-shown"));
  }

  // A link to a heading in the hidden view switches to that view first.
  function reveal() {
    const target = location.hash ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
    const view = target?.closest("[role=tabpanel]");
    if (!view?.hidden) return;
    show(view.dataset.panel);
    target.scrollIntoView();
  }

  for (const [index, tab] of tabs.entries()) {
    tab.addEventListener("click", () => show(tab.dataset.panel));
    tab.addEventListener("keydown", (event) => {
      const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
      if (!step) return;
      event.preventDefault();
      show(tabs[(index + step + tabs.length) % tabs.length].dataset.panel, true);
    });
  }
  addEventListener("hashchange", reveal);
  show("overview");
  reveal();
})();
