"""Read deployment records for one environment and expected release revision."""

import argparse
import json
import re
import subprocess
import sys
from datetime import datetime
from urllib.parse import urlencode


def gh_json(arguments):
    result = subprocess.run(
        ["gh", *arguments], capture_output=True, text=True, timeout=30, check=False
    )
    if result.returncode:
        raise ValueError(
            f"GitHub evidence lookup failed (exit {result.returncode}); no deployment verified"
        )
    return json.loads(result.stdout)


def collect(repo, environment, expected_sha, task="deploy", workflow=None, branch=None):
    evidence = {
        "repo": repo,
        "environment": environment,
        "expected_sha": expected_sha,
        "task": task,
        "checked_at": datetime.now().astimezone().isoformat(),
        "status": "unverified",
        "availability_verified": False,
    }
    try:
        query = urlencode({"environment": environment, "task": task, "per_page": 5})
        deployments = gh_json(
            ["api", "--method", "GET", f"repos/{repo}/deployments?{query}"]
        )
        if not isinstance(deployments, list):
            raise TypeError("GitHub returned no deployment list")
        matching = [
            item
            for item in deployments
            if isinstance(item, dict)
            and item.get("environment") == environment
            and item.get("task") == task
        ]
        if matching:
            latest = max(
                matching,
                key=lambda item: (item.get("created_at", ""), item.get("id", 0)),
            )
            deployment_id = latest.get("id")
            if type(deployment_id) is not int or deployment_id <= 0:
                raise ValueError("Deployment has no valid numeric identity")
            statuses = gh_json(
                [
                    "api",
                    "--method",
                    "GET",
                    f"repos/{repo}/deployments/{deployment_id}/statuses?per_page=1",
                ]
            )
            if not isinstance(statuses, list):
                raise TypeError("GitHub returned no deployment status list")
            status = statuses[0] if statuses else {}
            if not isinstance(status, dict):
                raise TypeError("GitHub returned an invalid deployment status")
            evidence["deployment"] = {
                "id": deployment_id,
                "sha": latest.get("sha"),
                "state": status.get("state"),
                "url": latest.get("url"),
                "environment_url": status.get("environment_url"),
                "status_url": status.get("url"),
                "updated_at": status.get("created_at"),
            }
            if status.get("environment") not in (None, "", environment):
                evidence["reason"] = "Latest status belongs to a different environment"
            elif latest.get("sha") != expected_sha:
                evidence.update(
                    status="revision_mismatch",
                    reason="Latest deployment is not the expected release",
                )
            elif status.get("state") == "success":
                evidence.update(
                    status="reported_success",
                    reason="GitHub reports this environment deployed the expected revision; runtime behavior is not verified",
                )
            else:
                evidence["reason"] = (
                    f"Latest deployment status is {status.get('state') or 'unknown'}"
                )
        else:
            evidence["reason"] = (
                "No deployment record for the requested environment and task"
            )
        if workflow:
            command = [
                "run",
                "list",
                "--repo",
                repo,
                "--workflow",
                workflow,
                "--limit",
                "5",
                "--json",
                "status,conclusion,headSha,url",
            ]
            if branch:
                command.extend(["--branch", branch])
            evidence["workflow_runs"] = gh_json(command)
    except (
        OSError,
        ValueError,
        KeyError,
        TypeError,
        subprocess.SubprocessError,
    ) as error:
        evidence.update(status="unavailable", reason=str(error))
    return evidence


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", required=True)
    parser.add_argument("--environment", required=True)
    parser.add_argument(
        "--sha", required=True, help="Full expected release SHA, not a branch name"
    )
    parser.add_argument("--task", default="deploy")
    parser.add_argument("--workflow")
    parser.add_argument("--branch")
    args = parser.parse_args()
    if not re.fullmatch(r"[\w.-]+/[\w.-]+", args.repo):
        parser.error("--repo must be owner/repo")
    if not re.fullmatch(r"[0-9a-fA-F]{40}", args.sha):
        parser.error("--sha must be a full 40-character release SHA")
    print(
        json.dumps(
            collect(
                args.repo,
                args.environment,
                args.sha.lower(),
                args.task,
                args.workflow,
                args.branch,
            ),
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
