(function () {
  "use strict";
  const data = JSON.parse(document.getElementById("eod-data").textContent);
  const source = document.getElementById("source");
  const mode = document.getElementById("mode");
  const status = document.getElementById("status");
  const buttons = [...document.querySelectorAll(".toolbar button")];
  let formatted = null;
  let copied = null;

  document.getElementById("title").textContent = data.title;
  source.value = data.text;
  mode.value = data.mode;

  function message(text, error = false) {
    status.textContent = text;
    status.className = error ? "error" : "";
  }

  function update() {
    copied = null;
    document.getElementById("verification").textContent = "";
    if (/^\s{0,3}#{1,6}\s+Internal notes\b/im.test(source.value)) {
      source.value = EODFormatter.publicText(source.value);
    }
    try {
      formatted = EODFormatter.format(source.value, { mode: mode.value });
      document.getElementById("preview").innerHTML = formatted.html;
      document.getElementById("warning").textContent = formatted.warnings.join(" ");
      buttons.forEach(button => { button.disabled = false; });
      message("Ready to copy. Choose Slack or Teams.");
    } catch (error) {
      formatted = null;
      buttons.forEach(button => { button.disabled = true; });
      document.getElementById("preview").replaceChildren();
      document.getElementById("warning").textContent = "";
      message(error.message, true);
    }
    if (source.value !== data.text || mode.value !== data.mode) {
      document.getElementById("edited").textContent = "Edited here only. These changes are not saved to your EOD log and have not passed the EOD writing checker. Ask the agent to revise the saved draft.";
    } else document.getElementById("edited").textContent = "For EOD revisions, ask the agent to update the saved draft and regenerate this page.";
  }

  function copy(target) {
    if (!formatted) return;
    if (target === "slack" && !/(?:Chrome|Chromium|Edg)\//.test(navigator.userAgent)) {
      copied = null;
      message("Native Slack copy requires a Chromium-based browser. Open this HTML file in Chromium; no plain-text fallback was used.", true);
      return;
    }
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
        if (target === "slack") event.clipboardData.setData("slack/texty", JSON.stringify(formatted.delta));
        const required = target === "slack" ? "slack/texty" : target === "teams" ? "text/html" : "text/plain";
        if (!Array.from(event.clipboardData.types).includes(required)) throw new Error(`The browser rejected ${required}.`);
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
      copied = null;
      message(`Copy failed. ${failure?.message || "Open this page in Chromium and click the button again."} No plain-text fallback was used.`, true);
      return;
    }
    copied = { target, formatted };
    message(target === "slack" ? "Copied native Slack rich text. Paste with Ctrl+V." : target === "teams" ? "Copied rich HTML for Teams in Ferdium. Paste with Ctrl+V." : "Copied plain text; formatting was intentionally removed.");
  }

  // Ignore browser-added clipboard wrappers, but compare every semantic tag, link,
  // list start, line break, and text node. Never execute the pasted HTML.
  function htmlSignature(html) {
    const template = document.createElement("template");
    template.innerHTML = html; // Inert: pasted images/frames cannot fetch anything.
    function signature(node) {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent ? ["text", node.textContent] : null;
      if (node.nodeType !== Node.ELEMENT_NODE) return null;
      if (["META", "STYLE"].includes(node.tagName)) return null;
      return [node.tagName, node.getAttribute("href"), node.getAttribute("start"),
        [...node.childNodes].map(signature).filter(Boolean)];
    }
    return JSON.stringify([...template.content.childNodes].map(signature).filter(Boolean));
  }

  document.getElementById("verify").addEventListener("paste", event => {
    event.preventDefault();
    const output = document.getElementById("verification");
    if (!copied || !event.clipboardData) { output.textContent = "Click a copy button first, then paste here."; return; }
    const clipboard = event.clipboardData;
    const expected = copied.formatted;
    try {
      if (clipboard.getData("text/plain") !== expected.plain) throw new Error("Plain text differs from the current preview.");
      if (copied.target === "slack" && JSON.stringify(JSON.parse(clipboard.getData("slack/texty"))) !== JSON.stringify(expected.delta)) {
        throw new Error("Slack's native clipboard data is missing or changed.");
      }
      if (copied.target !== "plain" && htmlSignature(clipboard.getData("text/html")) !== htmlSignature(expected.html)) {
        throw new Error("The rich HTML structure is missing or changed.");
      }
      output.textContent = "Clipboard verified: text and requested formatting match the current preview. Check the destination rendering before sending.";
    } catch (error) { output.textContent = `Verification failed: ${error.message}`; }
  });

  source.addEventListener("input", update);
  mode.addEventListener("change", update);
  document.getElementById("copy-slack").addEventListener("click", () => copy("slack"));
  document.getElementById("copy-teams").addEventListener("click", () => copy("teams"));
  document.getElementById("copy-plain").addEventListener("click", () => copy("plain"));
  update();
})();
