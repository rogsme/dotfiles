#!/usr/bin/env python3
"""Check an EOD / weekly update for AI-writing tells and client-unsafe jargon.

Usage:
    python3 check_eod.py <file> [--mode client|internal|weekly] [--client client.md]
    echo "text" | python3 check_eod.py - --mode internal

--mode client (default) and weekly: full client-safety checks.
--mode internal: allows ticket IDs, links, identifiers and jargon; still
  blocks dashes, AI tropes and bold-label bullets.
--client: reads technical_level, opener, and the "## Never mention" list
  from the client config. technical_level: technical relaxes ticket IDs,
  identifiers and jargon to SOFT.

Only the text above a "## Internal notes" heading is checked (that section
never gets pasted). Exit code 1 when there are HARD findings, 0 otherwise.
HARD findings must be fixed. SOFT findings are judgment calls. PLACEHOLDER
findings are fine to leave, but must be flagged to Roger.
"""
import argparse
import re
import statistics
import sys

HARD, SOFT, PLACE = "HARD", "SOFT", "PLACEHOLDER"

# --- writing tells -----------------------------------------------------------
DASHES = [
    (r"—", "em dash"),
    (r"–", "en dash"),
    (r"(?<=\w)\s--\s?(?=\w)|(?<=\w)\s?--\s(?=\w)", "double hyphen used as a dash"),
    (r"(?<=[a-z,])\s-\s(?=[a-zA-Z])", "spaced hyphen used as a dash"),
]
BANNED = [
    "in conclusion", "to sum up", "in summary,", "in short,",
    "here's the kicker", "here's the thing", "here's the deal",
    "here's where it gets interesting", "but there's a catch",
    "let's break this down", "let's unpack", "let's dive in",
    "it's worth noting", "it is worth noting", "it's important to note",
    "importantly,", "notably,", "interestingly,",
    "stands as a testament", "a testament to", "plays a vital role",
    "plays a crucial role", "plays a key role", "in today's fast-paced",
    "ever-evolving", "without further ado", "look no further", "delve",
    "game-changer", "game changer", "game-changing", "serves as a",
    "at the end of the day", "when it comes to", "the world of",
]
SUSPECT = [
    "leverage", "leverages", "leveraged", "leveraging", "harness", "streamline", "streamlined",
    "foster", "empower", "unlock", "elevate", "supercharge", "spearhead",
    "showcase", "underscore", "bolster", "robust", "seamless", "seamlessly",
    "cutting-edge", "transformative", "pivotal", "crucial", "vital",
    "holistic", "landscape", "realm", "paradigm", "synergy", "cornerstone",
    "effortlessly", "fundamentally", "utilize", "utilizing", "quietly",
    "deeply", "remarkably", "arguably", "journey", "ecosystem",
]
NEG_PARALLEL = [
    r"\b(?:it|this|that)(?:'s|’s| is| was)\s+not\s+(?:just|only|merely|about)\b",
    r"\bisn['’]?t\s+(?:just|only|merely|about)\b[^.!?\n]{2,80}[,;.]\s*(?:it|this|that)['’]?s\b",
    r"\bnot\s+because\b[^.!?\n]{3,60}\bbut\s+because\b",
    r"\bthe\s+(?:question|point|issue|problem|goal)\s+is\s*n['’]?t\b",
]
RHETORICAL_QA = r"\bthe\s+(?:result|answer|reason|catch|outcome|takeaway)\?\s"
COUNTDOWN = r"\bNot\s+[^.!?\n]{2,40}\.\s+Not\s+[^.!?\n]{2,40}\.\s"
ING_TAIL = (r",\s*(?:highlighting|underscoring|reflecting|showcasing|signaling|"
            r"emphasizing|cementing|solidifying|paving\s+the\s+way)\b")

# --- client-safety -----------------------------------------------------------
TICKET = r"\b[A-Z]{2,6}-\d{1,5}\b"
PR_REF = r"(?<![\w&])#\d{1,5}\b|\bPRs?\s*\d+\b"
GITHUB = r"https?://(?:github\.com|linear\.app)/\S+"
IDENT_SNAKE = r"\b[a-z0-9]+_[a-z0-9_]+\b"
IDENT_CAMEL = r"\b[a-z]+[A-Z][A-Za-z0-9]+\b"
FILEPATH = r"(?:\b[\w.-]+/)+[\w.-]+\.(?:py|ts|tsx|js|md|yml|yaml|json|sql|toml)\b|\b[\w-]+\.(?:py|ts|tsx|js|yml|yaml|toml|sql)\b"
ENV_VAR = r"\b[A-Z][A-Z0-9]*_[A-Z0-9_]{2,}\b"
JARGON = [
    "staging", "prod", "production", "PR", "PRs", "pull request", "CI",
    "repo", "endpoint", "API", "schema", "migration", "embedding",
    "embeddings", "RAG", "SQL", "LLM", "backend", "back end", "frontend",
    "front end", "webhook", "seed", "refactor", "Linear", "deploy pipeline",
    "reranker", "vector", "token", "tokens", "cache", "env", "branch",
    "commit", "merge conflict", "codec", "regression",
]
PLACEHOLDERS = r"\[(?:link|url|todo|tbd|placeholder|\.\.\.)\]|\bTODO\b|\bTBD\b|\bXXX\b|<[^>\n]{2,30}>"

EMOJI = re.compile(
    "[\U0001F300-\U0001FAFF\U00002600-\U000027BF\U0001F000-\U0001F2FF⭐✅❌]"
)
SHORTCODE = re.compile(r":[a-z0-9_+\-]{2,40}:")
HEADER_LINE = re.compile(r"^(?=.*[A-Z])[A-Z0-9 &+'/:,!().\-]{3,}(?:\s*\S{0,3})?$")


def line_of(text, pos):
    return text.count("\n", 0, pos) + 1


def load_client(path):
    """Tiny frontmatter + 'Never mention' parser (no yaml dependency)."""
    cfg = {"technical_level": "non-technical", "opener": None, "never": []}
    if not path:
        return cfg
    raw = open(path, encoding="utf-8").read()
    fm = re.match(r"^---\n(.*?)\n---", raw, re.S)
    if fm:
        for line in fm.group(1).splitlines():
            m = re.match(r"^(\w+):\s*(.*?)\s*$", line)
            if m:
                cfg[m.group(1)] = m.group(2).strip().strip('"').strip("'")
    sec = re.search(r"^##\s*Never mention\s*$(.*?)(?=^##\s|\Z)", raw, re.M | re.S | re.I)
    if sec:
        cfg["never"] = [re.sub(r"^\s*[-*]\s*", "", l).strip()
                        for l in sec.group(1).splitlines()
                        if re.match(r"^\s*[-*]\s+\S", l) and "<" not in l]
    return cfg


def main():
    ap = argparse.ArgumentParser(description="EOD checker")
    ap.add_argument("file")
    ap.add_argument("--mode", choices=["client", "internal", "weekly"], default="client")
    ap.add_argument("--client")
    args = ap.parse_args()
    cfg = load_client(args.client)
    internal = args.mode == "internal"
    technical = cfg.get("technical_level", "").lower() == "technical"
    safety = SOFT if technical else HARD
    raw = sys.stdin.read() if args.file == "-" else open(args.file, encoding="utf-8").read()
    text = re.split(r"^##\s*Internal notes\b.*$", raw, maxsplit=1, flags=re.M | re.I)[0]

    out = []

    def add(kind, pos_or_line, msg, is_line=False):
        ln = pos_or_line if is_line else line_of(text, pos_or_line)
        out.append((kind, ln, msg))

    for pat, label in DASHES:
        for m in re.finditer(pat, text):
            add(HARD, m.start(), f"dash: {label}")

    low = text.lower()
    for phrase in BANNED:
        for m in re.finditer(re.escape(phrase), low):
            add(HARD, m.start(), f"AI phrase: {phrase!r}")
    for pat in NEG_PARALLEL:
        for m in re.finditer(pat, text, re.I):
            add(HARD, m.start(), f"negative parallelism: {re.sub(chr(10), ' ', m.group(0))[:60]!r}")
    for pat, label in [(RHETORICAL_QA, "self-answered question"), (COUNTDOWN, "dramatic countdown"),
                       (ING_TAIL, "trailing -ing commentary")]:
        for m in re.finditer(pat, text, re.I if pat != COUNTDOWN else 0):
            add(HARD, m.start(), f"{label}: {m.group(0).strip()[:50]!r}")
    for w in SUSPECT:
        for m in re.finditer(rf"\b{re.escape(w)}\b", text, re.I):
            add(SOFT, m.start(), f"suspect word: {w!r}")

    # Markdown that doesn't belong in a pasted chat update
    for m in re.finditer(r"```", text):
        add(SOFT if internal else HARD, m.start(), "code fence (deliver as plain text)")
    if not internal:
        for m in re.finditer(r"`[^`\n]+`", text):
            add(safety, m.start(), f"backticks: {m.group(0)!r}")
    for m in re.finditer(r"^#{1,6}\s", text, re.M):
        add(HARD, m.start(), "markdown header (use an ALL CAPS line)")
    for m in re.finditer(r"^\s*(?:[-*•]|\d+\.)\s+\*\*[^*\n]+?(?::\*\*|\*\*\s*[:.])", text, re.M):
        add(HARD, m.start(), "bold-label bullet")

    # Client-safety (skipped for internal updates)
    shortcode_spans = [m.span() for m in SHORTCODE.finditer(text)]

    def in_shortcode(pos):
        return any(a <= pos < b for a, b in shortcode_spans)

    if not internal:
        for pat, label in [(TICKET, "ticket ID"), (PR_REF, "PR reference"), (GITHUB, "GitHub/Linear link"),
                           (FILEPATH, "file path"), (ENV_VAR, "env var / constant")]:
            for m in re.finditer(pat, text):
                add(safety, m.start(), f"{label}: {m.group(0)!r}")
        for pat, label in [(IDENT_SNAKE, "snake_case identifier"), (IDENT_CAMEL, "camelCase identifier")]:
            for m in re.finditer(pat, text):
                if in_shortcode(m.start()) or "@" in text[max(0, m.start() - 30):m.end() + 30]:
                    continue  # emoji shortcode or part of an email address
                add(safety, m.start(), f"{label}: {m.group(0)!r}")
        if not technical:
            for w in JARGON:
                flags = 0 if w.isupper() or w[0].isupper() else re.I
                for m in re.finditer(rf"\b{re.escape(w)}\b", text, flags):
                    add(SOFT, m.start(), f"jargon, translate unless the client uses it: {m.group(0)!r}")
        for phrase in cfg["never"]:
            for m in re.finditer(rf"(?<!\w){re.escape(phrase)}(?!\w)", text, re.I):
                add(HARD, m.start(), f"on this client's never-mention list: {m.group(0)!r}")
    for m in re.finditer(PLACEHOLDERS, text, re.I):
        add(PLACE, m.start(), f"placeholder left in: {m.group(0)!r}")

    # Emoji density per section
    lines = text.splitlines()
    section, count, start = "intro", 0, 1
    sections = []
    for i, ln in enumerate(lines, 1):
        stripped = SHORTCODE.sub("", EMOJI.sub("", ln)).replace("\ufe0f", "").strip()
        if stripped and HEADER_LINE.match(stripped) and not stripped.startswith(("*", "-")):
            sections.append((section, count, start))
            section, count, start = stripped, 0, i
        count += len(EMOJI.findall(ln)) + len(SHORTCODE.findall(ln))
    sections.append((section, count, start))
    total = sum(c for _, c, _ in sections)
    for name, c, ln in sections:
        if c > 3:
            add(HARD, ln, f"{c} emojis in section {name!r} (max 3)", is_line=True)

    # Opening line (client daily only)
    first = next((l for l in lines if l.strip()), "")
    opener = cfg.get("opener") or "Hey team!"
    if args.mode == "client" and not first.startswith(opener[:20]):
        add(SOFT, 1, f"doesn't open with the client opener {opener[:40]!r} (fine if intentional)", is_line=True)
    if args.mode == "weekly" and not first.startswith("Weekly Recap"):
        add(SOFT, 1, "weekly doesn't open with 'Weekly Recap (...)'", is_line=True)

    # Rhythm
    prose = re.sub(r"^\s*(?:[-*•]|\d+\.)\s", "", text, flags=re.M)
    sents = [s for s in re.split(r"(?<=[.!?])\s+", prose) if len(s.split()) >= 3]
    lens = [len(s.split()) for s in sents]
    run = 1
    for i in range(1, len(lens)):
        run = run + 1 if abs(lens[i] - lens[i - 1]) <= 3 else 1
        if run == 5:
            add(SOFT, 0, "rhythm: 5+ sentences in a row of similar length", is_line=True)
    if len(lens) >= 8 and statistics.pstdev(lens) < 4:
        add(SOFT, 0, f"rhythm: flat overall (stdev {statistics.pstdev(lens):.1f} words)", is_line=True)

    order = {HARD: 0, PLACE: 1, SOFT: 2}
    out.sort(key=lambda f: (order[f[0]], f[1]))
    for kind, ln, msg in out:
        where = f"line {ln}" if ln else "overall"
        print(f"{kind:<11} {where:<8} {msg}")
    n = {k: sum(1 for f in out if f[0] == k) for k in (HARD, PLACE, SOFT)}
    print(f"\n{n[HARD]} hard, {n[PLACE]} placeholder, {n[SOFT]} soft. Emojis total: {total}.")
    if n[HARD]:
        print("Fix every HARD finding and re-run.")
    sys.exit(1 if n[HARD] else 0)


if __name__ == "__main__":
    main()
