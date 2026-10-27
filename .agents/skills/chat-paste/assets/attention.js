// Decides how a page asks for attention when it loads on a revision this browser has not seen. No DOM, so Node tests it.
(() => {
  // seen: the last revision acknowledged here, or null on the first load. Returns the revision to store, or null.
  function decide({ seen, revision, focused, visibility, permission }) {
    if (!Number.isInteger(seen)) return { mark: false, notify: false, store: revision };
    if (seen >= revision) return { mark: false, notify: false, store: null };
    if (focused) return { mark: false, notify: false, store: revision };
    return { mark: true, notify: visibility === "hidden" && permission === "granted", store: null };
  }

  globalThis.PlanAttention = { decide };
})();
