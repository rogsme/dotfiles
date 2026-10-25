---
name: grilling
description: "Grill the user relentlessly about a plan, decision or idea, in rounds of questions with recommended answers, until every decision is settled. Use when the user wants to be grilled or wants their thinking stress-tested, or when another skill runs a grilling."
license: MIT
metadata:
  rogs-skills/contract: "1"
---

# Grilling

Interview the user relentlessly until you reach a shared understanding. Map the conversation as a **design tree**: every decision branches into the decisions that hang off it.

## Rounds

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

## Facts and decisions

Finding _facts_ is your job, never the user's. When a frontier question needs a fact from the environment (code, files, tools), look it up yourself, or through a sub-agent when your harness has one. Don't block on it: a running lookup is an unsettled prerequisite, so only the questions downstream of it wait; ask the rest of the frontier now. The _decisions_ are the user's: put each one to them and wait.

## Finish

The session is done when the frontier is empty: every branch of the design tree visited, nothing left silently assumed. Summarize the decisions. Do not act on them until the user confirms you have reached a shared understanding.
