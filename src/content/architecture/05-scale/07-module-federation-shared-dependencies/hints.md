Write `satisfies` as a series of early returns: `*`, then `>=`, then the exact version (no prefix), and finally the `^`/`~` ranges. Both `^` and `~` start with the same check, `compareVersions(version, base) >= 0`; they only differ in which leading numbers must stay equal.
---
For a module, first build a `Map` from version to provider, adding a version only when it is not there yet (that keeps the first container). Sorting its keys with `compareVersions(second, first)` gives the candidates highest first, so "the highest accepted version" is just `candidates.find(...)`.
---
Fill `consumers` in one loop over the declarations. Singleton: everyone gets `candidates[0]`, and a rejected range pushes the same object into `strictVersion ? errors : warnings`. Not a singleton: `candidates.find((version) => accepts(config, version)) ?? config.version`. Then derive `loaded` from `new Set(Object.values(consumers))`, sorted highest first.
