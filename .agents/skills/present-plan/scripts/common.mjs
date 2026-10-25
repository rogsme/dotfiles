import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { realpathSync } from "node:fs";
import { lstat, mkdir, open, readFile, realpath, rename, unlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SCHEMA = "rogs-skills/present-plan/2";
export const APP = "present-plan-viewer";
export const DEFAULT_PORT = 4388;
export const DEFAULT_LISTEN = "all";

// Every file the page or the renderer loads from the CDN, at an exact version with its SRI hash.
export const CDN = "https://cdn.jsdelivr.net/npm/";
export const PINS = Object.freeze({
  marked: { file: "marked@18.1.0/lib/marked.esm.js", integrity: "sha384-snMBC5fa3uu2TE5nbJfoysnXEnXn+BPEHkzGLpV/ptEaRtamTgxGuWQvm0LUGEP1" },
  mermaid: { file: "mermaid@11.12.1/dist/mermaid.min.js", integrity: "sha384-LlKSgo4Eo5GuF/ZrstLti44dE+GC5XAJ7TSu0Nw9Q3vIZF2QMnkRcK7BUoLabYLF" },
  fonts: [
    { file: "@fontsource/fira-sans@5.2.7/latin-400.css", integrity: "sha384-zPaw5kB2GwP35DvNP/DulRjmoCoEwAIcuozJWvQnXxFSFN6VU4wGAYFgZCCUeWkk" },
    { file: "@fontsource/fira-sans@5.2.7/latin-400-italic.css", integrity: "sha384-V6pdaq3LwsgY0Ys0N/tvOaGfvpDVUrqxqKPj4kBeRkGLUOQT/PImhuhbh20O7eHj" },
    { file: "@fontsource/fira-sans@5.2.7/latin-700.css", integrity: "sha384-weHrQ2KhyfA8i7TjfIbufKDju7dI3XqiFWadqMFgTVUrX6AdQfLRcAC1DAITKo9S" },
    { file: "@fontsource/roboto-mono@5.2.9/latin-400.css", integrity: "sha384-JFPHn4664qlsqgjWEgXFsgABYQWx0Pj5JCrm+GsFOXN6jI+pIMWr/g6yglRL3K/6" },
    { file: "@fontsource/roboto-mono@5.2.9/latin-700.css", integrity: "sha384-Fx8lZDlFtHrHVrXa5xuu5AbcgcfBR0uaWdxH1EPltZfjRf5OF30Q9nWOF/Rbcypv" },
  ],
});

export const digest = (value) => createHash("sha256").update(value).digest("hex");
export const integrityOf = (value) => `sha384-${createHash("sha384").update(value).digest("base64")}`;
export const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[char]);
export const inside = (parent, child) => child === parent || child.startsWith(parent + path.sep);

const skillDirectory = fileURLToPath(new URL("..", import.meta.url));
const VIEWER_FILES = ["scripts/common.mjs", "scripts/server.mjs", "assets/plan.html", "assets/viewer.css", "assets/viewer.js", "assets/tabs.js", "assets/diagrams.js"];

// A running server reports this, so open can tell a server started from older skill files.
export async function viewerVersion() {
  const hash = createHash("sha256");
  for (const file of VIEWER_FILES) hash.update(await readFile(path.join(skillDirectory, file)));
  return hash.digest("hex").slice(0, 16);
}

// Node resolves symlinks in the entry module's URL, not in process.argv[1].
export function invokedDirectly(moduleURL) {
  try { return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(moduleURL)); }
  catch { return false; }
}

export async function safePath(value) {
  if (!value || !path.isAbsolute(value)) throw new Error("Use an absolute filesystem path.");
  const normalized = path.resolve(value);
  let current = path.parse(normalized).root;
  for (const part of normalized.slice(current.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    const info = await lstat(current).catch((error) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    if (info?.isSymbolicLink()) throw new Error(`Refusing a symlink in path: ${current}`);
  }
  return normalized;
}

// /tmp is a symlink on macOS, and safePath refuses symlinks, so resolve it first.
export function defaultArtifactRoot() {
  try { return path.join(realpathSync("/tmp"), "present-plan"); }
  catch { return path.join(realpathSync(os.tmpdir()), "present-plan"); }
}

// In a shared parent such as /tmp another user can create the root first; refuse one this user does not own.
export async function checkOwnedDirectory(directory) {
  const info = await lstat(directory);
  const owner = typeof process.getuid === "function" ? process.getuid() : info.uid;
  if (!info.isDirectory() || info.uid !== owner || (info.mode & 0o022) !== 0) throw new Error(`The artifact root ${directory} must be a directory you own that no one else can write; choose another artifact root.`);
}

export async function readJSON(file) {
  const info = await lstat(file);
  if (!info.isFile() || info.isSymbolicLink() || info.size > 1_048_576) throw new Error("Invalid or oversized manifest file.");
  return JSON.parse(await readFile(file, "utf8"));
}

export async function atomicWrite(file, content, { exclusive = false } = {}) {
  await safePath(file);
  if (exclusive) {
    const handle = await open(file, "wx", 0o600);
    try { await handle.writeFile(content); } finally { await handle.close(); }
    return;
  }
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    await atomicWrite(temporary, content, { exclusive: true });
    await rename(temporary, file);
  } finally {
    await unlink(temporary).catch((error) => { if (error.code !== "ENOENT") throw error; });
  }
}

export function checkNode() {
  if (Number(process.versions.node.split(".")[0]) < 22) throw new Error("The presenter needs Node.js 22 or newer.");
}

function git(directory, args) {
  try { return execFileSync("git", ["-C", directory, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trimEnd(); }
  catch { return null; }
}

export async function inspectProject(repository, worktree) {
  const project = await realpath(repository);
  const checkout = await realpath(worktree);
  const listing = git(checkout, ["worktree", "list", "--porcelain", "-z"]);
  const checkouts = listing === null ? [checkout] : listing.split("\0").filter((field) => field.startsWith("worktree ")).map((field) => field.slice(9));
  if (!checkouts.includes(checkout) || checkouts[0] !== project) throw new Error("Repository and worktree identity do not match the main checkout.");
  if (listing === null && project !== checkout) throw new Error("A standalone plan needs the same repository and worktree directory.");
  return {
    repository: project, worktree: checkout, checkouts,
    branch: git(checkout, ["symbolic-ref", "--short", "-q", "HEAD"]),
    commit: git(checkout, ["rev-parse", "--verify", "HEAD"]),
  };
}

export async function externalDirectory(directory, checkouts) {
  const result = await safePath(directory);
  if (result === path.parse(result).root || result === os.homedir()) throw new Error("Use a dedicated artifact directory, not a filesystem root or home directory.");
  for (const checkout of checkouts) {
    if (inside(checkout, result) || inside(result, checkout)) throw new Error("Artifacts must stay outside every checkout, in a dedicated directory.");
  }
  return result;
}

export function identityOf({ repository, worktree, ticket, riders = [], kind = "ticket" }) {
  if (typeof ticket !== "string" || !ticket.trim() || ticket.length > 200) throw new Error("Supply a ticket id or a short standalone plan name.");
  if (!Array.isArray(riders) || riders.some((id) => typeof id !== "string" || !id || id.length > 200)) throw new Error("Invalid bundle identity.");
  if (kind !== "ticket" && kind !== "standalone") throw new Error("A plan is either a ticket plan or a standalone document.");
  if (kind === "standalone" && riders.length) throw new Error("A standalone document has no riders.");
  return { repository, worktree, ticket, riders: [...new Set(riders)].sort(), kind };
}

export const SESSION_ID = /^[0-9a-f]{32}$/;
export const sessionParent = (root, identity) => path.join(root, digest(identity.repository).slice(0, 16), digest(identity.ticket).slice(0, 16));
export const revisionFile = (revision) => `revision-${String(revision).padStart(4, "0")}.md`;

export async function loadSession(directory, { verifyContent = true } = {}) {
  const session = await safePath(directory);
  const manifest = await readJSON(path.join(session, "session.json")).catch((error) => { throw new Error(`Not an owned presenter session: ${error.message}`); });
  if (manifest.schema !== SCHEMA || manifest.session !== session || !Number.isInteger(manifest.revision) || manifest.revision < 1) throw new Error("Invalid presenter session manifest.");
  if (!SESSION_ID.test(manifest.id || "") || typeof manifest.token !== "string" || manifest.token.length < 32) throw new Error("Invalid presenter session credentials.");
  const project = await inspectProject(manifest.identity.repository, manifest.identity.worktree);
  const root = await externalDirectory(manifest.artifactRoot, project.checkouts);
  if (!inside(root, session) || session === root) throw new Error("Session escapes its artifact root.");
  await checkOwnedDirectory(root);
  if (path.dirname(session) !== sessionParent(root, manifest.identity) || JSON.stringify(identityOf(manifest.identity)) !== JSON.stringify(manifest.identity)) throw new Error("Invalid session identity or location.");
  if (verifyContent) {
    const source = path.join(session, revisionFile(manifest.revision));
    await safePath(source);
    await safePath(path.join(session, "plan.html"));
    if (digest(await readFile(source)) !== manifest.sourceDigest || digest(await readFile(path.join(session, "plan.html"))) !== manifest.htmlDigest) throw new Error("An owned plan file was modified outside the renderer; preserve it and ask before replacing it.");
  }
  return manifest;
}

export async function makePrivateDirectory(directory) {
  await safePath(directory);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await safePath(directory);
}

// The viewer's own files under the artifact root: the session registry, preferences and the server log.
export const viewerDirectory = (root) => path.join(root, "viewer");
export const registryDirectory = (root) => path.join(viewerDirectory(root), "sessions");
