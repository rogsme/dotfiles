# Open or reuse the pull request

The create-pr skill publishes; this file holds what the lifecycle adds around it. Publish at most once, verify every field, and repair a pull request in place instead of opening a second one.

## Sync gate

Run this right before every push: before the handover below, and before each push in step 8 of the skill. The gate passes when `HEAD` contains the freshly fetched base and any copy of the branch already on the remote, so the pull request is ready for review the moment it opens.

1. Fetch `<remote>`. Record the SHA of `<remote>/<base>`, and of `<remote>/<branch>` when the remote has the branch.
2. When `HEAD` does not contain `<remote>/<base>` (the base is an ancestor of `HEAD`, or every change it made since their merge base is under the generated paths `## CI gate` names), merge it and rerun the complete verification as step 5 of the skill describes. Keep or retake the browser-pass captures as `browser-pass.md` `## Procedure` allows. Then fetch again and repeat until the base holds still; `## CI gate` names the automation that moves it.
3. When `<remote>/<branch>` exists and is not an ancestor of `HEAD`, the remote branch holds commits this checkout lacks: stop with `Status: BLOCKED`, naming both SHAs. Never force-push.

## Before the handover

1. Pass the sync gate.
2. Run `find-pr` for the exact head repository, head branch and base, so you know whether this run creates the pull request or refreshes an existing one.

## The body

- Read the body format from the base branch on the remote, not from the worktree: the template `## Pull requests` names, or `docs/agents/pull-request.md` without its marker line.
- Keep the template's headings, order and checklists. Replace every prompt with a factual answer. Check a box only with evidence for exactly what it asserts, and leave human certifications such as approvals or sign-offs for a human.
- Add each required heading `## Pull requests` lists that the template lacks.
- Reference tickets plainly. Never use closing keywords: only `finish-ticket` completes tickets.
- Write the finished body to a private temporary file outside the repository with a quoted heredoc, so backticks, dollar signs and quotes reach the forge unchanged. Delete only temporary files you created, after the read-back.

## The handover

Call the Skill tool with "create-pr" and state the pull request exactly:

- the host, repository, remote and base from `## Forge`, and the current branch at the recorded `HEAD` as the head;
- the title: every ticket id first, lead first, then the title, in the form `## Pull requests` gives;
- the finished body file, published as given;
- not a draft, unless the user asked for one;
- the assignee `## Pull requests` names, or nobody for `Assignee: none`;
- the verification already run at `HEAD`: each command, its result and the SHA;
- when `find-pr` found a pull request, refresh its body instead of creating one;
- the constraints: no closing keywords, no other branch, base, label or reviewer, and no commits.

## After the create-pr skill reports

1. `read-pr` and verify the destination, the head repository, branch and SHA (equal to `HEAD`), the base, the title, the body, the draft state and the assignees.
2. When the create-pr skill reports a blocker (authentication, an ineligible assignee, a suspected secret, a push that did not land), stop with `Status: BLOCKED`, its reason and the exact partial state.
3. When the pull request exists but a field is wrong, repair that same pull request with `edit-pr` or `assign` and read it back again. When the outcome cannot be determined, stop with the exact partial state instead of retrying blindly.
