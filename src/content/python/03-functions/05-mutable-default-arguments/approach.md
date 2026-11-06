1. Call each starter definition twice and watch the second call see the first call's data. Find the object that is created once and reused.
2. Pick the sentinel for each case: `None` where `None` has no other meaning, a private `object()` where it does.
3. Build fresh objects inside the body, so each call or instance owns its own container.
4. Decide what to do with containers the caller passes in: fill the caller's list when that is the contract (`add_tag`), copy it when the object should own its state (`Registry`, `request`).
5. Check the edge cases: an empty list passed on purpose, `None` passed explicitly, and a returned dict mutated by the caller.
