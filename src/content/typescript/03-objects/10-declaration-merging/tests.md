## pattern: PluginRegistry is declared twice

```regex
\binterface\s+PluginRegistry\b[\s\S]*\binterface\s+PluginRegistry\b
```

## type: The merged PluginRegistry has analytics and featureFlags

```ts
type _ = [
  Expect<Equal<keyof PluginRegistry, 'analytics' | 'featureFlags'>>,
  Expect<Equal<PluginRegistry['featureFlags']['isEnabled'], (flag: string) => boolean>>,
];
```

## runtime: isEnabled reports only the enabled flags

```js
const registry = createRegistry(['dark-mode', 'new-checkout']);
assert.equal(registry.featureFlags.isEnabled('dark-mode'), true);
assert.equal(registry.featureFlags.isEnabled('new-checkout'), true);
assert.equal(registry.featureFlags.isEnabled('beta'), false);
```

## runtime: analytics keeps working

```js
const registry = createRegistry([]);
registry.analytics.trackEvent('signup');
registry.analytics.trackEvent('purchase');
assert.deepEqual(registry.analytics.trackedEvents, ['signup', 'purchase']);
```
