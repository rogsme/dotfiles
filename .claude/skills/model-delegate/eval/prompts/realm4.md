# Task: structured incident record

Below is a raw Slack message about a production incident. Convert it into a
single JSON object following the schema EXACTLY.

## Raw message

> hey so prod went down again... started around 3:47pm eastern on July 3rd 2026,
> the payments-api was throwing 500s, on-call was Maria, we rolled back the bad
> deploy at 4:20pm eastern and things recovered by 4:35pm. probably like 12% of
> checkout traffic affected. related services: Payments API, Checkout Web.
> this was pretty bad but not our worst.

## Schema (keys MUST appear in exactly this order)

1. `id` — string, `"INC-"` + start date as `YYYYMMDD` in UTC.
2. `title` — string, at most 60 characters, human-readable one-liner.
3. `severity` — exactly one of `"sev1"`, `"sev2"`, `"sev3"`. Rule: impact >= 25%
   of traffic → sev1; 5% to <25% → sev2; below 5% → sev3.
4. `started_at` — ISO 8601 UTC with `Z` suffix, e.g. `"2026-01-01T00:00:00Z"`.
   Note: the message uses US Eastern time; convert to UTC.
5. `resolved_at` — same format; resolution is when service RECOVERED, not when
   the rollback was initiated.
6. `duration_minutes` — integer, resolved_at minus started_at.
7. `impact_pct` — number (no % sign).
8. `services` — array of strings, lowercase kebab-case, sorted alphabetically.
9. `oncall` — string, first name only.
10. `summary` — string, at most 80 characters, must mention the rollback.

## Output rules

- Output ONLY the raw JSON object. No markdown fences, no prose before or
  after, no comments.
