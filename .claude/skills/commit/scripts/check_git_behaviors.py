#!/usr/bin/env python3
"""Check documented Git mechanics, not model behavior, in disposable repositories."""

import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile


ENV = os.environ.copy()
for key in tuple(ENV):
    if key.startswith("GIT_"):
        ENV.pop(key)
ENV.update(
    GIT_CONFIG_NOSYSTEM="1",
    GIT_CONFIG_GLOBAL=os.devnull,
    GIT_TERMINAL_PROMPT="0",
    GIT_AUTHOR_NAME="Commit skill fixture",
    GIT_AUTHOR_EMAIL="fixture@example.invalid",
    GIT_COMMITTER_NAME="Commit skill fixture",
    GIT_COMMITTER_EMAIL="fixture@example.invalid",
    LC_ALL="C",
)


def git(repo, *args, check=True, env=None):
    result = subprocess.run(
        ["git", "--no-pager", *args],
        cwd=repo,
        env=ENV | (env or {}),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=20,
    )
    if check and result.returncode:
        raise RuntimeError(f"git {args!r}: {result.stderr.decode(errors='replace')}")
    return result


def write(repo, name, text):
    path = repo / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)
    return path


def init(root, name, initial=True):
    repo = root / name
    repo.mkdir()
    git(repo, "init", "--initial-branch=main")
    if initial:
        write(repo, "tracked.txt", "A\n")
        git(repo, "--literal-pathspecs", "add", "--", "tracked.txt")
        git(repo, "commit", "-m", "Create baseline")
    return repo


def head(repo):
    return git(repo, "rev-parse", "HEAD").stdout.strip()


def hook(repo, name, body):
    path = write(repo, f".git/hooks/{name}", "#!/bin/sh\n" + body)
    path.chmod(0o700)


def staged_only(root):
    repo = init(root, "staged-only")
    write(repo, "tracked.txt", "B\n")
    git(repo, "add", "--", "tracked.txt")
    write(repo, "tracked.txt", "A\n")
    snapshot = root / "saved-index"
    shutil.copyfile(repo / ".git/index", snapshot)
    snapshot.chmod(0o600)
    git(repo, "reset", "HEAD", "--", "tracked.txt")
    assert not git(repo, "diff", "HEAD", "--", "tracked.txt").stdout
    assert git(repo, "show", ":tracked.txt").stdout == b"A\n"
    assert (
        git(repo, "show", ":tracked.txt", env={"GIT_INDEX_FILE": str(snapshot)}).stdout
        == b"B\n"
    )
    assert (repo / "tracked.txt").read_bytes() == b"A\n"


def literal_filenames(root):
    repo = init(root, "literal-filenames")
    names = ["fix*.txt", "fix-other.txt", "line\nbreak.txt"]
    for name in names:
        write(repo, name, "fixture\n")
    git(repo, "--literal-pathspecs", "add", "--", names[0], names[2])
    paths = git(repo, "diff", "--cached", "--name-only", "-z").stdout.split(b"\0")[:-1]
    assert set(paths) == {os.fsencode(names[0]), os.fsencode(names[2])}


def partial_patch(root):
    repo = init(root, "partial-patch")
    original = "".join(f"line {n}\n" for n in range(20))
    write(repo, "tracked.txt", original)
    git(repo, "add", "--", "tracked.txt")
    git(repo, "commit", "-m", "Create patch baseline")
    desired = original.replace("line 0\n", "first change \n").replace(
        "line 19\n", "last change\n"
    )
    write(repo, "tracked.txt", desired)
    git(repo, "config", "apply.whitespace", "fix")
    patch = git(
        repo,
        "diff",
        "--no-ext-diff",
        "--no-textconv",
        "--binary",
        "--full-index",
        "--no-renames",
        "--",
        "tracked.txt",
    ).stdout
    assert patch.count(b"\n@@ ") == 2
    second_hunk = patch.index(b"\n@@ ", patch.index(b"\n@@ ") + 1)
    patch_path = root / "partial.patch"
    patch_path.write_bytes(patch[:second_hunk] + b"\n")
    git(repo, "apply", "--cached", "--check", "--whitespace=warn", str(patch_path))
    git(repo, "apply", "--cached", "--whitespace=warn", str(patch_path))
    assert git(repo, "show", ":tracked.txt").stdout.decode() == original.replace(
        "line 0\n", "first change \n"
    )
    assert (repo / "tracked.txt").read_text() == desired


def initial_commit(root):
    repo = init(root, "initial-commit", initial=False)
    write(repo, "new.txt", "new file\n")
    empty = git(repo, "hash-object", "-t", "tree", "--stdin").stdout.decode().strip()
    assert not git(repo, "diff", empty, "--", "new.txt").stdout
    git(repo, "add", "--", "new.txt")
    tree = git(repo, "write-tree").stdout.strip()
    git(repo, "commit", "-m", "Create initial commit")
    assert git(repo, "rev-parse", "HEAD^{tree}").stdout.strip() == tree
    assert len(git(repo, "rev-list", "--parents", "-1", "HEAD").stdout.split()) == 1


def hook_outcomes(root):
    repo = init(root, "hook-outcomes")
    write(repo, "tracked.txt", "B\n")
    git(repo, "add", "--", "tracked.txt")
    before = head(repo)
    hook(repo, "pre-commit", "exit 1\n")
    assert git(repo, "commit", "-m", "Rejected attempt", check=False).returncode != 0
    assert head(repo) == before
    hook(
        repo,
        "pre-commit",
        "printf 'hook change\\n' >> tracked.txt\ngit add -- tracked.txt\n",
    )
    hook(repo, "post-commit", "exit 1\n")
    approved = git(repo, "write-tree").stdout.strip()
    git(repo, "commit", "-m", "Hook-modified commit")
    assert head(repo) != before
    assert git(repo, "rev-parse", "HEAD^{tree}").stdout.strip() != approved
    assert git(repo, "show", "HEAD:tracked.txt").stdout == b"B\nhook change\n"
    assert git(repo, "rev-list", "--count", "HEAD").stdout.strip() == b"2"


def path_commit_bypasses_index(root):
    repo = init(root, "commit-paths")
    write(repo, "tracked.txt", "B\n")
    git(repo, "add", "--", "tracked.txt")
    write(repo, "tracked.txt", "C\n")
    git(repo, "commit", "-m", "Demonstrate path semantics", "--", "tracked.txt")
    assert git(repo, "show", "HEAD:tracked.txt").stdout == b"C\n"


def excluded_staging(root):
    repo = init(root, "excluded-staging")
    write(repo, ".env", "DUMMY_VALUE=fixture-only\n")
    git(repo, "add", "--", ".env")
    original_blob = git(repo, "rev-parse", ":.env").stdout.strip()
    candidate = root / "candidate-index"
    env = {"GIT_INDEX_FILE": str(candidate)}
    git(repo, "read-tree", "HEAD", env=env)
    write(repo, "tracked.txt", "approved change\n")
    git(repo, "add", "--", "tracked.txt", env=env)
    git(repo, "commit", "-m", "Commit approved file", env=env)
    assert git(repo, "ls-tree", "HEAD", "--", ".env").stdout == b""
    # Reconcile the included entry; retain the excluded entry in the original index.
    git(repo, "reset", "HEAD", "--", "tracked.txt")
    assert git(repo, "rev-parse", ":.env").stdout.strip() == original_blob
    assert git(repo, "diff", "--cached", "--name-only").stdout.strip() == b".env"


def paused_linked_rebase(root):
    repo = init(root, "linked-main")
    linked = root / "linked-worktree"
    git(repo, "worktree", "add", "-b", "topic", str(linked))
    write(linked, "tracked.txt", "topic change\n")
    git(linked, "add", "--", "tracked.txt")
    git(linked, "commit", "-m", "Change topic")
    write(repo, "tracked.txt", "main change\n")
    git(repo, "add", "--", "tracked.txt")
    git(repo, "commit", "-m", "Change main")
    assert git(linked, "rebase", "main", check=False).returncode != 0
    write(linked, "tracked.txt", "resolved change\n")
    git(linked, "add", "--", "tracked.txt")
    assert (linked / ".git").is_file()
    assert not git(linked, "ls-files", "--unmerged").stdout
    state = Path(
        git(linked, "rev-parse", "--git-path", "rebase-merge").stdout.decode().strip()
    )
    if not state.is_absolute():
        state = linked / state
    assert state.is_dir()


def main():
    if not shutil.which("git"):
        raise SystemExit("Git is required")
    eval_path = Path(__file__).resolve().parents[1] / "evals/evals.json"
    evals = json.loads(eval_path.read_text())
    assert evals["skill_name"] == "commit" and len(evals["evals"]) == 9
    tests = [
        staged_only,
        literal_filenames,
        partial_patch,
        initial_commit,
        hook_outcomes,
        path_commit_bypasses_index,
        excluded_staging,
        paused_linked_rebase,
    ]
    with tempfile.TemporaryDirectory(
        prefix="commit-skill-check-", dir="/tmp/opencode"
    ) as tmp:
        root = Path(tmp)
        root.chmod(0o700)
        for test in tests:
            test(root)
            print(f"PASS {test.__name__}")
    print(
        f"{len(tests)} Git mechanics checks passed; agent eval prompts validated, not executed."
    )


if __name__ == "__main__":
    main()
