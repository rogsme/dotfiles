#!/usr/bin/env python3
"""List the PRs Roger worked on today, sorted into EOD buckets.

Usage:
    python3 todays_prs.py --client ~/.eod/<client>/client.md [--date YYYY-MM-DD] [--tz Area/City]
    python3 todays_prs.py --repo owner/name [--repo ...] [--author @me] [--date ...]

"Today" is the local calendar day (system timezone unless --tz), converted to
UTC for GitHub, so a late-night merge still counts as today.

Buckets:
  MERGED       merged during the day
  OPENED       created during the day, still open (drafts marked)
  WORKED ON    older open PR with commits pushed during the day
  ACTIVITY     updated during the day with no new commits (comments, bot
                reviews, label changes)
  CLOSED       closed without merging during the day

MERGED, OPENED and WORKED ON must appear in the update. ACTIVITY and CLOSED
are listed for Roger as FYI.

Reads repos and pr_authors from the client config. Read-only: only runs
`gh pr list` and `gh pr view`. Set GH=/path/to/gh to override the binary.
"""

import argparse
import json
import os
import re
import subprocess
import sys
from datetime import date, datetime, timedelta, timezone

try:
    from zoneinfo import ZoneInfo
except ImportError:  # pragma: no cover
    ZoneInfo = None

GH = os.environ.get("GH", "gh")
FIELDS = "number,title,state,isDraft,createdAt,mergedAt,closedAt,updatedAt,url,author"


def gh_json(args):
    try:
        out = subprocess.run(
            [GH, *args], check=True, capture_output=True, text=True
        ).stdout
    except FileNotFoundError:
        sys.exit("gh not found. Install the GitHub CLI or set GH=/path/to/gh.")
    except subprocess.CalledProcessError as e:
        sys.exit(f"gh failed: {' '.join(args[:4])}...\n{e.stderr.strip()}")
    return json.loads(out or "[]")


def ts(s):
    return datetime.fromisoformat(s.replace("Z", "+00:00")) if s else None


def parse_list(v):
    v = v.strip().strip("[]")
    return [x.strip().strip("'\"") for x in v.split(",") if x.strip().strip("'\"")]


def load_client(path):
    raw = open(os.path.expanduser(path), encoding="utf-8").read()
    fm = re.match(r"^---\n(.*?)\n---", raw, re.S)
    cfg = {}
    if fm:
        for line in fm.group(1).splitlines():
            m = re.match(r"^(\w+):\s*(.*?)\s*$", line)
            if m:
                cfg[m.group(1)] = m.group(2)
    repos = [r for r in parse_list(cfg.get("repos", "")) if "/" in r and "<" not in r]
    authors = parse_list(cfg.get("pr_authors", "")) or ["@me"]
    return repos, authors


def local_tz(name):
    if name:
        if ZoneInfo is None:
            sys.exit("--tz needs Python 3.9+ (zoneinfo)")
        return ZoneInfo(name)
    return datetime.now().astimezone().tzinfo


def main():
    ap = argparse.ArgumentParser(description="Today's PRs, bucketed for an EOD")
    ap.add_argument("--client", help="client.md with repos: and optional pr_authors:")
    ap.add_argument(
        "--repo", action="append", default=[], help="owner/name (repeatable)"
    )
    ap.add_argument(
        "--author",
        action="append",
        default=[],
        help="PR author (repeatable, default @me)",
    )
    ap.add_argument("--date", help="local day, YYYY-MM-DD (default: today)")
    ap.add_argument("--tz", help="IANA timezone (default: system)")
    ap.add_argument("--json", action="store_true", help="machine-readable output")
    a = ap.parse_args()

    repos, authors = load_client(a.client) if a.client else ([], [])
    repos = a.repo or repos
    authors = a.author or authors or ["@me"]
    if not repos:
        sys.exit(
            "No repos. Add repos: [owner/name] to the client config or pass --repo."
        )

    tz = local_tz(a.tz)
    day = date.fromisoformat(a.date) if a.date else datetime.now(tz).date()
    start = datetime(day.year, day.month, day.day, tzinfo=tz)
    end = start + timedelta(days=1)
    start_utc = start.astimezone(timezone.utc)
    search_from = start_utc.strftime("%Y-%m-%dT%H:%M:%SZ")

    def today(t):
        return t is not None and start <= t < end

    buckets = {k: [] for k in ("MERGED", "OPENED", "WORKED ON", "ACTIVITY", "CLOSED")}
    seen = set()
    for repo in repos:
        for author in authors:
            prs = gh_json(
                [
                    "pr",
                    "list",
                    "--repo",
                    repo,
                    "--author",
                    author,
                    "--state",
                    "all",
                    "--search",
                    f"updated:>={search_from}",
                    "--limit",
                    "100",
                    "--json",
                    FIELDS,
                ]
            )
            for p in prs:
                key = (repo, p["number"])
                if key in seen:
                    continue
                seen.add(key)
                p["repo"] = repo
                created, merged, closed = (
                    ts(p.get("createdAt")),
                    ts(p.get("mergedAt")),
                    ts(p.get("closedAt")),
                )
                if today(merged):
                    buckets["MERGED"].append(p)
                elif p["state"] == "CLOSED" and today(closed):
                    buckets["CLOSED"].append(p)
                elif p["state"] == "OPEN" and today(created):
                    buckets["OPENED"].append(p)
                elif p["state"] == "OPEN":
                    commits = gh_json(
                        [
                            "pr",
                            "view",
                            str(p["number"]),
                            "--repo",
                            repo,
                            "--json",
                            "commits",
                        ]
                    )
                    pushed = [
                        c
                        for c in commits.get("commits", [])
                        if today(ts(c.get("committedDate")))
                    ]
                    p["commitsToday"] = len(pushed)
                    buckets["WORKED ON" if pushed else "ACTIVITY"].append(p)
                # merged or closed on another day: updated today by a comment, ignore

    if a.json:
        print(
            json.dumps(
                {
                    "date": day.isoformat(),
                    "tz": str(tz),
                    "from_utc": search_from,
                    "buckets": buckets,
                },
                indent=2,
            )
        )
        return

    print(
        f"PRs for {day.isoformat()} ({tz}), repos: {', '.join(repos)}, authors: {', '.join(authors)}"
    )
    total = 0
    for name, items in buckets.items():
        if not items:
            continue
        print(f"\n{name}")
        for p in sorted(items, key=lambda x: (x["repo"], x["number"])):
            extra = []
            if p.get("isDraft"):
                extra.append("draft")
            if "commitsToday" in p:
                n = p["commitsToday"]
                extra.append(f"{n} commit{'s' if n != 1 else ''} today")
            note = f" ({', '.join(extra)})" if extra else ""
            print(f"- #{p['number']} {p['title']}{note} {p['url']}")
            total += 1
    if not any(buckets.values()):
        print("\nNo PR activity found for this day.")
    required = sum(len(buckets[k]) for k in ("MERGED", "OPENED", "WORKED ON"))
    print(
        f"\n{required} PR(s) must appear in the update (MERGED, OPENED, WORKED ON); "
        f"{total - required} more for Roger as FYI (ACTIVITY, CLOSED)."
    )
    print(
        "Next: gh pr view <n> --repo <repo> --json number,title,state,isDraft,body,url for each required PR."
    )


if __name__ == "__main__":
    main()
