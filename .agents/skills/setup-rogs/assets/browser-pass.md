<!-- rogs-skills config v1: browser-pass -->
# Browser pass

The last step before a pull request opens: drive the real application with the `playwright-cli` skill and watch the change work. Tests prove the code; this pass proves the product. Written by `/setup-rogs`; edit it freely.

## When it applies

- Required for every user-visible change: {{FILL: the paths and kinds of change that count, for example "any diff under frontend/, or a backend change that a page renders"}}.
- Any other change skips the pass, and the pull request's `## Screenshots` section says why in one line ("no user-visible surface: ...").

## Instances

| Surface or persona | Start command | URL |
|---|---|---|
| {{FILL: who uses the surface}} | {{FILL: the command that starts a signed-in instance}} | {{FILL: the default URL}} |

- Ports: {{FILL: how a worktree takes a free set of ports when several worktrees run passes at once, or "fixed ports: one pass at a time"}}.
- Start order: {{FILL: a shared backend to start first in the background, or "each instance starts on its own"}}. Stop every instance when the pass ends by sending SIGTERM to its own process id; a pattern-based kill also matches the shell that runs it and other worktrees' instances.
- A change that spans several personas runs on every instance it touches.
- Seed data: {{FILL: the seed command, or "none"}}. An empty list where data belongs means the seed is missing: run the seed, never work around it in the application.

## Procedure

1. Run the pass on the finalized, pushed head.
2. Walk every acceptance criterion with a visible result, on the page and persona the ticket names, against the real backend.
3. Run one negative check: for a gated surface, open it as a less privileged persona and confirm the refusal; otherwise confirm a neighboring behavior the change could have broken.
4. Treat a failure as a bug in the branch: fix it, rerun the checks, and walk the pass again from the top. Captures from an older head are discarded, never reused.

The pass is done when every visible criterion of every ticket has a capture, the negative check passed, and every instance started for it is stopped.

## Captures

- One PNG per visible criterion, and one WebM video per interactive flow (a form submit, a streamed answer, a multi-step action). Static changes need no video.
- Capture a settled surface: wait until its loading state is gone and the data the criterion names is on screen, then look at the PNG before keeping it.
- Checking a capture without image input: {{FILL: the command a model without image input uses to have each PNG described, or "every model used here reads images"}}. A capture that fails the check is fixed or taken again before it is kept.
- Record each flow as a scripted run with chapter markers, so the video reads as a walkthrough.
- Name files `<ticket id>-<criterion slug>.png` or `.webm` and write them to a temporary directory outside the repository. Captures are never committed.
- Captures show seed or test data only. {{FILL: data that must never appear in a capture, or "Never capture secrets or personal data."}}
- Upload every capture through the `attach` operations of the tracker (on the lead ticket) and the forge, titled with the criterion it proves. Link the forge's permanent URLs from the pull request and the handoff. When one side cannot attach, follow the gap rules in the configuration contract.
