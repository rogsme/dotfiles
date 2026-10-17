# Reviewer guide: OpenCode

Runs any model OpenCode reaches as the plan reviewer through `opencode run`, under a read-only agent, for plans that a model from another vendor writes, such as an OpenAI model reviewing a Claude model's plans.

## Setup notes

`opencode run` takes no permission flags, and the default agent can usually edit files and run shell commands, so the read-only limits live in an agent named `plan-review`. setup-rogs never edits harness configuration: give the user this file to save as `~/.config/opencode/agents/plan-review.md`.

```markdown
---
description: Read-only plan reviewer that review-plan runs through opencode run.
mode: primary
steps: 40
permissions:
  - action: "*"
    resource: "*"
    effect: deny
  - action: read
    resource: "*"
    effect: allow
  - action: read
    resource: "*.env"
    effect: deny
  - action: read
    resource: "*.env.*"
    effect: deny
  - action: glob
    resource: "*"
    effect: allow
  - action: grep
    resource: "*"
    effect: allow
---

You review implementation plans that another model wrote. You can read, search and list files in this repository, and nothing else. The attached brief says what to check and how to reply.
```

The first rule denies everything: shell, edits, the web, files outside the working directory, MCP servers, skills and subagents. The next rules allow reads, globs and searches again, except for environment files. The last matching rule wins, so the `.env` denials stay after the read rule. Searches are the gap: a `grep` rule matches the search pattern rather than the file, so a search can still return lines from an environment file the repository does not ignore. Searches skip what `.gitignore` ignores, which is why the check below requires every environment file to be ignored.

## Command

```
opencode run --agent plan-review -m <provider/model#variant> --title "Plan review" -f <brief> "Review the plan in the attached brief and reply in the format it sets." < /dev/null
```

- `-m` picks the reviewer model, such as `openai/gpt-6-astra#xhigh`. It is required: naming a primary agent keeps the session's default model, so a `model` in the agent file does not choose the reviewer.
- `< /dev/null` closes stdin, so the run never waits on input.

## Check

- `opencode debug agents` lists `plan-review` as a `primary` agent whose own rules start with `*` denied, then allow only `read`, `glob` and `grep`, with the `.env` denials after the read rule. When the agent is missing or allows more, give the user the setup notes and keep the feature off.
- `git ls-files --cached --others --exclude-standard` lists no environment file that holds secrets (a committed `.env.example` is fine). When it lists one, ask the user to ignore it, and keep the feature off until they do.
