import { randomBytes } from "node:crypto";
import { lstat, mkdtemp, open, readFile, unlink } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

import { DESTINATIONS, SCHEMA, atomicWrite, artifactDirectory, checkNode, checkOwnedDirectory, defaultArtifactRoot, digest, escapeHTML, identityOf, invokedDirectly, loadSession, makePrivateDirectory, revisionFile, sessionParent } from "./common.mjs";

const assets = new URL("../assets/", import.meta.url);
const { format } = createRequire(import.meta.url)("../assets/formatter.js");

// JSON inside a script element: nothing in it can close the element or start markup.
export function scriptJSON(data) {
  return JSON.stringify(data).replace(/&/g, "\\u0026").replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}

export async function renderMessage(options) {
  checkNode();
  const destination = options.destination || "both";
  if (!DESTINATIONS.includes(destination)) throw new Error("Destination must be slack, teams, or both.");
  const identity = identityOf({ name: options.name });
  const artifactRoot = await artifactDirectory(options.artifactRoot || defaultArtifactRoot());
  const sourceInfo = await lstat(options.source);
  if (!sourceInfo.isFile() || sourceInfo.size > 1_048_576) throw new Error("The source must be a regular UTF-8 file no larger than 1 MiB.");
  const source = await readFile(options.source, "utf8");
  // Unsupported content fails here, before anything is written.
  const formatted = format(source);
  await makePrivateDirectory(artifactRoot);
  await checkOwnedDirectory(artifactRoot);
  let previous = null;
  let session;
  if (options.session) {
    previous = await loadSession(options.session);
    if (JSON.stringify(previous.identity) !== JSON.stringify(identity) || previous.artifactRoot !== artifactRoot) throw new Error("Session name or artifact root changed; start a new message.");
    session = previous.session;
  } else {
    const parent = sessionParent(artifactRoot, identity);
    await makePrivateDirectory(parent);
    session = await mkdtemp(path.join(parent, "message-"));
  }
  const lock = await open(path.join(session, ".render.lock"), "wx", 0o600).catch(() => { throw new Error("This session is already being rendered; do not overwrite its lock."); });
  try {
    if (previous) previous = await loadSession(session);
    const sourceDigest = digest(source);
    const revision = previous ? previous.revision + (previous.sourceDigest === sourceDigest ? 0 : 1) : 1;
    const sourceName = revisionFile(revision);
    const title = options.title || previous?.title || identity.name;
    const metadata = {
      schema: SCHEMA, session, artifactRoot, identity,
      id: previous?.id || randomBytes(16).toString("hex"),
      token: previous?.token || randomBytes(32).toString("base64url"),
      title, destination, revision, sourceDigest,
      createdAt: previous?.createdAt || new Date().toISOString(),
    };
    const values = {
      TITLE: escapeHTML(title), REVISION: String(revision), DIGEST: sourceDigest, DESTINATION: destination,
      CONTENT: formatted.html, WARNINGS: escapeHTML(formatted.warnings.join(" ")),
      DATA: scriptJSON({ title, destination, plain: formatted.plain, html: formatted.html, delta: formatted.delta }),
    };
    const template = await readFile(new URL("message.html", assets), "utf8");
    const html = template.replace(/\{\{([A-Z_]+)\}\}/g, (_, key) => values[key]);
    metadata.htmlDigest = digest(html);
    if (!previous || previous.revision !== revision) {
      await atomicWrite(path.join(session, sourceName), source, { exclusive: true });
      const { token, ...snapshot } = metadata;
      await atomicWrite(path.join(session, sourceName.replace(/\.md$/, ".json")), JSON.stringify({ ...snapshot, htmlDigest: undefined }, null, 2) + "\n", { exclusive: true });
    }
    await atomicWrite(path.join(session, "message.html"), html);
    await atomicWrite(path.join(session, "session.json"), JSON.stringify(metadata, null, 2) + "\n");
    return { session, html: path.join(session, "message.html"), source: path.join(session, sourceName), revision, sourceDigest, warnings: formatted.warnings };
  } finally {
    await lock.close();
    await unlink(path.join(session, ".render.lock"));
  }
}

export function parseArguments(argv) {
  const result = {};
  const flags = { "--source": "source", "--name": "name", "--destination": "destination", "--title": "title", "--artifacts": "artifactRoot", "--session": "session" };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flags[flag] && argv[i + 1]) result[flags[flag]] = argv[++i];
    else throw new Error(`Unknown or incomplete argument: ${flag}`);
  }
  for (const name of ["source", "name"]) if (!result[name]) throw new Error(`Missing ${name}. See --help.`);
  return result;
}

if (invokedDirectly(import.meta.url)) {
  if (process.argv.includes("--help")) {
    console.log("node render_message.mjs --source <message.md> --name <short name> [--destination slack|teams|both] [--title <title>] [--artifacts <root, default /tmp/chat-paste>] [--session <owned-directory>]");
  } else {
    try { console.log(JSON.stringify(await renderMessage(parseArguments(process.argv.slice(2))), null, 2)); }
    catch (error) { console.error(error.message); process.exitCode = 1; }
  }
}
