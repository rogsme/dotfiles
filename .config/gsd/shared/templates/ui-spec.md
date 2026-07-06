---
phase: {N}
slug: {phase-slug}
status: draft                # draft | approved
created: {YYYY-MM-DD}
---

# Phase {N} — UI Design Contract

> Visual and interaction contract for frontend phases. Implementation must follow it;
> gsd-ui-review audits against it.

## Layout

{Page/screen structure: regions, navigation placement, responsive breakpoints.
One short paragraph or ASCII sketch per screen this phase touches.}

## Components

| Component | Source | Notes |
|-----------|--------|-------|
| {component} | {library / custom} | {usage constraints} |

## Spacing Scale

<!-- Declared values must be multiples of 4. -->

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | icon gaps, inline padding |
| sm | 8px | compact element spacing |
| md | 16px | default element spacing |
| lg | 24px | section padding |
| xl | 32px | layout gaps |

Exceptions: {list any, or "none"}

## Color Tokens

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | {hex/token} | background, surfaces |
| Secondary (30%) | {hex/token} | cards, sidebar, nav |
| Accent (10%) | {hex/token} | {explicit element list — never "all interactive elements"} |
| Destructive | {hex/token} | destructive actions only |

## Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | {px} | {weight} | {ratio} |
| Label | {px} | {weight} | {ratio} |
| Heading | {px} | {weight} | {ratio} |
| Display | {px} | {weight} | {ratio} |

## Interaction States

| State | Treatment |
|-------|-----------|
| Empty | {heading + body copy + next step} |
| Loading | {skeleton / spinner policy} |
| Error | {problem + solution path copy} |
| Disabled | {visual treatment} |
| Destructive confirmation | {action name}: {confirmation copy} |

## Accessibility

- Contrast: {WCAG target, e.g. AA — 4.5:1 body text}
- Focus: {visible focus treatment}
- Keyboard: {all interactive elements reachable/operable}
- Semantics: {landmarks, labels, alt text policy}
