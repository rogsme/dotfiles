import { randomBytes } from "node:crypto";
import { lstat, mkdtemp, open, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { CDN, PINS, SCHEMA, atomicWrite, checkNode, checkOwnedDirectory, defaultArtifactRoot, digest, escapeHTML, externalDirectory, identityOf, inspectProject, integrityOf, invokedDirectly, loadSession, makePrivateDirectory, revisionFile, safePath, sessionParent } from "./common.mjs";

const assets = new URL("../assets/", import.meta.url);

// Marked runs here in Node, so it comes from the CDN once, checked against its pinned hash, and then from the cache.
export async function loadMarked(artifactRoot) {
  checkNode();
  const cache = path.join(artifactRoot, "cache");
  const file = path.join(cache, PINS.marked.file.replace(/[/@]/g, "_"));
  let code = await readFile(await safePath(file)).catch((error) => { if (error.code === "ENOENT") return null; throw error; });
  if (code === null) {
    code = await fetchPinned(PINS.marked);
    await makePrivateDirectory(cache);
    await checkOwnedDirectory(artifactRoot);
    await atomicWrite(file, code, { exclusive: true }).catch((error) => { if (error.code !== "EEXIST") throw error; });
    code = await readFile(file);
  }
  if (integrityOf(code) !== PINS.marked.integrity) throw new Error(`The cached Marked file ${file} does not match its pinned hash; delete it so the renderer fetches it again.`);
  const { marked } = await import(pathToFileURL(file).href);
  return marked;
}

export async function fetchPinned(pin) {
  let response;
  try { response = await fetch(CDN + pin.file, { signal: AbortSignal.timeout(30_000), redirect: "error" }); }
  catch (error) { throw new Error(`Cannot fetch ${pin.file} from the CDN (${error.cause?.code || error.name}). Presentation needs network access the first time.`); }
  if (!response.ok) throw new Error(`Cannot fetch ${pin.file} from the CDN (HTTP ${response.status}).`);
  const code = Buffer.from(await response.arrayBuffer());
  if (integrityOf(code) !== pin.integrity) throw new Error(`${pin.file} from the CDN does not match its pinned hash; refusing it.`);
  return code;
}

function decodeEntities(text) {
  return String(text).replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (all, name) => {
    if (name[0] !== "#") return ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\u00a0" })[name.toLowerCase()];
    const value = name[1].toLowerCase() === "x" ? parseInt(name.slice(2), 16) : Number(name.slice(1));
    return value > 0 && value <= 0x10ffff && !(value >= 0xd800 && value <= 0xdfff) ? String.fromCodePoint(value) : "\ufffd";
  });
}

const SEVERITIES = new Set(["blocker", "risk", "nit"]);
const DECISIONS = new Set(["accept", "refine", "reject"]);
const VERDICT = /^\s*Plan review:.*\bverdict (SOUND|REVISE|RETHINK)\b/;

export function renderMarkdown(markdown, marked) {
  let toc = [];
  let prefix = "section";
  let diagrams = 0;
  const text = (value) => escapeHTML(value).replace(/&amp;((?:#(?:x[0-9a-f]+|\d+)|[a-z][a-z0-9]*);)/gi, "&$1");
  function inline(tokens = []) {
    return tokens.map((token) => {
      switch (token.type) {
        case "text": return token.tokens ? inline(token.tokens) : text(token.text);
        case "escape": return escapeHTML(token.text);
        case "strong": return `<strong>${inline(token.tokens)}</strong>`;
        case "em": return `<em>${inline(token.tokens)}</em>`;
        case "del": return `<s>${inline(token.tokens)}</s>`;
        case "codespan": return `<code>${escapeHTML(token.text)}</code>`;
        case "br": return "<br>";
        case "html": return escapeHTML(token.raw);
        case "link": {
          const url = decodeEntities(token.href);
          const safe = /^(https?:\/\/|mailto:|#[a-z0-9_-]+$)/i.test(url) && !/[\u0000- \u007f]/.test(url);
          return safe ? `<a href="${escapeHTML(url)}" rel="noreferrer noopener">${inline(token.tokens)}</a>` : `${inline(token.tokens)} (${text(token.href)})`;
        }
        case "image": return `<span class="image-reference">Image: ${text(token.text)} (${text(token.href)})</span>`;
        default: return escapeHTML(token.raw || token.text || "");
      }
    }).join("");
  }
  // Severity and decision cells of the review table become badges; their text stays as written.
  function badge(item, column) {
    const content = inline(item.tokens);
    const value = item.text.trim().toLowerCase();
    if (column === "severity" && SEVERITIES.has(value)) return `<span class="badge sev-${value}">${content}</span>`;
    if (column === "decision" && DECISIONS.has(value)) return `<span class="badge dec-${value}">${content}</span>`;
    return content;
  }
  function blocks(tokens) {
    return tokens.map((token) => {
      switch (token.type) {
        case "space": case "def": return "";
        case "heading": {
          const id = `${prefix}-${toc.length + 1}`;
          const content = inline(token.tokens);
          toc.push({ id, content, depth: token.depth });
          return `<h${token.depth} id="${id}">${content}</h${token.depth}>`;
        }
        case "paragraph": case "text": {
          const verdict = token.text.match(VERDICT);
          const style = /^\s*Not reviewed:/.test(token.text) ? ' class="review-warning"' : verdict ? ` class="verdict verdict-${verdict[1].toLowerCase()}"` : "";
          return `<p${style}>${token.tokens ? inline(token.tokens) : text(token.text)}</p>`;
        }
        case "blockquote": return `<blockquote>${blocks(token.tokens)}</blockquote>`;
        case "list": {
          const tag = token.ordered ? "ol" : "ul";
          const start = token.ordered && token.start !== 1 ? ` start="${Number(token.start)}"` : "";
          return `<${tag}${start}>${token.items.map((item) => `<li>${blocks(item.tokens)}</li>`).join("")}</${tag}>`;
        }
        case "checkbox": return `<input type="checkbox" disabled${token.checked ? " checked" : ""} aria-label="Plan checklist item">`;
        case "table": {
          const columns = token.header.map((item) => item.text.trim().toLowerCase());
          const cell = (item, tag, index) => `<${tag}>${tag === "td" ? badge(item, columns[index]) : inline(item.tokens)}</${tag}>`;
          return `<div class="table-scroll"><table><thead><tr>${token.header.map((item, index) => cell(item, "th", index)).join("")}</tr></thead><tbody>${token.rows.map((row) => `<tr>${row.map((item, index) => cell(item, "td", index)).join("")}</tr>`).join("")}</tbody></table></div>`;
        }
        case "code":
          if ((token.lang || "").trim().toLowerCase() === "mermaid") {
            // Network references stay out of the Mermaid renderer, whatever this page's content policy allows.
            const unsafe = /%%\{|^\s*---|(?:https?|ftp|data|blob|file|javascript):|\/\/|@import|url\s*\(|(?:img|image|icon|href|src)\s*:|<(?:img|image|iframe|script|style|link|object|embed|foreignObject)\b|&(?:#|lt;|amp;)/im;
            if (unsafe.test(token.text)) return `<p class="review-warning">This diagram needs local-only source. Network resources and configuration directives stay as text for review.</p><pre><code>${escapeHTML(token.text)}</code></pre>`;
            diagrams++;
            // Mermaid replaces the source in the browser, so the digest is how the page tells a changed diagram.
            return `<figure data-diagram="${diagrams}" data-digest="${digest(token.text).slice(0, 16)}"><div class="diagram">${escapeHTML(token.text)}</div><figcaption>Diagram ${diagrams}</figcaption></figure>`;
          }
          return `<pre><code>${escapeHTML(token.text)}</code></pre>`;
        case "hr": return "<hr>";
        case "html": return `<pre class="source-html">${escapeHTML(token.raw)}</pre>`;
        default: return `<pre>${escapeHTML(token.raw || token.text || "")}</pre>`;
      }
    }).join("\n");
  }
  function panel(name, tokens) {
    toc = [];
    prefix = name;
    const html = blocks(tokens);
    const links = toc.map(({ id, content, depth }) => `<a class="depth-${depth}" href="#${id}">${content.replace(/<[^>]*>/g, "")}</a>`).join("\n");
    return { html, links };
  }
  const tokens = marked.lexer(markdown, { gfm: true, breaks: false });
  const sections = splitSections(tokens);
  const overview = sections.find((section) => section.title === "Overview");
  if (!overview) {
    const { html, links } = panel("section", tokens);
    return { html, diagrams, toc: links, tabs: false };
  }
  // The planner writes the overview for people; the full plan keeps every other line of the source.
  const title = tokens.find((token) => token.type !== "space");
  const shared = title?.type === "heading" && title.depth === 1 ? [title] : [];
  const review = sections.filter((section) => section !== overview && section.title === "Plan review");
  const warnings = sections.filter((section) => section !== overview && !review.includes(section))
    .flatMap((section) => section.tokens.filter((token) => token.type === "paragraph" && /^\s*Not reviewed:/.test(token.text)));
  const top = panel("title", shared);
  const human = panel("overview", [...overview.tokens, ...review.flatMap((section) => section.tokens), ...warnings]);
  const full = panel("section", tokens.filter((token) => !shared.includes(token) && !overview.tokens.includes(token)));
  const html = `${top.html}
<div class="tabs" role="tablist" aria-label="Plan views"><button type="button" role="tab" id="tab-overview" aria-controls="panel-overview" data-panel="overview" aria-selected="true">Overview</button><button type="button" role="tab" id="tab-full" aria-controls="panel-full" data-panel="full" aria-selected="false">Full plan</button></div>
<section id="panel-overview" role="tabpanel" aria-labelledby="tab-overview" data-panel="overview">${human.html}</section>
<section id="panel-full" role="tabpanel" aria-labelledby="tab-full" data-panel="full">${full.html}</section>`;
  const navigation = `<div data-panel="overview">${human.links}</div>\n<div data-panel="full">${full.links}</div>`;
  return { html, diagrams, toc: navigation, tabs: true };
}

// Top-level sections start at each level 1 or 2 heading; tokens before the first one form an untitled section.
function splitSections(tokens) {
  const sections = [{ title: null, tokens: [] }];
  for (const token of tokens) {
    if (token.type === "heading" && token.depth <= 2) sections.push({ title: token.depth === 2 ? token.text.trim() : null, tokens: [] });
    sections.at(-1).tokens.push(token);
  }
  return sections;
}

export async function renderPlan(options) {
  const project = await inspectProject(options.repository, options.worktree);
  const artifactRoot = await externalDirectory(options.artifactRoot || defaultArtifactRoot(), project.checkouts);
  const sourceInfo = await lstat(options.source);
  if (!sourceInfo.isFile() || sourceInfo.size > 1_048_576) throw new Error("The source must be a regular Markdown file no larger than 1 MiB.");
  const source = await readFile(options.source, "utf8");
  if (!source.trim()) throw new Error("The plan is empty.");
  const identity = identityOf({ ...project, ticket: options.ticket, riders: options.riders, kind: options.standalone ? "standalone" : "ticket" });
  await makePrivateDirectory(artifactRoot);
  await checkOwnedDirectory(artifactRoot);
  const rendered = renderMarkdown(source, await loadMarked(artifactRoot));
  let previous = null;
  let session;
  if (options.session) {
    previous = await loadSession(options.session);
    if (JSON.stringify(previous.identity) !== JSON.stringify(identity) || previous.artifactRoot !== artifactRoot) throw new Error("Session identity, repository, or bundle changed; start a new review.");
    session = previous.session;
  } else {
    const parent = sessionParent(artifactRoot, identity);
    await makePrivateDirectory(parent);
    session = await mkdtemp(path.join(parent, "review-"));
  }
  const lock = await open(path.join(session, ".render.lock"), "wx", 0o600).catch(() => { throw new Error("This session is already being rendered; do not overwrite its lock."); });
  try {
    if (previous) previous = await loadSession(session);
    const sourceDigest = digest(source);
    const revision = previous ? previous.revision + (previous.sourceDigest === sourceDigest ? 0 : 1) : 1;
    const sourceName = revisionFile(revision);
    const metadata = {
      schema: SCHEMA, session, artifactRoot, identity,
      id: previous?.id || randomBytes(16).toString("hex"),
      token: previous?.token || randomBytes(32).toString("base64url"),
      branch: project.branch, commit: project.commit, revision, sourceDigest,
      createdAt: previous?.createdAt || new Date().toISOString(),
    };
    const pin = (item) => `integrity="${item.integrity}" crossorigin="anonymous"`;
    const values = {
      TITLE: escapeHTML(options.title || identity.ticket), CONTENT: rendered.html, TOC: rendered.toc,
      KIND: identity.kind, TICKET: escapeHTML([identity.ticket, ...identity.riders].join(", ")), REVISION: String(revision),
      DIGEST: sourceDigest, LOCATION: escapeHTML(`${project.worktree} | ${project.branch || "detached or unavailable"} | ${project.commit || "unborn or unavailable"}`),
      FONTS: PINS.fonts.map((font) => `<link rel="stylesheet" href="${CDN}${font.file}" ${pin(font)}>`).join("\n  "),
      // tabs.js runs first so diagrams in the hidden tab wait until it is shown.
      SCRIPTS: [
        rendered.tabs && '<script defer src="/assets/tabs.js"></script>',
        rendered.diagrams && `<script defer src="${CDN}${PINS.mermaid.file}" ${pin(PINS.mermaid)}></script>\n  <script defer src="/assets/diagrams.js"></script>`,
        '<script defer src="/assets/attention.js"></script>',
        '<script defer src="/assets/changes.js"></script>',
        '<script defer src="/assets/viewer.js"></script>',
      ].filter(Boolean).join("\n  "),
    };
    const template = await readFile(new URL("plan.html", assets), "utf8");
    const html = template.replace(/\{\{([A-Z_]+)\}\}/g, (_, key) => values[key]);
    metadata.htmlDigest = digest(html);
    if (!previous || previous.revision !== revision) {
      await atomicWrite(path.join(session, sourceName), source, { exclusive: true });
      const { token, ...snapshot } = metadata;
      await atomicWrite(path.join(session, sourceName.replace(/\.md$/, ".json")), JSON.stringify({ ...snapshot, htmlDigest: undefined }, null, 2) + "\n", { exclusive: true });
    }
    await atomicWrite(path.join(session, "plan.html"), html);
    await atomicWrite(path.join(session, "session.json"), JSON.stringify(metadata, null, 2) + "\n");
    return { session, html: path.join(session, "plan.html"), source: path.join(session, sourceName), revision, sourceDigest };
  } finally {
    await lock.close();
    await unlink(path.join(session, ".render.lock"));
  }
}

export function parseArguments(argv) {
  const result = { riders: [] };
  const flags = { "--source": "source", "--repository": "repository", "--worktree": "worktree", "--ticket": "ticket", "--artifacts": "artifactRoot", "--session": "session", "--title": "title" };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === "--standalone") result.standalone = true;
    else if (flag === "--rider" && argv[i + 1]) result.riders.push(argv[++i]);
    else if (flags[flag] && argv[i + 1]) result[flags[flag]] = argv[++i];
    else throw new Error(`Unknown or incomplete argument: ${flag}`);
  }
  for (const name of ["source", "repository", "worktree", "ticket"]) if (!result[name]) throw new Error(`Missing ${name}. See --help.`);
  return result;
}

if (invokedDirectly(import.meta.url)) {
  if (process.argv.includes("--help")) {
    console.log("node render_plan.mjs --source <plan.md> --repository <main-checkout> --worktree <checkout> --ticket <id or short name> [--standalone] [--artifacts <external-root, default /tmp/present-plan>] [--rider <id>] [--session <owned-directory>] [--title <title>]");
  } else {
    try { console.log(JSON.stringify(await renderPlan(parseArguments(process.argv.slice(2))), null, 2)); }
    catch (error) { console.error(error.message); process.exitCode = 1; }
  }
}
