---
name: grill-with-docs
description: "Grill the user relentlessly about a plan, design or idea until every decision is settled, sharpening the project's domain language and recording glossary terms and ADRs as decisions land. Use when the user wants to be grilled, wants a plan or design stress-tested, or asks to sharpen the project's terminology."
license: MIT
metadata:
  rogs-skills/contract: "1"
  opencode/slash: "true"
---

# Grill with docs

Interview the user relentlessly until you reach a shared understanding of the plan, and build the project's domain model while you do: challenge terms, stress-test them with scenarios, and write the glossary and the decisions down the moment they settle.

## 1. Find the domain docs

Before the first round, find where the glossary and the decisions live:

1. When `docs/agents/domain.md` exists, it names the glossary file, the layout (one context or several) and the ADR directories. Use those.
2. Otherwise use what the repository already has: `CONTEXT.md` or `GLOSSARY.md` at the root, or a `CONTEXT-MAP.md` or `GLOSSARY-MAP.md` that points at one glossary per context, plus `docs/adr/` and any context-level `docs/adr/` directories.
3. When nothing exists, create files lazily, only once there is something to write: a root `CONTEXT.md` when the first term is resolved, `docs/adr/` when the first ADR is needed. A repository with several contexts gets a root `CONTEXT-MAP.md` listing them.

Read the glossary and the ADRs for the area under discussion before the first round.

## 2. Grill in rounds

Map the conversation as a **design tree**: every decision branches into the decisions that hang off it.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled: the questions you can ask _now_ without guessing at answers you haven't heard yet. Ask the whole frontier in one round: number each question and give your recommended answer. Then wait for the user's answers before the next round.

Format a round like so:

```
**Q1. <question title>**: <question body, possibly several paragraphs, with the choices when there are any>

Recommended: <your recommended answer>

---

**Q2. <question title>**: <question body>

Recommended: <your recommended answer>
```

Word each question so "yes" accepts your recommended answer.

Each round the user answers reshapes the tree: settled decisions push the frontier outward and unblock the questions that depended on them. Recompute the frontier and ask the next round. A question whose answer depends on another question still open in this round belongs to a later round.

Finding _facts_ is your job, never the user's. When a frontier question needs a fact from the environment (code, files, tools), look it up yourself, or through a sub-agent when your harness has one. Don't block on it: a running lookup is an unsettled prerequisite, so only the questions downstream of it wait; ask the rest of the frontier now. The _decisions_ are the user's: put each one to them and wait.

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

The session is done when the frontier is empty: every branch of the design tree visited, nothing left silently assumed, every resolved term in the glossary and every qualifying decision recorded. Summarize the decisions and list the files you changed. Do not act on the plan until the user confirms you have reached a shared understanding.
