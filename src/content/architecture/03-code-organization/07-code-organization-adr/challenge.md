Write the code organization ADR for **Pawprint**, a veterinary clinic SaaS.

## Briefing

- Six developers in two squads: Scheduling and Billing.
- `src/` is organized by type: `components/` (140 files), `hooks/`, `services/`, `utils/`. Any file imports any other.
- Last quarter, a change to invoice formatting broke the appointment calendar twice. Onboarding takes three weeks because nobody knows where a feature lives.
- Next year the team plans a modular monolith, so the boundaries must be checkable in CI.

The code splits into these slices:

| Slice | What it is | Used by |
| --- | --- | --- |
| `appointments` | booking and rescheduling visits | nothing (composed by routes) |
| `invoices` | creating and paying invoices | nothing (composed by routes) |
| `pet` | the pet record: name, species, owner | `appointments`, `invoices` |
| `ui` | buttons, date picker, modal, no business knowledge | `appointments`, `invoices`, `pet` |

## Task

In `adr.js`, export two constants.

**`adr`**, the record:

- `id`: a positive integer.
- `title`: at least 10 characters.
- `status`: `'accepted'`.
- `layer`: `'code-organization'`.
- `context`: at least 80 characters.
- `decision`: at least 40 characters, starts with `We will` and mentions the `public API`.
- `alternatives`: at least two `{ option, reason }` objects with distinct `option` texts (at least 3 characters) and a `reason` of at least 20 characters explaining why it was rejected.
- `consequences`: `{ positive: [...], negative: [...] }`, each with at least one item of at least 15 characters.

**`structure`**, the enforceable part:

- `layers`: layer names from highest to lowest, at least three, no duplicates, starting with `'app'` and ending with `'shared'`.
- `allowedImports`: an object with one key per layer (and no other keys) listing the layers it may import. A layer may only list layers **strictly below** it, every layer except `shared` lists `'shared'`, and `shared` lists nothing.
- `slices`: exactly one `{ name, layer, publicApi }` per briefing slice. `layer` is one of `layers` but not `'app'`, and `publicApi` is the slice index file: `src/<layer>/<name>/index.js` (`.jsx`, `.ts` and `.tsx` also accepted).

Coherence with the briefing: a slice must sit in a layer **strictly below** every slice that uses it, because slices of the same layer never import each other.

The tests check structure and coherence, not your wording.
