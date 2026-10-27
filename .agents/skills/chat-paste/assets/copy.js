// The copy buttons: one message, written to the clipboard in the formats each destination reads.
(function () {
  "use strict";
  const data = JSON.parse(document.getElementById("chat-paste-data").textContent);
  const status = document.getElementById("status");
  // Only Chromium's custom-MIME envelope is interoperable with Slack Electron.
  // Other browsers can still copy semantic rich HTML; do not block them.
  const nativeSlack = /(?:Chrome|Chromium|Edg)\//.test(navigator.userAgent);

  function message(text, error = false) {
    status.textContent = text;
    status.className = error ? "error" : "";
  }

  // Visual confirmation only; #status already announces the result to screen readers.
  const toast = document.getElementById("toast");
  let toastTimer;
  function showToast(text, error = false) {
    toast.textContent = text;
    toast.className = error ? "show error" : "show";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.className = error ? "error" : ""; }, 2600);
  }

  function copy(target) {
    const useNativeSlack = target === "slack" && nativeSlack;
    let wrote = false;
    let failure = null;
    // Slack's legacy custom MIME must use the copy event, not `web slack/texty`.
    // That Async Clipboard custom format is a different wire protocol.
    function handler(event) {
      event.preventDefault();
      try {
        if (!event.clipboardData) throw new Error("The browser did not provide a clipboard writer.");
        event.clipboardData.setData("text/plain", data.plain);
        if (target !== "plain") event.clipboardData.setData("text/html", data.html);
        if (useNativeSlack) event.clipboardData.setData("slack/texty", JSON.stringify(data.delta));
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
    helper.value = data.plain;
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
      showToast("Copy failed", true);
      return;
    }
    if (target === "slack") message("Copied for Slack. Paste normally into Slack.");
    else if (target === "teams") message("Copied for Teams. Paste normally into Teams or Ferdium.");
    else message("Copied plain text; formatting was intentionally removed.");
    showToast({ slack: "Copied for Slack", teams: "Copied for Teams", plain: "Copied plain text" }[target]);
  }

  // A message for one app shows only that app's button; plain text is always there.
  const hidden = { slack: data.destination === "teams", teams: data.destination === "slack", plain: false };
  for (const target of ["slack", "teams", "plain"]) {
    const button = document.getElementById(`copy-${target}`);
    button.hidden = hidden[target];
    button.disabled = false;
    button.addEventListener("click", () => copy(target));
  }
  message("Ready to copy.");
})();
