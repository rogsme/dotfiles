# Git edge cases

Consult these branches when the main workflow reaches them. Preserve user content and stop
when a safe non-interactive staging or recovery procedure cannot be established.

## Index preservation

The index is an independent snapshot. For example, HEAD can contain A, the index B, and the
worktree A again. Resetting that entry loses staged B even though no worktree byte changes.
A staged new file deleted from disk has the same risk. `git diff HEAD` describes the worktree,
not all staged work. A displayed text diff is not a complete backup.

Before mutating the index:

1. Resolve its path with `git rev-parse --git-path index`. Preserve a private copy outside the
   repository, with restrictive directory and file permissions. If the index is split, retain
   its shared-index dependency too (`git rev-parse --shared-index-path`). Do not log contents.
2. Record HEAD and the original staged entries, including modes and blob IDs. A tree snapshot
   preserves content and modes, but not index flags or intent-to-add state; retain the index
   backup as well. Handle an absent index explicitly in an unborn repository.
3. Decide how omitted entries will remain recoverable and be restored after each commit.
   Ask when a staged-only version and the current worktree express competing intent.

Path-scoped `git reset HEAD -- <paths>` changes only the index, but replaces its prior contents.
Use literal pathspec handling and only after preservation. There is no HEAD in an unborn
repository. `git rm --cached` can refuse an entry whose staged content differs from the file
on disk; do not force removal as a substitute for preserving that content.

`GIT_INDEX_FILE` permits an alternate candidate index. It can isolate an atomic group from
excluded staging, but is not a complete solution: hooks use the candidate index, HEAD still
advances, and the original index must be reconciled against that new HEAD. Retaining the old
index unchanged can make committed changes appear as staged reversals. Restore only intended
pending entries, preserving excluded entries and their flags; inspect the result. If uncertain,
stop with the backup intact rather than copying an old index over current user or hook work.

## Partial staging

Prefer whole-file staging for a coherent change. For partial text staging, define the base as
the current candidate index and the target as the inspected desired version. An unstaged
`git diff -- <path>` is relative to that index; a HEAD-relative patch is suitable only when the
candidate entry actually matches HEAD. Staged-only versions require their preserved blobs.

Generate replayable patches with `--no-ext-diff --no-textconv --binary --full-index` and explicit
paths. Disable rename detection when a plain per-file patch is needed. Inspect patch headers,
file modes, context, and resulting contents when selecting or splitting hunks.

Use `git apply --cached --check --whitespace=warn <patch>`, then
`git apply --cached --whitespace=warn <patch>`, from the worktree root. The explicit whitespace
policy prevents `apply.whitespace=fix` from silently rewriting additions. Check that the index
has not changed between generation, checking, and application. Avoid `--3way`, `--reject`, or
fuzzy context adjustments as automatic fallbacks; they can leave conflicts or change meaning.

`--check` proves applicability only. An edited patch can stage content present in neither the
original index nor the worktree. Inspect the complete resulting candidate snapshot.

Ordinary `git diff` does not include genuinely untracked files, including those in an unborn
repository. Use an explicit, correctly named addition patch from an empty base, or stage the
whole file when coherent. Do not assume diffing an empty tree discovers untracked files.
Treat binary changes, symlinks, modes, renames, and submodule gitlinks as explicit units; do not
split their metadata as ordinary text hunks. Dirty submodule contents need a separate scoped
workflow, not just staging the superproject path.

## Operation state

Unmerged entries are only one signal. Resolve administrative paths with `git rev-parse
--git-path <name>` so linked worktrees work too. Check `MERGE_HEAD`, `rebase-merge`,
`rebase-apply` (including am state), and `sequencer`; check `CHERRY_PICK_HEAD` and `REVERT_HEAD`
through reference-aware queries. These state names follow current Git implementation; use
Git's status explanation as supporting evidence, not a parser for translated prose.

Unless explicitly asked to finish that operation, stop and identify it. An authorized
continuation belongs to the appropriate merge/rebase/am/cherry-pick/revert workflow; do not
assume a plain commit completes it correctly.

## Hook outcomes

Record HEAD and `git write-tree` before each attempt. Then inspect actual state:

- If HEAD did not advance and no commit was created, inspect hook side effects before correcting
  a safe in-scope cause. Retry only after a fresh review and while making progress.
- If HEAD advanced, inspect the new commit even if the command reported failure. Verify its
  parent and tree, and report any remaining error. Do not create a duplicate retry.
- If a hook staged changes or rewrote the message, compare the recorded result with the approved
  snapshot and requested message. Report unexpected differences and stop without automatic amend.
- If a hook changed only the worktree, preserve and classify those residual changes before
  continuing. Do not assume they were committed.

Pre-commit, prepare-commit-msg, and commit-msg can abort before creation. Post-commit runs after
creation and cannot undo it. Git can also update HEAD and then fail to write its new index.
Successful pre-commit hooks may alter the index, which Git rereads. No general guarantee rolls
back arbitrary hook side effects.

Respect configured identity, signing, and attribution policies. Missing credentials or required
human certification are blockers to report, not reasons to disable signing, invent identities,
or manufacture Signed-off-by, Reviewed-by, or Tested-by trailers.

## Filename and secret handling

Use `--literal-pathspecs` for enumerated filenames, including those containing `*`, `?`, brackets,
or leading pathspec magic. Combine it with `--` and safely quoted arguments. NUL-delimited
pathspec files solve record separation, not pathspec interpretation. Directory arguments can
still include unreviewed children; enumerate files explicitly. Parse both paths of rename records
according to the selected NUL-delimited Git format.

Screen already-staged paths before printing unrestricted cached diffs. Preserve excluded staging
privately and omit it from the candidate commit. Metadata screening and ignore rules cannot prove
that ordinary source files contain no credentials. Use existing required secret hooks and inspect
safe changes; redact suspected values from reports. If a credential was exposed, report the need
to revoke or rotate it. History cleanup requires separate authorization. Push protection does not
protect local commits or tool output.

## Sources

Reviewed 2026-10-03. Git guarantees below differ from project-specific recommendations.

- [git-add](https://git-scm.com/docs/git-add): independent staged versions, directory staging,
  and edited-patch caveats.
- [git-reset](https://git-scm.com/docs/git-reset) and [git-rm](https://git-scm.com/docs/git-rm):
  index-only changes and cached-removal constraints.
- [git](https://git-scm.com/docs/git), [git-status](https://git-scm.com/docs/git-status), and
  [git-rev-parse](https://git-scm.com/docs/git-rev-parse): literal paths, alternate indexes,
  NUL-delimited status, and worktree-aware administrative paths.
- [git-diff](https://git-scm.com/docs/git-diff), [git-apply](https://git-scm.com/docs/git-apply),
  and [git-write-tree](https://git-scm.com/docs/git-write-tree): diff baselines, replayability,
  cached application, whitespace policy, and tree snapshots.
- [git-commit](https://git-scm.com/docs/git-commit) and [githooks](https://git-scm.com/docs/githooks):
  commit paths bypass staged contents, hook phases, and message modification.
- [Git commit implementation](https://github.com/git/git/blob/c46c1e37724f0478939de636ab8ea5a89086d532/builtin/commit.c):
  index rereading after hooks and failures after repository updates.
- [Git status implementation](https://github.com/git/git/blob/c46c1e37724f0478939de636ab8ea5a89086d532/wt-status.c):
  operation-state detection, an implementation detail rather than a stable porcelain interface.
- [gitattributes](https://git-scm.com/docs/gitattributes): normalization and filters mean an
  index tree is not necessarily byte-identical to worktree files.
- [Git workflows](https://git-scm.com/docs/gitworkflows#_separate_changes) and
  [Git contribution guidance](https://git-scm.com/docs/SubmittingPatches#describe-changes):
  coherent logical commits and messages explaining motivation.
- [Tim Pope's message guidance](https://tbaggery.com/2008/04/19/a-note-about-git-commit-messages.html)
  and [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/): formatting fallbacks
  and optional structured-message rules.
- [npm lockfiles](https://docs.npmjs.com/cli/v11/configuring-npm/package-lock-json#description):
  generated files can be intended repository content.
- [GitHub sensitive-data guidance](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
  and [push protection](https://docs.github.com/en/code-security/concepts/secret-security/push-protection):
  secret prevention, credential rotation, and the limits of push-time protection.
- [Kernel AI policy](https://docs.kernel.org/process/coding-assistants.html): an example of
  repository-specific attribution and a prohibition on agent-generated human DCO sign-offs.
