The core `PluginRegistry` interface only knows about `analytics`. A feature-flag plugin must extend it
**without editing the original declaration**.

1. Add a **second** `interface PluginRegistry` declaration with
   `featureFlags: { isEnabled(flag: string): boolean }`.
2. Complete `createRegistry(enabledFlags: string[]): PluginRegistry` so that
   `featureFlags.isEnabled(flag)` returns `true` only for flags listed in `enabledFlags`.

```ts
const registry = createRegistry(['dark-mode']);
registry.featureFlags.isEnabled('dark-mode'); // true
registry.featureFlags.isEnabled('beta');      // false
registry.analytics.trackEvent('signup');
registry.analytics.trackedEvents;             // ['signup']
```
