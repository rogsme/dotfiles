// The message chrome: theme toggle, comment mode, the comment panel, Done, and live updates.
(() => {
  const root = document.documentElement;
  const revision = Number(root.dataset.messageRevision);
  const sourceDigest = root.dataset.messageDigest;
  const base = location.pathname.replace(/[^/]*$/, "");
  const live = /^\/r\/[0-9a-f]{32}\/$/.test(base);
  const article = document.querySelector("article");
  const $ = (selector) => document.querySelector(selector);
  const commentButton = $("#cp-comment");
  const themeButton = $("#cp-theme");
  const notifyButton = $("#cp-notify");
  const changesButton = $("#cp-changes");
  const doneButton = $("#cp-done");
  const hint = $("#cp-hint");
  const banner = $("#cp-banner");
  const draftsKey = `chat-paste:${base}:drafts`;
  const targets = new Map();
  let drafts = loadDrafts();
  let state = null;
  let offline = false;
  let commentMode = false;
  let composer = null;
  let suppressClick = false;

  function element(tag, attributes = {}, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attributes)) {
      if (key === "text") node.textContent = value;
      else if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
      else node.setAttribute(key, value);
    }
    node.append(...children.filter(Boolean));
    return node;
  }

  // Drafts survive a reload, including the one a new revision triggers.
  function loadDrafts() {
    try { return JSON.parse(sessionStorage.getItem(draftsKey) || "[]"); } catch { return []; }
  }
  function saveDrafts() {
    try { sessionStorage.setItem(draftsKey, JSON.stringify(drafts)); } catch { /* drafts then live only in this page */ }
  }

  async function api(route, body) {
    const init = body === undefined
      ? { headers: { "X-Chat-Paste": "1" } }
      : { method: "POST", headers: { "Content-Type": "application/json", "X-Chat-Paste": "1" }, body: JSON.stringify(body) };
    const response = await fetch(base + route, init);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `The viewer answered HTTP ${response.status}.`);
    return data;
  }

  // Theme: the server writes the saved choice onto <html>; without one the page follows the system.
  const system = matchMedia("(prefers-color-scheme: dark)");
  const dark = () => root.dataset.theme ? root.dataset.theme === "dark" : system.matches;
  function paintTheme() {
    themeButton.textContent = dark() ? "☀️" : "\u{1F319}";
    themeButton.title = dark() ? "Switch to light mode" : "Switch to dark mode";
  }
  themeButton.addEventListener("click", async () => {
    root.dataset.theme = dark() ? "light" : "dark";
    paintTheme();
    if (live) await api("api/theme", { theme: root.dataset.theme }).catch(() => {});
  });
  system.addEventListener("change", () => { if (!root.dataset.theme) paintTheme(); });
  paintTheme();

  // Targets
  const BLOCKS = "p, li, pre, blockquote";
  const blockOf = (node) => (node.nodeType === 1 ? node : node.parentElement).closest(BLOCKS) || article;

  // The context is the block's own text around the range. A nested list is its own block,
  // so a bullet's context never runs into the bullets under it.
  function textTarget(range, kindOfTarget) {
    const block = blockOf(range.startContainer);
    let prefix = "";
    let suffix = "";
    try {
      const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (blockOf(node) !== block) continue;
        if (node === range.startContainer) prefix += node.data.slice(0, range.startOffset);
        if (node === range.endContainer) suffix += node.data.slice(range.endOffset);
        if (node === range.startContainer || node === range.endContainer) continue;
        if (range.comparePoint(node, node.length) < 0) prefix += node.data;
        else if (range.comparePoint(node, 0) > 0) suffix += node.data;
      }
      prefix = prefix.slice(-60);
      suffix = suffix.slice(0, 60);
    } catch { /* a range that leaves its block keeps no context */ }
    return { kind: kindOfTarget, quote: range.toString().replace(/\s+/g, " ").trim(), prefix, suffix, range };
  }

  const wordCharacter = /[\p{L}\p{N}_'’-]/u;
  function wordAt(x, y) {
    let node = null;
    let offset = 0;
    if (document.caretPositionFromPoint) {
      const position = document.caretPositionFromPoint(x, y);
      if (position) { node = position.offsetNode; offset = position.offset; }
    } else if (document.caretRangeFromPoint) {
      const range = document.caretRangeFromPoint(x, y);
      if (range) { node = range.startContainer; offset = range.startOffset; }
    }
    if (!node || node.nodeType !== Node.TEXT_NODE || !article.contains(node)) return null;
    let start = offset;
    let end = offset;
    while (start > 0 && wordCharacter.test(node.data[start - 1])) start--;
    while (end < node.data.length && wordCharacter.test(node.data[end])) end++;
    if (start === end) return null;
    const range = document.createRange();
    range.setStart(node, start);
    range.setEnd(node, end);
    return range;
  }

  function describe(target) {
    if (target.kind === "general") return "General comment";
    if (target.kind === "word") return `Word "${target.quote}"`;
    return `"${target.quote}"`;
  }

  // Highlights use the CSS Custom Highlight API, so the message's DOM never changes.
  function paintTargets() {
    const ranges = drafts.map((draft) => targets.get(draft.id)).filter((target) => target instanceof Range);
    if (composer?.target.range) ranges.push(composer.target.range);
    if (globalThis.CSS?.highlights) CSS.highlights.set("cp-draft", new Highlight(...ranges));
  }

  // Composer
  function closeComposer() {
    composer?.box.remove();
    composer = null;
    paintTargets();
    scheduleHover();
  }

  function openComposer(target, rect) {
    closeComposer();
    const field = element("textarea", { "aria-label": "Comment", placeholder: "What should change?" });
    const save = () => {
      const text = field.value.trim();
      if (!text) return field.focus();
      const id = `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      drafts.push({ id, text, revision, sourceDigest, target: { kind: target.kind, quote: target.quote, prefix: target.prefix, suffix: target.suffix } });
      targets.set(id, target.range);
      saveDrafts();
      getSelection()?.removeAllRanges();
      closeComposer();
      render();
    };
    field.addEventListener("keydown", (event) => {
      if (event.key === "Escape") { event.stopPropagation(); closeComposer(); }
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) { event.preventDefault(); save(); }
    });
    const box = element("div", { class: "cp-composer", role: "dialog", "aria-label": "New comment" },
      element("div", { class: "cp-target-label", text: describe(target) }),
      field,
      element("div", { class: "cp-row" },
        element("button", { type: "button", class: "cp-button", text: "Cancel", onclick: closeComposer }),
        element("button", { type: "button", class: "cp-button primary", text: "Save", onclick: save })));
    document.body.append(box);
    const width = box.offsetWidth;
    box.style.top = `${rect.bottom + scrollY + 8}px`;
    box.style.left = `${Math.max(16, Math.min(rect.left + scrollX, scrollX + document.documentElement.clientWidth - width - 16))}px`;
    composer = { box, target };
    paintTargets();
    field.focus({ preventScroll: true });
  }

  // Hover: in comment mode a highlight glides to the word under the pointer.
  const hover = element("div", { class: "cp-hover", "aria-hidden": "true" });
  document.body.append(hover);
  let pointer = null;
  let frame = 0;
  let dragging = false;

  function hoverRect(x, y) {
    const under = document.elementFromPoint(x, y);
    if (!under || !article.contains(under)) return null;
    const range = wordAt(x, y);
    // The caret lands on the nearest word even in a margin, so the pointer must be over the word itself.
    return range && [...range.getClientRects()].find((item) => x >= item.left - 2 && x <= item.right + 2 && y >= item.top - 2 && y <= item.bottom + 2);
  }

  function paintHover() {
    frame = 0;
    const rect = commentMode && !dragging && !composer && pointer ? hoverRect(...pointer) : null;
    if (!rect) return hover.classList.remove("on");
    const pad = 2;
    const appearing = !hover.classList.contains("on");
    hover.className = `cp-hover${appearing ? " jump" : ""}`;
    hover.style.width = `${rect.width + pad * 2}px`;
    hover.style.height = `${rect.height + pad * 2}px`;
    hover.style.transform = `translate(${rect.left + scrollX - pad}px, ${rect.top + scrollY - pad}px)`;
    // A highlight that appears fades in where it is, instead of sliding over from the last word.
    if (appearing) void hover.offsetWidth;
    hover.classList.remove("jump");
    hover.classList.add("on");
  }
  const scheduleHover = () => { frame ||= requestAnimationFrame(paintHover); };
  document.addEventListener("pointermove", (event) => { pointer = [event.clientX, event.clientY]; scheduleHover(); });
  document.addEventListener("pointerleave", () => { pointer = null; scheduleHover(); });
  addEventListener("scroll", scheduleHover, { passive: true });
  document.addEventListener("pointerup", () => { dragging = false; scheduleHover(); });

  article.addEventListener("pointerdown", () => { suppressClick = false; dragging = true; scheduleHover(); });
  article.addEventListener("mouseup", (event) => {
    if (!commentMode || event.target.closest(".cp-composer")) return;
    const selection = getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (!article.contains(range.commonAncestorContainer)) return;
    const target = textTarget(range.cloneRange(), "text");
    if (!target.quote) return;
    suppressClick = true;
    openComposer(target, range.getBoundingClientRect());
  });
  article.addEventListener("click", (event) => {
    if (!commentMode) return;
    event.preventDefault();
    if (suppressClick) { suppressClick = false; return; }
    const range = wordAt(event.clientX, event.clientY);
    if (range) openComposer(textTarget(range, "word"), range.getBoundingClientRect());
  }, true);

  // Panel
  // A general comment is on the message as a whole, so it has no target to highlight.
  const generalField = element("textarea", { id: "cp-general-text", "aria-label": "General comment", placeholder: "A comment on the whole message" });
  const addGeneral = () => {
    const text = generalField.value.trim();
    if (!text) return generalField.focus();
    drafts.push({
      id: `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, text, revision, sourceDigest,
      target: { kind: "general", quote: "", prefix: "", suffix: "" },
    });
    generalField.value = "";
    saveDrafts();
    render();
  };
  generalField.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) { event.preventDefault(); addGeneral(); }
  });
  const generalButton = element("button", { type: "button", id: "cp-general-add", class: "cp-button", text: "Add", onclick: addGeneral });
  const general = element("div", { class: "cp-general" },
    element("label", { for: "cp-general-text", text: "General comment" }), generalField, element("div", { class: "cp-row" }, generalButton));
  const draftList = element("div", { id: "cp-drafts" });
  const sentList = element("div", { id: "cp-sent" });
  const sendButton = element("button", { type: "button", id: "cp-send", class: "cp-button primary", text: "Send comments", disabled: "" });
  const panel = element("aside", { id: "cp-panel", "aria-label": "Comments" },
    element("div", { class: "cp-panel-head" }, element("span", { text: "Comments" }),
      element("button", { type: "button", class: "cp-button", text: "Close", onclick: () => setCommentMode(false) })),
    element("div", { class: "cp-panel-body" }, general, element("h3", { text: "Drafts" }), draftList, element("h3", { text: "Sent" }), sentList),
    element("div", { class: "cp-panel-foot" }, sendButton));
  document.body.append(panel);

  function draftCard(draft) {
    const text = element("div", { class: "cp-text", text: draft.text });
    const card = element("div", { class: "cp-card" }, element("div", { class: "cp-target-label", text: describe(draft.target) }), text);
    const edit = () => {
      const field = element("textarea", { "aria-label": "Edit comment" });
      field.value = draft.text;
      const row = element("div", { class: "cp-row" },
        element("button", { type: "button", class: "cp-button", text: "Cancel", onclick: render }),
        element("button", { type: "button", class: "cp-button primary", text: "Save", onclick: () => {
          if (!field.value.trim()) return field.focus();
          draft.text = field.value.trim();
          saveDrafts();
          render();
        } }));
      card.replaceChildren(card.firstChild, field, row);
      field.focus();
    };
    card.append(element("div", { class: "cp-row" },
      element("button", { type: "button", class: "cp-button", text: "Edit", onclick: edit }),
      element("button", { type: "button", class: "cp-button", text: "Delete", onclick: () => {
        drafts = drafts.filter((item) => item !== draft);
        targets.delete(draft.id);
        saveDrafts();
        render();
      } })));
    return card;
  }

  function sentCards() {
    const batches = [...(state?.batches || [])].reverse();
    if (!batches.length) return [element("p", { class: "cp-empty", text: "Nothing sent yet." })];
    return batches.flatMap((batch) => [
      element("p", { class: "cp-batch-note", text: `Batch ${batch.seq}, on revision ${batch.revision}: ${batch.reply ? "answered" : "waiting for the agent"}` }),
      batch.reply?.message && element("p", { class: "cp-batch-note", text: batch.reply.message }),
      ...batch.comments.map((comment) => {
        const answer = batch.reply?.answers.find((item) => item.id === comment.id);
        return element("div", { class: "cp-card sent" },
          element("div", { class: "cp-target-label", text: describe(comment.target) }),
          element("div", { class: "cp-text", text: comment.text }),
          answer && element("div", { class: "cp-answer" },
            element("span", { class: `badge ${answer.outcome === "changed" ? "changed" : "kept"}`, text: answer.outcome === "changed" ? "Changed" : "Kept" }),
            document.createTextNode(answer.text)));
      }),
    ]);
  }

  sendButton.addEventListener("click", async () => {
    sendButton.disabled = true;
    try {
      await api("api/feedback", { comments: drafts });
      drafts = [];
      targets.clear();
      saveDrafts();
      await refresh();
    } catch (error) { hint.textContent = error.message; render(); }
  });

  function setCommentMode(on) {
    commentMode = on && !locked();
    if (!commentMode) closeComposer();
    document.body.classList.toggle("comment-mode", commentMode);
    document.body.classList.toggle("panel-open", commentMode);
    commentButton.setAttribute("aria-pressed", String(commentMode));
    render();
    scheduleHover();
  }
  commentButton.addEventListener("click", () => setCommentMode(!commentMode));
  document.addEventListener("keydown", (event) => {
    if (event.target.closest?.("textarea, input, [contenteditable]") || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === "c" && !commentButton.disabled) setCommentMode(!commentMode);
    if (event.key === "Escape") composer ? closeComposer() : setCommentMode(false);
  });

  // Done
  const closed = () => state && state.status !== "open";
  const locked = () => !live || offline || !state || closed();

  function blocker() {
    if (!live) return "Open this page through the link the agent printed.";
    if (offline || !state) return "The viewer is not reachable.";
    if (closed()) return "This message is closed.";
    if (state.revision !== revision) return `Reload: revision ${state.revision} exists.`;
    if (drafts.length) return `Send or discard ${drafts.length} draft${drafts.length === 1 ? "" : "s"} first.`;
    if (state.pending) return "The agent is revising.";
    return null;
  }

  const dialog = element("dialog", { "aria-label": "Confirm" });
  document.body.append(dialog);
  doneButton.addEventListener("click", () => {
    dialog.replaceChildren(
      element("p", { text: "Finish this message?" }),
      element("p", { class: "cp-empty", text: "The agent stops waiting for comments. Copy the message first if you have not." }),
      element("div", { class: "cp-row" },
        element("button", { type: "button", class: "cp-button", text: "Cancel", onclick: () => dialog.close() }),
        element("button", { type: "button", class: "cp-button primary", text: "Done", onclick: async () => {
          dialog.close();
          try { await api("api/done", { revision, sourceDigest }); }
          catch (error) { hint.textContent = error.message; }
          await refresh();
        } })));
    dialog.showModal();
  });

  function showBanner(className, text) {
    banner.className = className || "";
    banner.textContent = text || "";
    banner.hidden = !text;
  }

  function render() {
    const reason = blocker();
    doneButton.disabled = Boolean(reason);
    doneButton.title = reason || "Finish this message";
    doneButton.hidden = Boolean(state && closed());
    commentButton.disabled = locked();
    const count = commentButton.querySelector(".count");
    count.textContent = String(drafts.length);
    count.hidden = !drafts.length;
    hint.textContent = commentMode ? "Select text, or click a word." : reason && !closed() ? reason : "";
    sendButton.disabled = !drafts.length || locked();
    generalField.disabled = generalButton.disabled = locked();
    sendButton.textContent = drafts.length ? `Send ${drafts.length} comment${drafts.length === 1 ? "" : "s"}` : "Send comments";
    draftList.replaceChildren(...(drafts.length ? drafts.map(draftCard) : [element("p", { class: "cp-empty", text: "Select text or click a word, or write a general comment above." })]));
    sentList.replaceChildren(...sentCards());
    if (!live) showBanner("offline", "Open this page through the link the agent printed to comment.");
    else if (offline) showBanner("offline", "The viewer is not reachable. Your drafts stay in this tab, and the copy buttons still work.");
    else if (state?.status === "done") showBanner("closed", "Finished. You can close this tab; the copy buttons still work.");
    else if (state?.status === "ended") showBanner("closed", "This message is closed. The copy buttons still work.");
    else showBanner();
    paintTargets();
  }

  // A failed check retries on its own, so the offline banner clears as soon as the viewer answers.
  let retryTimer = 0;
  const retrySoon = () => { clearTimeout(retryTimer); retryTimer = setTimeout(refresh, 2000); };
  async function refresh() {
    clearTimeout(retryTimer);
    try {
      state = await api("api/state");
      offline = false;
    } catch { offline = true; retrySoon(); }
    if (locked() && commentMode) setCommentMode(false);
    render();
  }

  // Attention: a page that reloads onto a revision while nobody looks marks its tab title,
  // and shows a notification when the tab is hidden and the browser allows them.
  const seenKey = `chat-paste:${base}:seen`;
  const title = document.title;
  function readSeen() {
    try { const value = localStorage.getItem(seenKey); return value === null ? null : Number(value); } catch { return null; }
  }
  function storeSeen(value) {
    try { localStorage.setItem(seenKey, String(value)); } catch { /* the next load then counts as a first load */ }
  }
  function acknowledge() {
    if (document.visibilityState !== "visible") return;
    document.title = title;
    if (!(readSeen() >= revision)) storeSeen(revision);
  }
  const canAsk = () => live && "Notification" in globalThis && isSecureContext && Notification.permission === "default";
  notifyButton.textContent = "\u{1F514}";
  notifyButton.hidden = !canAsk();
  notifyButton.addEventListener("click", async () => {
    try { await Notification.requestPermission(); } catch { /* the title mark still works */ }
    notifyButton.hidden = !canAsk();
  });
  if (live && globalThis.PlanAttention) {
    const decision = PlanAttention.decide({
      seen: readSeen(), revision, focused: document.hasFocus(), visibility: document.visibilityState,
      permission: "Notification" in globalThis ? Notification.permission : "unsupported",
    });
    if (decision.store !== null) storeSeen(decision.store);
    if (decision.mark) document.title = `(new) ${title}`;
    if (decision.notify) {
      try {
        const notice = new Notification(`Revision ${revision} is ready`, { body: title, tag: seenKey });
        notice.addEventListener("click", () => { focus(); notice.close(); });
      } catch { /* the title mark still shows */ }
    }
    addEventListener("focus", acknowledge);
    document.addEventListener("visibilitychange", acknowledge);
  }

  // Changes: this browser keeps the blocks of the last two revisions it showed of each message, and marks
  // what changed since the earlier one. Changed words get a highlight and new blocks a class, so the
  // message's text and structure never change.
  const revisionsKey = `chat-paste:${base}:revisions`;
  const showChangesKey = "chat-paste:changes";

  // Each block's own text, with whitespace collapsed, and where each of its characters sits in the DOM.
  function pageBlocks() {
    const found = new Map();
    const walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const block = blockOf(node);
      if (block === article) continue;
      let entry = found.get(block);
      if (!entry) found.set(block, entry = { element: block, characters: [], positions: [] });
      for (let offset = 0; offset < node.data.length; offset++) {
        const space = /\s/.test(node.data[offset]);
        if (space && (!entry.characters.length || entry.characters.at(-1) === " ")) continue;
        entry.characters.push(space ? " " : node.data[offset]);
        entry.positions.push([node, offset]);
      }
    }
    const blocks = [];
    for (const entry of found.values()) {
      if (entry.characters.at(-1) === " ") { entry.characters.pop(); entry.positions.pop(); }
      if (entry.characters.length) blocks.push({ element: entry.element, positions: entry.positions, tab: null, tag: entry.element.tagName.toLowerCase(), text: entry.characters.join("") });
    }
    return blocks;
  }

  // Keeps only the messages this browser opened most recently.
  function pruneRevisions(keep = 20) {
    const records = [];
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (!/^chat-paste:.*:revisions$/.test(key)) continue;
      let at = 0;
      try { at = JSON.parse(localStorage.getItem(key)).at || 0; } catch { /* a broken record goes first */ }
      records.push({ key, at });
    }
    records.sort((a, b) => b.at - a.at);
    for (const { key } of records.slice(keep)) localStorage.removeItem(key);
  }

  // Stores this revision and returns the one to compare it with: the previous revision when this one is
  // already stored, so a reload keeps the marks, or the stored one when this revision is newer.
  function rememberRevision(blocks) {
    const record = () => ({ revision, blocks: blocks.map(({ tab, tag, text }) => ({ tab, tag, text })) });
    let stored = null;
    try { stored = JSON.parse(localStorage.getItem(revisionsKey) || "null"); } catch { /* a broken record starts over */ }
    let baseline = null;
    let next = null;
    if (stored?.current?.revision === revision) { baseline = stored.previous || null; next = { ...stored, at: Date.now() }; }
    else if (stored?.current?.revision < revision) { baseline = stored.current; next = { current: record(), previous: stored.current, at: Date.now() }; }
    else if (!stored?.current) next = { current: record(), previous: null, at: Date.now() };
    // A newer revision already stored means this page is out of date: it compares with nothing.
    if (next) {
      try { localStorage.setItem(revisionsKey, JSON.stringify(next)); pruneRevisions(); } catch { /* the marks then last only for this load */ }
    }
    return baseline;
  }

  function changesSince(blocks, baseline) {
    if (!baseline || !globalThis.PlanChanges) return null;
    const oldBlocks = Array.isArray(baseline.blocks) ? baseline.blocks : [];
    const ranges = [];
    const elements = [];
    let count = 0;
    for (const [index, item] of PlanChanges.align(oldBlocks, blocks).entries()) {
      if (item.status === "same") continue;
      count++;
      const block = blocks[index];
      const spans = item.status === "changed" ? PlanChanges.wordDiff(oldBlocks[item.from].text, block.text) : [];
      // A change that only removed words leaves nothing to highlight, so the block shows it.
      if (!spans.length) { elements.push(block.element); continue; }
      for (const [start, end] of spans) {
        const range = document.createRange();
        range.setStart(...block.positions[start]);
        const [node, offset] = block.positions[end - 1];
        range.setEnd(node, offset + 1);
        ranges.push(range);
      }
    }
    return { ranges, elements, count, since: baseline.revision };
  }

  function paintChanges(changes, show) {
    for (const item of changes.elements) item.classList.toggle("cp-changed-block", show);
    if (globalThis.CSS?.highlights) {
      if (show) CSS.highlights.set("cp-changed", new Highlight(...changes.ranges));
      else CSS.highlights.delete("cp-changed");
    }
    changesButton.setAttribute("aria-pressed", String(show));
  }

  if (live) {
    const blocks = pageBlocks();
    const changes = changesSince(blocks, rememberRevision(blocks));
    if (changes?.count) {
      let show = true;
      try { show = localStorage.getItem(showChangesKey) !== "hidden"; } catch { /* marks show by default */ }
      changesButton.textContent = `Changes (${changes.count})`;
      changesButton.title = `Mark what changed since revision ${changes.since}`;
      changesButton.hidden = false;
      changesButton.addEventListener("click", () => {
        const next = changesButton.getAttribute("aria-pressed") !== "true";
        try { localStorage.setItem(showChangesKey, next ? "shown" : "hidden"); } catch { /* the choice then lasts only for this load */ }
        paintChanges(changes, next);
      });
      paintChanges(changes, show);
    }
  }

  render();
  if (!live) return;
  function connect() {
    const events = new EventSource(base + "events");
    events.addEventListener("state", (event) => {
      if (Number(JSON.parse(event.data).split(":")[0]) !== revision) return location.reload();
      void refresh();
    });
    events.addEventListener("open", () => { void refresh(); });
    events.addEventListener("error", () => {
      offline = true;
      render();
      retrySoon();
      // The browser reconnects a dropped stream itself; one it has closed needs a new EventSource.
      if (events.readyState === EventSource.CLOSED) setTimeout(connect, 2000);
    });
  }
  connect();
  void refresh();
})();
