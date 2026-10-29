import fnmatch
from pathlib import Path
import re
import unittest


AGENT = Path(__file__).resolve().parents[3] / "agents" / "EOD.md"


def permission_rules(section):
    frontmatter = AGENT.read_text(encoding="utf-8").split("---", 2)[1]
    block = re.search(rf"^  {section}:\n((?:    .*\n)+)", frontmatter, re.M)
    if not block:
        raise AssertionError(f"Missing {section} permission rules")
    return re.findall(r'^    "([^"]+)": (allow|deny|ask)$', block[1], re.M)


def permission(section, resource):
    effect = "ask"
    for pattern, match in permission_rules(section):
        if section != "bash":
            pattern = str(Path(pattern).expanduser())
        if fnmatch.fnmatchcase(resource, pattern):
            effect = match
    return effect


class AgentPermissionTests(unittest.TestCase):
    def test_preview_directory_allows_boundary_and_edits(self):
        self.assertEqual(permission("external_directory", "/tmp/opencode/*"), "allow")
        self.assertEqual(
            permission("edit", "/tmp/opencode/eod-internal-chat.md"), "allow"
        )

    def test_formatter_directories_are_readable_but_not_editable(self):
        for base in ["~/.agents/skills/chat-paste", "~/.claude/skills/chat-paste"]:
            root = str(Path(base).expanduser())
            with self.subTest(root=root):
                self.assertEqual(permission("external_directory", f"{root}/*"), "allow")
                self.assertEqual(
                    permission("edit", f"{root}/scripts/render_message.mjs"), "deny"
                )

    def test_formatter_cli_accepts_saved_messages(self):
        for base in ["~/.agents/skills/chat-paste", "~/.claude/skills/chat-paste"]:
            for root in ["~/.eod", "/tmp/opencode"]:
                command = (
                    f"node {Path(base).expanduser()}/scripts/render_message.mjs "
                    f"--source {Path(root).expanduser()}/client/internal.md --name eod --destination both"
                )
                with self.subTest(command=command):
                    self.assertEqual(permission("bash", command), "allow")

    def test_viewer_commands_accept_only_preview_sessions(self):
        for base in ["~/.agents/skills/chat-paste", "~/.claude/skills/chat-paste"]:
            for action in ["open", "poll", "reply", "end"]:
                cli = f"node {Path(base).expanduser()}/scripts/viewer.mjs {action} --session"
                self.assertEqual(
                    permission("bash", f"{cli} /tmp/opencode/eod-chat-paste/session"),
                    "allow",
                )
                self.assertEqual(
                    permission("bash", f"{cli} /tmp/private/session"), "deny"
                )

    def test_deployment_evidence_uses_only_its_pinned_helper(self):
        command = f"python3 {Path.home()}/.config/opencode/skills/eod/scripts/deployment_evidence.py --repo example/app --environment staging --sha {'a' * 40}"
        self.assertEqual(permission("bash", command), "allow")
        self.assertEqual(
            permission("bash", "gh api --method POST repos/example/app/deployments"),
            "deny",
        )

    def test_unrelated_paths_and_inline_python_stay_denied(self):
        home = Path.home()
        for resource in [f"{home}/obsidian/*", "/tmp/private/*"]:
            self.assertEqual(permission("external_directory", resource), "deny")
        for resource in [f"{home}/.config/opencode/agents/EOD.md", "/tmp/private.md"]:
            self.assertEqual(permission("edit", resource), "deny")
        self.assertEqual(permission("bash", "python3 -c 'print(1)'"), "deny")
        self.assertEqual(permission("bash", "node -e 'console.log(1)'"), "deny")


if __name__ == "__main__":
    unittest.main()
