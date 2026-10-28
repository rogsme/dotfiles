#!/usr/bin/env python3
"""Print what Roger's Obsidian vault holds for one client on one day (or a range).

Usage:
    python3 obsidian_day.py --client ~/.eod/<client>/client.md [--date YYYY-MM-DD]
                            [--since YYYY-MM-DD] [--vault ~/obsidian]

Works from the vault's layout only, never from client or project names:
  daily/<date>.md                   ## Log (open action items) and ## Capture (Roger's notes)
  clients/<slug>/**.md              notes that belong to that client
  clients/<slug>/meetings/*.md      meeting notes (type: meeting, date:, people:)
  people/*.md                       a person's client: link; empty means our own team
  +inbox/                           raw material not filed yet

The vault client is the ~/.eod folder name, or the optional `obsidian:` key in
client.md (`none` turns the pass off). A note belongs to a client through its
`client:` link or the clients/<slug>/ folder it sits in, so projects can come
and go without changing anything here.

Prints markdown: the vault status (READY, NOT READY with reasons, OFF or
UNAVAILABLE), each day's Capture bullets that link no other client, the Log
action items that belong to this client, this client's meetings tagged
client-attended or internal-only, and a people legend. Read-only.
"""

import argparse
import os
import re
import sys
from datetime import date, datetime, timedelta

VAULT = os.path.expanduser("~/obsidian")
WIKILINK = re.compile(r"\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]")
DATE_IN_NAME = re.compile(r"(\d{4})[-_](\d{2})[-_](\d{2})")
TOP_BULLET = re.compile(r"^[-*+] ")


def frontmatter(text):
    m = re.match(r"^---\n(.*?)\n---\n?", text, re.S)
    if not m:
        return {}, text
    fields = {}
    for line in m.group(1).splitlines():
        kv = re.match(r"^(\w+):\s*(.*?)\s*$", line)
        if kv:
            fields[kv.group(1)] = kv.group(2)
    return fields, text[m.end():]


def read(path):
    try:
        with open(path, encoding="utf-8") as f:
            return f.read()
    except (OSError, UnicodeDecodeError):
        return ""


def links(text):
    return [m.group(1).strip() for m in WIKILINK.finditer(text)]


def link_key(name):
    """Vault-wide note key: the basename, without .md for notes."""
    name = os.path.basename(name.strip())
    return name[:-3] if name.endswith(".md") else name


def first_link(value):
    found = links(value or "")
    return link_key(found[0]) if found else None


def vault_slug(client_path):
    raw = read(os.path.expanduser(client_path))
    fields, _ = frontmatter(raw)
    slug = fields.get("obsidian", "").strip().strip("'\"")
    if slug:
        return slug
    return os.path.basename(os.path.dirname(os.path.abspath(os.path.expanduser(client_path))))


class Vault:
    """Index of note name -> owning client, people, and meetings."""

    def __init__(self, root):
        self.root = root
        self.owner = {}     # note key -> client slug
        self.people = {}    # person key -> (display name, client slug or None)
        self.meetings = []  # (date, rel path, fields, body)
        self.clients = set()
        self.inbox = set()

        clients_dir = os.path.join(root, "clients")
        if os.path.isdir(clients_dir):
            self.clients = {d for d in os.listdir(clients_dir)
                            if os.path.isdir(os.path.join(clients_dir, d)) and not d.startswith(".")}
        for slug in self.clients:
            self.owner[slug] = slug
            for dirpath, dirnames, filenames in os.walk(os.path.join(clients_dir, slug)):
                dirnames[:] = [d for d in dirnames if not d.startswith(".")]
                for name in filenames:
                    if name.startswith("."):
                        continue
                    path = os.path.join(dirpath, name)
                    key = link_key(name)
                    owner = slug
                    if name.endswith(".md"):
                        fields, body = frontmatter(read(path))
                        owner = first_link(fields.get("client")) or slug
                        if fields.get("type") == "meeting":
                            day = fields.get("date") or name[:10]
                            self.meetings.append((day, os.path.relpath(path, root), fields, body))
                    self.owner[key] = owner

        people_dir = os.path.join(root, "people")
        if os.path.isdir(people_dir):
            for name in os.listdir(people_dir):
                if not name.endswith(".md"):
                    continue
                fields, body = frontmatter(read(os.path.join(people_dir, name)))
                key = link_key(name)
                title = re.search(r"^# (.+)$", body, re.M)
                display = title.group(1).strip() if title else key.replace("-", " ").title()
                self.people[key] = (display, first_link(fields.get("client")))

        inbox_dir = os.path.join(root, "+inbox")
        if os.path.isdir(inbox_dir):
            for dirpath, dirnames, filenames in os.walk(inbox_dir):
                dirnames[:] = [d for d in dirnames if not d.startswith(".")]
                for name in filenames:
                    if not name.startswith("."):
                        self.inbox.add(os.path.relpath(os.path.join(dirpath, name), inbox_dir))

    def client_of(self, key):
        key = link_key(key)
        if key in self.people:
            return self.people[key][1]
        return self.owner.get(key)


def blocks(section):
    """Split a section into top-level bullets, each with its continuation lines."""
    out, cur, fence = [], [], False
    for line in section.splitlines():
        if not fence and TOP_BULLET.match(line) and cur:
            out.append(cur)
            cur = []
        if line.lstrip().startswith("```"):
            fence = not fence
        cur.append(line)
    if cur:
        out.append(cur)
    return ["\n".join(b).strip("\n") for b in out if "\n".join(b).strip()]


def section(body, heading):
    m = re.search(rf"^## {re.escape(heading)}\s*$(.*?)(?=^## |\Z)", body, re.M | re.S)
    return m.group(1).strip("\n") if m else ""


def foreign(vault, text, slug):
    """True when the text links a note or person that belongs to another client."""
    for target in links(text):
        owner = vault.client_of(target)
        if owner and owner != slug and owner in vault.clients:
            return True
    return False


def days(start, end):
    d = start
    while d <= end:
        yield d
        d += timedelta(days=1)


def in_range(text, start, end):
    m = DATE_IN_NAME.search(text)
    if not m:
        return False
    try:
        d = date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
    except ValueError:
        return False
    return start <= d <= end


def demote(body):
    return re.sub(r"^(#{1,4}) ", lambda m: "#" * (len(m.group(1)) + 2) + " ", body.strip(), flags=re.M)


def report(vault_root, slug, start, end):
    out = []
    head = f"# Vault pass: {slug}, {start}" + ("" if start == end else f" to {end}")
    if not os.path.isdir(vault_root):
        return [head, f"Vault status: UNAVAILABLE (no vault at {vault_root})"]
    vault = Vault(vault_root)
    if slug not in vault.clients:
        return [head, f"Vault status: UNAVAILABLE (no clients/{slug}/ folder in the vault;"
                      " set obsidian: <vault client folder> in client.md, or obsidian: none)"]

    reasons, notes, body_lines, seen_people = [], [], [], set()
    linked_from_capture = set()

    for d in days(start, end):
        iso = d.isoformat()
        rel = f"daily/{iso}.md"
        raw = read(os.path.join(vault_root, rel))
        if not raw:
            if d == end:
                reasons.append(f"no daily note for {iso} ({rel})")
            elif d.weekday() < 5:
                notes.append(f"no daily note for {iso}")
            continue
        _, body = frontmatter(raw)
        body_lines.append(f"## {iso} daily ({rel})")

        capture = blocks(section(body, "Capture"))
        kept = [b for b in capture if not foreign(vault, b, slug)]
        body_lines.append("\n### Capture (Roger's own notes)")
        body_lines.append("\n".join(kept) if kept else "(empty)")
        if len(capture) > len(kept):
            body_lines.append(f"({len(capture) - len(kept)} bullet(s) left out: they link another client)")
        for b in kept:
            linked_from_capture.update(links(b))
            seen_people.update(link_key(t) for t in links(b))

        items = [line for line in section(body, "Log").splitlines()
                 if re.match(r"^\s*[-*] \[[ xX]\]", line)]
        mine = [line for line in items
                if any(vault.client_of(t) == slug for t in links(line)) and not foreign(vault, line, slug)]
        body_lines.append("\n### Open action items for this client (from the daily Log)")
        body_lines.append("\n".join(mine) if mine else "(none)")
        if len(items) > len(mine):
            body_lines.append(f"({len(items) - len(mine)} item(s) left out: other clients or no client)")
        body_lines.append("")

    meetings = sorted(m for m in vault.meetings
                      if first_link(m[2].get("client")) == slug and in_range(m[0], start, end))
    body_lines.append("## Meetings")
    if not meetings:
        body_lines.append("(none filed for this client in range)")
    for day, rel, fields, body in meetings:
        attendees = [link_key(t) for t in links(fields.get("people", ""))]
        seen_people.update(attendees)
        kinds = [vault.people.get(a, (None, "unknown"))[1] for a in attendees]
        tag = "client-attended" if slug in kinds else "internal-only"
        title = re.search(r"^# (.+)$", body, re.M)
        title = title.group(1).strip() if title else os.path.basename(rel)[:-3]
        names = ", ".join(f"{vault.people[a][0]} ({who(vault, a, slug)})" if a in vault.people
                          else f"{a} (unknown)" for a in attendees) or "(none listed)"
        rest = re.sub(r"^# .+\n?", "", body.strip(), count=1)
        body_lines.append(f"\n### {title} ({day[:10]}, {tag})")
        body_lines.append(f"File: {rel}")
        body_lines.append(f"Attendees: {names}")
        body_lines.append(demote(rest))
        for line in rest.splitlines():
            seen_people.update(link_key(t) for t in links(line))

    for name in sorted(vault.inbox):
        if in_range(name, start, end):
            reasons.append(f"unfiled in +inbox: {name} (dated in range)")
            continue
        try:
            mtime = datetime.fromtimestamp(os.path.getmtime(os.path.join(vault_root, "+inbox", name))).date()
        except OSError:
            continue
        if start <= mtime <= end:
            reasons.append(f"unfiled in +inbox: {name} (added {mtime})")
        elif link_key(name) in {link_key(t) for t in linked_from_capture}:
            reasons.append(f"unfiled in +inbox: {name} (linked from Capture)")

    out.append(head)
    if reasons:
        out.append("Vault status: NOT READY")
        out += [f"- {r}" for r in reasons]
        out.append("Run /process (and /daily for a missing daily) in the vault, then run this again.")
    else:
        out.append("Vault status: READY")
    out += [f"- note: {n}" for n in notes]
    out.append("")
    out += body_lines

    people = sorted(p for p in seen_people if p in vault.people)
    if people:
        out.append("\n## People")
        out += [f"- {p}: {vault.people[p][0]} ({who(vault, p, slug)})" for p in people]
    return out


def who(vault, person, slug):
    owner = vault.people[person][1]
    if owner == slug:
        return "client"
    if owner and owner in vault.clients:
        return "other client"
    return "internal"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--client", required=True, help="~/.eod/<client>/client.md")
    ap.add_argument("--date", help="YYYY-MM-DD, default today")
    ap.add_argument("--since", help="YYYY-MM-DD, first day of a range ending at --date")
    ap.add_argument("--vault", default=VAULT, help="vault root (default ~/obsidian)")
    a = ap.parse_args()

    if not os.path.isfile(os.path.expanduser(a.client)):
        sys.exit(f"no client config at {a.client}")
    try:
        end = date.fromisoformat(a.date) if a.date else datetime.now().astimezone().date()
        start = date.fromisoformat(a.since) if a.since else end
    except ValueError as e:
        sys.exit(f"bad date: {e}")
    if start > end:
        sys.exit("--since is after --date")

    slug = vault_slug(a.client)
    if slug.lower() == "none":
        print("Vault status: OFF (obsidian: none in client.md)")
        return
    print("\n".join(report(os.path.expanduser(a.vault), slug, start, end)).rstrip() + "\n")


if __name__ == "__main__":
    main()
