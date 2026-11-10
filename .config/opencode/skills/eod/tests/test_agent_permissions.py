import fnmatch
import json
from pathlib import Path
import unittest


AGENT = Path(__file__).resolve().parents[3] / "agents" / "EOD.md"


def permission_rules(section):
    frontmatter = AGENT.read_text(encoding="utf-8").split("---", 2)[1]
    rules = [
        json.loads(line.removeprefix("  - "))
        for line in frontmatter.splitlines()
        if line.startswith("  - {")
    ]
    matching = [
        (rule["resource"], rule["effect"])
        for rule in rules
        if fnmatch.fnmatchcase(section, rule["action"])
    ]
    if not matching:
        raise AssertionError(f"Missing {section} permission rules")
    return matching


def permission(section, resource):
    effect = "ask"
    for pattern, match in permission_rules(section):
        if section in ("external_directory", "read", "edit"):
            pattern = str(Path(pattern).expanduser())
        if fnmatch.fnmatchcase(resource, pattern) or (
            section == "shell" and pattern.endswith(" *") and resource == pattern[:-2]
        ):
            effect = match
    return effect


class AgentPermissionTests(unittest.TestCase):
    def test_policy_uses_only_native_v2_fields(self):
        frontmatter = AGENT.read_text(encoding="utf-8").split("---", 2)[1]
        self.assertRegex(frontmatter, r"(?m)^permissions:")
        self.assertNotRegex(frontmatter, r"(?m)^(permission|tools):")

    def test_startup_command_is_allowed_without_arguments(self):
        for base in ("~/.config/opencode", f"{Path.home()}/.config/opencode"):
            command = f"python3 {base}/skills/eod/scripts/eod_context.py"
            with self.subTest(command=command):
                self.assertEqual(permission("shell", command), "allow")
                self.assertEqual(
                    permission(
                        "shell", f"{command} --root /tmp/opencode/clients --logs 0"
                    ),
                    "allow",
                )

    def test_python_commands_are_allowed_with_and_without_the_shell_guard(self):
        for command in (
            "python3 /tmp/opencode/example.py",
            "python3 /tmp/opencode/example.py --client synthetic > /tmp/opencode/result.md",
            "python3 -c 'print(1)'",
        ):
            with self.subTest(command=command):
                self.assertEqual(permission("shell", command), "allow")
                self.assertEqual(
                    permission("shell", f"bash -e -o pipefail -c '{command}'"),
                    "allow",
                )
        self.assertEqual(
            permission("shell", "bash -e -o pipefail -c 'echo unrelated'"), "deny"
        )

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
                    self.assertEqual(permission("shell", command), "allow")

    def test_viewer_commands_accept_only_preview_sessions(self):
        for base in ["~/.agents/skills/chat-paste", "~/.claude/skills/chat-paste"]:
            for action in ["open", "poll", "reply", "end"]:
                cli = f"node {Path(base).expanduser()}/scripts/viewer.mjs {action} --session"
                self.assertEqual(
                    permission("shell", f"{cli} /tmp/opencode/eod-chat-paste/session"),
                    "allow",
                )
                self.assertEqual(
                    permission("shell", f"{cli} /tmp/private/session"), "deny"
                )

    def test_deployment_evidence_uses_only_its_pinned_helper(self):
        command = f"python3 {Path.home()}/.config/opencode/skills/eod/scripts/deployment_evidence.py --repo example/app --environment staging --sha {'a' * 40}"
        self.assertEqual(permission("shell", command), "allow")
        self.assertEqual(
            permission("shell", "gh api --method POST repos/example/app/deployments"),
            "deny",
        )

    def test_unrelated_paths_and_inline_node_stay_denied(self):
        home = Path.home()
        for resource in [f"{home}/obsidian/*", "/tmp/private/*"]:
            self.assertEqual(permission("external_directory", resource), "deny")
        for resource in [f"{home}/.config/opencode/agents/EOD.md", "/tmp/private.md"]:
            self.assertEqual(permission("edit", resource), "deny")
        self.assertEqual(permission("shell", "node -e 'console.log(1)'"), "deny")


if __name__ == "__main__":
    unittest.main()
