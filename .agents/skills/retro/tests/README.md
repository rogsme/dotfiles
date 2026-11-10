# Session reader verification

Tests use invented transcripts, a stand-in `opencode` and disposable git repositories outside this checkout. They read no real session and need only Node.js and git. They clear `GIT_` variables before calling git, so they also pass inside a git hook.

From the repository root:

```sh
node --test skills/engineering/retro/tests/*.test.mjs
```

The tests run `scripts/sessions.mjs` as a command: which sessions count for a worktree, the order they come in, what a digest keeps and drops for each harness (including a shell call OpenCode marks completed that exited nonzero), the warnings for a harness that fails or a format it no longer recognizes, the permissions on the digests, and a run through a symlink to the skill folder, the layout a symlinked install creates.

They cannot notice a harness changing its storage. Run the script against a real worktree after upgrading one: the session count should match what the harness shows, with no `Warning:` lines.
