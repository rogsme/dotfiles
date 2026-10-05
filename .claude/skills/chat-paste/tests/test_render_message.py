import importlib.util
import json
from pathlib import Path
import re
import subprocess
import tempfile
import unittest
from unittest.mock import patch
import io
import contextlib

SKILL = Path(__file__).resolve().parents[1]
SCRIPT = SKILL / "scripts" / "render_message.py"
spec = importlib.util.spec_from_file_location("chat_paste_renderer", SCRIPT)
renderer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(renderer)


class SharedRenderTests(unittest.TestCase):
    def test_content_policy_is_not_inferred(self):
        body = "PLAIN CAPS\n\n## Internal notes\nINTENTIONAL_NOTES\n\nBefore you send:\nCheck the links."
        page, _ = renderer.render(body)
        data = json.loads(
            re.search(
                r'<script type="application/json" id="chat-paste-data">(.*?)</script>',
                page,
                re.S,
            )[1]
        )
        self.assertEqual(data["text"], body)
        self.assertNotIn("mode", data)
        self.assertEqual(data["destination"], "both")
        self.assertNotIn("EOD writing checker", page)

    def test_script_data_is_safe(self):
        title = "</script><img src=x onerror=alert(1)>__SCRIPTS__"
        page, _ = renderer.render("Ordinary message", title, "teams")
        data = re.search(
            r'<script type="application/json" id="chat-paste-data">(.*?)</script>',
            page,
            re.S,
        )[1]
        self.assertEqual(json.loads(data)["title"], title)
        self.assertNotIn("<img src=x", page)
        self.assertNotRegex(page, r"<script[^>]+src=")
        self.assertIn("default-src &#x27;none&#x27;", page)

    def test_cli_stdin_and_private_output(self):
        with tempfile.TemporaryDirectory(prefix="chat-paste-") as root:
            output = Path(root) / "message.html"
            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--stdin",
                    "--output",
                    str(output),
                    "--destination",
                    "teams",
                    "--no-open",
                ],
                input="## Announcement\n* Ready 🙂",
                capture_output=True,
                text=True,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(output.stat().st_mode & 0o777, 0o600)
            self.assertIn(output.as_uri(), result.stdout)
            self.assertIn("Copy for Teams", result.stdout)

    def test_file_input_is_preserved_and_page_regenerates(self):
        with tempfile.TemporaryDirectory(prefix="chat-paste-") as root:
            source = Path(root) / "message.txt"
            source.write_text("First message")
            command = ["python3", str(SCRIPT), str(source), "--no-open"]
            first = subprocess.run(command, capture_output=True, text=True)
            self.assertEqual(first.returncode, 0, first.stderr)
            self.assertEqual(source.read_text(), "First message")
            source.write_text("Revised message")
            second = subprocess.run(command, capture_output=True, text=True)
            self.assertEqual(second.returncode, 0, second.stderr)
            self.assertIn("Revised message", source.with_suffix(".html").read_text())

    def test_unrelated_output_is_preserved(self):
        with tempfile.TemporaryDirectory(prefix="chat-paste-") as root:
            output = Path(root) / "message.html"
            output.write_text("User-owned content")
            with self.assertRaisesRegex(ValueError, "unrelated"):
                renderer.write_preview("New page", output)
            self.assertEqual(output.read_text(), "User-owned content")

    def test_symlink_output_is_preserved(self):
        with tempfile.TemporaryDirectory(prefix="chat-paste-") as root:
            target = Path(root) / "owned.html"
            target.write_text("User-owned content")
            output = Path(root) / "message.html"
            output.symlink_to(target)
            with self.assertRaisesRegex(ValueError, "symlink"):
                renderer.write_preview("New page", output)
            self.assertEqual(target.read_text(), "User-owned content")

    def test_source_cannot_be_overwritten(self):
        with tempfile.TemporaryDirectory(prefix="chat-paste-") as root:
            source = Path(root) / "message.md"
            source.write_text("Original message")
            result = subprocess.run(
                ["python3", str(SCRIPT), str(source), "--output", str(source)],
                capture_output=True,
                text=True,
            )
            self.assertEqual(result.returncode, 1)
            self.assertEqual(source.read_text(), "Original message")

    def test_unsupported_content_leaves_no_output(self):
        with tempfile.TemporaryDirectory(prefix="chat-paste-") as root:
            output = Path(root) / "message.html"
            result = subprocess.run(
                ["python3", str(SCRIPT), "--stdin", "--output", str(output)],
                input="![image](https://example.com/image.png)",
                capture_output=True,
                text=True,
            )
            self.assertEqual(result.returncode, 1)
            self.assertFalse(output.exists())

    def test_invalid_destination_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "Destination"):
            renderer.render("Message", destination="email")

    def test_delivery_opens_by_default_and_can_opt_out(self):
        output = Path("/tmp/opencode/chat-paste-open-test.html")
        with (
            patch.object(renderer.subprocess, "run") as run,
            contextlib.redirect_stdout(io.StringIO()),
        ):
            renderer.describe_preview(output, "slack", [])
            self.assertEqual(run.call_args.args[0], ["xdg-open", str(output)])
            run.reset_mock()
            renderer.describe_preview(output, "slack", [], open_browser=False)
            run.assert_not_called()

    def test_open_failure_keeps_the_preview_url(self):
        output = Path("/tmp/opencode/chat-paste-open-test.html")
        stdout, stderr = io.StringIO(), io.StringIO()
        with (
            patch.object(renderer.subprocess, "run", side_effect=OSError("No browser")),
            contextlib.redirect_stdout(stdout),
            contextlib.redirect_stderr(stderr),
        ):
            renderer.describe_preview(output, "slack", [])
        self.assertIn(output.as_uri(), stdout.getvalue())
        self.assertIn("automatic opening failed", stderr.getvalue())

    def test_cli_inherits_default_open_and_no_open(self):
        with tempfile.TemporaryDirectory(prefix="chat-paste-open-") as root:
            source = Path(root) / "message.md"
            source.write_text("Ready")
            for flags, expected in [([], True), (["--no-open"], False)]:
                with (
                    patch.object(
                        renderer.sys, "argv", [str(SCRIPT), str(source), *flags]
                    ),
                    patch.object(renderer, "describe_preview") as deliver,
                ):
                    self.assertEqual(renderer.main(), 0)
                    self.assertEqual(deliver.call_args.kwargs["open_browser"], expected)


if __name__ == "__main__":
    unittest.main()
