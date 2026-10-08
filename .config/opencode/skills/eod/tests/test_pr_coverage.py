import contextlib
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch


SKILL = Path(__file__).resolve().parents[1]
CHECKER = SKILL / "scripts/check_eod.py"


def load_script(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


checker = load_script("check_eod", CHECKER)
gather = load_script("todays_prs", SKILL / "scripts/todays_prs.py")
BUCKETS = ("MERGED", "OPENED", "WORKED ON", "ACTIVITY", "CLOSED")


def inventory():
    return {
        "buckets": {
            bucket: [
                {"repo": "owner/app", "number": number, "title": f"Work item {number}"}
            ]
            for number, bucket in enumerate(BUCKETS, 1)
        }
    }


def link(n, repo="owner/app"):
    return f"[#{n}](https://github.com/{repo}/pull/{n})"


class CoverageTests(unittest.TestCase):
    def test_only_merged_opened_and_worked_on_are_required(self):
        missing, _, summary = checker.check_pr_coverage("* Updates (#1, #2, #3).", inventory(), [])
        self.assertEqual(missing, [])
        self.assertIn("3/3 required PRs visible", summary)
        self.assertIn("FYI: owner/app#4, owner/app#5", summary)
        for number in range(1, 4):
            public = "* " + ", ".join(f"#{n}" for n in range(1, 4) if n != number)
            with self.subTest(number=number):
                self.assertEqual(
                    checker.check_pr_coverage(public, inventory(), [])[0],
                    [f"owner/app#{number}"],
                )

    def test_private_notes_do_not_count(self):
        for heading in ("## Internal notes", "  ### Internal notes"):
            with self.subTest(heading=heading):
                missing, _, summary = checker.check_pr_coverage(
                    f"* #1, #2.\n\n{heading}\nIncluded #3.", inventory(), []
                )
                self.assertEqual(missing, ["owner/app#3"])
                self.assertIn("2/3 required PRs visible", summary)

    def test_titles_and_generic_housekeeping_do_not_count(self):
        for text in (
            "* Work item 1, Work item 2, Work item 3.",
            "* Housekeeping behind the scenes.",
        ):
            with self.subTest(text=text):
                self.assertEqual(
                    len(checker.check_pr_coverage(text, inventory(), [])[0]), 3
                )

    def test_pr_urls_and_repo_identities_count(self):
        text = (
            "* https://github.com/owner/app/pull/1\n"
            "* owner/app#2\n* PR 3"
        )
        self.assertEqual(checker.check_pr_coverage(text, inventory(), [])[0], [])

    def test_wrong_and_duplicate_numbers_do_not_pass(self):
        for text in ("* #1, #2, #99.", "* #1, #1, #2."):
            with self.subTest(text=text):
                self.assertEqual(
                    checker.check_pr_coverage(text, inventory(), [])[0],
                    ["owner/app#3"],
                )

    def test_explicit_skip_changes_required_count(self):
        missing, _, summary = checker.check_pr_coverage(
            "* #1, #2.", inventory(), ["owner/app#3"]
        )
        self.assertEqual(missing, [])
        self.assertIn("2/2 required PRs visible (1 explicitly skipped", summary)

    def test_unknown_skip_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "not in gather output"):
            checker.check_pr_coverage("* #1.", inventory(), ["owner/app#99"])

    def test_number_boundaries_are_respected(self):
        missing, _, _ = checker.check_pr_coverage("* #10, #2, #3.", inventory(), [])
        self.assertEqual(missing, ["owner/app#1"])

    def test_colliding_numbers_need_repo_identity(self):
        data = inventory()
        data["buckets"]["MERGED"].append({"repo": "owner/other", "number": 1})
        public = "* #1, #2, #3."
        self.assertEqual(
            set(checker.check_pr_coverage(public, data, [])[0]),
            {"owner/app#1", "owner/other#1"},
        )
        self.assertEqual(
            checker.check_pr_coverage(
                public + " owner/app#1, owner/other#1.", data, []
            )[0],
            [],
        )

    def test_duplicate_gather_identity_counts_once(self):
        data = inventory()
        data["buckets"]["ACTIVITY"].append(data["buckets"]["MERGED"][0])
        missing, _, summary = checker.check_pr_coverage("* #1, #2, #3.", data, [])
        self.assertEqual(missing, [])
        self.assertIn("3/3 required", summary)

    def test_invalid_or_incomplete_inventory_is_rejected(self):
        for data in ({}, {"buckets": {}}, {"buckets": {b: [] for b in BUCKETS[:2]}}):
            with self.subTest(data=data), self.assertRaises(ValueError):
                checker.check_pr_coverage("", data, [])
        optional_missing = {"buckets": {b: [] for b in BUCKETS[:3]}}
        self.assertEqual(checker.check_pr_coverage("", optional_missing, [])[0], [])
        data = inventory()
        data["buckets"]["MERGED"][0]["number"] = "1"
        with self.assertRaisesRegex(ValueError, "Invalid PR identity"):
            checker.check_pr_coverage("", data, [])

    def test_links_are_not_scanned_as_code_and_only_pr_links_reach_github(self):
        def hard(public):
            result = subprocess.run(
                [sys.executable, str(CHECKER), "-"],
                input="Hey team!\n\nTODAY\n" + public + "\n",
                capture_output=True,
                text=True,
                timeout=10,
            )
            return [l for l in result.stdout.splitlines() if l.startswith("HARD")]

        teams = (
            "* Tasks are in Teams: https://teams.cloud.microsoft/l/message/19:abc"
            "/1790977876523?tenantId=90e8&groupId=34a1&parentMessageId=179&teamName=Lazer"
        )
        self.assertEqual(hard(teams), [])
        self.assertEqual(len(hard("* Saved with groupId set.")), 1)
        github = hard("* Details: https://github.com/owner/app/pull/1")
        self.assertEqual(len(github), 1)
        self.assertIn("GitHub/Linear link", github[0])
        self.assertEqual(hard(f"* Shipped ({link(1)}, [owner/app#2]"
                              "(https://github.com/owner/app/pull/2))."), [])
        github = hard("* See [the issue](https://github.com/owner/app/issues/1).")
        self.assertEqual(len(github), 1)

    def run_checker(self, root, public, extra=()):
        draft = Path(root) / "draft.md"
        manifest = Path(root) / "gather.prs.json"
        draft.write_text("Hey team!\n\nTODAY\n" + public, encoding="utf-8")
        manifest.write_text(json.dumps(inventory()), encoding="utf-8")
        return subprocess.run(
            [sys.executable, str(CHECKER), str(draft), "--prs", str(manifest), *extra],
            capture_output=True,
            text=True,
            timeout=10,
        )

    def test_cli_blocks_a_log_only_pr(self):
        with tempfile.TemporaryDirectory(
            dir="/tmp/opencode", prefix="eod-coverage-"
        ) as root:
            result = self.run_checker(
                root, f"* Shipped ({link(1)}, {link(2)}, {link(3)})."
            )
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertIn("0 hard", result.stdout)
            result = self.run_checker(
                root, f"* {link(1)}, {link(2)}.\n\n## Internal notes\n#3"
            )
            self.assertEqual(result.returncode, 1)
            self.assertIn(
                "gathered PR missing from public update: owner/app#3", result.stdout
            )
            result = self.run_checker(
                root, f"* {link(1)}, {link(2)}.", ["--skip-pr", "owner/app#3"]
            )
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_cli_requires_each_pr_number_to_link_to_its_pr(self):
        with tempfile.TemporaryDirectory(
            dir="/tmp/opencode", prefix="eod-coverage-"
        ) as root:
            result = self.run_checker(root, f"* Shipped (#1, {link(2)}, {link(3)}).")
            self.assertEqual(result.returncode, 1)
            self.assertIn(
                "PR owner/app#1 has no link: write "
                "[#1](https://github.com/owner/app/pull/1)",
                result.stdout,
            )
            result = self.run_checker(
                root,
                "* Shipped ([#1](https://github.com/owner/app/pull/2), "
                f"{link(2)}, {link(3)}).",
            )
            self.assertEqual(result.returncode, 1)
            self.assertIn("PR link text does not match its URL", result.stdout)

    def test_cli_missing_inventory_blocks_delivery(self):
        with tempfile.TemporaryDirectory(
            dir="/tmp/opencode", prefix="eod-coverage-"
        ) as root:
            result = self.run_checker(
                root,
                "* #1, #2, #3.",
                ["--prs", str(Path(root) / "missing.json")],
            )
            self.assertEqual(result.returncode, 1)
            self.assertIn("PR coverage check failed", result.stdout)

    def test_gather_summary_counts_every_bucket(self):
        def pr(number, state="OPEN", **dates):
            return {
                "number": number,
                "title": f"Work item {number}",
                "state": state,
                "isDraft": False,
                "url": f"https://github.com/owner/app/pull/{number}",
                "createdAt": "2026-10-01T12:00:00Z",
                **dates,
            }

        prs = [
            pr(1, "MERGED", mergedAt="2026-10-07T12:00:00Z"),
            pr(2, createdAt="2026-10-07T12:00:00Z"),
            pr(3),
            pr(4),
            pr(5, "CLOSED", closedAt="2026-10-07T12:00:00Z"),
        ]
        output = io.StringIO()
        with (
            patch.object(
                gather.sys,
                "argv",
                [
                    "todays_prs.py",
                    "--repo",
                    "owner/app",
                    "--date",
                    "2026-10-07",
                    "--tz",
                    "UTC",
                ],
            ),
            patch.object(
                gather,
                "gh_json",
                side_effect=[
                    prs,
                    {"commits": [{"committedDate": "2026-10-07T12:00:00Z"}]},
                    {"commits": []},
                ],
            ),
            contextlib.redirect_stdout(output),
        ):
            gather.main()
        self.assertIn("3 PR(s) must appear in the update", output.getvalue())
        self.assertIn("2 more for Roger as FYI", output.getvalue())
        for bucket in BUCKETS:
            self.assertIn(f"\n{bucket}\n", output.getvalue())
        

if __name__ == "__main__":
    unittest.main()
