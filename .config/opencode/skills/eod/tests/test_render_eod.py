import importlib.util
import io
import json
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch
import os
import sys

SKILL = Path(__file__).resolve().parents[1]
SCRIPT = SKILL / "scripts" / "render_eod.py"
spec = importlib.util.spec_from_file_location("render_eod", SCRIPT)
renderer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(renderer)


class RenderTests(unittest.TestCase):
    def setUp(self):
        self.stdout = self.enterContext(redirect_stdout(io.StringIO()))
        self.stderr = self.enterContext(redirect_stderr(io.StringIO()))
        self.temporary = tempfile.TemporaryDirectory(prefix="eod-cli-")
        self.addCleanup(self.temporary.cleanup)
        self.session = Path(self.temporary.name)
        self.source = self.session / "revision-0001.md"
        self.page = self.session / "message.html"
        self.source.touch()
        self.page.touch()
        self.cli = self.session / "render_message.mjs"
        self.cli.touch()
        self.cli.with_name("viewer.mjs").touch()
        self.prepared_source = None

    def fake_cli(self, command):
        if "--source" in command:
            source = Path(command[command.index("--source") + 1])
            self.prepared_source = source.read_text()
            self.assertEqual(source.stat().st_mode & 0o777, 0o600)
            return {
                "session": str(self.session),
                "source": str(self.source),
                "html": str(self.page),
                "warnings": [],
            }
        return {
            "browserOpened": True,
            "urls": [{"label": "Local", "url": "http://127.0.0.1:4410/r/test/"}],
        }

    def test_formatter_uses_shared_skill_before_legacy_install(self):
        with tempfile.TemporaryDirectory(prefix="eod-formatter-") as root:
            home = Path(root)
            shared = home / ".agents/skills/chat-paste/scripts/render_message.mjs"
            legacy = home / ".claude/skills/chat-paste/scripts/render_message.mjs"
            for cli in [shared, legacy]:
                cli.parent.mkdir(parents=True)
                cli.touch()
            self.assertEqual(renderer.find_chat_paste_cli(home), shared)
            shared.unlink()
            self.assertEqual(renderer.find_chat_paste_cli(home), legacy)
            legacy.unlink()
            self.assertEqual(renderer.find_chat_paste_cli(home), shared)

    def test_destination_override_reuses_eod_preparation(self):
        with tempfile.TemporaryDirectory(prefix="eod-destination-") as root:
            source = Path(root) / "internal.md"
            source.write_text("Team update\n\n## Internal notes\nPRIVATE_SENTINEL")
            with (
                patch.object(renderer, "CHAT_PASTE_CLI", self.cli),
                patch.object(
                    renderer.sys,
                    "argv",
                    [
                        str(SCRIPT),
                        str(source),
                        "--mode",
                        "internal",
                        "--destination",
                        "both",
                    ],
                ),
                patch.object(
                    renderer,
                    "run_cli",
                    side_effect=self.fake_cli,
                ) as call,
            ):
                self.assertEqual(renderer.main(), 0)
                command = call.call_args.args[0]
                self.assertEqual(command[command.index("--destination") + 1], "both")
                self.assertEqual(self.prepared_source, "Team update")

    def output_path(self, draft):
        output = Path("/tmp/opencode") / f"{draft.stem}.html"
        self.addCleanup(output.unlink, missing_ok=True)
        return output

    def export_page(self, text, mode="client"):
        if not renderer.CHAT_PASTE_CLI.is_file():
            self.skipTest("Optional formatter is not installed")
        with tempfile.TemporaryDirectory(prefix="eod-export-") as root:
            draft = Path(root) / f"{Path(root).name}.md"
            draft.write_text(text, encoding="utf-8")
            result = subprocess.run(
                [
                    sys.executable,
                    str(SCRIPT),
                    str(draft),
                    "--mode",
                    mode,
                    "--no-open",
                    "--artifacts",
                    str(Path(root) / "artifacts"),
                ],
                capture_output=True,
                text=True,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(draft.read_text(encoding="utf-8"), text)
            self.assertFalse(draft.with_suffix(".html").exists())
            payload = json.loads(result.stdout)
            self.assertFalse(payload["browserOpened"])
            self.assertNotIn("PRIVATE_SENTINEL", Path(payload["source"]).read_text())
            return Path(payload["html"]).read_text(encoding="utf-8")

    def test_private_notes_never_enter_the_export(self):
        page = self.export_page(
            "Hey team!\n\nTODAY 🙂\n* Works\n\n## Internal notes\nPRIVATE_SENTINEL",
        )
        self.assertNotIn("PRIVATE_SENTINEL", page)
        self.assertNotIn("## Internal notes", page)
        self.assertIn("/assets/viewer.js", page)

    @unittest.skipUnless(
        renderer.CHAT_PASTE_CLI.is_file(), "Optional formatter is not installed"
    )
    def test_cli_generates_private_page_and_regenerates_after_revisions(self):
        with tempfile.TemporaryDirectory(prefix="eod-render-") as root:
            draft = Path(root) / f"{Path(root).name}.md"
            draft.write_text("Hey team!\n\nTODAY 🙂\n* First", encoding="utf-8")
            command = [
                "python3",
                str(SCRIPT),
                str(draft),
                "--no-open",
                "--artifacts",
                str(Path(root) / "artifacts"),
            ]
            first = subprocess.run(command, capture_output=True, text=True)
            self.assertEqual(first.returncode, 0, first.stderr)
            first_result = json.loads(first.stdout)
            output = Path(first_result["html"])
            self.assertEqual(output.stat().st_mode & 0o777, 0o600)
            self.assertEqual(Path(first_result["source"]).stat().st_mode & 0o777, 0o600)
            self.assertIn("* First", Path(first_result["source"]).read_text())
            draft.write_text("Hey team!\n\nTODAY 🙂\n* Revised", encoding="utf-8")
            second = subprocess.run(
                command + ["--session", first_result["session"]],
                capture_output=True,
                text=True,
            )
            self.assertEqual(second.returncode, 0, second.stderr)
            self.assertIn("Revised", output.read_text())
            self.assertNotIn('"* First"', output.read_text())
            second_result = json.loads(second.stdout)
            self.assertEqual(second_result["session"], first_result["session"])
            self.assertEqual(second_result["revision"], 2)
            self.assertIn("* First", Path(first_result["source"]).read_text())

    @unittest.skipUnless(
        renderer.CHAT_PASTE_CLI.is_file(), "Optional formatter is not installed"
    )
    def test_unsupported_input_does_not_create_a_page(self):
        with tempfile.TemporaryDirectory(prefix="eod-render-") as root:
            draft = Path(root) / f"{Path(root).name}.md"
            output = self.output_path(draft)
            draft.write_text("![image](https://example.com/a.png)")
            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    str(draft),
                    "--no-open",
                    "--artifacts",
                    str(Path(root) / "artifacts"),
                ],
                capture_output=True,
                text=True,
            )
            self.assertEqual(result.returncode, 1)
            self.assertFalse(output.exists())
            self.assertFalse((Path(root) / "artifacts").exists())

    @unittest.skipUnless(
        renderer.CHAT_PASTE_CLI.is_file(), "Optional formatter is not installed"
    )
    def test_unrelated_html_is_preserved(self):
        with tempfile.TemporaryDirectory(prefix="eod-render-") as root:
            draft = Path(root) / f"{Path(root).name}.md"
            draft.write_text("Message")
            output = self.output_path(draft)
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_text("User-owned page")
            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    str(draft),
                    "--no-open",
                    "--artifacts",
                    str(Path(root) / "artifacts"),
                ],
                capture_output=True,
                text=True,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(output.read_text(), "User-owned page")

    @unittest.skipUnless(
        renderer.CHAT_PASTE_CLI.is_file(), "Optional formatter is not installed"
    )
    def test_symlink_output_is_preserved(self):
        with tempfile.TemporaryDirectory(prefix="eod-render-") as root:
            draft = Path(root) / f"{Path(root).name}.md"
            draft.write_text("Message")
            target = Path(root) / "private.html"
            target.write_text("User-owned page")
            output = self.output_path(draft)
            output.parent.mkdir(parents=True, exist_ok=True)
            output.symlink_to(target)
            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    str(draft),
                    "--no-open",
                    "--artifacts",
                    str(Path(root) / "artifacts"),
                ],
                capture_output=True,
                text=True,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(target.read_text(), "User-owned page")
            self.assertTrue(output.is_symlink())

    def test_notes_and_client_files_are_rejected(self):
        with tempfile.TemporaryDirectory(prefix="eod-render-") as root:
            for name in ["2026-10-05.notes.md", "client.md"]:
                path = Path(root) / name
                path.write_text("Sensitive configuration")
                result = subprocess.run(
                    ["python3", str(SCRIPT), str(path), "--no-open"],
                    capture_output=True,
                    text=True,
                )
                self.assertEqual(result.returncode, 1)
                self.assertFalse(path.with_suffix(".html").exists())

    def test_channel_recommendation(self):
        with tempfile.TemporaryDirectory(prefix="eod-render-") as root:
            config = Path(root) / "client.md"
            config.write_text("---\nchannel: Microsoft Teams chat\n---\n")
            self.assertEqual(renderer.channel(config), "teams")
            config.write_text("---\nchannel: Slack and Microsoft Teams chat\n---\n")
            self.assertEqual(renderer.channel(config), "both")

    def test_heading_policy_stays_in_the_eod_adapter(self):
        self.assertEqual(
            renderer.prepare_message("Hey team!\n\nQA ✅\n* Works", "client"),
            "Hey team!\n\n## QA ✅\n* Works",
        )
        source = "Weekly Recap (Oct 1 to Oct 5) 🎯\n\nHey team! Short week.\n\nYour spreadsheets\nImports are done.\n\nVibes & Reflection 😄\nHappy with the result."
        prepared = renderer.prepare_message(source, "weekly")
        self.assertIn("## Your spreadsheets", prepared)
        self.assertIn("## Vibes & Reflection 😄", prepared)
        self.assertNotIn("## Hey team!", prepared)

    def test_review_batch_status_leadin_stays_a_paragraph(self):
        source = (
            "Hey team!\n\nIN REVIEW 📋\n"
            "All changes are still in progress, waiting on review:\n"
            "* Fixing large uploads.\n* Keeping follow-ups on topic."
        )
        prepared = renderer.prepare_message(source, "client")
        self.assertIn("## IN REVIEW 📋", prepared)
        self.assertIn(
            "\nAll changes are still in progress, waiting on review:\n", prepared
        )
        self.assertNotIn("## All changes", prepared)

    def test_review_flags_are_rejected_only_by_the_eod_adapter(self):
        for label in [
            "Before you send:",
            "Reviewer: Pat",
            "📝 Friday reminder: say weekly",
        ]:
            with self.assertRaisesRegex(ValueError, "review flags"):
                renderer.prepare_message(
                    f"Public message\n\n{label}\nPrivate annotation", "client"
                )

    @unittest.skipUnless(
        renderer.CHAT_PASTE_CLI.is_file(), "Optional formatter is not installed"
    )
    def test_old_preview_is_preserved_beside_new_session(self):
        with tempfile.TemporaryDirectory(prefix="eod-migrate-") as root:
            draft = Path(root) / f"{Path(root).name}.md"
            draft.write_text("Hey team!\n\nTODAY 🙂\n* Works")
            output = self.output_path(draft)
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_text(
                "<!doctype html>\n<!-- Generated by EOD formatter v1. -->\nOld generated preview"
            )
            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    str(draft),
                    "--no-open",
                    "--artifacts",
                    str(Path(root) / "artifacts"),
                ],
                capture_output=True,
                text=True,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("Old generated preview", output.read_text())
            self.assertNotEqual(str(output), json.loads(result.stdout)["html"])

    def test_handoff_uses_only_public_cli_and_prepared_message(self):
        self.assertFalse((SKILL / "assets" / "formatter.js").exists())
        with tempfile.TemporaryDirectory(prefix="eod-contract-") as root:
            source = Path(root) / "2026-10-05.md"
            source.write_text(
                "Hey team!\n\nSHIPPED\n• Works\n\n## Internal notes\nPRIVATE_SENTINEL"
            )
            with (
                patch.object(renderer, "CHAT_PASTE_CLI", self.cli),
                patch.object(
                    renderer.sys,
                    "argv",
                    [str(SCRIPT), str(source), "--mode", "internal"],
                ),
                patch.object(renderer, "run_cli", side_effect=self.fake_cli) as call,
            ):
                self.assertEqual(renderer.main(), 0)
                command = call.call_args.args[0]
                self.assertEqual(command[:2], ["node", str(self.cli)])
                self.assertIn("--source", command)
                self.assertNotIn("--stdin", command)
                self.assertNotIn("--output", command)
                self.assertEqual(command[command.index("--destination") + 1], "slack")
                self.assertEqual(
                    self.prepared_source, "Hey team!\n\n## SHIPPED\n• Works"
                )
                self.assertNotIn("PRIVATE_SENTINEL", str(call.call_args))
                self.assertFalse(Path(command[command.index("--source") + 1]).exists())

    def test_adapter_opens_only_with_explicit_flag(self):
        with tempfile.TemporaryDirectory(prefix="eod-open-") as root:
            source = Path(root) / "2026-10-05.md"
            source.write_text("Ready")
            for mode in ["client", "internal", "weekly"]:
                for flags in [[], ["--no-open"], ["--open"]]:
                    with (
                        self.subTest(mode=mode, flags=flags),
                        patch.object(renderer, "CHAT_PASTE_CLI", self.cli),
                        patch.object(
                            renderer.sys,
                            "argv",
                            [str(SCRIPT), str(source), "--mode", mode, *flags],
                        ),
                        patch.object(
                            renderer,
                            "run_cli",
                            side_effect=self.fake_cli,
                        ) as call,
                    ):
                        self.assertEqual(renderer.main(), 0)
                        self.assertEqual(
                            call.call_count, 2 if flags == ["--open"] else 1
                        )
                        if flags == ["--open"]:
                            self.assertEqual(
                                call.call_args.args[0],
                                [
                                    "node",
                                    str(self.cli.with_name("viewer.mjs")),
                                    "open",
                                    "--session",
                                    str(self.session),
                                ],
                            )

    def test_eod_delivery_and_checker_work_without_formatter_or_node(self):
        with tempfile.TemporaryDirectory(prefix="eod-standalone-") as root:
            draft = Path(root) / f"{Path(root).name}.md"
            draft.write_bytes((SKILL / "tests/demo.md").read_bytes())
            original = draft.read_bytes()
            output = self.output_path(draft)
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_text("OLD_PREVIEW_SENTINEL")
            env = {**os.environ, "HOME": root, "PATH": ""}
            result = subprocess.run(
                [sys.executable, str(SCRIPT), str(draft), "--no-open"],
                env=env,
                capture_output=True,
                text=True,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("preview skipped", result.stdout)
            self.assertIn("plain text", result.stdout)
            self.assertNotIn(str(output), result.stdout)
            self.assertEqual(output.read_text(), "OLD_PREVIEW_SENTINEL")
            self.assertEqual(draft.read_bytes(), original)
            checked = subprocess.run(
                [sys.executable, str(SKILL / "scripts/check_eod.py"), str(draft)],
                env=env,
                capture_output=True,
                text=True,
            )
            self.assertEqual(checked.returncode, 0, checked.stdout + checked.stderr)

    def test_standalone_preparation_excludes_private_notes(self):
        self.assertEqual(
            renderer.prepare_message(
                "Public body\n\n## Internal notes\nPRIVATE_SENTINEL", "client"
            ),
            "Public body",
        )
        self.assertNotIn("importlib", SCRIPT.read_text())

    def test_cli_failures_and_invalid_json_are_errors(self):
        cases = [
            subprocess.CompletedProcess([], 1, stdout="", stderr="Unsupported format"),
            subprocess.CompletedProcess([], 0, stdout="", stderr=""),
            subprocess.CompletedProcess([], 0, stdout="[]", stderr=""),
        ]
        for result in cases:
            with (
                self.subTest(result=result),
                patch.object(renderer.subprocess, "run", return_value=result),
            ):
                with self.assertRaises(ValueError):
                    renderer.run_cli(["node", str(self.cli)])

    def test_missing_node_is_an_error_not_a_missing_skill(self):
        draft = self.session / "draft.md"
        draft.write_text("Public body")
        with (
            patch.object(renderer, "CHAT_PASTE_CLI", self.cli),
            patch.object(renderer.sys, "argv", [str(SCRIPT), str(draft)]),
            patch.object(
                renderer.subprocess, "run", side_effect=FileNotFoundError("node")
            ),
        ):
            self.assertEqual(renderer.main(), 1)
        self.assertIn("Formatting failed", self.stderr.getvalue())
        self.assertNotIn("not installed", self.stdout.getvalue())

    def test_no_preview_is_claimed_without_existing_paths(self):
        draft = self.session / "draft.md"
        draft.write_text("Public body")
        with (
            patch.object(renderer, "CHAT_PASTE_CLI", self.cli),
            patch.object(renderer.sys, "argv", [str(SCRIPT), str(draft), "--open"]),
            patch.object(
                renderer, "run_cli", return_value={"session": "/missing/session"}
            ) as call,
        ):
            self.assertEqual(renderer.main(), 1)
            self.assertEqual(call.call_count, 1)
        self.assertEqual(self.stdout.getvalue(), "")

    def test_browser_failure_preserves_the_render_result(self):
        draft = self.session / "draft.md"
        draft.write_text("Public body")

        def fail_open(command):
            if "open" in command:
                raise ValueError("No usable viewer port")
            return self.fake_cli(command)

        with (
            patch.object(renderer, "CHAT_PASTE_CLI", self.cli),
            patch.object(renderer.sys, "argv", [str(SCRIPT), str(draft), "--open"]),
            patch.object(renderer, "run_cli", side_effect=fail_open),
        ):
            self.assertEqual(renderer.main(), 1)
        self.assertEqual(json.loads(self.stdout.getvalue())["html"], str(self.page))
        self.assertIn("No usable viewer port", self.stderr.getvalue())

    def test_unsuccessful_browser_launch_is_not_reported_as_open(self):
        draft = self.session / "draft.md"
        draft.write_text("Public body")

        def unopened(command):
            if "open" in command:
                return {
                    "browserOpened": False,
                    "browserReason": "xdg-open: ENOENT",
                    "urls": [],
                }
            return self.fake_cli(command)

        with (
            patch.object(renderer, "CHAT_PASTE_CLI", self.cli),
            patch.object(renderer.sys, "argv", [str(SCRIPT), str(draft), "--open"]),
            patch.object(renderer, "run_cli", side_effect=unopened),
        ):
            self.assertEqual(renderer.main(), 0)
        self.assertFalse(json.loads(self.stdout.getvalue())["browserOpened"])


if __name__ == "__main__":
    unittest.main()
