<!-- rogs-skills:begin config v1 -->
## Ticket lifecycle

Tickets move through six skills that hand off through status lines. None of them calls another; a person starts each stage. Their configuration lives in `docs/agents/`: `issue-tracker.md` ({{FILL: tracker and project in a few words}}), `forge.md` ({{FILL: forge and repository in a few words}}), `workflow.md` (verification, worktrees, and the features that are on: {{FILL: the features that are on, or "none"}}) and `domain.md`.

```
create-ticket       audit the code, then draft and create tickets
     |   the user creates a worktree: branch = directory name = lead ticket id
start-ticket        read-only investigation and plan        Status: AWAITING_APPROVAL
     |   the user approves the plan
work-ticket         implement, verify, pull request, exact-head CI, handoff
                                                            Status: READY_FOR_REVIEW
     |   a fresh session, never the implementer
review-pr           findings pinned to the exact head
                                    Verdict: CHANGES_REQUESTED | READY_FOR_HUMAN
     |   when changes were requested or the base moved
address-pr-review   verify, fix or push back, reply; at most two rounds
                                                            Status: READY_FOR_REVIEW
     |   the user runs the human verification steps
finish-ticket       merge, verify, complete the tickets     Status: DONE
```

- The implementer never reviews its own change, the fixer never resolves review threads, the reviewer never writes to the tracker, and only `finish-ticket` merges.
- Every claim (CI is green, reviewed, verified) names the exact head SHA, and that head contains the current base.
- After a plan is approved, "go" or "do it" means `work-ticket`, never a generic implementation flow.
- When plan presentation is on, `present-plan` shows the settled plan after optional adversarial review. Browser feedback and ending the session never approve it; explicit approval stays in this conversation and the user starts `work-ticket` separately.
- Run `/setup-rogs` to change this configuration, or ask it to check the setup for drift.
<!-- rogs-skills:end -->
