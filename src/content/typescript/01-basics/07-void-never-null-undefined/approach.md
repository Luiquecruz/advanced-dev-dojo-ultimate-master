1. Replace `users[0]` with `users.find(...)` comparing ids, and annotate the return type as `User | undefined` to document the empty case.
2. In `displayName`, read `user?.nickname`, fall back to `user?.name`, then to `"Guest"`, using `??` at each step.
3. In `retryCount`, read `settings?.retries` and fall back with `??` so `0` is preserved.
4. Add `: never` to `fail` so the compiler knows calls to it do not return.
