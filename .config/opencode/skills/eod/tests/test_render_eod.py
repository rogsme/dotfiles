import importlib.util
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
    def output_path(self, draft):
        output = Path("/tmp/opencode") / f"{draft.stem}.html"
        self.addCleanup(output.unlink, missing_ok=True)
        return output

    def export_page(self, text, mode="client"):
        if not renderer.CHAT_PASTE_CLI.is_file():
            self.skipTest("Optional formatter is not installed")
        with tempfile.TemporaryDirectory(prefix="eod-export-") as root:
            draft = Path(root) / f"{Path(root).name}.md"
            output = self.output_path(draft)
            draft.write_text(text, encoding="utf-8")
            result = subprocess.run(
                [sys.executable, str(SCRIPT), str(draft), "--mode", mode, "--no-open"],
                capture_output=True,
                text=True,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(draft.read_text(encoding="utf-8"), text)
            self.assertFalse(draft.with_suffix(".html").exists())
            return output.read_text(encoding="utf-8")

    def test_private_notes_never_enter_the_export(self):
        page = self.export_page(
            "Hey team!\n\nTODAY 🙂\n* Works\n\n## Internal notes\nPRIVATE_SENTINEL",
        )
        self.assertNotIn("PRIVATE_SENTINEL", page)
        self.assertNotIn("## Internal notes", page)
        self.assertNotRegex(page, r"<script[^>]+src=")
        self.assertIn("default-src &#x27;none&#x27;", page)

    @unittest.skipUnless(
        renderer.CHAT_PASTE_CLI.is_file(), "Optional formatter is not installed"
    )
    def test_cli_generates_private_page_and_regenerates_after_revisions(self):
        with tempfile.TemporaryDirectory(prefix="eod-render-") as root:
            draft = Path(root) / f"{Path(root).name}.md"
            output = self.output_path(draft)
            draft.write_text("Hey team!\n\nTODAY 🙂\n* First", encoding="utf-8")
            command = ["python3", str(SCRIPT), str(draft), "--no-open"]
            first = subprocess.run(command, capture_output=True, text=True)
            self.assertEqual(first.returncode, 0, first.stderr)
            self.assertEqual(output.stat().st_mode & 0o777, 0o600)
            self.assertIn(output.as_uri(), first.stdout)
            draft.write_text("Hey team!\n\nTODAY 🙂\n* Revised", encoding="utf-8")
            second = subprocess.run(command, capture_output=True, text=True)
            self.assertEqual(second.returncode, 0, second.stderr)
            self.assertIn("Revised", output.read_text())
            self.assertNotIn('"* First"', output.read_text())

    @unittest.skipUnless(
        renderer.CHAT_PASTE_CLI.is_file(), "Optional formatter is not installed"
    )
    def test_unsupported_input_does_not_create_a_page(self):
        with tempfile.TemporaryDirectory(prefix="eod-render-") as root:
            draft = Path(root) / f"{Path(root).name}.md"
            output = self.output_path(draft)
            draft.write_text("![image](https://example.com/a.png)")
            result = subprocess.run(
                ["python3", str(SCRIPT), str(draft), "--no-open"],
                capture_output=True,
                text=True,
            )
            self.assertEqual(result.returncode, 1)
            self.assertFalse(output.exists())

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
                ["python3", str(SCRIPT), str(draft), "--no-open"],
                capture_output=True,
                text=True,
            )
            self.assertEqual(result.returncode, 1)
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
                ["python3", str(SCRIPT), str(draft), "--no-open"],
                capture_output=True,
                text=True,
            )
            self.assertEqual(result.returncode, 1)
            self.assertEqual(target.read_text(), "User-owned page")

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
    def test_old_owned_eod_preview_migrates_to_shared_renderer(self):
        with tempfile.TemporaryDirectory(prefix="eod-migrate-") as root:
            draft = Path(root) / f"{Path(root).name}.md"
            draft.write_text("Hey team!\n\nTODAY 🙂\n* Works")
            output = self.output_path(draft)
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_text(
                "<!doctype html>\n<!-- Generated by EOD formatter v1. -->\nOld generated preview"
            )
            result = subprocess.run(
                ["python3", str(SCRIPT), str(draft), "--no-open"],
                capture_output=True,
                text=True,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("<!-- Generated by chat-paste v1. -->", output.read_text())

    def test_handoff_uses_only_public_cli_and_prepared_message(self):
        self.assertFalse((SKILL / "assets" / "formatter.js").exists())
        with tempfile.TemporaryDirectory(prefix="eod-contract-") as root:
            source = Path(root) / "2026-10-05.md"
            source.write_text(
                "Hey team!\n\nSHIPPED\n• Works\n\n## Internal notes\nPRIVATE_SENTINEL"
            )
            result = subprocess.CompletedProcess([], 0, stdout="", stderr="")
            with (
                patch.object(renderer, "CHAT_PASTE_CLI", SCRIPT),
                patch.object(
                    renderer.sys,
                    "argv",
                    [str(SCRIPT), str(source), "--mode", "internal"],
                ),
                patch.object(renderer.subprocess, "run", return_value=result) as call,
            ):
                self.assertEqual(renderer.main(), 0)
                command = call.call_args.args[0]
                self.assertEqual(command[1], str(SCRIPT))
                self.assertIn("--stdin", command)
                self.assertEqual(
                    command[command.index("--output") + 1],
                    str(Path("/tmp/opencode") / f"{source.stem}.html"),
                )
                self.assertEqual(command[command.index("--destination") + 1], "slack")
                self.assertEqual(
                    call.call_args.kwargs["input"], "Hey team!\n\n## SHIPPED\n• Works"
                )
                self.assertNotIn("PRIVATE_SENTINEL", str(call.call_args))

    def test_adapter_opens_only_with_explicit_flag(self):
        with tempfile.TemporaryDirectory(prefix="eod-open-") as root:
            source = Path(root) / "2026-10-05.md"
            source.write_text("Ready")
            for mode in ["client", "internal", "weekly"]:
                for flags in [[], ["--no-open"], ["--open"]]:
                    with (
                        self.subTest(mode=mode, flags=flags),
                        patch.object(renderer, "CHAT_PASTE_CLI", SCRIPT),
                        patch.object(
                            renderer.sys,
                            "argv",
                            [str(SCRIPT), str(source), "--mode", mode, *flags],
                        ),
                        patch.object(
                            renderer.subprocess,
                            "run",
                            return_value=subprocess.CompletedProcess(
                                [], 0, stdout="", stderr=""
                            ),
                        ) as call,
                    ):
                        self.assertEqual(renderer.main(), 0)
                        command = call.call_args.args[0]
                        self.assertEqual(
                            [arg for arg in command if arg in ("--open", "--no-open")],
                            flags or ["--no-open"],
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


if __name__ == "__main__":
    unittest.main()
