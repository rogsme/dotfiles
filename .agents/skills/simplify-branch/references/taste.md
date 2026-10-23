# Taste rules

What a taste pass looks for, beyond the repository's own rules, which win where the two disagree. Each rule names the code to keep; a candidate is the code that falls short of it.

## Size

- The smallest complete change: fewer lines, names and files, as long as the code reads as plainly.
- A helper earns its place with a second caller, or with a name that explains what its body does not. Inline one that only renames its body.
- An option, parameter or setting earns its place with a caller that sets it differently from the rest. On a public surface it stays, since callers outside the change may set it.
- An interface earns its place with a second implementation. A fake in a test counts only when the test cannot use the real thing.

## Fit

- Code reads like its neighbors: the same naming, error handling, comment density and file layout.
- Names use the glossary's words and say what a thing is, not how it is built.
- The standard library and the dependencies already present come before new code. A taste pass never adds a dependency.

## Comments

- A comment says why: the reason, the trap, the contract another program relies on. One that restates the code goes.
- A comment the change made stale gets fixed or goes.

## One place

- Each fact lives in one place, and the rest derives from it: reuse the helper, constant, type or fixture that exists.
- Duplication a project keeps on purpose stays: both sides of a trust boundary, a fixture that pins another project's text, helpers kept word for word so they can be checked together.

## Flow

- Return early, and keep the main path at the left margin.
- One plain statement beats a clever one: a reader follows it without running it in their head.
- A check the caller already guarantees, or a branch that cannot run, goes.

## Leftovers

- Dead code, unused imports, private names nothing uses, commented-out code, debug output, and TODOs the change resolved all go. An unused export stays: code outside the repository may use it.

## Efficiency

- Work whose result does not change inside a loop moves out of it.
- One call that answers every item beats one call per item, when the interface offers it.
- Clarity gives way to speed only for a measured need.

## Altitude

- Each piece lives in the layer that owns it: parsing at the edge, each decision in one place, input and output at the boundary.
- A function stays at one level of abstraction. One that mixes policy with mechanics splits along that line.

## Tests

- A test checks behavior at its seam, not the implementation behind it.
- Tests that prove the same thing merge into one, and a test's name says the behavior it proves.

## Text

- Messages, help text and documentation follow the project's writing rules. An error says what is wrong and, when it can, what to run next.
