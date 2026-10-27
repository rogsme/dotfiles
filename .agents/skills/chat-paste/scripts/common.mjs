import { createHash, randomUUID } from "node:crypto";
import { realpathSync } from "node:fs";
import { lstat, mkdir, open, readFile, rename, unlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SCHEMA = "rogs-skills/chat-paste/1";
export const APP = "chat-paste-viewer";
// Outside present-plan's ports (4388 and the 19 above it), so the two viewers rarely meet.
export const DEFAULT_PORT = 4410;
export const DEFAULT_LISTEN = "all";
export const DESTINATIONS = ["slack", "teams", "both"];

export const digest = (value) => createHash("sha256").update(value).digest("hex");
export const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[char]);
export const inside = (parent, child) => child === parent || child.startsWith(parent + path.sep);

const skillDirectory = fileURLToPath(new URL("..", import.meta.url));
const VIEWER_FILES = ["scripts/common.mjs", "scripts/server.mjs", "assets/message.html", "assets/viewer.css", "assets/viewer.js", "assets/copy.js", "assets/attention.js", "assets/changes.js"];

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
  try { return path.join(realpathSync("/tmp"), "chat-paste"); }
  catch { return path.join(realpathSync(os.tmpdir()), "chat-paste"); }
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
  if (Number(process.versions.node.split(".")[0]) < 22) throw new Error("The chat-paste viewer needs Node.js 22 or newer.");
}

export async function artifactDirectory(directory) {
  const result = await safePath(directory);
  if (result === path.parse(result).root || result === os.homedir()) throw new Error("Use a dedicated artifact directory, not a filesystem root or home directory.");
  return result;
}

export function identityOf({ name }) {
  if (typeof name !== "string" || !name.trim() || name.length > 200) throw new Error("Supply a short name for the message, such as eod-2026-10-27.");
  return { name };
}

export const SESSION_ID = /^[0-9a-f]{32}$/;
export const sessionParent = (root, identity) => path.join(root, digest(identity.name).slice(0, 16));
export const revisionFile = (revision) => `revision-${String(revision).padStart(4, "0")}.md`;

export async function loadSession(directory, { verifyContent = true } = {}) {
  const session = await safePath(directory);
  const manifest = await readJSON(path.join(session, "session.json")).catch((error) => { throw new Error(`Not an owned chat-paste session: ${error.message}`); });
  if (manifest.schema !== SCHEMA || manifest.session !== session || !Number.isInteger(manifest.revision) || manifest.revision < 1) throw new Error("Invalid chat-paste session manifest.");
  if (!SESSION_ID.test(manifest.id || "") || typeof manifest.token !== "string" || manifest.token.length < 32) throw new Error("Invalid chat-paste session credentials.");
  const root = await artifactDirectory(manifest.artifactRoot);
  if (!inside(root, session) || session === root) throw new Error("Session escapes its artifact root.");
  await checkOwnedDirectory(root);
  if (path.dirname(session) !== sessionParent(root, manifest.identity) || JSON.stringify(identityOf(manifest.identity)) !== JSON.stringify(manifest.identity)) throw new Error("Invalid session identity or location.");
  if (verifyContent) {
    const source = path.join(session, revisionFile(manifest.revision));
    await safePath(source);
    await safePath(path.join(session, "message.html"));
    if (digest(await readFile(source)) !== manifest.sourceDigest || digest(await readFile(path.join(session, "message.html"))) !== manifest.htmlDigest) throw new Error("An owned message file was modified outside the renderer; preserve it and ask before replacing it.");
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
// Each viewer keeps its own file, so viewers on two ports under one artifact root never share a secret.
export const serverFile = (root, port) => path.join(viewerDirectory(root), `server-${port}.json`);
