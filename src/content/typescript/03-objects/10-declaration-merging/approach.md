1. Declare the second `interface PluginRegistry` with the `featureFlags` member.
2. Add `featureFlags: { isEnabled(flag) { ... } }` to the object returned by `createRegistry`.
3. Use `enabledFlags.includes(flag)` to decide the result.
