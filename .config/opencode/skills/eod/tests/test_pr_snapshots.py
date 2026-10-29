import copy
import importlib.util
import io
import json
import subprocess
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import patch

SCRIPT = Path(__file__).resolve().parents[1] / "scripts/todays_prs.py"
spec = importlib.util.spec_from_file_location("pr_snapshots", SCRIPT)
collector = importlib.util.module_from_spec(spec)
spec.loader.exec_module(collector)
DAY = "2026-10-28"


def pr(
    number=7,
    body="## Summary\nA synthetic change.\n\n## Risks\nStill needs checking.\n",
    **changes,
):
    return {
        "number": number,
        "title": "Synthetic update",
        "state": "MERGED",
        "isDraft": False,
        "createdAt": "2026-10-27T12:00:00Z",
        "mergedAt": "2026-10-28T12:00:00Z",
        "closedAt": "2026-10-28T12:00:00Z",
        "updatedAt": "2026-10-28T12:00:00Z",
        "url": f"https://github.com/owner/app/pull/{number}",
        "author": {"login": "fixture"},
        "body": body,
        **changes,
    }


class SnapshotTests(unittest.TestCase):
    def gather(self, root, responses, repos=("owner/app",), save=True):
        arguments = [str(SCRIPT), "--date", DAY, "--tz", "UTC", "--json"]
        for repo in repos:
            arguments.extend(["--repo", repo])
        if save:
            arguments.extend(["--save-dir", str(root)])
        output = io.StringIO()
        with (
            patch.object(collector.sys, "argv", arguments),
            patch.object(
                collector, "gh_json", side_effect=copy.deepcopy(responses)
            ) as calls,
            redirect_stdout(output),
        ):
            collector.main()
        return json.loads(output.getvalue()), calls

    def test_one_list_response_saves_full_json_and_readable_body(self):
        body = (
            "## Summary\n"
            + "\n".join(f"Line {i}: café 🛠️" for i in range(1000))
            + "\n\n## Risks\nUnverified.\n"
        )
        original = pr(body=body)
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            inventory, calls = self.gather(root, [[original]])
            self.assertEqual(calls.call_count, 1)
            self.assertIn("body", calls.call_args.args[0][-1].split(","))
            saved = inventory["buckets"]["MERGED"][0]
            self.assertNotIn("body", saved)
            self.assertEqual(
                json.loads(Path(saved["snapshot_path"]).read_text()), original
            )
            self.assertEqual(Path(saved["body_path"]).read_bytes(), body.encode())
            self.assertEqual(Path(saved["body_path"]).stat().st_mode & 0o777, 0o600)
            self.assertIn("fetched_at", saved)
            self.assertEqual(
                json.loads((root / f"{DAY}.prs.json").read_text()), inventory
            )

    def test_commit_classification_and_optional_buckets_are_unchanged(self):
        older = pr(state="OPEN", mergedAt=None, closedAt=None)
        activity = pr(number=8, state="OPEN", mergedAt=None, closedAt=None)
        closed = pr(number=9, state="CLOSED", mergedAt=None)
        with tempfile.TemporaryDirectory() as directory:
            inventory, calls = self.gather(
                Path(directory),
                [
                    [older, activity, closed],
                    {"commits": [{"committedDate": "2026-10-28T10:00:00Z"}]},
                    {"commits": []},
                ],
            )
            self.assertEqual(calls.call_count, 3)
            self.assertEqual(inventory["buckets"]["WORKED ON"][0]["commitsToday"], 1)
            self.assertIn("body_path", inventory["buckets"]["WORKED ON"][0])
            for bucket in ("ACTIVITY", "CLOSED"):
                self.assertNotIn("body_path", inventory["buckets"][bucket][0])
                self.assertNotIn("body", inventory["buckets"][bucket][0])

    def test_same_pr_number_in_different_repositories_has_distinct_paths(self):
        with tempfile.TemporaryDirectory() as directory:
            inventory, _ = self.gather(
                Path(directory),
                [[pr(body="First")], [pr(body="Second")]],
                repos=("owner/app", "other/app"),
            )
            first, second = inventory["buckets"]["MERGED"]
            self.assertNotEqual(first["body_path"], second["body_path"])
            self.assertEqual(Path(first["body_path"]).read_text(), "First")
            self.assertEqual(Path(second["body_path"]).read_text(), "Second")

    def test_refresh_publishes_new_snapshots_and_preserves_previous_generation(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            before, _ = self.gather(root, [[pr(body="Before")]])
            after, _ = self.gather(
                root, [[pr(body="After", updatedAt="2026-10-28T14:00:00Z")]]
            )
            old = before["buckets"]["MERGED"][0]
            new = after["buckets"]["MERGED"][0]
            self.assertNotEqual(old["body_path"], new["body_path"])
            self.assertEqual(Path(old["body_path"]).read_text(), "Before")
            self.assertEqual(Path(new["body_path"]).read_text(), "After")
            self.assertEqual(new["updatedAt"], "2026-10-28T14:00:00Z")
            self.assertEqual(json.loads((root / f"{DAY}.prs.json").read_text()), after)

    def test_api_failure_does_not_replace_existing_inventory(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            before, _ = self.gather(root, [[pr(body="Preserve me")]])
            with self.assertRaises(SystemExit):
                self.gather(
                    root,
                    [[pr(body="New response")], SystemExit("GitHub unavailable")],
                    repos=("owner/app", "other/app"),
                )
            self.assertEqual(json.loads((root / f"{DAY}.prs.json").read_text()), before)
            self.assertEqual(
                Path(before["buckets"]["MERGED"][0]["body_path"]).read_text(),
                "Preserve me",
            )

    def test_failed_inventory_publish_keeps_old_body_and_json_pair(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            before, _ = self.gather(root, [[pr(body="Original")]])
            replace = collector.os.replace

            def fail_manifest(source, target):
                if Path(target).name == f"{DAY}.prs.json":
                    raise OSError("Synthetic interrupted publication")
                return replace(source, target)

            with (
                patch.object(collector.os, "replace", side_effect=fail_manifest),
                self.assertRaises(SystemExit),
            ):
                self.gather(root, [[pr(body="Partial refresh")]])
            self.assertEqual(json.loads((root / f"{DAY}.prs.json").read_text()), before)
            saved = before["buckets"]["MERGED"][0]
            self.assertEqual(Path(saved["body_path"]).read_text(), "Original")
            self.assertEqual(
                json.loads(Path(saved["snapshot_path"]).read_text())["body"], "Original"
            )

    def test_missing_body_fails_instead_of_saving_a_partial_snapshot(self):
        incomplete = pr()
        del incomplete["body"]
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            with self.assertRaises(SystemExit):
                self.gather(root, [[incomplete]])
            self.assertFalse((root / f"{DAY}.prs.json").exists())

    def test_default_json_output_remains_lean_without_writing_files(self):
        original = pr()
        del original["body"]
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            inventory, calls = self.gather(root, [[original]], save=False)
            self.assertNotIn("body", calls.call_args.args[0][-1].split(","))
            self.assertNotIn("snapshot_path", inventory["buckets"]["MERGED"][0])
            self.assertEqual(list(root.iterdir()), [])

    def test_empty_and_null_bodies_are_valid(self):
        with tempfile.TemporaryDirectory() as directory:
            inventory, _ = self.gather(
                Path(directory), [[pr(body=""), pr(number=8, body=None)]]
            )
            for saved in inventory["buckets"]["MERGED"]:
                self.assertEqual(Path(saved["body_path"]).read_text(), "")

    def test_unrelated_or_symlinked_inventory_is_preserved(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            manifest = root / f"{DAY}.prs.json"
            manifest.write_text("User-owned content")
            with self.assertRaises(SystemExit):
                self.gather(root, [[pr()]])
            self.assertEqual(manifest.read_text(), "User-owned content")
            manifest.unlink()
            target = root / "user-file.txt"
            target.write_text("Keep this")
            manifest.symlink_to(target)
            with self.assertRaises(SystemExit):
                self.gather(root, [[pr()]])
            self.assertTrue(manifest.is_symlink())
            self.assertEqual(target.read_text(), "Keep this")

    def test_snapshot_failure_does_not_publish_partial_inventory(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            before, _ = self.gather(root, [[pr(body="Original")]])
            write = collector.atomic_write

            def fail_body(path, content):
                if path.name.endswith(".body.md"):
                    raise OSError("Synthetic disk error")
                write(path, content)

            with (
                patch.object(collector, "atomic_write", side_effect=fail_body),
                self.assertRaises(SystemExit),
            ):
                self.gather(root, [[pr(body="New")]])
            self.assertEqual(json.loads((root / f"{DAY}.prs.json").read_text()), before)

    def test_duplicate_authors_do_not_duplicate_snapshots(self):
        with tempfile.TemporaryDirectory() as directory:
            arguments = [
                str(SCRIPT),
                "--repo",
                "owner/app",
                "--author",
                "one",
                "--author",
                "two",
                "--date",
                DAY,
                "--tz",
                "UTC",
                "--save-dir",
                directory,
                "--json",
            ]
            output = io.StringIO()
            with (
                patch.object(collector.sys, "argv", arguments),
                patch.object(collector, "gh_json", side_effect=[[pr()], [pr()]]),
                redirect_stdout(output),
            ):
                collector.main()
            inventory = json.loads(output.getvalue())
            self.assertEqual(len(inventory["buckets"]["MERGED"]), 1)
            self.assertEqual(
                len(list(Path(inventory["snapshot_directory"]).glob("*.body.md"))), 1
            )

    def test_timeout_is_reported_without_a_success_result(self):
        with (
            patch.object(
                collector.subprocess,
                "run",
                side_effect=subprocess.TimeoutExpired("gh", 30),
            ),
            self.assertRaisesRegex(SystemExit, "timed out"),
        ):
            collector.gh_json(["pr", "list"])


if __name__ == "__main__":
    unittest.main()
