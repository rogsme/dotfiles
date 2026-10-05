/* Offline chat formatter. Slack clipboard protocol reference: slackfmt (see references/clipboard.md). */
(function (root, factory) {
  const api = factory(typeof module === "object" ? require("./vendor/marked.umd.js").marked : root.marked);
  if (typeof module === "object") module.exports = api;
  else root.ChatPasteFormatter = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (marked) {
  "use strict";
  const emoji = {
    slightly_smiling_face: "🙂", sweat_smile: "😅", smile: "😄", smiling_face: "☺️",
    tada: "🎉", rocket: "🚀", white_check_mark: "✅", warning: "⚠️", eyes: "👀",
    thumbs_up: "👍", thumbsup: "👍", "+1": "👍", wave: "👋", fire: "🔥",
    muscle: "💪", memo: "📝", hammer_and_wrench: "🛠️", dart: "🎯", heart: "❤️",
    thinking_face: "🤔", sweat: "😓", relaxed: "☺️", grin: "😁", blush: "😊",
  };
  const escape = value => String(value).replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[ch]);

  function normalize(text) {
    const source = String(text).replace(/\r\n?/g, "\n").trim();
    if (!source) throw new Error("The message is empty.");
    if (source.length > 100000) throw new Error("The message exceeds 100,000 characters.");
    // Unicode bullets are a common plain-text input. Heading inference and
    // content filtering belong to callers; only explicit Markdown is styled.
    let fenced = false;
    const markdown = source.split("\n").map(line => {
      if (/^\s*(?:```|~~~)/.test(line)) { fenced = !fenced; return line; }
      if (fenced) return line;
      if (/^\s*•\s+/.test(line)) return line.replace(/^(\s*)•\s+/, "$1* ");
      return line;
    }).join("\n");
    return { source, markdown };
  }

  function decode(text) {
    return text.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (all, name) => {
      if (name[0] !== "#") return ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\u00a0" })[name.toLowerCase()];
      const n = name[1].toLowerCase() === "x" ? parseInt(name.slice(2), 16) : Number(name.slice(1));
      return n > 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff) ? String.fromCodePoint(n) : "�";
    });
  }

  function safeURL(url) {
    if (!/^(?:https?:\/\/|mailto:)/i.test(url)) throw new Error(`Unsupported link: ${url}. Use an https, http, or mailto URL.`);
    if (/[\u0000-\u0020\u007f]/.test(url)) throw new Error("A link contains spaces or control characters.");
    return url;
  }

  function textRuns(tokens, attrs = {}, literal = false) {
    const runs = [];
    const add = (text, attributes) => {
      if (!literal && !attributes.code) text = decode(text).replace(/:([a-z0-9_+\-]+):/g, (all, name) => {
        if (!emoji[name]) throw new Error(`Unsupported emoji ${all}. Replace it with a Unicode emoji.`);
        return emoji[name];
      });
      if (text) runs.push({ text, attrs: attributes });
    };
    for (const token of tokens || []) {
      switch (token.type) {
        case "text":
          if (token.tokens) runs.push(...textRuns(token.tokens, attrs, literal));
          else add(token.text, attrs);
          break;
        case "escape": add(token.text, attrs); break;
        case "strong": runs.push(...textRuns(token.tokens, { ...attrs, bold: true })); break;
        case "em": runs.push(...textRuns(token.tokens, { ...attrs, italic: true })); break;
        case "del": runs.push(...textRuns(token.tokens, { ...attrs, strike: true })); break;
        case "codespan": add(token.text, { ...attrs, code: true }); break;
        case "link": runs.push(...textRuns(token.tokens, { ...attrs, link: safeURL(token.href) })); break;
        case "br": add("\n", attrs); break;
        default: throw new Error(`Unsupported ${token.type} formatting. Use text, emphasis, links, lists, quotes, or code.`);
      }
    }
    return runs;
  }

  function model(markdown) {
    const lines = [];
    const blank = (count, context = { kind: "paragraph" }) => { for (let i = 0; i < count; i++) lines.push({ ...context, runs: [] }); };
    const trailing = raw => (raw.match(/\n*$/)?.[0] || "").length;
    function emit(runs, block) {
      let current = [];
      for (const run of runs) {
        const chunks = run.text.split("\n");
        chunks.forEach((chunk, i) => {
          if (chunk) current.push({ text: chunk, attrs: run.attrs });
          if (i < chunks.length - 1) {
            if (block.kind === "list") throw new Error("Line breaks within a list item cannot be preserved exactly. Put each bullet on one source line.");
            lines.push({ ...block, runs: current });
            current = [];
          }
        });
      }
      lines.push({ ...block, runs: current });
    }
    function blocks(tokens, context = { kind: "paragraph" }) {
      let previous = null;
      let spacing = 0;
      for (const token of tokens) {
        if (token.type === "space") { spacing += (token.raw.match(/\n/g) || []).length; continue; }
        if (token.type === "def") continue;
        if (previous) blank(Math.max(0, trailing(previous.raw) + spacing - 1), context);
        spacing = 0;
        if (context.kind === "quote" && !["paragraph", "text"].includes(token.type)) {
          throw new Error("Only text paragraphs are supported inside blockquotes.");
        }
        switch (token.type) {
          case "paragraph": case "text": emit(textRuns(token.tokens), context); break;
          case "heading": emit(textRuns(token.tokens, { bold: true }), { kind: "heading" }); break;
          case "list": lists(token, 0); break;
          case "blockquote":
            if (context.kind === "quote") throw new Error("Nested blockquotes are unsupported.");
            blocks(token.tokens, { kind: "quote" });
            break;
          case "code":
            for (const text of token.text.split("\n")) emit([{ text, attrs: {} }], { kind: "code" });
            break;
          default: throw new Error(`Unsupported ${token.type} block. Tables, images, raw HTML, and separators are not exported.`);
        }
        previous = token;
      }
    }
    function lists(token, indent) {
      if (indent > 7) throw new Error("List nesting exceeds seven indentation levels.");
      if (token.ordered && token.start !== 1) throw new Error("Ordered lists must start at 1 for exact Slack formatting.");
      for (let i = 0; i < token.items.length; i++) {
        const item = token.items[i];
        if (item.task) throw new Error("Task checkboxes are unsupported. Use a Unicode checkbox in a normal bullet.");
        let hasText = false;
        for (const child of item.tokens) {
          if (child.type === "list") {
            if (!hasText) throw new Error("A nested list needs a parent bullet.");
            lists(child, indent + 1);
          } else if (child.type === "paragraph" || child.type === "text") {
            if (hasText) throw new Error("Multiple paragraphs inside one list item are unsupported.");
            emit(textRuns(child.tokens), { kind: "list", list: token.ordered ? "ordered" : "bullet", indent, number: i + 1 });
            hasText = true;
          } else if (child.type !== "space") throw new Error(`Unsupported ${child.type} inside a list.`);
        }
        if (i < token.items.length - 1) {
          const gap = Math.max(0, trailing(item.raw) - 1);
          if (gap && indent) throw new Error("Blank lines between nested bullets cannot be preserved exactly. Remove the blank lines.");
          if (gap && token.ordered) throw new Error("Blank lines between numbered items can reset Slack's numbering. Remove the blank lines.");
          blank(gap);
        }
      }
    }
    blocks(marked.lexer(markdown, { gfm: true, breaks: true }));
    return lines;
  }

  function runHTML(run) {
    let html = escape(run.text);
    const a = run.attrs;
    if (a.code) html = `<code>${html}</code>`;
    if (a.bold) html = `<strong>${html}</strong>`;
    if (a.italic) html = `<em>${html}</em>`;
    if (a.strike) html = `<s>${html}</s>`;
    if (a.link) html = `<a href="${escape(a.link)}">${html}</a>`;
    return html;
  }

  function toHTML(lines) {
    const content = line => line.runs.map(runHTML).join("");
    let index = 0;
    function list(level) {
      const first = lines[index];
      const type = first.list;
      const tag = type === "ordered" ? "ol" : "ul";
      let html = `<${tag}${tag === "ol" && first.number !== 1 ? ` start="${first.number}"` : ""}>`;
      while (index < lines.length && lines[index].kind === "list" && lines[index].indent === level && lines[index].list === type) {
        html += `<li>${content(lines[index++])}`;
        while (lines[index]?.kind === "list" && lines[index].indent > level) html += list(lines[index].indent);
        html += "</li>";
      }
      return html + `</${tag}>`;
    }
    let html = "";
    while (index < lines.length) {
      const line = lines[index];
      if (line.kind === "list") { html += list(line.indent); continue; }
      if (line.kind === "code") {
        const code = [];
        while (lines[index]?.kind === "code") code.push(content(lines[index++]));
        html += `<pre><code>${code.join("\n")}</code></pre>`;
        continue;
      }
      const p = `<p style="margin:0">${content(line) || "<br>"}</p>`;
      html += line.kind === "quote" ? `<blockquote>${p}</blockquote>` : p;
      index++;
    }
    return html;
  }

  function toDelta(lines) {
    const ops = [];
    // Keep line endings separate: Quill's block attributes belong only on newlines.
    for (const line of lines) {
      for (const run of line.runs) ops.push({ insert: run.text, ...(Object.keys(run.attrs).length ? { attributes: run.attrs } : {}) });
      const attrs = line.kind === "list" ? { list: line.list, ...(line.indent ? { indent: line.indent } : {}) } :
        line.kind === "quote" ? { blockquote: true } : line.kind === "code" ? { "code-block": true } : {};
      ops.push({ insert: "\n", ...(Object.keys(attrs).length ? { attributes: attrs } : {}) });
    }
    return { ops };
  }

  function format(text) {
    const { source, markdown } = normalize(text);
    const lines = model(markdown);
    // Markdown parsers can treat under-indented children as root siblings. Check
    // the source hierarchy independently rather than silently flattening it.
    const expected = [];
    const indents = [];
    let fenced = false;
    for (const line of markdown.split("\n")) {
      if (/^\s*(?:```|~~~)/.test(line)) { fenced = !fenced; continue; }
      if (fenced) continue;
      const item = line.match(/^([ \t]*)([-*+]|\d+[.)])\s+/);
      if (!item) continue;
      const width = item[1].replace(/\t/g, "    ").length;
      while (indents.length && width < indents[indents.length - 1]) indents.pop();
      if (!indents.length || width > indents[indents.length - 1]) indents.push(width);
      expected.push({ indent: indents.length - 1, list: /^\d/.test(item[2]) ? "ordered" : "bullet" });
    }
    const actual = lines.filter(line => line.kind === "list").map(({ indent, list }) => ({ indent, list }));
    if (JSON.stringify(expected) !== JSON.stringify(actual)) {
      throw new Error("Markdown would change the list indentation. Indent child bullets by two spaces under a bullet, or three spaces under a numbered item.");
    }
    const plain = lines.map(line => {
      const prefix = line.kind === "list" ? "  ".repeat(line.indent) + (line.list === "ordered" ? `${line.number}. ` : "• ") : line.kind === "quote" ? "> " : "";
      return prefix + line.runs.map(r => r.text).join("");
    }).join("\n");
    const warnings = /(^|[\s(])@[\p{L}\p{N}_]/u.test(plain) ? ["Select real @mentions in Slack or Teams after pasting; copied names do not notify anyone."] : [];
    return { source, lines, html: toHTML(lines), plain, delta: toDelta(lines), warnings };
  }

  return { format, escape };
});

if (typeof module === "object" && require.main === module) {
  try {
    const { text } = JSON.parse(require("node:fs").readFileSync(0, "utf8"));
    process.stdout.write(JSON.stringify(module.exports.format(text)));
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
