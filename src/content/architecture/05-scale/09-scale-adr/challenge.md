Write the scale ADR for **Tidepool Travel**, a trip booking product.

## Briefing

- 18 engineers in **3 product teams**: `discovery` (finding trips), `checkout` (booking and paying) and `accounts` (profile and loyalty).
- One repository and one React 19 application, released through a shared **weekly release train** every Tuesday. Twice last quarter an account bug held back the whole train, including an urgent booking fix.
- About 85% of feature changes stay inside one domain.
- All teams use React 19 and the same design system. No domain needs another framework version or a separate lifecycle.
- The code has four domains: `search`, `booking`, `payments`, `account`.

## Task

In `adr.js`, export two constants.

**`adr`**, the record:

- `id`: a positive integer.
- `title`: at least 10 characters.
- `status`: `'accepted'`.
- `layer`: `'scale'`.
- `context`: at least 80 characters.
- `decision`: at least 40 characters, starts with `We will` and names the chosen topology in words: `monolith`, `modular monolith`, `monorepo` or `micro-frontends` (`micro frontends` also accepted).
- `alternatives`: at least two `{ option, reason }` objects with distinct `option` texts (at least 3 characters) and a `reason` of at least 20 characters explaining why it was rejected.
- `consequences`: `{ positive: [...], negative: [...] }`, each with at least one item of at least 15 characters.

**`plan`**, the enforceable part:

- `topology`: one of `'monolith'`, `'modular-monolith'`, `'monorepo'`, `'micro-frontends'`.
- `modules`: exactly one `{ name, owner }` per briefing domain, where `owner` is one of the three teams and every team owns at least one module.
- `revisitWhen`: at least two distinct triggers (at least 20 characters each) that would make the team reconsider the decision.

Micro-frontends must be addressed with the briefing numbers:

- if `topology` is not `'micro-frontends'`, one alternative whose `option` mentions micro-frontends must give a `reason` that cites the **team count** (`3` or `three`) and the **deploy cadence** (`week` or `release train`);
- if `topology` is `'micro-frontends'`, the `context` must cite both instead.

The tests check structure and coherence, not your wording.
