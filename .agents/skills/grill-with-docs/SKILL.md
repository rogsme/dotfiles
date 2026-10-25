---
name: grill-with-docs
description: "Grill the user relentlessly about a plan or design while sharpening the project's domain language, recording glossary terms and ADRs as decisions land. Use when the user wants a plan grilled against the project's glossary and decisions, asks to sharpen the project's terminology, or wants the decisions written down as they settle."
license: MIT
metadata:
  rogs-skills/contract: "1"
---

# Grill with docs

Interview the user relentlessly until you reach a shared understanding of the plan, and build the project's domain model while you do: challenge terms, stress-test them with scenarios, and write the glossary and the decisions down the moment they settle.

## 1. Find the domain docs

Before the first round, find where the glossary and the decisions live:

1. When `docs/agents/domain.md` exists, it names the glossary file, the layout (one context or several) and the ADR directories. Use those.
2. Otherwise use what the repository already has: `GLOSSARY.md` or `CONTEXT.md` at the root, or a `GLOSSARY-MAP.md` or `CONTEXT-MAP.md` that points at one glossary per context, plus `docs/adr/` and any context-level `docs/adr/` directories.
3. When nothing exists, create files lazily, only once there is something to write: a root `GLOSSARY.md` when the first term is resolved, `docs/adr/` when the first ADR is needed. A repository with several contexts gets a root `GLOSSARY-MAP.md` listing them.

Read the glossary and the ADRs for the area under discussion before the first round.

## 2. Grill in rounds

Call the Skill tool with "grilling" and run its rounds. Work step 3 into every round: the domain questions join the frontier, and the glossary and ADR writes happen as answers land.

## 3. Sharpen the domain as you go

### Challenge against the glossary

When the user uses a term that conflicts with the glossary, call it out immediately: "Your glossary defines 'cancellation' as X, but you seem to mean Y. Which is it?"

### Sharpen fuzzy language

When the user uses a vague or overloaded term, propose a precise canonical one: "You're saying 'account': do you mean the Customer or the User? Those are different things."

### Discuss concrete scenarios

When domain relationships come up, stress-test them with specific scenarios. Invent scenarios that probe edge cases and force precision about the boundaries between concepts.

### Cross-reference with code

When the user states how something works, check whether the code agrees, and surface any contradiction: "Your code cancels entire Orders, but you just said partial cancellation is possible. Which is right?"

### Update the glossary inline

When a term is resolved, write it into the glossary right there, in the format in [GLOSSARY-FORMAT.md](GLOSSARY-FORMAT.md). Capture terms as they happen instead of batching them. The glossary holds definitions and nothing else: no implementation details, no spec, no scratch notes.

### Offer ADRs sparingly

Offer an ADR only when the decision is hard to reverse, surprising without context, and the result of a real trade-off. When any of the three is missing, skip it. Write qualifying ones in the format in [ADR-FORMAT.md](ADR-FORMAT.md).

## 4. Finish

The session is done when grilling's finish holds and every resolved term is in the glossary and every qualifying decision is recorded. Summarize the decisions and list the files you changed. Do not act on the plan until the user confirms you have reached a shared understanding.
