#!/usr/bin/env python3
"""Print the live context an EOD run starts from, in one allowlisted command.

    python3 eod_context.py [--logs N] [--root DIR]

Replaces a chain like `date; git remote get-url origin; grep ...; ls | head`,
which OpenCode's shell allowlist rejects because it checks every command in a
chain or pipe separately. Read-only.
"""
import argparse
import glob
import os
import re
import subprocess
from datetime import datetime

EOD = os.path.expanduser("~/.eod")


def git_remote():
    try:
        out = subprocess.run(["git", "remote", "get-url", "origin"],
                             capture_output=True, text=True, timeout=5)
        return out.stdout.strip() or "not in a git repo"
    except (OSError, subprocess.SubprocessError):
        return "not in a git repo"


def clients(root):
    rows = []
    for path in sorted(glob.glob(os.path.join(root, "*", "client.md"))):
        name = os.path.basename(os.path.dirname(path))
        fields = {}
        with open(path, encoding="utf-8") as f:
            m = re.match(r"^---\n(.*?)\n---", f.read(), re.S)
        if m:
            for line in m.group(1).splitlines():
                kv = re.match(r"^(status|repos):\s*(.*?)\s*$", line)
                if kv:
                    fields[kv.group(1)] = kv.group(2)
        rows.append(f"{name}  status={fields.get('status', '?')}  repos={fields.get('repos', '?')}")
    return rows


def latest_logs(root, n):
    files = [p for p in glob.glob(os.path.join(root, "*", "2*.md")) if os.path.isfile(p)]
    files.sort(key=os.path.getmtime, reverse=True)
    return files[:n]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--logs", type=int, default=8)
    ap.add_argument("--root", default=EOD, help="log root (default ~/.eod)")
    a = ap.parse_args()

    print(f"Today: {datetime.now().astimezone().strftime('%A %Y-%m-%d')}")
    print(f"Current repo: {git_remote()}")
    print("Configured clients:")
    for row in clients(a.root) or ["none yet"]:
        print(f"  {row}")
    print("Latest log files:")
    for p in latest_logs(a.root, a.logs) or ["no log yet"]:
        print(f"  {p}")


if __name__ == "__main__":
    main()
