import { cp, lstat, mkdtemp, open, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { SCHEMA, atomicWrite, checkOwnedDirectory, defaultArtifactRoot, digest, escapeHTML, externalDirectory, identityOf, inspectProject, inspectRuntime, inside, invokedDirectly, loadSession, makePrivateDirectory, safePath } from "./common.mjs";

const assets = new URL("../assets/", import.meta.url);

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

export async function renderMarkdown(markdown, runtime) {
  await inspectRuntime(runtime);
  const entry = await safePath(path.join(runtime, "node_modules", "marked", "lib", "marked.esm.js"));
  const { marked } = await import(pathToFileURL(entry).href);
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
            // Network references stay out of the Mermaid renderer, whatever this page's CSP allows.
            const unsafe = /%%\{|^\s*---|(?:https?|ftp|data|blob|file|javascript):|\/\/|@import|url\s*\(|(?:img|image|icon|href|src)\s*:|<(?:img|image|iframe|script|style|link|object|embed|foreignObject)\b|&(?:#|lt;|amp;)/im;
            if (unsafe.test(token.text)) return `<p class="review-warning">This diagram needs local-only source. Network resources and configuration directives stay as text for review.</p><pre><code>${escapeHTML(token.text)}</code></pre>`;
            diagrams++;
            // Lavish turns diagrams in a .mermaid container into whiteboards; any other container keeps the SVG, whose boxes take notes.
            return `<figure><div class="diagram">${escapeHTML(token.text)}</div><figcaption>Diagram ${diagrams}. Click a box to comment on it.</figcaption></figure>`;
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
  const runtime = await inspectRuntime(await externalDirectory(options.runtime, project.checkouts));
  const artifactRoot = await externalDirectory(options.artifactRoot || defaultArtifactRoot(), project.checkouts);
  const stateDir = await externalDirectory(options.stateDir || path.join(runtime, "lavish-state"), project.checkouts);
  if (inside(artifactRoot, runtime) || inside(runtime, artifactRoot) || inside(artifactRoot, stateDir)) throw new Error("Use separate directories for artifacts, runtime, and server state.");
  const port = options.port === undefined ? 4388 : Number(options.port);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("Use an unprivileged local server port.");
  const sourceInfo = await lstat(options.source);
  if (!sourceInfo.isFile() || sourceInfo.size > 1_048_576) throw new Error("The source must be a regular Markdown file no larger than 1 MiB.");
  const source = await readFile(options.source, "utf8");
  if (!source.trim()) throw new Error("The plan is empty.");
  const identity = identityOf({ ...project, ticket: options.ticket, riders: options.riders });
  const rendered = await renderMarkdown(source, runtime);
  await makePrivateDirectory(artifactRoot);
  await checkOwnedDirectory(artifactRoot);
  let previous = null;
  let session;
  if (options.session) {
    previous = await loadSession(options.session);
    if (JSON.stringify(previous.identity) !== JSON.stringify(identity) || previous.artifactRoot !== artifactRoot) throw new Error("Session identity, repository, or bundle changed; start a new review.");
    if (previous.runtime !== runtime || previous.stateDir !== stateDir || previous.port !== port) throw new Error("Session runtime or server settings changed; start a new review.");
    session = previous.session;
  } else {
    const parent = path.join(artifactRoot, digest(project.repository).slice(0, 16), digest(identity.ticket).slice(0, 16));
    await makePrivateDirectory(parent);
    session = await mkdtemp(path.join(parent, "review-"));
  }
  const lock = await open(path.join(session, ".render.lock"), "wx", 0o600).catch(() => { throw new Error("This session is already being rendered; do not overwrite its lock."); });
  try {
    if (previous) previous = await loadSession(session);
    const sourceDigest = digest(source);
    const revision = previous ? previous.revision + (previous.sourceDigest === sourceDigest ? 0 : 1) : 1;
    const sourceName = `revision-${String(revision).padStart(4, "0")}.md`;
    const sourceFile = path.join(session, sourceName);
    if (rendered.diagrams) {
      const moduleDirectory = path.join(session, "assets", "mermaid");
      if (!previous?.diagramAssets) {
        await makePrivateDirectory(moduleDirectory);
        const bundle = await safePath(path.join(runtime, "node_modules", "mermaid", "dist", "mermaid.min.js"));
        await cp(bundle, path.join(moduleDirectory, "mermaid.min.js"), { force: false, errorOnExist: true });
        await cp(path.join(runtime, "node_modules", "mermaid", "LICENSE"), path.join(moduleDirectory, "LICENSE"), { force: false, errorOnExist: true });
        await cp(new URL("diagrams.js", assets), path.join(session, "assets", "diagrams.js"), { force: false, errorOnExist: true });
      }
    }
    if (rendered.tabs && !previous?.tabAssets) {
      await makePrivateDirectory(path.join(session, "assets"));
      await cp(new URL("tabs.js", assets), path.join(session, "assets", "tabs.js"), { force: false, errorOnExist: true });
    }
    const metadata = {
      schema: SCHEMA, session, artifactRoot, identity, runtime, stateDir, port,
      branch: project.branch, commit: project.commit, revision, sourceDigest,
      createdAt: previous?.createdAt || new Date().toISOString(),
      diagramAssets: Boolean(rendered.diagrams || previous?.diagramAssets),
      tabAssets: Boolean(rendered.tabs || previous?.tabAssets),
    };
    const title = options.title || identity.ticket;
    const values = {
      TITLE: escapeHTML(title), CONTENT: rendered.html, TOC: rendered.toc,
      TICKET: escapeHTML([identity.ticket, ...identity.riders].join(", ")), REVISION: String(revision),
      DIGEST: sourceDigest, SOURCE: sourceName,
      LOCATION: escapeHTML(`${project.worktree} | ${project.branch || "detached or unavailable"} | ${project.commit || "unborn or unavailable"}`),
      // tabs.js runs first so diagrams in the hidden tab wait until it is shown.
      SCRIPTS: [
        rendered.tabs && '<script src="assets/tabs.js"></script>',
        rendered.diagrams && '<script src="assets/mermaid/mermaid.min.js"></script>\n  <script src="assets/diagrams.js"></script>',
      ].filter(Boolean).join("\n  "),
    };
    const template = await readFile(new URL("plan.html", assets), "utf8");
    const html = template.replace(/\{\{([A-Z_]+)\}\}/g, (_, key) => values[key]);
    metadata.htmlDigest = digest(html);
    if (!previous || previous.revision !== revision) {
      await atomicWrite(sourceFile, source, { exclusive: true });
      await atomicWrite(path.join(session, sourceName.replace(/\.md$/, ".json")), JSON.stringify({ ...metadata, htmlDigest: undefined }, null, 2) + "\n", { exclusive: true });
    }
    await atomicWrite(path.join(session, "plan.html"), html);
    await atomicWrite(path.join(session, "session.json"), JSON.stringify(metadata, null, 2) + "\n");
    return { session, html: path.join(session, "plan.html"), source: sourceFile, revision, sourceDigest };
  } finally {
    await lock.close();
    await unlink(path.join(session, ".render.lock"));
  }
}

export function parseArguments(argv) {
  const result = { riders: [] };
  const flags = { "--source": "source", "--repository": "repository", "--worktree": "worktree", "--ticket": "ticket", "--artifacts": "artifactRoot", "--runtime": "runtime", "--session": "session", "--state-dir": "stateDir", "--port": "port", "--title": "title" };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === "--rider" && argv[i + 1]) result.riders.push(argv[++i]);
    else if (flags[flag] && argv[i + 1]) result[flags[flag]] = argv[++i];
    else throw new Error(`Unknown or incomplete argument: ${flag}`);
  }
  for (const name of ["source", "repository", "worktree", "ticket", "runtime"]) if (!result[name]) throw new Error(`Missing ${name}. See --help.`);
  return result;
}

if (invokedDirectly(import.meta.url)) {
  if (process.argv.includes("--help")) {
    console.log("node render_plan.mjs --source <plan.md> --repository <main-checkout> --worktree <checkout> --ticket <id> --runtime <tool-cache> [--artifacts <external-root, default /tmp/lavish>] [--rider <id>] [--session <owned-directory>] [--state-dir <external-directory>] [--port <port>] [--title <title>]");
  } else {
    try { console.log(JSON.stringify(await renderPlan(parseArguments(process.argv.slice(2))), null, 2)); }
    catch (error) { console.error(error.message); process.exitCode = 1; }
  }
}
