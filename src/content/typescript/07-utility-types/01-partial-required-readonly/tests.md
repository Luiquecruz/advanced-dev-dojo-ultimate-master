## type: DEFAULT_SETTINGS is complete and read-only

```ts
const fontSize: number = DEFAULT_SETTINGS.fontSize;
const notifications: boolean = DEFAULT_SETTINGS.notifications;
// @ts-expect-error DEFAULT_SETTINGS is read-only
DEFAULT_SETTINGS.theme = 'dark';
```

## type: Function signatures use the utility types

```ts
type _ = [
  Expect<Equal<typeof updateSettings, (current: Readonly<UserSettings>, changes: Partial<UserSettings>) => Readonly<UserSettings>>>,
  Expect<Equal<typeof resolveSettings, (settings: Partial<UserSettings>) => Required<UserSettings>>>,
];
const current: UserSettings = { theme: 'dark', language: 'pt' };
updateSettings(current, { fontSize: 14 });
// @ts-expect-error color is not a setting
updateSettings(current, { color: 'red' });
```

## runtime: updateSettings returns a new frozen object

```js
const current = { theme: 'light', language: 'en' };
const next = updateSettings(current, { theme: 'dark', fontSize: 14 });
assert.deepEqual(next, { theme: 'dark', language: 'en', fontSize: 14 });
assert.deepEqual(current, { theme: 'light', language: 'en' });
assert.ok(Object.isFrozen(next));
```

## runtime: resolveSettings fills missing values

```js
assert.deepEqual(resolveSettings({}), { theme: 'light', language: 'en', notifications: true, fontSize: 16 });
assert.deepEqual(resolveSettings({ theme: 'dark', notifications: false }), { theme: 'dark', language: 'en', notifications: false, fontSize: 16 });
```

## runtime: Explicit undefined falls back to the default

```js
const resolved = resolveSettings({ fontSize: undefined, language: 'pt' });
assert.equal(resolved.fontSize, 16);
assert.equal(resolved.language, 'pt');
```
