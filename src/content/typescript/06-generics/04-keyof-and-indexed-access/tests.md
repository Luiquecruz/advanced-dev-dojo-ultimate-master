## type: Derived type aliases

```ts
type _ = [
  Expect<Equal<SettingKey, 'theme' | 'fontSize' | 'autosave'>>,
  Expect<Equal<ThemeValue, 'light' | 'dark'>>,
  Expect<Equal<Role, 'admin' | 'editor' | 'viewer'>>,
  Expect<Equal<typeof ROLES, readonly ['admin', 'editor', 'viewer']>>,
];
```

## type: getProperty returns the exact property type

```ts
const settings: Settings = { theme: 'dark', fontSize: 14, autosave: true };
const theme = getProperty(settings, 'theme');
const size = getProperty(settings, 'fontSize');
type _ = [Expect<Equal<typeof theme, 'light' | 'dark'>>, Expect<Equal<typeof size, number>>];
// @ts-expect-error color is not a key of Settings
getProperty(settings, 'color');
```

## type: setProperty checks the value against the key

```ts
const settings: Settings = { theme: 'dark', fontSize: 14, autosave: true };
setProperty(settings, 'fontSize', 16);
// @ts-expect-error fontSize must be a number
setProperty(settings, 'fontSize', '16px');
// @ts-expect-error blue is not a theme
setProperty(settings, 'theme', 'blue');
```

## type: pluck returns an array of the property type

```ts
const users = [{ id: 1, name: 'Ada' }, { id: 2, name: 'Alan' }];
const names = pluck(users, 'name');
type _ = Expect<Equal<typeof names, string[]>>;
// @ts-expect-error email is not a key
pluck(users, 'email');
```

## runtime: The helpers read and write properties

```js
const settings = { theme: 'dark', fontSize: 14, autosave: true };
assert.equal(getProperty(settings, 'theme'), 'dark');
setProperty(settings, 'fontSize', 18);
assert.equal(settings.fontSize, 18);
assert.deepEqual(pluck([{ id: 1 }, { id: 2 }], 'id'), [1, 2]);
assert.deepEqual(ROLES, ['admin', 'editor', 'viewer']);
```

## forbid: No any left

```regex
\bany\b
```
