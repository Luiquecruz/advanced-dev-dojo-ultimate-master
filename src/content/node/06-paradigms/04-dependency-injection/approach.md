1. List what `SignupService` reaches for on its own: the repository, `randomUUID`, `new Date()` and `console`. Each one becomes a field of `SignupDependencies`.
2. Replace the self-created repository with a constructor that receives `deps`; the class now only knows interfaces.
3. Rewrite `signup` in the order a reviewer expects: normalize input, check the business rule (email taken), then perform side effects (save, send), then return. A failed rule leaves no trace.
4. Move every concrete choice into `createContainer`: defaults first, `...overrides` last so tests and other environments can replace any single piece.
5. Return the dependencies alongside the service so callers (and tests) can reach the same repository instance the service uses.
