#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = ["PyYAML>=6.0.2,<7"]
# ///
"""Validate the shared .claude/skills.yaml contract without running commands."""

from __future__ import annotations

import argparse
import copy
import glob as globlib
import json
import os
import re
import shlex
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

import yaml
from yaml.constructor import ConstructorError


RECOGNIZED = (
    "audit-tests",
    "fill-test-gaps",
    "review-conventions",
    "update-docs",
)
MARKDOWN_SUFFIXES = {".md", ".markdown"}


class DuplicateKeyLoader(yaml.SafeLoader):
    """Safe YAML loader that rejects duplicate mapping keys."""


def _construct_mapping(loader: DuplicateKeyLoader, node: yaml.MappingNode, deep: bool = False) -> dict[Any, Any]:
    loader.flatten_mapping(node)
    mapping: dict[Any, Any] = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node, deep=deep)
        try:
            duplicate = key in mapping
        except TypeError as exc:
            raise ConstructorError("while constructing a mapping", node.start_mark, "found an unhashable key", key_node.start_mark) from exc
        if duplicate:
            raise ConstructorError("while constructing a mapping", node.start_mark, f"found duplicate key {key!r}", key_node.start_mark)
        mapping[key] = loader.construct_object(value_node, deep=deep)
    return mapping


DuplicateKeyLoader.add_constructor(
    yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, _construct_mapping
)


class Validator:
    def __init__(self, repo: Path) -> None:
        self.repo = repo
        self.errors: list[str] = []
        self.warnings: list[str] = []
        self.sections: list[str] = []

    def error(self, path: str, message: str) -> None:
        self.errors.append(f"{path}: {message}")

    def warning(self, path: str, message: str) -> None:
        self.warnings.append(f"{path}: {message}")

    def exact_mapping(
        self,
        value: Any,
        path: str,
        required: set[str],
        optional: set[str] | None = None,
    ) -> dict[str, Any] | None:
        if not isinstance(value, dict):
            self.error(path, "must be a mapping")
            return None
        optional = optional or set()
        keys = set(value)
        unknown = keys - required - optional
        missing = required - keys
        if unknown:
            self.error(path, f"unknown keys: {', '.join(sorted(map(str, unknown)))}")
        if missing:
            self.error(path, f"missing keys: {', '.join(sorted(missing))}")
        return value

    def strings(
        self,
        value: Any,
        path: str,
        *,
        allow_empty: bool = False,
        unique: bool = False,
    ) -> list[str] | None:
        if not isinstance(value, list) or (not allow_empty and not value):
            qualifier = "a list" if allow_empty else "a nonempty list"
            self.error(path, f"must be {qualifier} of nonempty strings")
            return None
        result: list[str] = []
        for index, item in enumerate(value):
            if not isinstance(item, str) or not item.strip():
                self.error(f"{path}[{index}]", "must be a nonempty string")
                continue
            result.append(item)
        if unique and len(result) != len(set(result)):
            self.error(path, "values must be unique")
        return result

    def safe_relative(self, value: Any, path: str) -> str | None:
        if not isinstance(value, str) or not value or value != value.strip():
            self.error(path, "must be a nonempty normalized repository-relative string")
            return None
        if any(char in value for char in ("\0", "\n", "\r")):
            self.error(path, "must not contain NUL or line breaks")
            return None
        if "\\" in value:
            self.error(path, "must use POSIX '/' separators")
            return None
        if value.startswith(("/", "~")) or re.match(r"^[A-Za-z]:", value):
            self.error(path, "must be repository-relative")
            return None
        parts = value.split("/")
        if any(part in {"", ".", ".."} for part in parts):
            self.error(path, "must not contain empty, '.' or '..' path components")
            return None
        return value

    def contained(self, candidate: Path, path: str, *, must_exist: bool = False) -> Path | None:
        try:
            resolved = candidate.resolve(strict=must_exist)
        except (OSError, RuntimeError) as exc:
            self.error(path, f"cannot resolve path: {exc}")
            return None
        if not resolved.is_relative_to(self.repo):
            self.error(path, "resolves outside the repository")
            return None
        return resolved

    def literal(self, value: Any, path: str, *, must_exist: bool = False) -> tuple[str, Path] | None:
        relative = self.safe_relative(value, path)
        if relative is None:
            return None
        resolved = self.contained(self.repo / relative, path, must_exist=must_exist)
        return (relative, resolved) if resolved is not None else None

    def glob(self, value: Any, path: str) -> tuple[set[str], set[str]] | None:
        pattern = self.safe_relative(value, path)
        if pattern is None:
            return None
        if pattern.startswith("!"):
            self.error(path, "leading '!' negation is not supported")
            return None
        if "{" in pattern or "}" in pattern:
            self.error(path, "brace expansion is not supported")
            return None
        if re.search(r"(?:^|/|[^\\])[?*+@!]\(", pattern):
            self.error(path, "extglob syntax is not supported")
            return None
        for component in pattern.split("/"):
            if "**" in component and component != "**":
                self.error(path, "'**' must occupy a complete path component")
                return None
            if not self.valid_brackets(component):
                self.error(path, "has an invalid character class")
                return None

        static_parts: list[str] = []
        for component in pattern.split("/"):
            if any(char in component for char in "*?["):
                break
            static_parts.append(component)
        if self.contained(self.repo.joinpath(*static_parts), path) is None:
            return None

        matches: set[str] = set()
        files: set[str] = set()
        try:
            raw_matches = globlib.glob(
                os.fspath(self.repo / pattern), recursive=True, include_hidden=True
            )
        except (OSError, RuntimeError, re.error) as exc:
            self.error(path, f"cannot expand glob: {exc}")
            return None
        for raw in raw_matches:
            candidate = Path(raw)
            resolved = self.contained(candidate, path, must_exist=True)
            if resolved is None:
                continue
            try:
                relative = candidate.relative_to(self.repo).as_posix()
            except ValueError:
                self.error(path, "matched a path outside the repository")
                continue
            matches.add(relative)
            if candidate.is_file():
                files.add(relative)
        return matches, files

    @staticmethod
    def valid_brackets(component: str) -> bool:
        index = 0
        while index < len(component):
            if component[index] == "]":
                return False
            if component[index] != "[":
                index += 1
                continue
            end = component.find("]", index + 1)
            if end < 0 or end == index + 1 or (component[index + 1] in "!^" and end == index + 2):
                return False
            index = end + 1
        return True

    def glob_list(
        self,
        value: Any,
        path: str,
        *,
        allow_empty: bool = False,
        require_files: bool = False,
        warn_unmatched: bool = False,
    ) -> tuple[list[str], set[str], set[str]] | None:
        patterns = self.strings(value, path, allow_empty=allow_empty)
        if patterns is None:
            return None
        all_matches: set[str] = set()
        all_files: set[str] = set()
        valid_patterns: list[str] = []
        for index, pattern in enumerate(patterns):
            expanded = self.glob(pattern, f"{path}[{index}]")
            if expanded is None:
                continue
            matches, files = expanded
            valid_patterns.append(pattern)
            all_matches.update(matches)
            all_files.update(files)
            if require_files and not files:
                self.error(f"{path}[{index}]", "must match at least one existing file")
            elif warn_unmatched and not matches:
                self.warning(f"{path}[{index}]", "pattern matches nothing")
        return valid_patterns, all_matches, all_files

    def commands(self, value: Any, path: str) -> None:
        mapping = self.exact_mapping(value, path, {"check"}, {"fix"})
        if mapping is None:
            return
        checks = self.strings(mapping.get("check"), f"{path}.check")
        if checks is not None:
            for index, command in enumerate(checks):
                reason = mutating_check_reason(command)
                if reason:
                    self.error(f"{path}.check[{index}]", reason)
        if "fix" in mapping:
            self.strings(mapping["fix"], f"{path}.fix")

    def validate(self, document: Any) -> None:
        root = self.exact_mapping(document, "$", {"version", "skills"})
        if root is None:
            return
        version = root.get("version")
        if type(version) is not int or version != 1:
            self.error("version", "must be integer 1 (booleans are invalid)")
        skills = root.get("skills")
        if not isinstance(skills, dict) or not skills:
            self.error("skills", "must be a nonempty mapping")
            return
        self.sections = [name for name in RECOGNIZED if name in skills]
        if not self.sections:
            self.error("skills", "must contain at least one recognized section")
            return
        if "audit-tests" in skills:
            self.audit(skills["audit-tests"])
        if "fill-test-gaps" in skills:
            self.fill(skills["fill-test-gaps"])
        if "review-conventions" in skills:
            self.review(skills["review-conventions"])
        if "update-docs" in skills:
            self.docs(skills["update-docs"])

    def audit(self, value: Any) -> None:
        base = "skills.audit-tests"
        section = self.exact_mapping(
            value, base, {"source_globs", "test_globs", "known_exceptions", "commands"}
        )
        if section is None:
            return
        sources = self.glob_list(section.get("source_globs"), f"{base}.source_globs", warn_unmatched=True)
        tests = self.glob_list(section.get("test_globs"), f"{base}.test_globs", warn_unmatched=True)
        exceptions = section.get("known_exceptions")
        if not isinstance(exceptions, list):
            self.error(f"{base}.known_exceptions", "must be a list")
        else:
            for index, item in enumerate(exceptions):
                item_path = f"{base}.known_exceptions[{index}]"
                exception = self.exact_mapping(item, item_path, {"pattern", "reason"})
                if exception is None:
                    continue
                self.glob(exception.get("pattern"), f"{item_path}.pattern")
                reason = exception.get("reason")
                if not isinstance(reason, str) or not reason.strip():
                    self.error(f"{item_path}.reason", "must be a nonempty string")
        self.commands(section.get("commands"), f"{base}.commands")
        if sources is not None and tests is not None:
            overlap = sources[2] & tests[2]
            if overlap:
                self.error(base, f"source/test file overlap: {', '.join(sorted(overlap))}")

    def fill(self, value: Any) -> None:
        base = "skills.fill-test-gaps"
        section = self.exact_mapping(value, base, {"coverage", "skip", "commands"})
        if section is None:
            return
        coverage = self.exact_mapping(
            section.get("coverage"), f"{base}.coverage", {"command", "output", "format"}
        )
        if coverage is not None:
            command = coverage.get("command")
            if not isinstance(command, str) or not command.strip():
                self.error(f"{base}.coverage.command", "must be a nonempty string")
            self.literal(coverage.get("output"), f"{base}.coverage.output")
            if coverage.get("format") not in {"istanbul", "coverage.py"}:
                self.error(f"{base}.coverage.format", "must be 'istanbul' or 'coverage.py'")
        self.glob_list(section.get("skip"), f"{base}.skip", allow_empty=True)
        self.commands(section.get("commands"), f"{base}.commands")

    def convention_headings(self) -> set[str] | None:
        path = self.repo / "CONVENTIONS.md"
        resolved = self.contained(path, "CONVENTIONS.md", must_exist=True)
        if resolved is None or not resolved.is_file():
            if resolved is not None:
                self.error("CONVENTIONS.md", "must be an existing file")
            return None
        try:
            lines = resolved.read_text(encoding="utf-8").splitlines()
        except (OSError, UnicodeError) as exc:
            self.error("CONVENTIONS.md", f"cannot read UTF-8: {exc}")
            return None
        headings: set[str] = set()
        fence: str | None = None
        for index, line in enumerate(lines):
            fence_match = re.match(r"^ {0,3}(`{3,}|~{3,})", line)
            if fence_match:
                marker = fence_match.group(1)
                if fence is None:
                    fence = marker[0]
                elif marker[0] == fence:
                    fence = None
                continue
            if fence is not None:
                continue
            atx = re.match(r"^ {0,3}#{1,6}\s+(.+?)\s*#*\s*$", line)
            if atx:
                headings.add(atx.group(1).strip())
            if index + 1 < len(lines) and line.strip() and re.match(r"^ {0,3}(?:=+|-+)\s*$", lines[index + 1]):
                headings.add(line.strip())
        return headings

    def review(self, value: Any) -> None:
        base = "skills.review-conventions"
        section = self.exact_mapping(value, base, {"extensions", "exclusions", "scopes", "commands"})
        if section is None:
            return
        extensions = self.strings(section.get("extensions"), f"{base}.extensions", unique=True)
        if extensions is not None:
            for index, extension in enumerate(extensions):
                if not re.fullmatch(r"\.[A-Za-z0-9][A-Za-z0-9._+-]*", extension):
                    self.error(f"{base}.extensions[{index}]", "must be a dot-prefixed extension")
        exclusions = self.glob_list(section.get("exclusions"), f"{base}.exclusions", allow_empty=True)
        excluded_files = exclusions[2] if exclusions is not None else set()
        headings = self.convention_headings()
        scopes = section.get("scopes")
        owners: dict[str, str] = {}
        names: set[str] = set()
        if not isinstance(scopes, list) or not scopes:
            self.error(f"{base}.scopes", "must be a nonempty list")
        else:
            for index, item in enumerate(scopes):
                scope_path = f"{base}.scopes[{index}]"
                scope = self.exact_mapping(item, scope_path, {"name", "include", "sections"})
                if scope is None:
                    continue
                name = scope.get("name")
                if not isinstance(name, str) or not name.strip():
                    self.error(f"{scope_path}.name", "must be a nonempty string")
                    name = f"#{index}"
                elif name in names:
                    self.error(f"{scope_path}.name", "must be unique")
                else:
                    names.add(name)
                includes = self.glob_list(scope.get("include"), f"{scope_path}.include", warn_unmatched=True)
                sections = self.strings(scope.get("sections"), f"{scope_path}.sections", unique=True)
                if sections is not None and headings is not None:
                    for section_name in sections:
                        if section_name not in headings:
                            self.error(f"{scope_path}.sections", f"heading {section_name!r} is absent from CONVENTIONS.md")
                if includes is None or extensions is None:
                    continue
                owned = {
                    file
                    for file in includes[2]
                    if any(file.endswith(extension) for extension in extensions)
                    and file not in excluded_files
                }
                for file in sorted(owned):
                    if file in owners:
                        self.error(base, f"scope overlap for {file}: {owners[file]!r} and {name!r}")
                    else:
                        owners[file] = name
        self.commands(section.get("commands"), f"{base}.commands")

    def docs(self, value: Any) -> None:
        base = "skills.update-docs"
        section = self.exact_mapping(value, base, {"groups", "aliases", "skip", "commands"})
        if section is None:
            return
        groups = section.get("groups")
        group_names: set[str] = set()
        doc_owners: dict[str, str] = {}
        docs: set[str] = set()
        if not isinstance(groups, list) or not groups:
            self.error(f"{base}.groups", "must be a nonempty list")
        else:
            for group_index, item in enumerate(groups):
                group_path = f"{base}.groups[{group_index}]"
                group = self.exact_mapping(item, group_path, {"name", "docs"})
                if group is None:
                    continue
                name = group.get("name")
                if not isinstance(name, str) or not name.strip():
                    self.error(f"{group_path}.name", "must be a nonempty string")
                    name = f"#{group_index}"
                elif name in group_names:
                    self.error(f"{group_path}.name", "must be unique")
                else:
                    group_names.add(name)
                entries = group.get("docs")
                if not isinstance(entries, list) or not entries:
                    self.error(f"{group_path}.docs", "must be a nonempty list")
                    continue
                for doc_index, item_doc in enumerate(entries):
                    doc_path = f"{group_path}.docs[{doc_index}]"
                    doc = self.exact_mapping(item_doc, doc_path, {"path", "sources"})
                    if doc is None:
                        continue
                    literal = self.literal(doc.get("path"), f"{doc_path}.path", must_exist=True)
                    if literal is not None:
                        relative, resolved = literal
                        if not resolved.is_file() or resolved.suffix.lower() not in MARKDOWN_SUFFIXES:
                            self.error(f"{doc_path}.path", "must be an existing Markdown file")
                        if relative in doc_owners:
                            self.error(f"{doc_path}.path", f"already owned by group {doc_owners[relative]!r}")
                        else:
                            doc_owners[relative] = name
                            docs.add(relative)
                    self.glob_list(doc.get("sources"), f"{doc_path}.sources", require_files=True)

        aliases = section.get("aliases")
        if not isinstance(aliases, dict):
            self.error(f"{base}.aliases", "must be a mapping")
        else:
            for alias, targets in aliases.items():
                alias_path = f"{base}.aliases.{alias}"
                if not isinstance(alias, str) or not alias.strip():
                    self.error(f"{base}.aliases", "alias names must be nonempty strings")
                    continue
                if alias == "all":
                    self.error(alias_path, "'all' is reserved")
                target_list = self.strings(targets, alias_path, unique=True)
                if target_list is not None:
                    missing = sorted(set(target_list) - group_names)
                    if missing:
                        self.error(alias_path, f"unknown groups: {', '.join(missing)}")

        skip = self.glob_list(section.get("skip"), f"{base}.skip", allow_empty=True)
        if skip is not None:
            conflicts = docs & skip[2]
            if conflicts:
                self.error(f"{base}.skip", f"mapped docs are also skipped: {', '.join(sorted(conflicts))}")
        self.commands(section.get("commands"), f"{base}.commands")


def mutating_check_reason(command: str) -> str | None:
    try:
        lexer = shlex.shlex(command, posix=True, punctuation_chars=";&|>")
        lexer.whitespace_split = True
        lexer.commenters = ""
        tokens = list(lexer)
    except ValueError as exc:
        return f"cannot parse command safely: {exc}"
    lowered = [token.lower() for token in tokens]
    operators = {"&&", "||", ";", "|", "&", ">", ">>"}
    found_operators = [token for token in lowered if token in operators]
    if found_operators:
        return "each command list item must be one command without shell chaining or pipelines"
    for token in lowered:
        if token in {"--fix", "--write"} or token.startswith(("--fix=", "--write=")):
            return f"obvious mutating flag {token!r} is forbidden in check commands"
    if "prettier" in {Path(token).name for token in lowered} and "--write" in lowered:
        return "prettier --write is forbidden in check commands"

    while lowered and ("=" in lowered[0] and not lowered[0].startswith("=")):
        lowered = lowered[1:]
    if not lowered:
        return None
    executable = Path(lowered[0]).name
    if executable in {"deploy", "publish", "migrate"}:
        return f"obvious mutating command {executable!r} is forbidden in check commands"
    if executable == "terraform" and "apply" in lowered[1:]:
        return "terraform apply is forbidden in check commands"
    if executable in {"npm", "pnpm", "yarn", "bun"}:
        scripts = [token for token in lowered[1:] if token != "run" and not token.startswith("-")]
        if scripts and scripts[0] in {"deploy", "publish", "migrate"}:
            return f"mutating package script {scripts[0]!r} is forbidden in check commands"
    return None


def load_document(text: str) -> Any:
    return yaml.load(text, Loader=DuplicateKeyLoader)


def validate_text(repo: Path, text: str) -> Validator:
    validator = Validator(repo)
    try:
        document = load_document(text)
    except yaml.YAMLError as exc:
        validator.error("$", f"invalid YAML: {exc}")
        return validator
    validator.validate(document)
    return validator


def resolve_git_root(requested: str) -> tuple[Path | None, str | None]:
    path = Path(requested).expanduser()
    try:
        path = path.resolve(strict=True)
    except (OSError, RuntimeError) as exc:
        return None, f"repo cannot be resolved: {exc}"
    if not path.is_dir():
        return None, "repo must be a directory"
    try:
        process = subprocess.run(
            ["git", "-C", os.fspath(path), "rev-parse", "--show-toplevel"],
            check=False,
            capture_output=True,
            text=True,
            timeout=10,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        return None, f"cannot resolve Git root: {exc}"
    if process.returncode != 0:
        detail = process.stderr.strip() or "not inside a Git working tree"
        return None, f"cannot resolve Git root: {detail}"
    try:
        root = Path(process.stdout.strip()).resolve(strict=True)
    except (OSError, RuntimeError) as exc:
        return None, f"Git root cannot be resolved: {exc}"
    if not root.is_dir():
        return None, "resolved Git root is not a directory"
    return root, None


def report(
    validator: Validator,
    repo: str,
    source: str,
    *,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    result: dict[str, Any] = {
        "valid": not validator.errors,
        "repo": repo,
        "config": source,
        "source": source,
        "sections": validator.sections,
        "errors": validator.errors,
        "warnings": validator.warnings,
    }
    if extra:
        result.update(extra)
    return result


def self_test() -> int:
    checks: list[dict[str, Any]] = []
    with tempfile.TemporaryDirectory() as temporary:
        repo = Path(temporary) / "repo"
        (repo / ".git").mkdir(parents=True)
        (repo / "src").mkdir()
        (repo / "tests").mkdir()
        (repo / "docs").mkdir()
        (repo / "src" / "app.py").write_text("value = 1\n", encoding="utf-8")
        (repo / "tests" / "test_app.py").write_text("def test_app(): pass\n", encoding="utf-8")
        (repo / "docs" / "api.md").write_text("# API\n", encoding="utf-8")
        (repo / "CONVENTIONS.md").write_text("# Python\n\n## Tests\n", encoding="utf-8")

        valid = {
            "version": 1,
            "skills": {
                "audit-tests": {
                    "source_globs": ["src/**"],
                    "test_globs": ["tests/**"],
                    "known_exceptions": [],
                    "commands": {"check": ["python -m pytest"]},
                },
                "fill-test-gaps": {
                    "coverage": {
                        "command": "python -m coverage json",
                        "output": "coverage/coverage.json",
                        "format": "coverage.py",
                    },
                    "skip": [],
                    "commands": {"check": ["python -m pytest"]},
                },
                "review-conventions": {
                    "extensions": [".py"],
                    "exclusions": [],
                    "scopes": [
                        {"name": "source", "include": ["src/**"], "sections": ["Python"]},
                        {"name": "tests", "include": ["tests/**"], "sections": ["Tests"]},
                    ],
                    "commands": {"check": ["python -m ruff check ."]},
                },
                "update-docs": {
                    "groups": [
                        {
                            "name": "api",
                            "docs": [{"path": "docs/api.md", "sources": ["src/**"]}],
                        }
                    ],
                    "aliases": {"backend": ["api"]},
                    "skip": [],
                    "commands": {"check": ["python -m pytest docs"]},
                },
            },
        }

        cases: list[tuple[str, str, bool]] = [
            ("valid unified config", yaml.safe_dump(valid, sort_keys=False), True),
            ("duplicate keys", "version: 1\nversion: 1\nskills: {}\n", False),
        ]
        escaped = copy.deepcopy(valid)
        escaped["skills"]["fill-test-gaps"]["coverage"]["output"] = "../coverage.json"
        cases.append(("path escape", yaml.safe_dump(escaped, sort_keys=False), False))
        audit_overlap = copy.deepcopy(valid)
        audit_overlap["skills"]["audit-tests"]["test_globs"] = ["src/**"]
        cases.append(("audit overlap", yaml.safe_dump(audit_overlap, sort_keys=False), False))
        review_overlap = copy.deepcopy(valid)
        review_overlap["skills"]["review-conventions"]["scopes"][1]["include"] = ["src/**"]
        cases.append(("review overlap", yaml.safe_dump(review_overlap, sort_keys=False), False))
        chained_check = copy.deepcopy(valid)
        chained_check["skills"]["audit-tests"]["commands"]["check"] = ["pytest && ruff check ."]
        cases.append(("chained check command", yaml.safe_dump(chained_check, sort_keys=False), False))

        for name, text, expected in cases:
            validator = validate_text(repo, text)
            actual = not validator.errors
            checks.append(
                {
                    "name": name,
                    "expected_valid": expected,
                    "actual_valid": actual,
                    "passed": actual == expected,
                }
            )

    failures = [check["name"] for check in checks if not check["passed"]]
    validator = Validator(Path("/"))
    if failures:
        validator.errors.append(f"self-test failures: {', '.join(failures)}")
    output = report(
        validator,
        "<temporary>",
        "<self-test>",
        extra={"self_test": True, "checks": checks},
    )
    print(json.dumps(output, indent=2, sort_keys=True))
    return 0 if not failures else 1


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(
        description="Validate .claude/skills.yaml without executing configured commands."
    )
    result.add_argument(
        "config",
        nargs="?",
        help="config file (default: <repo>/.claude/skills.yaml)",
    )
    result.add_argument("--repo", help="repository path; required except with --self-test")
    result.add_argument(
        "--stdin",
        action="store_true",
        help="read proposed YAML from stdin and label it <stdin>",
    )
    result.add_argument(
        "--self-test",
        action="store_true",
        help="run deterministic internal checks without Git, network, or project commands",
    )
    return result


def main(argv: list[str] | None = None) -> int:
    args = parser().parse_args(argv)
    if args.self_test:
        if args.repo or args.config or args.stdin:
            print(json.dumps({"valid": False, "errors": ["--self-test cannot be combined with other inputs"]}))
            return 2
        return self_test()
    if not args.repo:
        print(json.dumps({"valid": False, "errors": ["--repo is required"]}))
        return 2
    if args.stdin and args.config:
        print(json.dumps({"valid": False, "errors": ["--stdin cannot be combined with config"]}))
        return 2

    repo, environment_error = resolve_git_root(args.repo)
    if repo is None:
        print(json.dumps({"valid": False, "repo": args.repo, "errors": [environment_error]}))
        return 2

    source = "<stdin>" if args.stdin else os.fspath(Path(args.config) if args.config else repo / ".claude" / "skills.yaml")
    if args.stdin:
        try:
            text = sys.stdin.buffer.read().decode("utf-8")
        except (OSError, UnicodeError) as exc:
            print(json.dumps({"valid": False, "repo": os.fspath(repo), "source": source, "errors": [f"cannot read stdin: {exc}"]}))
            return 2
    else:
        config = Path(source)
        if not config.is_absolute():
            config = repo / config
        expected_config = repo / ".claude" / "skills.yaml"
        try:
            lexical_config = config.absolute()
        except OSError as exc:
            print(json.dumps({"valid": False, "repo": os.fspath(repo), "source": source, "errors": [f"cannot normalize config path: {exc}"]}))
            return 2
        if lexical_config != expected_config:
            print(json.dumps({"valid": False, "repo": os.fspath(repo), "source": source, "errors": ["config path must be exactly <repo>/.claude/skills.yaml"]}))
            return 2
        try:
            resolved_config = config.resolve(strict=True)
        except (OSError, RuntimeError) as exc:
            print(json.dumps({"valid": False, "repo": os.fspath(repo), "source": source, "errors": [f"cannot resolve config: {exc}"]}))
            return 2
        if not resolved_config.is_relative_to(repo):
            print(json.dumps({"valid": False, "repo": os.fspath(repo), "source": source, "errors": ["config resolves outside the repository"]}))
            return 2
        if not resolved_config.is_file():
            print(json.dumps({"valid": False, "repo": os.fspath(repo), "source": source, "errors": ["config must be a file"]}))
            return 2
        source = os.fspath(config)
        try:
            text = resolved_config.read_text(encoding="utf-8")
        except (OSError, UnicodeError) as exc:
            print(json.dumps({"valid": False, "repo": os.fspath(repo), "source": source, "errors": [f"cannot read config as UTF-8: {exc}"]}))
            return 2

    validator = validate_text(repo, text)
    print(json.dumps(report(validator, os.fspath(repo), source), indent=2, sort_keys=True))
    return 0 if not validator.errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
