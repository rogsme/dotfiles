(function () {
  "use strict";
  const data = JSON.parse(document.getElementById("chat-paste-data").textContent);
  const source = document.getElementById("source");
  const status = document.getElementById("status");
  const buttons = [...document.querySelectorAll(".toolbar button")];
  // Only Chromium's custom-MIME envelope is interoperable with Slack Electron.
  // Other browsers can still copy semantic rich HTML; do not block them.
  const nativeSlack = /(?:Chrome|Chromium|Edg)\//.test(navigator.userAgent);
  let formatted = null;

  // Store only the appearance preference, never message content.
  const themeToggle = document.getElementById("theme-toggle");
  const themeKey = "chat-paste-theme";
  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    themeToggle.textContent = theme === "dark" ? "Light mode" : "Dark mode";
    themeToggle.setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} mode`);
    themeToggle.setAttribute("aria-pressed", String(theme === "dark"));
  }
  let savedTheme;
  try { savedTheme = localStorage.getItem(themeKey); } catch (_) { /* Storage may be disabled. */ }
  setTheme(["light", "dark"].includes(savedTheme) ? savedTheme : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  themeToggle.addEventListener("click", () => {
    const theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    setTheme(theme);
    try { localStorage.setItem(themeKey, theme); } catch (_) { /* The toggle still works without storage. */ }
  });

  document.getElementById("title").textContent = data.title;
  source.value = data.text;
  const revisionNote = "Browser edits are temporary and are not written to the source file." + (data.revisionNote ? ` ${data.revisionNote}` : "");
  document.getElementById("edited").textContent = revisionNote;
  if (data.destination !== "both") {
    const preferred = document.getElementById(`copy-${data.destination}`);
    preferred.textContent += " (recommended)";
  }

  function message(text, error = false) {
    status.textContent = text;
    status.className = error ? "error" : "";
  }

  function update() {
    try {
      formatted = ChatPasteFormatter.format(source.value);
      document.getElementById("preview").innerHTML = formatted.html;
      document.getElementById("warning").textContent = formatted.warnings.join(" ");
      buttons.forEach(button => { button.disabled = false; });
      message("Ready to copy.");
    } catch (error) {
      formatted = null;
      buttons.forEach(button => { button.disabled = true; });
      document.getElementById("preview").replaceChildren();
      document.getElementById("warning").textContent = "";
      message(error.message, true);
    }
    document.getElementById("edited").textContent = source.value !== data.text ? "Edited here only; changes are not saved. " + revisionNote : revisionNote;
  }

  function copy(target) {
    if (!formatted) return;
    const useNativeSlack = target === "slack" && nativeSlack;
    let wrote = false;
    let failure = null;
    // Slack's legacy custom MIME must use the copy event, not `web slack/texty`.
    // That Async Clipboard custom format is a different wire protocol.
    function handler(event) {
      event.preventDefault();
      try {
        if (!event.clipboardData) throw new Error("The browser did not provide a clipboard writer.");
        event.clipboardData.setData("text/plain", formatted.plain);
        if (target !== "plain") event.clipboardData.setData("text/html", formatted.html);
        if (useNativeSlack) event.clipboardData.setData("slack/texty", JSON.stringify(formatted.delta));
        const required = ["text/plain", ...(target !== "plain" ? ["text/html"] : []), ...(useNativeSlack ? ["slack/texty"] : [])];
        for (const type of required) {
          if (!Array.from(event.clipboardData.types).includes(type)) throw new Error(`The browser rejected ${type}.`);
        }
        wrote = true;
      } catch (error) { failure = error; }
    }
    const active = document.activeElement;
    const selection = window.getSelection();
    const ranges = selection ? Array.from({ length: selection.rangeCount }, (_, i) => selection.getRangeAt(i).cloneRange()) : [];
    const helper = document.createElement("textarea");
    helper.value = formatted.plain;
    helper.readOnly = true;
    helper.setAttribute("aria-hidden", "true");
    helper.style.cssText = "position:fixed;left:-10000px;top:0";
    document.body.append(helper);
    let success = false;
    document.addEventListener("copy", handler);
    try {
      helper.select();
      success = document.execCommand("copy");
    } catch (error) { failure = error; }
    finally {
      document.removeEventListener("copy", handler);
      helper.remove();
      if (active?.isConnected) active.focus({ preventScroll: true });
      if (selection && ranges.length) {
        selection.removeAllRanges();
        ranges.forEach(range => selection.addRange(range));
      }
    }
    if (!success || !wrote || failure) {
      message(`Copy failed. ${failure?.message || "Click the button again and check your browser's clipboard permissions."} No plain-text fallback was used.`, true);
      return;
    }
    if (target === "slack") message("Copied for Slack. Paste normally into Slack.");
    else if (target === "teams") message("Copied for Teams. Paste normally into Teams or Ferdium.");
    else message("Copied plain text; formatting was intentionally removed.");
  }

  source.addEventListener("input", update);
  document.getElementById("copy-slack").addEventListener("click", () => copy("slack"));
  document.getElementById("copy-teams").addEventListener("click", () => copy("teams"));
  document.getElementById("copy-plain").addEventListener("click", () => copy("plain"));
  update();
})();
