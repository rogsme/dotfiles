import importlib.util
import unittest
from pathlib import Path
from unittest.mock import patch

SCRIPT = Path(__file__).resolve().parents[1] / "scripts/deployment_evidence.py"
spec = importlib.util.spec_from_file_location("deployment_evidence", SCRIPT)
deployment = importlib.util.module_from_spec(spec)
spec.loader.exec_module(deployment)
SHA = "a" * 40


def record(sha=SHA, environment="staging", identity=1, created="2026-10-28T20:00:00Z"):
    return {
        "id": identity,
        "environment": environment,
        "sha": sha,
        "task": "deploy",
        "created_at": created,
        "url": "https://api.github.com/repos/example/app/deployments/1",
    }


class DeploymentEvidenceTests(unittest.TestCase):
    def test_unrelated_green_workflow_is_not_deployment_proof(self):
        green = [{"status": "completed", "conclusion": "success", "headSha": SHA}]
        with patch.object(deployment, "gh_json", side_effect=[[], green]) as call:
            result = deployment.collect(
                "example/app", "staging", SHA, workflow="Deploy staging", branch="main"
            )
        self.assertEqual(result["status"], "unverified")
        self.assertFalse(result["availability_verified"])
        command = call.call_args.args[0]
        self.assertEqual(command[command.index("--workflow") + 1], "Deploy staging")
        self.assertEqual(command[command.index("--branch") + 1], "main")

    def test_deployment_must_match_environment_and_release(self):
        with patch.object(
            deployment, "gh_json", return_value=[record(environment="preview")]
        ):
            self.assertEqual(
                deployment.collect("example/app", "staging", SHA)["status"],
                "unverified",
            )
        with patch.object(
            deployment,
            "gh_json",
            side_effect=[[record(sha="b" * 40)], [{"state": "success"}]],
        ):
            self.assertEqual(
                deployment.collect("example/app", "staging", SHA)["status"],
                "revision_mismatch",
            )

    def test_latest_failed_or_pending_status_is_not_success(self):
        for state in ("pending", "in_progress", "failure", "error", "inactive"):
            with (
                self.subTest(state=state),
                patch.object(
                    deployment, "gh_json", side_effect=[[record()], [{"state": state}]]
                ),
            ):
                self.assertEqual(
                    deployment.collect("example/app", "staging", SHA)["status"],
                    "unverified",
                )

    def test_old_success_does_not_override_newer_release(self):
        records = [
            record(),
            record(sha="b" * 40, identity=2, created="2026-10-28T21:00:00Z"),
        ]
        with patch.object(
            deployment, "gh_json", side_effect=[records, [{"state": "success"}]]
        ):
            self.assertEqual(
                deployment.collect("example/app", "staging", SHA)["status"],
                "revision_mismatch",
            )

    def test_success_reports_deployment_not_runtime_verification(self):
        with patch.object(
            deployment,
            "gh_json",
            side_effect=[[record()], [{"state": "success", "environment": "staging"}]],
        ) as call:
            result = deployment.collect("example/app", "staging", SHA)
        self.assertEqual(result["status"], "reported_success")
        self.assertFalse(result["availability_verified"])
        self.assertEqual(call.call_args_list[0].args[0][:3], ["api", "--method", "GET"])
        self.assertEqual(call.call_args_list[1].args[0][:3], ["api", "--method", "GET"])

    def test_changed_status_environment_and_lookup_errors_are_not_proof(self):
        with patch.object(
            deployment,
            "gh_json",
            side_effect=[
                [record()],
                [{"state": "success", "environment": "production"}],
            ],
        ):
            self.assertEqual(
                deployment.collect("example/app", "staging", SHA)["status"],
                "unverified",
            )
        with patch.object(
            deployment, "gh_json", side_effect=ValueError("Access unavailable")
        ):
            self.assertEqual(
                deployment.collect("example/app", "staging", SHA)["status"],
                "unavailable",
            )


if __name__ == "__main__":
    unittest.main()
