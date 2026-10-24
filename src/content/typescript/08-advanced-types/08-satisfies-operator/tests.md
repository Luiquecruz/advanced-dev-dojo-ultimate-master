## pattern: palette and routes use satisfies

```regex
\}\s*satisfies\s+Record<PaletteKey,\s*Color>[\s\S]*as\s+const\s+satisfies\s+Record<string,\s*Route>
```

## forbid: No annotation on palette and no assertion to Record

```regex
const\s+palette\s*:|as\s+Record\s*<
```

## type: palette keeps precise property types

```ts
type _ = [
  Expect<Equal<typeof palette.primary, string>>,
  Expect<Equal<typeof palette.accent, { r: number; g: number; b: number }>>,
];
```

## type: routes keep literal keys and paths

```ts
type _ = [
  Expect<Equal<RouteName, 'home' | 'profile' | 'settings'>>,
  Expect<Equal<typeof routes.home.path, '/'>>,
];
routePath('settings');
// @ts-expect-error
routePath('unknown');
```

## runtime: routePath and accentCss return the expected strings

```js
assert.equal(routePath('profile'), '/profile');
assert.equal(routePath('home'), '/');
assert.equal(accentCss(), 'rgb(255, 0, 128)');
```
