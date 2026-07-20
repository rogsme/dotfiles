# Update Guidelines

## Keep

- commands whose exact form, order, or scope is not obvious from repository configuration
- recurring gotchas and constraints that prevent concrete failures
- conventions that intentionally differ from language or tool defaults
- non-obvious package boundaries, generated-source rules, and focused verification steps

## Remove Or Move

- dependency lists, directory tours, and facts trivially derived from code
- generic advice, historical notes, and one-off fixes
- duplicated or contradictory instructions
- long procedures better loaded on demand as a skill
- package-specific rules from unconditional root context

## Drafting Test

For every changed line, answer:

1. What repository evidence supports it?
2. What likely mistake or repeated discovery does it prevent?
3. Is this the narrowest correct scope?
4. Can it be stated more directly or deleted?

## Approval Boundary

Before editing, show exact diffs with file paths and evidence-based reasons. Apply only explicitly approved hunks. If the file changed after approval, preserve unrelated changes and request renewed approval when the approved hunk no longer applies cleanly or its meaning changes.

## Validation

- Re-read edited files and resolve imports from their actual locations.
- Confirm referenced paths and configuration keys exist.
- Recheck effective hierarchy for conflicts and unintended broad scope.
- Use safe checks only. Never deploy, publish, migrate, destroy resources, or touch production data just to validate instructions.
