## Plan review

start-ticket hands every finished plan to `review-plan`, which has a model from a different vendor than the planner review it before the user sees it. The review is one round, and the planner settles every finding.

| Planner vendor | Reviewer | Command |
|---|---|---|
| {{FILL: one row for every vendor of a model that plans here, such as Anthropic or OpenAI}} | {{FILL: the reviewer model and its vendor, never the planner's vendor}} | {{FILL: the command from the reviewer guide, with <brief> where the brief's path goes}} |

- Time limit: {{FILL: minutes, at most 10}} minutes.
- Vendors that may receive this project's code and plans: {{FILL: the vendors, or "every reviewer vendor in the table"}}.
- The reviewer reads, searches and lists files in the worktree, and nothing else: no shell, edits, web access, MCP servers or skills.
