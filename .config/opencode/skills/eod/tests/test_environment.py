import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(SCRIPTS))
try:
    import check_environment as environment
    import smoke_agent
finally:
    sys.path.pop(0)


class EnvironmentTests(unittest.TestCase):
    def test_absent_and_incompatible_install_are_distinct(self):
        with tempfile.TemporaryDirectory() as directory:
            home = Path(directory)
            self.assertEqual(environment.check_environment(home)["status"], "absent")
            old = home / ".agents/skills/chat-paste/scripts/render_message.py"
            old.parent.mkdir(parents=True)
            old.touch()
            self.assertEqual(environment.check_environment(home)["status"], "broken")

    def test_missing_viewer_is_broken(self):
        with tempfile.TemporaryDirectory() as directory:
            home = Path(directory)
            cli = home / ".agents/skills/chat-paste/scripts/render_message.mjs"
            cli.parent.mkdir(parents=True)
            cli.touch()
            self.assertIn(
                "Missing viewer", environment.check_environment(home)["reason"]
            )

    def test_failed_render_does_not_pass_or_skip(self):
        with tempfile.TemporaryDirectory() as directory:
            home = Path(directory)
            cli = home / ".agents/skills/chat-paste/scripts/render_message.mjs"
            cli.parent.mkdir(parents=True)
            cli.touch()
            cli.with_name("viewer.mjs").touch()
            failed = subprocess.CompletedProcess([], 1, "", "incompatible CLI")
            with patch.object(environment.subprocess, "run", return_value=failed):
                result = environment.check_environment(home, home / "scratch")
            self.assertEqual(result["status"], "broken")
            self.assertIn("incompatible CLI", result["reason"])

    def test_installed_contract_renders_without_skipping(self):
        cli = environment.render_eod.CHAT_PASTE_CLI
        if not cli.parent.parent.exists():
            self.skipTest(
                "No optional skill installed; strict maintenance command still fails"
            )
        self.assertEqual(environment.check_environment()["status"], "ready")


class AgentSmokeTests(unittest.TestCase):
    def test_text_claim_without_completed_tool_is_not_proof(self):
        with (
            tempfile.TemporaryDirectory() as directory,
            self.assertRaisesRegex(ValueError, "No completed renderer"),
        ):
            smoke_agent.verify_smoke(
                '{"type":"text","text":"It worked"}',
                Path(directory),
                SCRIPTS / "render_eod.py",
            )

    def test_failed_tool_rejects_smoke(self):
        event = {
            "part": {
                "tool": "shell",
                "state": {"status": "error", "input": {"command": "render_eod.py"}},
            }
        }
        with self.assertRaisesRegex(ValueError, "failed tool"):
            smoke_agent.verify_smoke(
                json.dumps(event), Path("/tmp/opencode"), SCRIPTS / "render_eod.py"
            )


class ChangedInstallationTests(unittest.TestCase):
    def setUp(self):
        self.enterContext(patch.dict(environment.os.environ))
        environment.os.environ.pop("EOD_REGRESSION_ACTIVE", None)

    def test_passing_install_is_cached_and_edit_reruns_tests(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            skill = root / "skills/eod"
            skill.mkdir(parents=True)
            source = skill / "SKILL.md"
            source.write_text("First version")
            passed = subprocess.CompletedProcess([], 0, "", "Ran 1 test\nOK")
            with patch.object(
                environment.subprocess, "run", return_value=passed
            ) as call:
                first = environment.check_regressions_if_changed(
                    skill, root, root / "scratch"
                )
                second = environment.check_regressions_if_changed(
                    skill, root, root / "scratch"
                )
                self.assertFalse(first["cached"])
                self.assertTrue(second["cached"])
                self.assertEqual(call.call_count, 1)
                source.write_text("Updated version")
                third = environment.check_regressions_if_changed(
                    skill, root, root / "scratch"
                )
                self.assertFalse(third["cached"])
                self.assertEqual(call.call_count, 2)

    def test_failed_regressions_are_not_cached_as_passed(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            skill = root / "skill"
            skill.mkdir()
            failed = subprocess.CompletedProcess([], 1, "", "FAILED")
            with patch.object(
                environment.subprocess, "run", return_value=failed
            ) as call:
                for _ in range(2):
                    result = environment.check_regressions_if_changed(
                        skill, root, root / "scratch"
                    )
                    self.assertEqual(result["status"], "broken")
                self.assertEqual(call.call_count, 2)
            self.assertEqual(
                list((root / "scratch/eod-install-checks").glob("*.json")), []
            )

    def test_nested_context_call_does_not_recurse(self):
        with (
            patch.dict(environment.os.environ, {"EOD_REGRESSION_ACTIVE": "1"}),
            patch.object(environment.subprocess, "run") as call,
        ):
            self.assertEqual(
                environment.check_regressions_if_changed()["status"], "ready"
            )
            call.assert_not_called()

    def test_empty_discovery_is_not_a_passing_install(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            skill = root / "skill"
            skill.mkdir()
            empty = subprocess.CompletedProcess([], 0, "", "Ran 0 tests\nOK")
            with patch.object(environment.subprocess, "run", return_value=empty):
                result = environment.check_regressions_if_changed(
                    skill, root, root / "scratch"
                )
            self.assertEqual(result["status"], "broken")


if __name__ == "__main__":
    unittest.main()
