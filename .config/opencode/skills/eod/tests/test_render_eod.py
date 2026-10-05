import importlib.util
import json
from pathlib import Path
import re
import subprocess
import tempfile
import unittest

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
            r'<script type="application/json" id="eod-data">(.*?)</script>', page, re.S
        )[1]
        self.assertEqual(json.loads(data)["title"], title)
        self.assertNotIn("<img src=x", page)
        self.assertNotIn("</script><img", data)

    def test_cli_generates_private_page_and_regenerates_after_revisions(self):
        with tempfile.TemporaryDirectory(prefix="eod-render-") as root:
            draft = Path(root) / "2026-10-05.md"
            draft.write_text("Hey team!\n\nTODAY 🙂\n* First", encoding="utf-8")
            command = ["python3", str(SCRIPT), str(draft)]
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
                ["python3", str(SCRIPT), str(draft)], capture_output=True, text=True
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
                ["python3", str(SCRIPT), str(draft)], capture_output=True, text=True
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
                ["python3", str(SCRIPT), str(draft)], capture_output=True, text=True
            )
            self.assertEqual(result.returncode, 1)
            self.assertEqual(target.read_text(), "User-owned page")

    def test_notes_and_client_files_are_rejected(self):
        with tempfile.TemporaryDirectory(prefix="eod-render-") as root:
            for name in ["2026-10-05.notes.md", "client.md"]:
                path = Path(root) / name
                path.write_text("Sensitive configuration")
                result = subprocess.run(
                    ["python3", str(SCRIPT), str(path)], capture_output=True, text=True
                )
                self.assertEqual(result.returncode, 1)
                self.assertFalse(path.with_suffix(".html").exists())

    def test_channel_recommendation(self):
        with tempfile.TemporaryDirectory(prefix="eod-render-") as root:
            config = Path(root) / "client.md"
            config.write_text("---\nchannel: Microsoft Teams chat\n---\n")
            self.assertEqual(renderer.channel(config), "teams")


if __name__ == "__main__":
    unittest.main()
