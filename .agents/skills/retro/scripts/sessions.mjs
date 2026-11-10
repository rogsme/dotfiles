#!/usr/bin/env node
// Lists the coding sessions recorded for a worktree and condenses each one into a digest, so a retrospective can read them all.
// This is the one script that knows how harnesses store sessions, and each harness keeps its code in one load function.
import { execFileSync, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { closeSync, mkdtempSync, openSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const USAGE = "node sessions.mjs [--dir <path>]\n";
const TOOL_INPUT_LIMIT = 160;
const TOOL_ERROR_LIMIT = 600;
const OPENCODE_LIST_LIMIT = "1000000";
const OPENCODE_TIMEOUT = 120000;
const OPENCODE_PARALLEL_EXPORTS = 4;
const COMPACTED = "(context compacted here)";

function oneLine(text, limit) {
  const line = String(text ?? "").replace(/\s+/g, " ").trim();
  return line.length > limit ? `${line.slice(0, limit)}...` : line;
}

function toolLine(name, input) {
  const shown = typeof input?.command === "string" ? input.command : JSON.stringify(input ?? {});
  return `- ${name}: ${oneLine(shown, TOOL_INPUT_LIMIT)}`;
}

function failureLine(name, detail) {
  return `- ${name} FAILED: ${oneLine(detail, TOOL_ERROR_LIMIT)}`;
}

function isWithin(child, parent) {
  const relative = path.relative(parent, child);
  return !relative.startsWith("..") && !path.isAbsolute(relative);
}

function git(directory, args) {
  try {
    return execFileSync("git", ["-C", directory, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

// A session belongs to the worktree it started in, so another worktree nested under the root keeps its own sessions.
function resolveScope(directory) {
  const answer = git(directory, ["rev-parse", "--path-format=absolute", "--show-toplevel", "--git-dir", "--git-common-dir"]);
  if (!answer) return { kind: "directory", root: realpathSync(directory), excluded: [] };
  const [root, gitDirectory, commonDirectory] = answer.split("\n");
  const worktrees = (git(root, ["worktree", "list", "--porcelain"]) ?? "").split("\n")
    .filter((line) => line.startsWith("worktree "))
    .map((line) => line.slice("worktree ".length));
  return {
    kind: gitDirectory === commonDirectory ? "main checkout" : "linked worktree",
    root,
    excluded: worktrees.filter((worktree) => worktree !== root && isWithin(worktree, root)),
  };
}

function belongs(directory, { root, excluded }) {
  return isWithin(directory, root) && !excluded.some((worktree) => isWithin(directory, worktree));
}

// Strips what the harness wrapped around a person's words, and leaves a slash command as the person typed it.
function claudeUserText(raw) {
  const text = raw.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, "").trim();
  if (/^<(local-command-|task-notification)/.test(text)) return "";
  const command = text.match(/<command-name>([\s\S]*?)<\/command-name>/);
  if (!command) return text;
  const args = text.match(/<command-args>([\s\S]*?)<\/command-args>/);
  return `${command[1].trim()} ${args?.[1].trim() ?? ""}`.trim();
}

function toolText(content) {
  if (typeof content === "string") return content;
  return (content ?? []).map((block) => block.text ?? "").join(" ");
}

function parseClaudeTranscript(file) {
  const session = { harness: "claude-code", source: file, id: path.basename(file, ".jsonl"), events: [], branch: "", start: null, end: null, recognized: false, directory: null };
  const toolNames = new Map();
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (!line.trim()) continue;
    let record;
    try {
      record = JSON.parse(line);
    } catch {
      continue;
    }
    session.directory ??= record.cwd ?? null;
    if ((record.type !== "user" && record.type !== "assistant") || typeof record.message !== "object" || record.isSidechain) continue;
    session.recognized = true;
    if (record.gitBranch) session.branch = record.gitBranch;
    if (record.timestamp) {
      session.start ??= Date.parse(record.timestamp);
      session.end = Date.parse(record.timestamp);
    }
    if (record.isCompactSummary) {
      session.events.push({ note: COMPACTED });
      continue;
    }
    if (record.isMeta) continue;
    const content = record.message?.content;
    const blocks = typeof content === "string" ? [{ type: "text", text: content }] : content ?? [];
    for (const block of blocks) {
      if (block.type === "tool_use") {
        toolNames.set(block.id, block.name);
        session.events.push({ tool: toolLine(block.name, block.input) });
      } else if (block.type === "tool_result" && block.is_error) {
        session.events.push({ tool: failureLine(toolNames.get(block.tool_use_id) ?? "tool", toolText(block.content)) });
      } else if (block.type === "text") {
        const text = record.type === "user" ? claudeUserText(block.text ?? "") : (block.text ?? "").trim();
        if (text) session.events.push({ role: record.type, text });
      }
    }
  }
  return session;
}

function listJsonl(directory) {
  return readdirSync(directory).filter((name) => name.endsWith(".jsonl")).map((name) => path.join(directory, name));
}

function loadClaudeCode(scope, warnings) {
  const projects = path.join(process.env.CLAUDE_CONFIG_DIR ?? path.join(os.homedir(), ".claude"), "projects");
  let folders;
  try {
    folders = readdirSync(projects);
  } catch {
    return [];
  }
  // Folder names are lossy, so they only narrow the search. The transcript's own cwd decides.
  const slug = scope.root.replace(/[^a-zA-Z0-9]/g, "-");
  const candidates = folders.filter((name) => name === slug || name.startsWith(`${slug}-`));
  const sessions = [];
  for (const folder of candidates) {
    for (const file of listJsonl(path.join(projects, folder))) {
      const session = parseClaudeTranscript(file);
      if (session.directory ? belongs(session.directory, scope) : folder === slug) sessions.push(session);
    }
  }
  for (const session of sessions) {
    if (!session.recognized) warnings.push(`No messages recognized in ${session.source}. The transcript format may have changed.`);
    session.start ??= statSync(session.source).mtimeMs;
    session.end ??= session.start;
  }
  return sessions;
}

// OpenCode 2.2.5 exits 0 after writing only part of its output to a pipe, a different amount each run, so its stdout goes to a file.
function runOpencode(root, args, scratch) {
  const output = path.join(scratch, `opencode-${randomUUID()}.json`);
  const stdout = openSync(output, "wx", 0o600);
  let timer;
  return new Promise((resolve, reject) => {
    const child = spawn("opencode", args, { cwd: root, stdio: ["ignore", stdout, "pipe"] });
    // spawn's own timeout outlives a command that is not installed, which would hold this process open for the whole wait.
    timer = setTimeout(() => child.kill(), OPENCODE_TIMEOUT);
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code, signal) => {
      if (code === 0) resolve(readFileSync(output, "utf8"));
      else reject(Object.assign(new Error(`opencode ${args[1]} ended with ${signal ?? `exit ${code}`}`), { detail: oneLine(stderr, 200) || undefined }));
    });
  }).finally(() => {
    clearTimeout(timer);
    closeSync(stdout);
    rmSync(output, { force: true });
  });
}

function parseOpencodeExport(exported, listed) {
  const session = { harness: "opencode", source: `opencode session export ${listed.id}`, id: listed.id, events: [], branch: "", start: listed.created, end: listed.updated, recognized: false };
  for (const message of exported.messages ?? []) {
    if (message.type === "user") {
      session.recognized = true;
      if (message.text?.trim()) session.events.push({ role: "user", text: message.text.trim() });
    } else if (message.type === "compaction") {
      session.events.push({ note: COMPACTED });
    } else if (message.type === "assistant") {
      session.recognized = true;
      for (const part of message.content ?? []) {
        if (part.type === "text" && part.text?.trim()) {
          session.events.push({ role: "assistant", text: part.text.trim() });
        } else if (part.type === "tool") {
          session.events.push({ tool: toolLine(part.name, part.state?.input) });
          if (part.state?.status === "error") session.events.push({ tool: failureLine(part.name, part.state.error?.message ?? JSON.stringify(part.state.error)) });
          else if (Number.isInteger(part.state?.metadata?.exit) && part.state.metadata.exit !== 0) {
            const output = toolText(part.state.content);
            session.events.push({ tool: failureLine(part.name, `exit ${part.state.metadata.exit}${output ? `: ${output}` : ""}`) });
          }
        }
      }
    }
  }
  return session;
}

async function loadOpencode(scope, warnings, scratch) {
  let listing;
  try {
    listing = await runOpencode(scope.root, ["session", "list", "--format", "json", "-n", OPENCODE_LIST_LIMIT], scratch);
  } catch (error) {
    if (error.code !== "ENOENT") warnings.push(`Could not list OpenCode sessions, so any are missing here: ${error.detail ?? error.message}`);
    return [];
  }
  let listed;
  try {
    listed = JSON.parse(listing).filter((session) => belongs(session.directory, scope));
  } catch (error) {
    warnings.push(`Could not read the OpenCode session list, so any sessions are missing here: ${error.message}`);
    return [];
  }
  const sessions = [];
  const queue = [...listed];
  const exportNext = async () => {
    for (let entry = queue.shift(); entry; entry = queue.shift()) {
      try {
        const session = parseOpencodeExport(JSON.parse(await runOpencode(scope.root, ["session", "export", entry.id], scratch)), entry);
        if (!session.recognized) warnings.push(`No messages recognized in OpenCode session ${entry.id}. The export format may have changed.`);
        sessions.push(session);
      } catch (error) {
        warnings.push(`Could not export OpenCode session ${entry.id}, so it is missing here: ${error.detail ?? error.message}`);
      }
    }
  };
  await Promise.all(Array.from({ length: OPENCODE_PARALLEL_EXPORTS }, exportNext));
  return sessions;
}

function timestamp(ms) {
  return new Date(ms).toISOString().slice(0, 16).replace("T", " ");
}

function renderDigest(session, number) {
  const lines = [`# Session ${number}: ${session.harness}, ${timestamp(session.start)} to ${timestamp(session.end)} UTC`, "", `Source: ${session.source}`];
  let heading = "";
  for (const event of session.events) {
    if (event.note) {
      lines.push("", event.note);
      heading = "";
    } else if (event.tool) {
      lines.push(event.tool);
    } else {
      if (event.role !== heading) lines.push("", `## ${event.role === "user" ? "User" : "Assistant"}`);
      heading = event.role;
      lines.push("", event.text);
    }
  }
  return `${lines.join("\n")}\n`;
}

function kilobytes(bytes) {
  return `${Math.ceil(bytes / 1024)} KB`;
}

function renderIndex(scope, directory, sessions, warnings) {
  const lines = [`Scope: ${scope.kind}`, `Root: ${scope.root}`, `Digests: ${directory}`];
  lines.push(`Sessions: ${sessions.length}, ${kilobytes(sessions.reduce((total, session) => total + session.size, 0))} of digests, oldest first`, "");
  sessions.forEach((session, index) => {
    const said = session.events.filter((event) => event.role === "user");
    const first = said.find((event) => !/^\/\S+$/.test(event.text)) ?? said[0];
    lines.push(`${index + 1}. ${session.harness}, ${timestamp(session.start)} to ${timestamp(session.end)} UTC${session.branch ? `, branch ${session.branch}` : ""}, ${kilobytes(session.size)}`);
    lines.push(`   First message: ${first ? oneLine(first.text, 100) : "(none)"}`);
    lines.push(`   Digest: ${session.digest}`);
    lines.push(`   Source: ${session.source}`);
  });
  if (sessions.length) lines.push("");
  lines.push(...warnings.map((warning) => `Warning: ${warning}`));
  return `${lines.join("\n").trimEnd()}\n`;
}

function parseArgs(args) {
  if (args.includes("--help")) return { help: true };
  if (args.length === 0) return { directory: process.cwd() };
  if (args.length === 2 && args[0] === "--dir") return { directory: path.resolve(args[1]) };
  throw new Error(USAGE.trimEnd());
}

async function main(args) {
  const { help, directory } = parseArgs(args);
  if (help) {
    process.stdout.write(USAGE);
    return;
  }
  if (!statSync(directory, { throwIfNoEntry: false })?.isDirectory()) throw new Error(`Not a directory: ${directory}`);
  const scope = resolveScope(directory);
  const warnings = [];
  // mkdtemp makes the folder private, which matters because transcripts can hold secrets.
  const digests = mkdtempSync(path.join(os.tmpdir(), "retro-sessions-"));
  const claudeCode = loadClaudeCode(scope, warnings);
  const opencode = await loadOpencode(scope, warnings, digests);
  const sessions = [...claudeCode, ...opencode].sort((left, right) => left.start - right.start);
  sessions.forEach((session, index) => {
    const number = String(index + 1).padStart(2, "0");
    session.digest = `${number}-${session.harness}.md`;
    const digest = renderDigest(session, index + 1);
    session.size = Buffer.byteLength(digest);
    writeFileSync(path.join(digests, session.digest), digest, { mode: 0o600 });
  });
  process.stdout.write(renderIndex(scope, digests, sessions, warnings));
}

// Node resolves symlinks in the entry module's URL, not in process.argv[1], and installs symlink skill folders.
const invokedDirectly = process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
if (invokedDirectly) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
