1. Model the registry as a type: `Services` maps each key to the type its factory returns.
2. Write `Resolver`, `Factory` and `NewKey` so a factory sees only the existing map and a duplicate key becomes `never`.
3. Separate the untyped storage (a private map of registrations with `unknown` values) from the typed public API.
4. Make `register` immutable: copy the map, add the new registration and return a new container typed with the extended map.
5. Build services lazily: the factory runs on the first `resolve`; cache the result for singletons and skip the cache for transients.
6. Keep runtime checks for duplicate and unknown keys with the exact messages from the challenge.
7. Remove the casts from `createContainer` and confirm the negative type tests fail to compile.
