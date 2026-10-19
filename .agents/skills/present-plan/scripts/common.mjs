import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { realpathSync } from "node:fs";
import { lstat, mkdir, open, readFile, realpath, rename, unlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SCHEMA = "rogs-skills/present-plan/1";
export const RENDERER_VERSIONS = Object.freeze({ marked: "18.1.0", mermaid: "11.12.1" });
export const VERSIONS = Object.freeze({ "lavish-axi": "0.1.89", ...RENDERER_VERSIONS });
export const digest = (value) => createHash("sha256").update(value).digest("hex");
export const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[char]);
export const inside = (parent, child) => child === parent || child.startsWith(parent + path.sep);

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
  try { return path.join(realpathSync("/tmp"), "lavish"); }
  catch { return path.join(realpathSync(os.tmpdir()), "lavish"); }
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

export async function inspectRuntime(directory) {
  if (Number(process.versions.node.split(".")[0]) < 22) throw new Error("The presenter needs Node.js 22 or newer.");
  const runtime = await safePath(directory);
  for (const [name, version] of Object.entries(RENDERER_VERSIONS)) {
    const file = path.join(runtime, "node_modules", name, "package.json");
    await safePath(file);
    const pkg = await readJSON(file).catch((error) => { throw new Error(`Runtime package ${name} is unavailable: ${error.message}`); });
    if (pkg.name !== name || pkg.version !== version) throw new Error(`Runtime needs ${name}@${version}; found ${pkg.version || "unknown"}.`);
  }
  return runtime;
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
  if (result === path.parse(result).root || result === os.homedir()) throw new Error("Use a dedicated artifact/runtime directory, not a filesystem root or home directory.");
  for (const checkout of checkouts) {
    if (inside(checkout, result) || inside(result, checkout)) throw new Error("Artifacts and runtime must stay outside every checkout, in a dedicated directory.");
  }
  return result;
}

export function identityOf({ repository, worktree, ticket, riders = [] }) {
  if (typeof ticket !== "string" || !ticket.trim() || ticket.length > 200) throw new Error("Supply a ticket id or a short standalone plan name.");
  if (!Array.isArray(riders) || riders.some((id) => typeof id !== "string" || !id || id.length > 200)) throw new Error("Invalid bundle identity.");
  return { repository, worktree, ticket, riders: [...new Set(riders)].sort() };
}

export async function loadSession(directory, { verifyContent = true } = {}) {
  const session = await safePath(directory);
  const manifest = await readJSON(path.join(session, "session.json")).catch((error) => { throw new Error(`Not an owned presenter session: ${error.message}`); });
  if (manifest.schema !== SCHEMA || manifest.session !== session || !Number.isInteger(manifest.revision) || manifest.revision < 1) throw new Error("Invalid presenter session manifest.");
  const project = await inspectProject(manifest.identity.repository, manifest.identity.worktree);
  const root = await externalDirectory(manifest.artifactRoot, project.checkouts);
  if (!inside(root, session) || session === root) throw new Error("Session escapes its artifact root.");
  await checkOwnedDirectory(root);
  await externalDirectory(manifest.runtime, project.checkouts);
  await externalDirectory(manifest.stateDir, project.checkouts);
  const expectedParent = path.join(root, digest(project.repository).slice(0, 16), digest(manifest.identity.ticket).slice(0, 16));
  if (path.dirname(session) !== expectedParent || JSON.stringify(identityOf(manifest.identity)) !== JSON.stringify(manifest.identity)) throw new Error("Invalid session identity or location.");
  if (!Number.isInteger(manifest.port) || manifest.port < 1024 || manifest.port > 65535) throw new Error("Invalid presenter port.");
  if (verifyContent) {
    const source = path.join(session, `revision-${String(manifest.revision).padStart(4, "0")}.md`);
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
