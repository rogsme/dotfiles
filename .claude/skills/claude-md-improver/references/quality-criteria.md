# Evidence-Based Quality Criteria

Assess instructions by observable effect, not numeric scores or letter grades.

## Finding Types

| Type | Evidence to require | Typical correction |
|---|---|---|
| Stale | Referenced path, command, tool, version, or architecture contradicts current repository state | Update or remove |
| Conflicting | Two effective sources direct incompatible behavior | Resolve at the narrowest appropriate scope |
| Missing | Repeated or consequential repository-specific knowledge is not safely derivable | Add one concise instruction |
| Over-broad | Guidance loads outside the files or tasks where it applies | Move to nested instructions or a path-scoped rule |
| Derivable | Content merely repeats manifests, directory names, help text, or obvious code | Remove; point to a canonical source only if needed |
| Unclear | Vague language has no observable action or completion condition | Rewrite as a concrete instruction |

## Evaluation Dimensions

### Effective Scope

- Identify where each source loads and whether it is unconditional, inherited, imported, or lazy.
- Check `paths` patterns against real repository paths.
- Distinguish organization, user, project, local, and nested instructions.
- Flag duplication even when the duplicate text appears in different mechanisms.

### Currency

- Verify paths and script names directly.
- Treat runtime behavior as unverified unless safely tested or confirmed by authoritative project evidence.
- Flag instructions that depend on removed tools, old workflows, or superseded conventions.

### Conciseness

- Every always-loaded line should prevent a likely mistake or repeated discovery.
- Imports improve organization, not token cost.
- Prefer deletion when the repository or tool already communicates the fact clearly.
- Move task procedures to skills and path-specific guidance to scoped rules when supported.

### Actionability

- Use concrete verbs, paths, commands, conditions, and expected outcomes.
- State important prohibitions precisely; do not add generic engineering advice.
- Keep rationale only when it prevents a plausible incorrect alternative.

### Consistency

- Compare all simultaneously effective sources, not each file in isolation.
- More specific text appearing later may influence behavior, but concatenation does not guarantee a deterministic override. Remove contradictions rather than relying on order.

## Safe Evidence Rules

- Static repository evidence is sufficient for path, script, and configuration claims.
- Safe checks may include listing commands, parsing configuration, or running non-mutating help/status commands.
- Do not execute deployment, publishing, migration, destructive, production-data, or infrastructure-apply workflows for documentation validation.
- Mark unresolved claims as unverified and state the safest way to verify them.
