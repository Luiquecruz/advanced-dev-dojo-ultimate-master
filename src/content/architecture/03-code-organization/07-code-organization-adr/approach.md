1. Choose the layers first, from the most specific (`app`) to the most generic (`shared`), and keep their order in an array: the array index becomes the depth used by every rule.
2. Derive `allowedImports` from that order: each layer may import only what comes after it, every non-shared layer reaches `shared`, and `shared` depends on nothing.
3. Place each briefing slice by reading its "Used by" column: a slice must be deeper than all of its consumers, because two slices of the same layer never import each other. Domain-free code sinks to `shared`, a business concept used by two features becomes an entity.
4. Give each slice exactly one public API path, `src/<layer>/<name>/index.js`, the only file other slices may import.
5. Write the context from the briefing pain (type folders, cross-imports, broken calendar, onboarding, the planned modular monolith) and the decision as one "We will..." sentence naming the layers, the downward rule and the public API.
6. Reject real alternatives (type folders, flat feature folders, a full hexagonal core) with the briefing fact that rules each out, list gains and costs including the migration, and accept the record.
