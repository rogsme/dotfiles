import importlib.util
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import unittest


SKILL = Path(__file__).resolve().parents[1]
SCRIPT = SKILL / "scripts/obsidian_day.py"


def load_script(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


vault_pass = load_script("obsidian_day", SCRIPT)
OLD = time.mktime((2020, 1, 1, 0, 0, 0, 0, 0, -1))


def write(root, rel, text):
    path = Path(root) / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    os.utime(path, (OLD, OLD))
    return path


def note(fields, body):
    lines = "\n".join(f"{k}: {v}" for k, v in fields.items())
    return f"---\n{lines}\n---\n\n{body}\n"


def daily(capture, log=""):
    return note({"type": "daily", "date": "2026-01-07"},
                f"# 2026-01-07\n\n## Log\n\n{log}\n\n## Capture\n\n{capture}")


def meeting(day, client, people, title="Sync"):
    plist = ", ".join(f'"[[{p}]]"' for p in people)
    return note({"type": "meeting", "date": day, "client": f'"[[{client}]]"', "people": f"[{plist}]"},
                f"# {title}\n\n## Summary\n\nTalked.\n\n## Decisions\n\n- Ship it.\n")


def make_vault(root):
    write(root, "clients/acme/acme.md", note({"type": "client"}, "# Acme"))
    write(root, "clients/acme/projects/rocket.md",
          note({"type": "project", "client": '"[[acme]]"'}, "# Rocket"))
    write(root, "clients/globex/globex.md", note({"type": "client"}, "# Globex"))
    write(root, "clients/globex/projects/widget.md",
          note({"type": "project", "client": '"[[globex]]"'}, "# Widget"))
    write(root, "people/wile-coyote.md", note({"type": "person", "client": '"[[acme]]"'}, "# Wile Coyote"))
    write(root, "people/hank-scorpio.md", note({"type": "person", "client": '"[[globex]]"'}, "# Hank Scorpio"))
    write(root, "people/pat-teammate.md", note({"type": "person", "client": ""}, "# Pat Teammate"))
    write(root, "+inbox/.gitkeep", "")


class VaultPassTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = self.tmp.name
        make_vault(self.root)
        self.day = vault_pass.date(2026, 1, 7)

    def tearDown(self):
        self.tmp.cleanup()

    def run_pass(self, start=None, end=None, slug="acme"):
        end = end or self.day
        return "\n".join(vault_pass.report(self.root, slug, start or end, end))

    def test_other_client_capture_bullets_are_dropped(self):
        write(self.root, "daily/2026-01-07.md", daily(
            "- shipped the [[rocket]] launch pad with [[wile-coyote]]\n"
            "- helped [[hank-scorpio]] with the [[widget]] demo\n"
            "- quick call about [[widget]] pricing"))
        out = self.run_pass()
        self.assertIn("rocket", out)
        self.assertNotIn("hank-scorpio", out.split("## People")[0])
        self.assertNotIn("pricing", out)
        self.assertIn("2 bullet(s) left out", out)

    def test_unlinked_bullets_and_fenced_blocks_are_kept(self):
        write(self.root, "daily/2026-01-07.md", daily(
            "- tired but happy\n"
            "- [[wile-coyote]] sent this:\n"
            "```\n- not a new bullet\nanswer text\n```\n"
            "so that is settled\n"
            "- [[pat-teammate]] reviewed my work"))
        out = self.run_pass()
        for kept in ("tired but happy", "- not a new bullet", "so that is settled", "reviewed my work"):
            self.assertIn(kept, out)
        self.assertNotIn("left out: they link", out)
        self.assertIn("wile-coyote: Wile Coyote (client)", out)
        self.assertIn("pat-teammate: Pat Teammate (internal)", out)

    def test_log_items_keep_only_this_clients(self):
        write(self.root, "daily/2026-01-07.md", daily(
            "- nothing", log="**Open action items:**\n"
            "- [ ] Confirm the launch date — [[rocket]]\n"
            "- [ ] Send the quote — [[widget]]\n"
            "- [ ] Learn Rust"))
        out = self.run_pass()
        self.assertIn("Confirm the launch date", out)
        self.assertNotIn("Send the quote", out)
        self.assertNotIn("Learn Rust", out)
        self.assertIn("2 item(s) left out", out)

    def test_meeting_is_tagged_from_its_attendees(self):
        write(self.root, "daily/2026-01-07.md", daily("- nothing"))
        write(self.root, "clients/acme/meetings/2026-01-07-review.md",
              meeting("2026-01-07", "acme", ["pat-teammate", "wile-coyote"], "Client review"))
        write(self.root, "clients/acme/meetings/2026-01-07-prep.md",
              meeting("2026-01-07", "acme", ["pat-teammate"], "Internal prep"))
        write(self.root, "clients/globex/meetings/2026-01-07-other.md",
              meeting("2026-01-07", "globex", ["hank-scorpio"], "Other client sync"))
        out = self.run_pass()
        self.assertIn("### Client review (2026-01-07, client-attended)", out)
        self.assertIn("### Internal prep (2026-01-07, internal-only)", out)
        self.assertNotIn("Other client sync", out)
        self.assertIn("#### Decisions", out)

    def test_meetings_outside_the_range_are_left_out(self):
        write(self.root, "daily/2026-01-07.md", daily("- nothing"))
        write(self.root, "clients/acme/meetings/2026-01-06-old.md",
              meeting("2026-01-06", "acme", ["wile-coyote"], "Yesterday sync"))
        self.assertNotIn("Yesterday sync", self.run_pass())
        self.assertIn("Yesterday sync", self.run_pass(start=vault_pass.date(2026, 1, 6)))

    def test_ready_with_a_daily_and_an_empty_inbox(self):
        write(self.root, "daily/2026-01-07.md", daily("- nothing"))
        write(self.root, "+inbox/old-notes-2025-12-01.txt", "old")
        self.assertIn("Vault status: READY", self.run_pass())

    def test_unfiled_inbox_file_dated_today_is_not_ready(self):
        write(self.root, "daily/2026-01-07.md", daily("- nothing"))
        write(self.root, "+inbox/Acme sync - 2026_01_07 10_00 - Notes.pdf", "pdf")
        out = self.run_pass()
        self.assertIn("Vault status: NOT READY", out)
        self.assertIn("Acme sync - 2026_01_07 10_00 - Notes.pdf (dated in range)", out)

    def test_inbox_file_linked_from_capture_is_not_ready(self):
        write(self.root, "daily/2026-01-07.md", daily("- notes in [[call-transcript.txt]]"))
        write(self.root, "+inbox/call-transcript.txt", "words")
        out = self.run_pass()
        self.assertIn("Vault status: NOT READY", out)
        self.assertIn("call-transcript.txt (linked from Capture)", out)

    def test_missing_daily_is_not_ready(self):
        out = self.run_pass()
        self.assertIn("Vault status: NOT READY", out)
        self.assertIn("no daily note for 2026-01-07", out)

    def test_range_notes_missing_weekdays_without_blocking(self):
        write(self.root, "daily/2026-01-05.md", daily("- monday work"))
        write(self.root, "daily/2026-01-07.md", daily("- wednesday work"))
        out = self.run_pass(start=vault_pass.date(2026, 1, 5))
        self.assertIn("Vault status: READY", out)
        self.assertIn("- note: no daily note for 2026-01-06", out)
        self.assertIn("monday work", out)
        self.assertIn("wednesday work", out)

    def test_unknown_client_folder_is_unavailable(self):
        out = self.run_pass(slug="initech")
        self.assertIn("Vault status: UNAVAILABLE", out)
        self.assertIn("obsidian: none", out)


class ClientConfigTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.eod = Path(self.tmp.name) / "eod"

    def tearDown(self):
        self.tmp.cleanup()

    def client(self, folder, extra=""):
        path = self.eod / folder / "client.md"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(f"---\nclient: Test\nstatus: active\n{extra}---\n\n# Test\n", encoding="utf-8")
        return str(path)

    def test_eod_folder_name_is_the_default_vault_client(self):
        self.assertEqual(vault_pass.vault_slug(self.client("acme")), "acme")

    def test_obsidian_key_overrides_the_folder_name(self):
        self.assertEqual(vault_pass.vault_slug(self.client("acme", 'obsidian: "acme-corp"\n')), "acme-corp")

    def test_obsidian_none_turns_the_pass_off(self):
        out = subprocess.run(
            [sys.executable, str(SCRIPT), "--client", self.client("acme", "obsidian: none\n"),
             "--vault", self.tmp.name, "--date", "2026-01-07"],
            capture_output=True, text=True, check=True).stdout
        self.assertIn("Vault status: OFF", out)

    def test_cli_prints_the_pass_for_a_real_vault_folder(self):
        vault = Path(self.tmp.name) / "vault"
        make_vault(vault)
        write(vault, "daily/2026-01-07.md", daily("- launched [[rocket]]"))
        out = subprocess.run(
            [sys.executable, str(SCRIPT), "--client", self.client("acme"),
             "--vault", str(vault), "--date", "2026-01-07"],
            capture_output=True, text=True, check=True).stdout
        self.assertIn("Vault status: READY", out)
        self.assertIn("launched [[rocket]]", out)


if __name__ == "__main__":
    unittest.main()
