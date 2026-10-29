"""Run a synthetic formatter check through the installed EOD agent's permissions."""

import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path


def tool_calls(value):
    if isinstance(value, dict):
        if value.get("tool") in ("shell", "bash"):
            yield value
        for child in value.values():
            yield from tool_calls(child)
    elif isinstance(value, list):
        for child in value:
            yield from tool_calls(child)


def verify_smoke(transcript, root, renderer):
    events = [json.loads(line) for line in transcript.splitlines() if line.strip()]
    calls = [call for event in events for call in tool_calls(event)]
    executed = False
    for call in calls:
        state = call.get("state", {})
        command = state.get("input", {}).get("command", "")
        if str(renderer) in command and state.get("status") == "completed":
            executed = True
        if state.get("status") == "error":
            raise ValueError(
                "The EOD agent had a failed tool call; inspect its synthetic transcript"
            )
    if not executed:
        raise ValueError(
            "No completed renderer shell call in the actual EOD agent transcript"
        )
    proof = json.loads((root / "render-result.json").read_text())
    for key in ("source", "html"):
        path = Path(proof[key]).resolve()
        if not path.is_relative_to(root / "artifacts"):
            raise ValueError("The agent's preview escaped its synthetic artifact root")
        text = path.read_text()
        if (
            "EOD_AGENT_PRIVATE_SENTINEL" in text
            or "Synthetic public fixture" not in text
        ):
            raise ValueError("The agent's preview failed public/private content checks")
    if proof.get("browserOpened") is not False:
        raise ValueError("The agent smoke opened a browser")
    return proof


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--timeout", type=int, default=240)
    args = parser.parse_args()
    parent = Path("/tmp/opencode")
    parent.mkdir(parents=True, exist_ok=True)
    root = Path(tempfile.mkdtemp(prefix="eod-agent-smoke-", dir=parent))
    renderer = Path(__file__).with_name("render_eod.py").resolve()
    draft = root / "synthetic.md"
    draft.write_text(
        "Synthetic public fixture\n\n## Internal notes\nEOD_AGENT_PRIVATE_SENTINEL\n"
    )
    prompt = root / "instructions.md"
    prompt.write_text(
        "EVAL MODE: synthetic EOD integration smoke, not a client update.\n"
        "Skip the vault, tracker, PR inventory, drafting, reviews and browser. "
        "Do not read real client logs. Use only the synthetic files in this directory.\n"
        "Run this one shell command exactly, including its output redirection:\n"
        f"python3 {renderer} {draft} --no-open --require-preview "
        f"--artifacts {root / 'artifacts'} > {root / 'render-result.json'}\n"
        "Read the JSON result and its public Markdown snapshot. "
        "Confirm the public fixture is present and internal notes are absent. "
        "Do not fabricate result files or HTML. Report failure on denied or failed tools.\n"
    )
    try:
        run = subprocess.run(
            [
                "opencode",
                "run",
                "--standalone",
                "--agent",
                "EOD",
                "--format",
                "json",
                "--title",
                "EOD synthetic permission smoke",
                "--file",
                str(prompt),
                "EVAL MODE: run the attached synthetic EOD integration smoke instructions.",
            ],
            cwd=root,
            capture_output=True,
            text=True,
            timeout=args.timeout,
            check=False,
        )
        (root / "transcript.jsonl").write_text(run.stdout)
        (root / "stderr.txt").write_text(run.stderr)
        if run.returncode:
            raise ValueError(
                f"OpenCode exited {run.returncode}; see synthetic stderr.txt"
            )
        proof = verify_smoke(run.stdout, root, renderer)
    except (
        OSError,
        ValueError,
        KeyError,
        TypeError,
        subprocess.SubprocessError,
    ) as error:
        print(
            json.dumps(
                {"status": "failed", "reason": str(error), "artifacts": str(root)},
                indent=2,
            )
        )
        return 1
    print(
        json.dumps(
            {
                "status": "passed",
                "agent": "EOD",
                "artifacts": str(root),
                "html": proof["html"],
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
