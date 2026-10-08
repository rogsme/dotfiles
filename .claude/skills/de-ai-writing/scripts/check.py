#!/usr/bin/env python3
"""Flag common AI-writing tells in a text file. Informational only: a human
(or Claude) judges false positives. Usage:

    python check.py <file>
    echo "text" | python check.py -
"""
import re
import statistics
import sys

DASH_PATTERNS = [
    (r"—", "em dash"),
    (r"\s–\s", "en dash used as em dash"),
    (r"(?<=\w)\s--\s(?=\w)", "double-hyphen dash"),
]

BANNED_PHRASES = [
    "in conclusion", "to sum up", "in summary,",
    "here's the kicker", "here's the thing", "here's the deal",
    "here's where it gets interesting", "here's what most people miss",
    "but there's a catch", "let's break this down", "let's unpack",
    "it's worth noting", "it is worth noting", "it's important to note",
    "it is important to note", "importantly,", "notably,",
    "i hope this email finds you well", "stands as a testament",
    "a testament to", "plays a vital role", "plays a crucial role",
    "in today's fast-paced", "ever-evolving", "let's dive in",
    "without further ado", "look no further", "delve",
    "at the end of the day", "when it comes to", "in the world of",
    "game-changer", "game changer", "game-changing",
    "think of it as", "imagine a world where",
]

SUSPECT_WORDS = [
    "leverage", "leveraging", "harness", "streamline", "streamlining",
    "foster", "fostering", "empower", "empowering", "unlock", "elevate",
    "supercharge", "revolutionize", "spearhead", "showcase", "showcasing",
    "underscore", "underscoring", "bolster", "robust", "seamless",
    "seamlessly", "cutting-edge", "transformative", "pivotal", "crucial",
    "vital", "holistic", "intricate", "vibrant", "tapestry", "landscape",
    "realm", "paradigm", "synergy", "beacon", "cornerstone", "powerhouse",
    "effortlessly", "fundamentally", "boasts", "certainly",
    "utilize", "utilizing", "utilized",
]

NEG_PARALLELISM = [
    r"\b(?:it|this|that|he|she|which)?[’']?s?\s*(?:is|was|are|were)?\s*n[o’']t\s+(?:just|only|merely|simply|about)\b[^.!?\n]{3,80}[,;.]\s*(?:it|this|that|but)\b",
    r"\bnot\s+because\b[^.!?\n]{3,60}\bbut\s+because\b",
    r"\bthe\s+(?:question|point|issue|problem|answer|goal)\s+is\s*n[o’']t\b",
    r"\bisn[o’']?t\s+(?:just|only|merely|about)\b",
]

RHETORICAL_QA = r"\b(?:the\s+(?:result|answer|reason|goal|problem|verdict|takeaway|catch|outcome))\?\s"
TRIPLE_NEGATION = r"\bNot\s+(?:a\s+|an\s+|the\s+)?[^.!?\n]{2,40}\.\s+Not\s+(?:a\s+|an\s+|the\s+)?[^.!?\n]{2,40}\.\s"
BOLD_FIRST_BULLET = r"^\s*(?:[-*•]|\d+\.)\s+\*\*[^*\n]+?(?::\*\*|\*\*\s*[:.])"
SIGNIFICANCE_TAIL = (
    r",\s*(?:highlighting|underscoring|reflecting|showcasing|demonstrating|"
    r"signaling|emphasizing|cementing|solidifying|marking|reinforcing|"
    r"paving\s+the\s+way|shaping\s+the)\b"
)


def find(pattern, text, flags=re.IGNORECASE):
    return [m for m in re.finditer(pattern, text, flags)]


def line_of(text, pos):
    return text.count("\n", 0, pos) + 1


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    src = sys.stdin.read() if sys.argv[1] == "-" else open(sys.argv[1], encoding="utf-8").read()

    findings = []

    for pat, label in DASH_PATTERNS:
        for m in find(pat, src, 0):
            findings.append((line_of(src, m.start()), f"DASH: {label}"))

    low = src.lower()
    for phrase in BANNED_PHRASES:
        start = 0
        while (i := low.find(phrase, start)) != -1:
            findings.append((line_of(src, i), f"BANNED PHRASE: {phrase!r}"))
            start = i + 1

    for pat in NEG_PARALLELISM:
        for m in find(pat, src):
            snip = re.sub(r"\s+", " ", m.group(0))[:60]
            findings.append((line_of(src, m.start()), f"NEGATIVE PARALLELISM: {snip!r}"))

    for m in find(RHETORICAL_QA, src):
        findings.append((line_of(src, m.start()), f"RHETORICAL Q&A: {m.group(0).strip()!r}"))

    for m in find(TRIPLE_NEGATION, src, 0):
        findings.append((line_of(src, m.start()), "TRIPLE NEGATION countdown"))

    for m in find(BOLD_FIRST_BULLET, src, re.MULTILINE):
        findings.append((line_of(src, m.start()), "BOLD-FIRST BULLET"))

    for m in find(SIGNIFICANCE_TAIL, src):
        findings.append((line_of(src, m.start()), f"SIGNIFICANCE TAIL: {m.group(0).strip()!r}"))

    hits = []
    for w in SUSPECT_WORDS:
        for m in find(rf"\b{re.escape(w)}\b", src):
            hits.append((line_of(src, m.start()), w))
    for ln, w in hits:
        findings.append((ln, f"SUSPECT WORD: {w!r}"))

    # Rhythm: flag runs of 4+ sentences within +/-3 words of each other
    prose = re.sub(r"```.*?```", "", src, flags=re.DOTALL)
    prose = re.sub(r"^\s*(?:#|[-*•]|\d+\.)\s.*$", "", prose, flags=re.MULTILINE)
    sentences = [s for s in re.split(r"(?<=[.!?])\s+", prose) if len(s.split()) >= 3]
    lengths = [len(s.split()) for s in sentences]
    run = 1
    for i in range(1, len(lengths)):
        run = run + 1 if abs(lengths[i] - lengths[i - 1]) <= 3 else 1
        if run == 4:
            findings.append((0, "RHYTHM: 4+ consecutive sentences of similar length"))
    if len(lengths) >= 6 and statistics.pstdev(lengths) < 4:
        findings.append((0, f"RHYTHM: flat overall (stdev {statistics.pstdev(lengths):.1f} words)"))

    findings.sort(key=lambda f: f[0])
    for ln, msg in findings:
        loc = f"line {ln}" if ln else "overall"
        print(f"  {loc}: {msg}")

    n_suspect = len(hits)
    n_hard = len(findings) - n_suspect - sum(1 for f in findings if f[1].startswith("RHYTHM"))
    print(f"\n{len(findings)} finding(s): {max(n_hard,0)} hard-rule, {n_suspect} suspect-word, "
          f"{sum(1 for f in findings if f[1].startswith('RHYTHM'))} rhythm.")
    print("Suspect words are flags, not bans; density is what matters (>2 per page is a tell).")


if __name__ == "__main__":
    main()
