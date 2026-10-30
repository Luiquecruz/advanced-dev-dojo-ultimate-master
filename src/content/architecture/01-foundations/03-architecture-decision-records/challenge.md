Build a tiny, immutable ADR log in `adr.js`. All functions are named exports and **never mutate their arguments**.

- `createAdr({ id, title, context, decision, consequences })` (already written): returns `{ id, title, status: 'proposed', context, decision, consequences, supersedes: null, supersededBy: null }` and throws when a text field is empty.
- `accept(adr)`: returns a **new** record with `status: 'accepted'`. Throws an `Error` whose message contains `Cannot accept` when the ADR is not `'proposed'`.
- `supersede(log, oldId, newAdr)`: `log` is an array of ADRs and `newAdr` is a proposed ADR. Returns a **new array** where:
  - the ADR with `oldId` has `status: 'superseded'` and `supersededBy: newAdr.id`,
  - `newAdr` is appended with `status: 'accepted'` and `supersedes: oldId`,
  - every other ADR is unchanged.

  Throws an `Error` containing `not found` when no ADR has `oldId`, and an `Error` containing `Cannot supersede` when that ADR is not `'accepted'`. The original `log` array and its records must stay untouched.
- `toMarkdown(adr)`: returns the Nygard format. Ignoring blank lines, the lines are, in order:
  1. `# <id>. <title>`
  2. `## Status`, then the status line: `Proposed`, `Accepted` or `Superseded by ADR <supersededBy>`
  3. `## Context`, then the context
  4. `## Decision`, then the decision
  5. `## Consequences`, then the consequences
