Start with `structure.layers`. The Feature-Sliced Design order from lesson 03 works well: `app`, `pages`, `features`, `entities`, `shared`. You can drop or add layers as long as `app` is first and `shared` is last.
---
`allowedImports` follows directly from the order: each layer lists every layer after it in the array, and `shared` lists nothing. `layers.slice(index + 1)` gives you that list if you want to build it instead of typing it.
---
Place the slices from the "Used by" column, bottom up: `ui` has no business knowledge and is used by everything, so it goes to `shared`; `pet` is used by two features, so it cannot be a feature itself; `appointments` and `invoices` are user-facing capabilities.
---
For the ADR, the context is the pain in numbers (140 components, two breakages, three weeks of onboarding, modular monolith next year). The decision names the layers, "import only downward" and "only through the public API". Reject "keep folders by type" and "feature folders without layers" with the facts that rule them out, and list the migration cost as a negative consequence.
