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
  identifiers and jargon to SOFT. PR numbers like (#156) are always allowed,
  and so is a GitHub link written as a PR number's own link:
  [#156](https://github.com/owner/repo/pull/156).
--prs: saved JSON output from todays_prs.py --json. Every MERGED, OPENED and
  WORKED ON PR must appear in the public text as #N, owner/repo#N, or its URL,
  and carry its PR URL. ACTIVITY and CLOSED PRs are not required.
--skip-pr: repo#number explicitly skipped by Roger (repeatable, requires --prs).

Only the text above a "## Internal notes" heading is checked (that section
never gets pasted). Exit code 1 when there are HARD findings, 0 otherwise.
HARD findings must be fixed. SOFT findings are judgment calls. PLACEHOLDER
findings are fine to leave, but must be flagged to Roger.
"""

import argparse
from collections import Counter
import json
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
    "in conclusion",
    "to sum up",
    "in summary,",
    "in short,",
    "here's the kicker",
    "here's the thing",
    "here's the deal",
    "here's where it gets interesting",
    "but there's a catch",
    "let's break this down",
    "let's unpack",
    "let's dive in",
    "it's worth noting",
    "it is worth noting",
    "it's important to note",
    "importantly,",
    "notably,",
    "interestingly,",
    "stands as a testament",
    "a testament to",
    "plays a vital role",
    "plays a crucial role",
    "plays a key role",
    "in today's fast-paced",
    "ever-evolving",
    "without further ado",
    "look no further",
    "delve",
    "game-changer",
    "game changer",
    "game-changing",
    "serves as a",
    "at the end of the day",
    "when it comes to",
    "the world of",
]
SUSPECT = [
    "leverage",
    "leverages",
    "leveraged",
    "leveraging",
    "harness",
    "streamline",
    "streamlined",
    "foster",
    "empower",
    "unlock",
    "elevate",
    "supercharge",
    "spearhead",
    "showcase",
    "underscore",
    "bolster",
    "robust",
    "seamless",
    "seamlessly",
    "cutting-edge",
    "transformative",
    "pivotal",
    "crucial",
    "vital",
    "holistic",
    "landscape",
    "realm",
    "paradigm",
    "synergy",
    "cornerstone",
    "effortlessly",
    "fundamentally",
    "utilize",
    "utilizing",
    "quietly",
    "deeply",
    "remarkably",
    "arguably",
    "journey",
    "ecosystem",
]
NEG_PARALLEL = [
    r"\b(?:it|this|that)(?:'s|’s| is| was)\s+not\s+(?:just|only|merely|about)\b",
    r"\bisn['’]?t\s+(?:just|only|merely|about)\b[^.!?\n]{2,80}[,;.]\s*(?:it|this|that)['’]?s\b",
    r"\bnot\s+because\b[^.!?\n]{3,60}\bbut\s+because\b",
    r"\bthe\s+(?:question|point|issue|problem|goal)\s+is\s*n['’]?t\b",
]
RHETORICAL_QA = r"\bthe\s+(?:result|answer|reason|catch|outcome|takeaway)\?\s"
COUNTDOWN = r"\bNot\s+[^.!?\n]{2,40}\.\s+Not\s+[^.!?\n]{2,40}\.\s"
ING_TAIL = (
    r",\s*(?:highlighting|underscoring|reflecting|showcasing|signaling|"
    r"emphasizing|cementing|solidifying|paving\s+the\s+way)\b"
)

# --- client-safety -----------------------------------------------------------
TICKET = r"\b[A-Z]{2,6}-\d{1,5}\b"
GITHUB = r"https?://(?:github\.com|linear\.app)/\S+"
PR_LINK = (
    r"\[(?:([\w.-]+/[\w.-]+))?#(\d+)\]"
    r"\((https?://github\.com/([\w.-]+/[\w.-]+)/pull/(\d+))\)"
)
IDENT_SNAKE = r"\b[a-z0-9]+_[a-z0-9_]+\b"
IDENT_CAMEL = r"\b[a-z]+[A-Z][A-Za-z0-9]+\b"
FILEPATH = r"(?:\b[\w.-]+/)+[\w.-]+\.(?:py|ts|tsx|js|md|yml|yaml|json|sql|toml)\b|\b[\w-]+\.(?:py|ts|tsx|js|yml|yaml|toml|sql)\b"
ENV_VAR = r"\b[A-Z][A-Z0-9]*_[A-Z0-9_]{2,}\b"
JARGON = [
    "staging",
    "prod",
    "production",
    "PR",
    "PRs",
    "pull request",
    "CI",
    "repo",
    "endpoint",
    "API",
    "schema",
    "migration",
    "embedding",
    "embeddings",
    "RAG",
    "SQL",
    "LLM",
    "backend",
    "back end",
    "frontend",
    "front end",
    "webhook",
    "seed",
    "refactor",
    "Linear",
    "deploy pipeline",
    "reranker",
    "vector",
    "token",
    "tokens",
    "cache",
    "env",
    "branch",
    "commit",
    "merge conflict",
    "codec",
    "regression",
]
PLACEHOLDERS = r"\[(?:link|url|todo|tbd|placeholder|\.\.\.)\]|\bTODO\b|\bTBD\b|\bXXX\b|<[^>\n]{2,30}>"

EMOJI = re.compile(
    "[\U0001f300-\U0001faff\U00002600-\U000027bf\U0001f000-\U0001f2ff⭐✅❌]"
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
    sec = re.search(
        r"^##\s*Never mention\s*$(.*?)(?=^##\s|\Z)", raw, re.M | re.S | re.I
    )
    if sec:
        cfg["never"] = [
            re.sub(r"^\s*[-*]\s*", "", l).strip()
            for l in sec.group(1).splitlines()
            if re.match(r"^\s*[-*]\s+\S", l) and "<" not in l
        ]
    return cfg


REQUIRED_BUCKETS = ("MERGED", "OPENED", "WORKED ON")
OPTIONAL_BUCKETS = ("ACTIVITY", "CLOSED")


def check_pr_coverage(text, manifest, skipped):
    """Match required PRs to visible #N, owner/repo#N, or PR URL mentions.

    Returns (missing, unlinked, summary): unlinked PRs are visible but carry
    no link to their pull request.
    """
    data = manifest.get("buckets") if isinstance(manifest, dict) else None
    if not isinstance(data, dict) or not set(REQUIRED_BUCKETS) <= set(data):
        raise ValueError(
            "PR gather JSON must contain the MERGED, OPENED and WORKED ON buckets."
        )
    gathered = {}
    for bucket in REQUIRED_BUCKETS + OPTIONAL_BUCKETS:
        items = data.get(bucket, [])
        if not isinstance(items, list):
            raise ValueError(f"PR gather bucket {bucket} must be a list.")
        for pr in items:
            if (
                not isinstance(pr, dict)
                or not isinstance(pr.get("repo"), str)
                or not re.fullmatch(r"[^\s/#]+/[^\s/#]+", pr["repo"])
                or type(pr.get("number")) is not int
                or pr["number"] <= 0
            ):
                raise ValueError(f"Invalid PR identity in {bucket}.")
            gathered.setdefault(f"{pr['repo']}#{pr['number']}", (bucket, pr))
    skipped = set(skipped)
    unknown = skipped - gathered.keys()
    if unknown:
        raise ValueError(
            f"Skipped PRs not in gather output: {', '.join(sorted(unknown))}"
        )
    required = {
        key: pr
        for key, (bucket, pr) in gathered.items()
        if bucket in REQUIRED_BUCKETS and key not in skipped
    }
    optional = [key for key, (bucket, _) in gathered.items() if bucket in OPTIONAL_BUCKETS]
    public = re.split(
        r"^\s{0,3}#{1,6}\s+Internal notes\b.*$", text, maxsplit=1, flags=re.M | re.I
    )[0].casefold()
    numbers = Counter(pr["number"] for _, pr in gathered.values())
    missing, unlinked = [], []
    for key, pr in required.items():
        n, repo = pr["number"], re.escape(pr["repo"].casefold())
        identity = re.search(rf"(?<![\w/#-]){repo}#{n}(?!\w)", public)
        url = re.search(rf"github\.com/{repo}/pull/{n}(?!\w)", public)
        number = numbers[n] == 1 and re.search(
            rf"(?<![\w/#-])(?:#|prs?\s*){n}(?!\w)", public
        )
        if not (identity or url or number):
            missing.append(key)
        elif not url:
            unlinked.append(key)
    summary = (
        f"PR coverage: {len(required) - len(missing)}/{len(required)} required PRs "
        f"visible ({len(skipped)} explicitly skipped by Roger)."
    )
    if optional:
        summary += (
            f" Not required, list for Roger as FYI: {', '.join(sorted(optional))}."
        )
    return missing, unlinked, summary


def main():
    ap = argparse.ArgumentParser(description="EOD checker")
    ap.add_argument("file")
    ap.add_argument(
        "--mode", choices=["client", "internal", "weekly"], default="client"
    )
    ap.add_argument("--client")
    ap.add_argument("--prs", help="Saved JSON output from todays_prs.py --json")
    ap.add_argument(
        "--skip-pr",
        action="append",
        default=[],
        help="repo#number explicitly skipped by Roger (repeatable)",
    )
    args = ap.parse_args()
    if args.skip_pr and not args.prs:
        ap.error("--skip-pr requires --prs")
    cfg = load_client(args.client)
    internal = args.mode == "internal"
    technical = cfg.get("technical_level", "").lower() == "technical"
    safety = SOFT if technical else HARD
    raw = (
        sys.stdin.read()
        if args.file == "-"
        else open(args.file, encoding="utf-8").read()
    )
    text = re.split(
        r"^\s{0,3}#{1,6}\s+Internal notes\b.*$", raw, maxsplit=1, flags=re.M | re.I
    )[0]

    out = []

    def add(kind, pos_or_line, msg, is_line=False):
        ln = pos_or_line if is_line else line_of(text, pos_or_line)
        out.append((kind, ln, msg))

    if args.prs:
        try:
            with open(args.prs, encoding="utf-8") as gathered:
                missing, unlinked, summary = check_pr_coverage(
                    text, json.load(gathered), args.skip_pr
                )
            print(summary)
            for key in missing:
                add(
                    HARD,
                    1,
                    f"gathered PR missing from public update: {key}",
                    is_line=True,
                )
            for key in unlinked:
                repo, n = key.split("#")
                add(
                    HARD,
                    1,
                    f"PR {key} has no link: write [#{n}](https://github.com/{repo}/pull/{n})",
                    is_line=True,
                )
        except (OSError, ValueError) as error:
            add(HARD, 1, f"PR coverage check failed: {error}", is_line=True)

    for pat, label in DASHES:
        for m in re.finditer(pat, text):
            add(HARD, m.start(), f"dash: {label}")

    low = text.lower()
    for phrase in BANNED:
        for m in re.finditer(re.escape(phrase), low):
            add(HARD, m.start(), f"AI phrase: {phrase!r}")
    for pat in NEG_PARALLEL:
        for m in re.finditer(pat, text, re.I):
            add(
                HARD,
                m.start(),
                f"negative parallelism: {re.sub(chr(10), ' ', m.group(0))[:60]!r}",
            )
    for pat, label in [
        (RHETORICAL_QA, "self-answered question"),
        (COUNTDOWN, "dramatic countdown"),
        (ING_TAIL, "trailing -ing commentary"),
    ]:
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
    for m in re.finditer(
        r"^\s*(?:[-*•]|\d+\.)\s+\*\*[^*\n]+?(?::\*\*|\*\*\s*[:.])", text, re.M
    ):
        add(HARD, m.start(), "bold-label bullet")

    # Client-safety (skipped for internal updates)
    shortcode_spans = [m.span() for m in SHORTCODE.finditer(text)]
    # Query strings and paths inside a link are not prose; only the GitHub/Linear
    # check looks at URLs.
    url_spans = [m.span() for m in re.finditer(r"https?://[^\s)\]>]+", text)]

    def in_shortcode(pos):
        return any(a <= pos < b for a, b in shortcode_spans)

    def in_url(pos):
        return any(a <= pos < b for a, b in url_spans)

    # A PR number linked to its own pull request is the one allowed GitHub link.
    pr_links = set()
    for m in re.finditer(PR_LINK, text):
        text_repo, text_n, url, url_repo, url_n = m.groups()
        if text_n != url_n or (text_repo and text_repo.casefold() != url_repo.casefold()):
            add(HARD, m.start(), f"PR link text does not match its URL: {m.group(0)!r}")
        else:
            pr_links.add(m.start(3))

    if not internal:
        for m in re.finditer(GITHUB, text):
            if m.start() not in pr_links:
                add(safety, m.start(), f"GitHub/Linear link: {m.group(0)!r}")
        for pat, label in [
            (TICKET, "ticket ID"),
            (FILEPATH, "file path"),
            (ENV_VAR, "env var / constant"),
        ]:
            for m in re.finditer(pat, text):
                if not in_url(m.start()):
                    add(safety, m.start(), f"{label}: {m.group(0)!r}")
        for pat, label in [
            (IDENT_SNAKE, "snake_case identifier"),
            (IDENT_CAMEL, "camelCase identifier"),
        ]:
            for m in re.finditer(pat, text):
                if (
                    in_shortcode(m.start())
                    or in_url(m.start())
                    or "@" in text[max(0, m.start() - 30) : m.end() + 30]
                ):
                    continue  # emoji shortcode, link, or part of an email address
                add(safety, m.start(), f"{label}: {m.group(0)!r}")
        if not technical:
            for w in JARGON:
                flags = 0 if w.isupper() or w[0].isupper() else re.I
                for m in re.finditer(rf"\b{re.escape(w)}\b", text, flags):
                    if in_url(m.start()):
                        continue
                    add(
                        SOFT,
                        m.start(),
                        f"jargon, translate unless the client uses it: {m.group(0)!r}",
                    )
        for phrase in cfg["never"]:
            for m in re.finditer(rf"(?<!\w){re.escape(phrase)}(?!\w)", text, re.I):
                add(
                    HARD,
                    m.start(),
                    f"on this client's never-mention list: {m.group(0)!r}",
                )
    for m in re.finditer(PLACEHOLDERS, text, re.I):
        add(PLACE, m.start(), f"placeholder left in: {m.group(0)!r}")

    # Emoji density per section
    lines = text.splitlines()
    section, count, start = "intro", 0, 1
    sections = []
    for i, ln in enumerate(lines, 1):
        stripped = SHORTCODE.sub("", EMOJI.sub("", ln)).replace("\ufe0f", "").strip()
        if (
            stripped
            and HEADER_LINE.match(stripped)
            and not stripped.startswith(("*", "-"))
        ):
            sections.append((section, count, start))
            section, count, start = stripped, 0, i
        count += len(EMOJI.findall(ln)) + len(SHORTCODE.findall(ln))
    sections.append((section, count, start))
    total = sum(c for _, c, _ in sections)
    for name, c, ln in sections:
        if c > 3:
            add(HARD, ln, f"{c} emojis in section {name!r} (max 3)", is_line=True)

    # Structure (client and weekly)
    if args.mode in ("client", "weekly"):
        header = (cfg.get("main_header") or "").strip()
        if args.mode == "client" and header and "<" not in header:
            norm = lambda x: re.sub(r"[^A-Z0-9&]", "", EMOJI.sub("", x).upper())
            if not any(norm(l) == norm(header) for l in lines):
                add(
                    HARD,
                    1,
                    f"main section header missing: use exactly {header!r}",
                    is_line=True,
                )
        for i, ln in enumerate(lines, 1):
            if re.match(r"^\s*-\s+\S", ln):
                add(SOFT, i, "bullet uses '-'; this skill uses '*'", is_line=True)
        for i in range(len(lines) - 1):
            cur, nxt = lines[i], lines[i + 1]
            m1 = re.match(r"^(\s*)[-*\u2022]\s+.*:\s*$", cur)
            m2 = re.match(r"^(\s*)[-*\u2022]\s+\S", nxt)
            if m1 and m2 and len(m1.group(1)) == len(m2.group(1)):
                add(
                    SOFT,
                    i + 1,
                    "lead-in written as a bullet (ends with ':' and the list continues at the same level); make it a plain line",
                    is_line=True,
                )

    # Opening line (client daily only)
    first = next((l for l in lines if l.strip()), "")
    opener = cfg.get("opener") or "Hey team!"
    if args.mode == "client" and not first.startswith(opener[:20]):
        add(
            SOFT,
            1,
            f"doesn't open with the client opener {opener[:40]!r} (fine if intentional)",
            is_line=True,
        )
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
            add(
                SOFT, 0, "rhythm: 5+ sentences in a row of similar length", is_line=True
            )
    if len(lens) >= 8 and statistics.pstdev(lens) < 4:
        add(
            SOFT,
            0,
            f"rhythm: flat overall (stdev {statistics.pstdev(lens):.1f} words)",
            is_line=True,
        )

    order = {HARD: 0, PLACE: 1, SOFT: 2}
    out.sort(key=lambda f: (order[f[0]], f[1]))
    for kind, ln, msg in out:
        where = f"line {ln}" if ln else "overall"
        print(f"{kind:<11} {where:<8} {msg}")
    n = {k: sum(1 for f in out if f[0] == k) for k in (HARD, PLACE, SOFT)}
    print(
        f"\n{n[HARD]} hard, {n[PLACE]} placeholder, {n[SOFT]} soft. Emojis total: {total}."
    )
    if n[HARD]:
        print("Fix every HARD finding and re-run.")
    sys.exit(1 if n[HARD] else 0)


if __name__ == "__main__":
    main()
