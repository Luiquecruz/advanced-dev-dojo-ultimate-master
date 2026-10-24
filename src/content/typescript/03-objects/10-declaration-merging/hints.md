Write `interface PluginRegistry { ... }` again below the first one, containing only the new member.
---
After merging, the compiler requires `featureFlags` in the object returned by `createRegistry`.
---
`isEnabled(flag) { return enabledFlags.includes(flag); }` is enough.
