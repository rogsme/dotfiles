---
name: generate-conventions
description: >-
  Use when the user wants to create or update a CONVENTIONS.md file, document
  the project's coding standards, or establish a conventions reference for the
  team. Also use when the user says "generate conventions", "document our code
  style", "what are our coding patterns", or wants to onboard contributors
  with a standards doc. Works with any language or framework.
argument-hint: "[output-path]"
---

# Generate CONVENTIONS.md

Analyze the project codebase using parallel sub-agents, then synthesize a comprehensive CONVENTIONS.md that documents all observed conventions, patterns, and standards.

**Arguments:** `$ARGUMENTS` is optional. If provided, it is the output file path (default: `CONVENTIONS.md` in the project root).

**Output path:** If `$ARGUMENTS` is non-empty, use it as the output path. Otherwise, use `CONVENTIONS.md` in the project root.

---

## Phase 0: Detect Existing CONVENTIONS.md

Before starting analysis, check if the output path already exists:

1. Try to read the file at the output path.
2. If the file **exists**, switch to **update mode**:
   - Read the entire existing file and keep its contents available for Phase 2.
   - In Phase 2, merge new findings INTO the existing document rather than generating from scratch.
3. If the file **does not exist**, proceed in **create mode** (generate from scratch).

---

## Phase 1: Parallel Codebase Analysis

Launch ALL of the following Explore agents simultaneously. Each agent must return a structured report (not fix anything — this is read-only analysis). Run this analysis regardless of whether a CONVENTIONS.md already exists — the goal is to discover the current state of the codebase.

---

### Agent 1 — Project Structure & Architecture

Analyze the overall project structure and architecture:

- Run `ls` on the root directory and key subdirectories to map the full directory tree (2-3 levels deep)
- Identify the language(s) and framework(s) used (check `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `Gemfile`, `pom.xml`, `build.gradle`, etc.)
- Identify the package manager (npm, yarn, pnpm, uv, pip, cargo, go, bundler, maven, gradle, etc.)
- Map the directory layout and what each top-level directory is for
- Identify the architectural pattern (MVC, layered, hexagonal, microservices, monolith, etc.)
- Check for a `src/` directory, `lib/` directory, or flat structure
- Identify separation of concerns: where does routing, business logic, data access, validation live?
- Check for dependency injection patterns, middleware patterns, plugin systems
- Look for configuration files and how config is loaded (env vars, config files, etc.)
- Check for CI/CD configuration (`.github/workflows/`, `.gitlab-ci.yml`, `Jenkinsfile`, etc.)
- Identify the entry point(s) of the application

Return a structured report with sections: Language & Framework, Package Manager, Directory Layout, Architecture Pattern, Separation of Concerns, Configuration, Entry Points.

---

### Agent 2 — Code Style & Formatting

Analyze code style and formatting conventions across 10-15 representative source files (not tests):

- Identify the formatter/linter in use (check config files: `.eslintrc`, `ruff.toml`, `pyproject.toml [tool.ruff]`, `.prettierrc`, `rustfmt.toml`, `.editorconfig`, etc.)
- String quoting style (single vs double quotes)
- Indentation (tabs vs spaces, indent width)
- Line length limit
- Trailing commas in multi-line constructs (yes/no)
- Import ordering convention (check for isort, eslint-plugin-import, etc.)
- Import style (absolute vs relative, named vs default, wildcard)
- Semicolons (for JS/TS)
- Bracket style (same-line vs next-line for blocks)
- Function argument formatting (inline vs one-per-line threshold)
- Blank line conventions (between functions, classes, sections)
- File organization pattern (imports -> constants -> types -> implementation -> exports)

Return a structured report with: Formatter/Linter, String Style, Indentation, Line Length, Trailing Commas, Import Conventions, File Organization.

---

### Agent 3 — Naming Conventions

Analyze naming patterns across 10-15 representative source files:

- Class naming (PascalCase, camelCase, etc.)
- Function/method naming (snake_case, camelCase, etc.)
- Variable naming (snake_case, camelCase, etc.)
- Constant naming (UPPER_SNAKE_CASE, etc.)
- Private member naming (leading underscore, `#private`, etc.)
- File naming (snake_case, kebab-case, PascalCase, etc.)
- Directory naming conventions
- Interface/type naming (I-prefix, -able suffix, etc.)
- Enum naming and member naming
- Database/collection/table naming conventions (if applicable)
- API route/endpoint naming (plural nouns, kebab-case, etc.)
- Test file and test function naming patterns

Return a structured report with examples from the actual codebase for each convention.

---

### Agent 4 — Error Handling & Patterns

Analyze error handling and common code patterns across the codebase:

- How are errors/exceptions defined? (custom classes, error codes, error objects, inner classes, etc.)
- Where are errors defined? (co-located with services, separate error module, etc.)
- Error propagation pattern (throw/catch, Result types, error callbacks, middleware, etc.)
- How do errors flow between layers? (service -> route, etc.)
- Exception chaining or wrapping patterns
- Logging patterns (logger setup, log levels, structured logging, etc.)
- Validation patterns (where and how is input validated?)
- Authentication/authorization patterns
- Async patterns (async/await, promises, callbacks, goroutines, etc.)
- Singleton/factory/builder patterns in use
- Dependency injection approach
- How are external services/APIs called? (client classes, direct calls, etc.)

Return a structured report with code examples from the actual codebase.

---

### Agent 5 — Testing Conventions

Analyze the test suite:

- Test framework in use (pytest, jest, mocha, go test, rspec, junit, etc.)
- Test file location (mirrored structure, `__tests__/`, co-located, etc.)
- Test file naming pattern
- Test function/method naming pattern
- Test organization (classes, describe blocks, modules, etc.)
- Fixture/setup/teardown patterns
- Mocking approach (what library, mock at what level, etc.)
- How are async operations tested?
- Test data patterns (factories, fixtures, builders, hardcoded, etc.)
- Database testing approach (real DB, in-memory, mocked, etc.)
- HTTP/API testing approach (test client, supertest, etc.)
- Assertion style (assert, expect, should, etc.)
- Coverage configuration
- Parameterized/table-driven testing patterns
- Check `conftest.py`, `setup.py`, test config files for shared fixtures/configuration

Return a structured report with examples from actual test files.

---

### Agent 6 — Models, Schemas & Data Layer

Analyze data models and schemas:

- ORM/ODM in use (if any)
- Model definition patterns (base classes, mixins, decorators, etc.)
- Schema/DTO patterns (validation schemas, request/response types, etc.)
- Field definition style (explicit types, decorators, validators, etc.)
- Relationship definitions
- Migration approach (if applicable)
- Serialization/deserialization patterns
- Model vs schema separation (if applicable)
- Database configuration and connection patterns
- Any model naming conventions (singular/plural, suffixes, etc.)

Return a structured report with examples from actual model/schema files.

---

### Agent 7 — Documentation & Comments

Analyze documentation patterns across 10-15 representative files:

- Docstring/JSDoc/comment style (Google, NumPy, Sphinx, JSDoc, etc.)
- What gets documented (all functions? public only? classes? modules?)
- Docstring sections used (Args, Returns, Raises, Examples, etc.)
- Inline comment style and frequency
- README patterns
- API documentation approach (OpenAPI decorators, annotations, etc.)
- Type documentation (in docstrings vs annotations vs both)
- Any anti-patterns explicitly avoided (e.g., change-marker comments)

Return a structured report with examples from actual files.

---

## Phase 2: Synthesis

After ALL agents complete, 7 structured reports are available. Now synthesize them into CONVENTIONS.md. The approach depends on the mode determined in Phase 0.

### If UPDATE mode (existing CONVENTIONS.md found)

Both the existing file contents and the 7 agent reports are available. **Update** the existing document — do not replace it.

**Before making any changes**, present the user with a summary of proposed changes:

1. **Sections to add** — new sections not in the existing file
2. **Conventions to add** — new rules to add within existing sections
3. **Stale conventions to update** — existing rules where the codebase has clearly diverged (include the evidence: "doc says X, but Y was found in N files")
4. **Code examples to refresh** — examples referencing patterns/classes that no longer exist

Ask the user to confirm before proceeding. The user may approve all changes, reject some, or ask for modifications.

**After confirmation**, apply the approved changes following these rules:

1. **Preserve the existing structure.** Keep the same section ordering and headers from the existing file. Do not reorganize unless the existing structure is clearly broken.
2. **Preserve intentional content.** The existing file may contain hand-written conventions, editorial decisions, or nuances that the agents cannot infer from code alone. Do NOT remove or water down these. Treat existing content as authoritative unless the user explicitly approved the change.
3. **Add missing conventions.** If agents discovered patterns not covered in the existing file, add them in the most appropriate existing section — or create a new section if no existing section fits.
4. **Update stale conventions.** Only update conventions the user approved in the summary step. Only flag conventions as stale when the evidence is strong (consistent pattern across multiple files), not for one-off deviations.
5. **Update code examples.** If existing examples reference patterns, class names, or structures that no longer exist in the codebase, update them with current examples from the agent reports.
6. **Do NOT shrink the file.** The updated file should be at least as comprehensive as the original. It is fine to grow it with new findings.

Use the Edit tool to make targeted changes to the existing file rather than rewriting it entirely. If the changes are extensive enough that targeted edits would be unwieldy, a full rewrite is acceptable — but the output must preserve all intentional content from the original.

### If CREATE mode (no existing CONVENTIONS.md)

Generate from scratch using these rules:

1. **Be specific, not generic.** Every convention must reflect what was actually observed in the codebase. Include real code examples from the project where possible (anonymize sensitive data).
2. **Group logically.** Use clear sections with headers. Suggested structure:
   - Project Structure
   - Code Style & Formatting
   - Naming Conventions
   - Import Conventions
   - Type Annotations / Type Safety
   - Error Handling
   - Documentation & Comments
   - Models & Data Layer
   - API Design (if applicable)
   - Service Layer (if applicable)
   - Testing Conventions
   - Async Patterns (if applicable)
   - Logging
   - Environment & Configuration
   - AI Assistance Guidelines
3. **Include code examples.** For each major convention, include a short code example showing the correct pattern. Use the project's actual code style.
4. **Note the tools.** Mention the specific linter, formatter, test framework, package manager, etc. and their relevant configuration.
5. **Omit sections that don't apply.** If the project doesn't have models or an API layer, skip those sections.
6. **Keep it actionable.** Each convention should be a clear, enforceable rule — not a vague suggestion. Use imperative mood ("Use...", "Always...", "Never...").
7. **AI Assistance section.** Include a section with guidelines for AI coding assistants working with the codebase (understanding the architecture, generating code that fits, analyzing issues).

### Writing the File (CREATE mode only)

Write the synthesized CONVENTIONS.md to the determined output path. The file should:
- Start with a title: `# {Project Name} Conventions`
- Include a brief intro paragraph explaining the purpose
- Use markdown headers (##, ###) for sections
- Use code blocks with language tags for examples
- Use bullet points for rules
- Be comprehensive but not redundant with itself

### Commit (both modes)

After writing/updating the file, invoke the `commit` skill to stage and commit the changes. If no changes were made, do not commit.

### Final Report (both modes)

After writing/updating, report:
- The mode used (create vs update)
- The output path
- A summary of what was generated or changed (in update mode, list sections added/modified)
