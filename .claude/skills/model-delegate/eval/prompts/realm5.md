# Task: write a PR description

You are opening a pull request. Below are the raw materials: a diffstat, commit
messages, and the developer's messy scratch notes. Write the PR description.

## Diffstat

```
 src/auth/session.ts        | 74 ++++++++++++++++++++++-----------
 src/auth/refresh.ts        | 41 ++++++++++++++++++ (new file)
 src/api/middleware.ts      | 18 +++++---
 src/config.ts              |  6 ++-
 tests/auth/refresh.test.ts | 92 ++++++++++++++++++++++++++++++++++ (new file)
```

## Commit messages

- `fix: stop reading expired sessions from cache`
- `feat: sliding session refresh with 5m grace window`
- `chore: bump session TTL config default 24h -> 12h`

## Scratch notes

- users were getting randomly logged out mid-session, turned out the cache
  returned sessions past their TTL and middleware treated any cache hit as valid
- new refresh.ts rotates the token if it's in the last 20% of its lifetime,
  grace window of 5 min where old+new both accepted (mobile clients retry with
  stale token)
- had to change middleware to check expiry explicitly, tiny perf cost (~1ms,
  one extra Date.now compare)
- TTL default halved to 12h since refresh makes long TTLs pointless
- TODO not in this PR: rate limiting the refresh endpoint — follow-up ticket
  AUTH-482
- tests: full coverage on refresh.ts, the session.ts change is covered
  indirectly, middleware change has NO dedicated test yet (existing suite
  passes)

## Requirements

- At most 150 words, markdown allowed.
- A reviewer who reads only your description must understand what changed, why,
  the risk areas, and what is deliberately out of scope.
- Do not invent anything not in the materials.
