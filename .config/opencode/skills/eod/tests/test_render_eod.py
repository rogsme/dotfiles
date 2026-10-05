import importlib.util
import json
from pathlib import Path
import re
import subprocess
import tempfile
import unittest
from unittest.mock import patch

SKILL = Path(__file__).resolve().parents[1]
SCRIPT = SKILL / "scripts" / "render_eod.py"
spec = importlib.util.spec_from_file_location("render_eod", SCRIPT)
renderer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(renderer)


class RenderTests(unittest.TestCase):
    def test_private_notes_never_enter_the_export(self):
        page, warnings = renderer.render(
            "Hey team!\n\nTODAY 🙂\n* Works\n\n## Internal notes\nPRIVATE_SENTINEL",
            "Demo",
            "client",
        )
        self.assertNotIn("PRIVATE_SENTINEL", page)
        self.assertNotIn("## Internal notes", page)
        self.assertNotRegex(page, r"<script[^>]+src=")
        self.assertIn("default-src &#x27;none&#x27;", page)
        self.assertEqual(warnings, [])

    def test_script_data_cannot_break_out_or_rewrite_the_template(self):
        title = "</script><img src=x onerror=alert(1)>__SCRIPTS__"
        page, _ = renderer.render("Public message", title, "client")
        data = re.search(
            r'<script type="application/json" id="chat-paste-data">(.*?)</script>',
            page,
            re.S,
        )[1]
        self.assertEqual(json.loads(data)["title"], title)
        self.assertNotIn("<img src=x", page)
        self.assertNotIn("</script><img", data)

    def test_cli_generates_private_page_and_regenerates_after_revisions(self):
        with tempfile.TemporaryDirectory(prefix="eod-render-") as root:
            draft = Path(root) / "2026-10-05.md"
            draft.write_text("Hey team!\n\nTODAY 🙂\n* First", encoding="utf-8")
            command = ["python3", str(SCRIPT), str(draft), "--no-open"]
            first = subprocess.run(command, capture_output=True, text=True)
            self.assertEqual(first.returncode, 0, first.stderr)
            output = draft.with_suffix(".html")
            self.assertEqual(output.stat().st_mode & 0o777, 0o600)
            self.assertIn(output.as_uri(), first.stdout)
            draft.write_text("Hey team!\n\nTODAY 🙂\n* Revised", encoding="utf-8")
            second = subprocess.run(command, capture_output=True, text=True)
            self.assertEqual(second.returncode, 0, second.stderr)
            self.assertIn("Revised", output.read_text())
            self.assertNotIn('"* First"', output.read_text())

    def test_unsupported_input_does_not_create_a_page(self):
        with tempfile.TemporaryDirectory(prefix="eod-render-") as root:
            draft = Path(root) / "2026-10-05.md"
            draft.write_text("![image](https://example.com/a.png)")
            result = subprocess.run(
                ["python3", str(SCRIPT), str(draft), "--no-open"],
                capture_output=True,
                text=True,
            )
            self.assertEqual(result.returncode, 1)
            self.assertFalse(draft.with_suffix(".html").exists())

    def test_unrelated_html_is_preserved(self):
        with tempfile.TemporaryDirectory(prefix="eod-render-") as root:
            draft = Path(root) / "2026-10-05.md"
            draft.write_text("Message")
            output = draft.with_suffix(".html")
            output.write_text("User-owned page")
            result = subprocess.run(
                ["python3", str(SCRIPT), str(draft), "--no-open"],
                capture_output=True,
                text=True,
            )
            self.assertEqual(result.returncode, 1)
            self.assertEqual(output.read_text(), "User-owned page")

    def test_symlink_output_is_preserved(self):
        with tempfile.TemporaryDirectory(prefix="eod-render-") as root:
            draft = Path(root) / "2026-10-05.md"
            draft.write_text("Message")
            target = Path(root) / "private.html"
            target.write_text("User-owned page")
            draft.with_suffix(".html").symlink_to(target)
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

    def test_review_flags_are_rejected_only_by_the_eod_adapter(self):
        for label in [
            "Before you send:",
            "Reviewer: Pat",
            "📝 Friday reminder: say weekly",
        ]:
            with self.assertRaisesRegex(ValueError, "review flags"):
                renderer.render(
                    f"Public message\n\n{label}\nPrivate annotation", "Demo", "client"
                )

    def test_old_owned_eod_preview_migrates_to_shared_renderer(self):
        with tempfile.TemporaryDirectory(prefix="eod-migrate-") as root:
            draft = Path(root) / "2026-10-05.md"
            draft.write_text("Hey team!\n\nTODAY 🙂\n* Works")
            output = draft.with_suffix(".html")
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

    def test_eod_uses_shared_implementation_without_local_assets(self):
        self.assertFalse((SKILL / "assets" / "formatter.js").exists())
        self.assertTrue(renderer.SHARED_SCRIPT.is_file())
        page, _ = renderer.render(
            "Hey team!\n\nSHIPPED\n• Works", "Demo", "internal", "slack"
        )
        data = json.loads(
            re.search(
                r'<script type="application/json" id="chat-paste-data">(.*?)</script>',
                page,
                re.S,
            )[1]
        )
        self.assertEqual(data["destination"], "slack")
        self.assertEqual(data["text"], "Hey team!\n\n## SHIPPED\n• Works")
        self.assertIn("writing checker", data["revisionNote"])

    def test_adapter_inherits_shared_delivery_policy(self):
        shared = renderer.shared_formatter()
        with tempfile.TemporaryDirectory(prefix="eod-open-") as root:
            source = Path(root) / "2026-10-05.md"
            source.write_text("Ready")
            for flags, expected in [([], True), (["--no-open"], False)]:
                with (
                    patch.object(renderer, "shared_formatter", return_value=shared),
                    patch.object(
                        renderer.sys, "argv", [str(SCRIPT), str(source), *flags]
                    ),
                    patch.object(shared, "describe_preview") as deliver,
                ):
                    self.assertEqual(renderer.main(), 0)
                    self.assertEqual(deliver.call_args.kwargs["open_browser"], expected)


if __name__ == "__main__":
    unittest.main()
