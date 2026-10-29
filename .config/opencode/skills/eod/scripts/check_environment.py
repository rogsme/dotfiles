"""Exercise the installed EOD formatter with synthetic data, never client notes."""

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import render_eod


def check_environment(home=None, temporary_root=Path("/tmp/opencode")):
    home = home or Path.home()
    cli = render_eod.find_chat_paste_cli(home)
    installs = [home / root / "skills/chat-paste" for root in (".agents", ".claude")]
    if not cli.is_file():
        installed = any(path.exists() for path in installs)
        return {
            "status": "broken" if installed else "absent",
            "reason": "Installed chat-paste has no supported render_message.mjs entry point."
            if installed
            else "Optional chat-paste skill is not installed.",
        }
    if not cli.with_name("viewer.mjs").is_file():
        return {"status": "broken", "reason": f"Missing viewer.mjs beside {cli}"}
    try:
        temporary_root.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(
            prefix="eod-check-", dir=temporary_root
        ) as directory:
            root = Path(directory)
            draft = root / "synthetic.md"
            draft.write_text(
                "Synthetic EOD check\n\nTODAY\n* Public fixture.\n\n"
                "## Internal notes\nEOD_PRIVATE_CHECK_SENTINEL\n",
                encoding="utf-8",
            )
            result = subprocess.run(
                [
                    sys.executable,
                    str(Path(__file__).with_name("render_eod.py")),
                    str(draft),
                    "--no-open",
                    "--require-preview",
                    "--artifacts",
                    str(root / "artifacts"),
                ],
                capture_output=True,
                text=True,
                timeout=60,
                check=False,
                env={**os.environ, "HOME": str(home)},
            )
            if result.returncode:
                raise ValueError(result.stderr.strip() or result.stdout.strip())
            payload = json.loads(result.stdout)
            for key in ("source", "html"):
                output = Path(payload[key])
                if not output.is_relative_to(root / "artifacts"):
                    raise ValueError(
                        f"Formatter's {key} escaped the synthetic artifact root"
                    )
                text = output.read_text(encoding="utf-8")
                if (
                    "EOD_PRIVATE_CHECK_SENTINEL" in text
                    or "Public fixture." not in text
                ):
                    raise ValueError(
                        f"Formatter's {key} failed public/private content checks"
                    )
            if payload.get("browserOpened") is not False:
                raise ValueError("Synthetic check unexpectedly opened a browser")
    except (
        OSError,
        ValueError,
        KeyError,
        TypeError,
        subprocess.SubprocessError,
    ) as error:
        return {"status": "broken", "reason": str(error)}
    return {
        "status": "ready",
        "reason": "Installed formatter rendered public-only synthetic Markdown.",
    }


def installation_fingerprint(skill, home):
    roots = [skill, render_eod.find_chat_paste_cli(home).parent.parent]
    files = set()
    for root in roots:
        if root.is_dir():
            files.update(
                path
                for path in root.rglob("*")
                if path.is_file()
                and path.suffix in {".py", ".md", ".mjs", ".js", ".html", ".css"}
            )
    agents = skill.parent.parent / "agents"
    files.update(
        path for path in agents.glob("*.md") if path.stem.lower().startswith("eod")
    )
    signature = hashlib.sha256(sys.version.encode())
    for path in sorted(files):
        signature.update(str(path).encode())
        signature.update(path.read_bytes())
    node = shutil.which("node")
    if node:
        info = Path(node).stat()
        signature.update(f"{node}:{info.st_size}:{info.st_mtime_ns}".encode())
    return signature.hexdigest()


def check_regressions_if_changed(
    skill=None, home=None, temporary_root=Path("/tmp/opencode")
):
    if os.environ.get("EOD_REGRESSION_ACTIVE") == "1":
        return {"status": "ready", "reason": "Covered by the parent regression run"}
    skill = skill or Path(__file__).resolve().parents[1]
    home = home or Path.home()
    try:
        signature = installation_fingerprint(skill, home)
        cache = temporary_root / "eod-install-checks"
        cache.mkdir(mode=0o700, parents=True, exist_ok=True)
        passed = cache / f"{signature}.json"
        if passed.is_file():
            saved = json.loads(passed.read_text())
            if saved == {"fingerprint": signature, "status": "passed"}:
                return {
                    "status": "ready",
                    "cached": True,
                    "reason": "Installed EOD and formatter files are unchanged since passing regressions",
                }
        run = subprocess.run(
            [
                sys.executable,
                "-m",
                "unittest",
                "discover",
                "-s",
                str(skill / "tests"),
                "-p",
                "test_*.py",
                "-v",
            ],
            capture_output=True,
            text=True,
            timeout=120,
            check=False,
            env={**os.environ, "EOD_REGRESSION_ACTIVE": "1"},
        )
        log = cache / f"{signature}.log"
        with tempfile.NamedTemporaryFile(mode="w", dir=cache, delete=False) as output:
            output.write(run.stdout + run.stderr)
            temporary = Path(output.name)
        temporary.replace(log)
        if run.returncode or not re.search(
            r"Ran [1-9]\d* tests?\b", run.stdout + run.stderr
        ):
            return {
                "status": "broken",
                "reason": f"EOD regression tests failed; see {log}",
            }
        with tempfile.NamedTemporaryFile(mode="w", dir=cache, delete=False) as output:
            json.dump({"fingerprint": signature, "status": "passed"}, output)
            temporary = Path(output.name)
        temporary.replace(passed)
    except (OSError, ValueError, subprocess.SubprocessError) as error:
        return {"status": "broken", "reason": str(error)}
    return {
        "status": "ready",
        "cached": False,
        "reason": "Updated EOD/formatter installation passed regression tests",
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--require-preview", action="store_true")
    parser.add_argument(
        "--tests", action="store_true", help="Run all EOD regression tests too"
    )
    parser.add_argument(
        "--agent",
        action="store_true",
        help="Also run the real EOD permission smoke test",
    )
    args = parser.parse_args()
    result = check_environment()
    print(json.dumps(result, indent=2), flush=True)
    if result["status"] == "broken" or (
        args.require_preview and result["status"] != "ready"
    ):
        return 1
    if args.tests:
        tested = subprocess.run(
            [
                sys.executable,
                "-m",
                "unittest",
                "discover",
                "-s",
                str(Path(__file__).resolve().parents[1] / "tests"),
                "-p",
                "test_*.py",
                "-v",
            ],
            check=False,
            timeout=120,
        ).returncode
        if tested:
            return tested
    if args.agent:
        return subprocess.run(
            [sys.executable, str(Path(__file__).with_name("smoke_agent.py"))],
            check=False,
            timeout=300,
        ).returncode
    return 0


if __name__ == "__main__":
    sys.exit(main())
