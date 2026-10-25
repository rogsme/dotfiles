// The review chrome: theme toggle, comment mode, the comment panel, Approve or Done, and live updates.
(() => {
  const root = document.documentElement;
  const kind = root.dataset.sessionKind;
  const revision = Number(root.dataset.planRevision);
  const sourceDigest = root.dataset.planDigest;
  const base = location.pathname.replace(/[^/]*$/, "");
  const live = /^\/r\/[0-9a-f]{32}\/$/.test(base);
  const article = document.querySelector("article");
  const $ = (selector) => document.querySelector(selector);
  const commentButton = $("#pp-comment");
  const themeButton = $("#pp-theme");
  const approveButton = $("#pp-approve");
  const hint = $("#pp-hint");
  const banner = $("#pp-banner");
  const draftsKey = `present-plan:${base}:drafts`;
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
      ? { headers: { "X-Plan-Review": "1" } }
      : { method: "POST", headers: { "Content-Type": "application/json", "X-Plan-Review": "1" }, body: JSON.stringify(body) };
    const response = await fetch(base + route, init);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `The viewer answered HTTP ${response.status}.`);
    return data;
  }

  // Theme: the server writes the saved choice onto <html>; without one the page follows the system.
  const system = matchMedia("(prefers-color-scheme: dark)");
  const dark = () => root.dataset.theme ? root.dataset.theme === "dark" : system.matches;
  function paintTheme() {
    themeButton.textContent = dark() ? "\u2600\uFE0F" : "\u{1F319}";
    themeButton.title = dark() ? "Switch to light mode" : "Switch to dark mode";
  }
  themeButton.addEventListener("click", async () => {
    root.dataset.theme = dark() ? "light" : "dark";
    paintTheme();
    document.dispatchEvent(new Event("plan-theme-changed"));
    if (live) await api("api/theme", { theme: root.dataset.theme }).catch(() => {});
  });
  system.addEventListener("change", () => {
    if (root.dataset.theme) return;
    paintTheme();
    document.dispatchEvent(new Event("plan-theme-changed"));
  });
  paintTheme();

  // Targets
  const tabOf = (node) => (node.nodeType === 1 ? node : node.parentElement).closest("[role=tabpanel]")?.dataset.panel || null;

  function headingsOf(node) {
    const target = node.nodeType === 1 ? node : node.parentElement;
    const panel = target.closest("[role=tabpanel]");
    const stack = [];
    for (const heading of article.querySelectorAll("h1, h2, h3, h4, h5, h6")) {
      const position = heading.compareDocumentPosition(target);
      if (heading !== target && !(position & Node.DOCUMENT_POSITION_FOLLOWING) && !(position & Node.DOCUMENT_POSITION_CONTAINED_BY)) break;
      const own = heading.closest("[role=tabpanel]");
      if (own && own !== panel) continue;
      const level = Number(heading.tagName[1]);
      while (stack.length && stack.at(-1).level >= level) stack.pop();
      stack.push({ level, text: heading.textContent.trim() });
    }
    return stack.map((item) => item.text);
  }

  const blockOf = (node) => (node.nodeType === 1 ? node : node.parentElement).closest("p, li, td, th, pre, blockquote, h1, h2, h3, h4, h5, h6, figcaption, summary") || article;

  function textTarget(range, kindOfTarget) {
    const block = blockOf(range.startContainer);
    let prefix = "";
    let suffix = "";
    try {
      const before = document.createRange();
      before.selectNodeContents(block);
      before.setEnd(range.startContainer, range.startOffset);
      prefix = before.toString().slice(-60);
      const after = document.createRange();
      after.selectNodeContents(block);
      after.setStart(range.endContainer, range.endOffset);
      suffix = after.toString().slice(0, 60);
    } catch { /* a range that leaves its block keeps no context */ }
    return { kind: kindOfTarget, quote: range.toString().replace(/\s+/g, " ").trim(), prefix, suffix, node: range.startContainer, range };
  }

  const wordCharacter = /[\p{L}\p{N}_'\u2019-]/u;
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

  function diagramTarget(node) {
    const figure = node.closest("figure[data-diagram]");
    if (!figure?.querySelector("svg")) return null;
    const diagram = Number(figure.dataset.diagram);
    const box = node.closest("g.node");
    if (box) return { kind: "box", diagram, label: box.textContent.replace(/\s+/g, " ").trim(), node: box, element: box };
    return { kind: "diagram", diagram, label: `Diagram ${diagram}`, node: figure, element: figure };
  }

  function describe(target) {
    if (target.kind === "box") return `Diagram ${target.diagram}, box "${target.label}"`;
    if (target.kind === "diagram") return `Diagram ${target.diagram}`;
    if (target.kind === "word") return `Word "${target.quote}"`;
    return `"${target.quote}"`;
  }

  // Highlights use the CSS Custom Highlight API, so the plan's DOM never changes.
  function paintTargets() {
    for (const item of document.querySelectorAll(".pp-target")) item.classList.remove("pp-target");
    const ranges = [];
    for (const draft of drafts) {
      const target = targets.get(draft.id);
      if (target instanceof Range) ranges.push(target);
      else target?.classList.add("pp-target");
    }
    if (composer?.target.range) ranges.push(composer.target.range);
    composer?.target.element?.classList.add("pp-target");
    if (globalThis.CSS?.highlights) CSS.highlights.set("pp-draft", new Highlight(...ranges));
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
      drafts.push({
        id, text, tab: tabOf(target.node), headings: headingsOf(target.node), revision, sourceDigest,
        target: { kind: target.kind, quote: target.quote || "", prefix: target.prefix || "", suffix: target.suffix || "", diagram: target.diagram ?? null, label: target.label || "" },
      });
      targets.set(id, target.range || target.element);
      saveDrafts();
      getSelection()?.removeAllRanges();
      closeComposer();
      render();
    };
    field.addEventListener("keydown", (event) => {
      if (event.key === "Escape") { event.stopPropagation(); closeComposer(); }
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) { event.preventDefault(); save(); }
    });
    const box = element("div", { class: "pp-composer", role: "dialog", "aria-label": "New comment" },
      element("div", { class: "pp-target-label", text: describe(target) }),
      field,
      element("div", { class: "pp-row" },
        element("button", { type: "button", class: "pp-button", text: "Cancel", onclick: closeComposer }),
        element("button", { type: "button", class: "pp-button primary", text: "Save", onclick: save })));
    document.body.append(box);
    const width = box.offsetWidth;
    box.style.top = `${rect.bottom + scrollY + 8}px`;
    box.style.left = `${Math.max(16, Math.min(rect.left + scrollX, scrollX + document.documentElement.clientWidth - width - 16))}px`;
    composer = { box, target };
    paintTargets();
    field.focus({ preventScroll: true });
  }

  // Hover: in comment mode a highlight glides to the word or diagram box under the pointer.
  const hover = element("div", { class: "pp-hover", "aria-hidden": "true" });
  document.body.append(hover);
  let pointer = null;
  let frame = 0;
  let dragging = false;

  function hoverTarget(x, y) {
    const under = document.elementFromPoint(x, y);
    if (!under || !article.contains(under) || under.closest(".tabs, .source-details summary")) return null;
    const box = under.closest(".diagram g.node");
    if (box) return { kind: "box", rect: box.getBoundingClientRect() };
    if (under.closest(".diagram")) return null;
    const range = wordAt(x, y);
    // The caret lands on the nearest word even in a margin, so the pointer must be over the word itself.
    const rect = range && [...range.getClientRects()].find((item) => x >= item.left - 2 && x <= item.right + 2 && y >= item.top - 2 && y <= item.bottom + 2);
    return rect ? { kind: "word", rect } : null;
  }

  function paintHover() {
    frame = 0;
    const target = commentMode && !dragging && !composer && pointer ? hoverTarget(...pointer) : null;
    if (!target) return hover.classList.remove("on");
    const pad = target.kind === "word" ? 2 : 4;
    const appearing = !hover.classList.contains("on");
    hover.className = `pp-hover ${target.kind}${appearing ? " jump" : ""}`;
    hover.style.width = `${target.rect.width + pad * 2}px`;
    hover.style.height = `${target.rect.height + pad * 2}px`;
    hover.style.transform = `translate(${target.rect.left + scrollX - pad}px, ${target.rect.top + scrollY - pad}px)`;
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
    if (!commentMode || event.target.closest(".pp-composer")) return;
    const selection = getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (!article.contains(range.commonAncestorContainer)) return;
    // Text inside a diagram is a box, which the click handles.
    if ((range.commonAncestorContainer.nodeType === 1 ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement).closest(".diagram")) return selection.removeAllRanges();
    const target = textTarget(range.cloneRange(), "text");
    if (!target.quote) return;
    suppressClick = true;
    openComposer(target, range.getBoundingClientRect());
  });
  article.addEventListener("click", (event) => {
    if (!commentMode) return;
    if (event.target.closest(".tabs, .source-details summary")) return;
    event.preventDefault();
    if (suppressClick) { suppressClick = false; return; }
    const diagram = diagramTarget(event.target);
    if (diagram) return openComposer(diagram, diagram.element.getBoundingClientRect());
    const range = wordAt(event.clientX, event.clientY);
    if (range) openComposer(textTarget(range, "word"), range.getBoundingClientRect());
  }, true);

  // Panel
  const draftList = element("div", { id: "pp-drafts" });
  const sentList = element("div", { id: "pp-sent" });
  const sendButton = element("button", { type: "button", id: "pp-send", class: "pp-button primary", text: "Send comments", disabled: "" });
  const panel = element("aside", { id: "pp-panel", "aria-label": "Comments" },
    element("div", { class: "pp-panel-head" }, element("span", { text: "Comments" }),
      element("button", { type: "button", class: "pp-button", text: "Close", onclick: () => setCommentMode(false) })),
    element("div", { class: "pp-panel-body" }, element("h3", { text: "Drafts" }), draftList, element("h3", { text: "Sent" }), sentList),
    element("div", { class: "pp-panel-foot" }, sendButton));
  document.body.append(panel);

  function draftCard(draft) {
    const text = element("div", { class: "pp-text", text: draft.text });
    const card = element("div", { class: "pp-card" }, element("div", { class: "pp-target-label", text: describe(draft.target) }), text);
    const edit = () => {
      const field = element("textarea", { "aria-label": "Edit comment" });
      field.value = draft.text;
      const row = element("div", { class: "pp-row" },
        element("button", { type: "button", class: "pp-button", text: "Cancel", onclick: render }),
        element("button", { type: "button", class: "pp-button primary", text: "Save", onclick: () => {
          if (!field.value.trim()) return field.focus();
          draft.text = field.value.trim();
          saveDrafts();
          render();
        } }));
      card.replaceChildren(card.firstChild, field, row);
      field.focus();
    };
    card.append(element("div", { class: "pp-row" },
      element("button", { type: "button", class: "pp-button", text: "Edit", onclick: edit }),
      element("button", { type: "button", class: "pp-button", text: "Delete", onclick: () => {
        drafts = drafts.filter((item) => item !== draft);
        targets.delete(draft.id);
        saveDrafts();
        render();
      } })));
    return card;
  }

  function sentCards() {
    const batches = [...(state?.batches || [])].reverse();
    if (!batches.length) return [element("p", { class: "pp-empty", text: "Nothing sent yet." })];
    return batches.flatMap((batch) => [
      element("p", { class: "pp-batch-note", text: `Batch ${batch.seq}, on revision ${batch.revision}: ${batch.reply ? "answered" : "waiting for the agent"}` }),
      batch.reply?.message && element("p", { class: "pp-batch-note", text: batch.reply.message }),
      ...batch.comments.map((comment) => {
        const answer = batch.reply?.answers.find((item) => item.id === comment.id);
        return element("div", { class: "pp-card sent" },
          element("div", { class: "pp-target-label", text: describe(comment.target) }),
          element("div", { class: "pp-text", text: comment.text }),
          answer && element("div", { class: "pp-answer" },
            element("span", { class: `badge ${answer.outcome === "changed" ? "dec-accept" : "sev-nit"}`, text: answer.outcome === "changed" ? "Changed" : "Kept" }),
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

  // Approve or Done
  const closed = () => state && state.status !== "open";
  const locked = () => !live || offline || !state || closed();

  function blocker() {
    if (!live) return "Open this page through the link the agent printed.";
    if (offline || !state) return "The viewer is not reachable.";
    if (closed()) return "This review is closed.";
    if (state.revision !== revision) return `Reload: revision ${state.revision} exists.`;
    if (drafts.length) return `Send or discard ${drafts.length} draft${drafts.length === 1 ? "" : "s"} first.`;
    if (state.pending) return "The agent is revising.";
    return null;
  }

  const dialog = element("dialog", { "aria-label": "Confirm" });
  document.body.append(dialog);
  approveButton.textContent = kind === "standalone" ? "Done" : "Approve";
  approveButton.addEventListener("click", () => {
    const ticket = kind !== "standalone";
    dialog.replaceChildren(
      element("p", { text: ticket ? `Approve revision ${revision} and start work-ticket?` : "Finish this review?" }),
      element("p", { class: "pp-empty", text: ticket ? "Your agent session takes this as your approval of exactly this revision, and starts the work." : "The agent stops waiting for comments on this document." }),
      element("div", { class: "pp-row" },
        element("button", { type: "button", class: "pp-button", text: "Cancel", onclick: () => dialog.close() }),
        element("button", { type: "button", class: "pp-button primary", text: ticket ? "Approve" : "Done", onclick: async () => {
          dialog.close();
          try { await api(ticket ? "api/approve" : "api/done", { revision, sourceDigest }); }
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
    approveButton.disabled = Boolean(reason);
    approveButton.title = reason || (kind === "standalone" ? "Finish this review" : `Approve revision ${revision}`);
    approveButton.hidden = Boolean(state && closed());
    commentButton.disabled = locked();
    const count = commentButton.querySelector(".count");
    count.textContent = String(drafts.length);
    count.hidden = !drafts.length;
    hint.textContent = commentMode ? "Select text, or click a word, box or diagram." : reason && !closed() ? reason : "";
    sendButton.disabled = !drafts.length || locked();
    sendButton.textContent = drafts.length ? `Send ${drafts.length} comment${drafts.length === 1 ? "" : "s"}` : "Send comments";
    draftList.replaceChildren(...(drafts.length ? drafts.map(draftCard) : [element("p", { class: "pp-empty", text: "Turn on comment mode, then select text or click a word, a box or a diagram." })]));
    sentList.replaceChildren(...sentCards());
    if (!live) showBanner("offline", "Open this page through the link the agent printed to comment or approve.");
    else if (offline) showBanner("offline", "The viewer is not reachable. Your drafts stay in this tab.");
    else if (state?.status === "approved") showBanner("approved", `Approved revision ${state.approval?.revision ?? revision}. Work continues in your agent session; if it does not continue on its own, type "go" there.`);
    else if (state?.status === "done") showBanner("closed", "Review finished. You can close this tab.");
    else if (state?.status === "ended") showBanner("closed", "The agent ended this review.");
    else showBanner();
    paintTargets();
  }

  async function refresh() {
    try {
      state = await api("api/state");
      offline = false;
    } catch { offline = true; }
    if (locked() && commentMode) setCommentMode(false);
    render();
  }

  render();
  if (!live) return;
  const events = new EventSource(base + "events");
  events.addEventListener("state", (event) => {
    if (Number(JSON.parse(event.data).split(":")[0]) !== revision) return location.reload();
    void refresh();
  });
  events.addEventListener("error", () => { offline = true; render(); });
  events.addEventListener("open", () => { void refresh(); });
  void refresh();
})();
