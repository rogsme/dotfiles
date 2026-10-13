## Bundles

A bundle is a set of tickets that one pull request delivers together, because together they are one user-visible piece of functionality, typically a backend ticket and the frontend ticket that renders it. Tickets from unrelated areas never form a bundle, however convenient. A ticket with no `Delivers with:` line is a bundle of one, and everything below reduces to the single-ticket flow.

- Encoding: every member's description carries a `Delivers with: <ids>` line naming the other members, plus a relation to each: {{FILL: the relation this tracker uses, from the relate operation}}. When a pair already has a blocking relation, that relation counts; never add a second relation to the same pair. The line is what means "same pull request"; a relation without the line is only a loose link.
- Resolving: load a member, read its `Delivers with:` line, load each named ticket, and require its own line to name the same set. Stop and report when the lines disagree, or, on a tracker that records bundle relations, when a named ticket lacks the relation; never guess a bundle from similar titles.
- From a pull request: the lead is the head branch when it matches the ticket id format, otherwise the first id in the title. The riders are the other ids in the title and in the related-work list. That set must equal the bundle resolved from the tracker; a pull request never widens or narrows a bundle on its own.
- Lead and riders: {{FILL: the lead rule, for example "the backend ticket, unless another member already has a branch or pull request"}}. The branch, the worktree and the pull request belong to the lead.
- Transitions: every member makes each lifecycle transition at the same time. The full plan, handoff and completion comments go on the lead; each rider gets a short pointer comment naming the lead and the pull request.
- New work: a cross-stack outcome that has no tickets yet is written as one ticket. Bundles exist for outcomes that were already split.
