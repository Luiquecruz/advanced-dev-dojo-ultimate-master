## type: assertNever only accepts never

```ts
type _ = Expect<Equal<typeof assertNever, (value: never) => never>>;
// @ts-expect-error
assertNever('circle');
```

## runtime: assertNever throws a descriptive error

```js
assert.throws(() => assertNever({ kind: 'hexagon' }), 'Unexpected value: {"kind":"hexagon"}');
```

## runtime: area handles every shape

```js
assert.equal(area({ kind: 'triangle', base: 4, height: 3 }), 6); assert.equal(area({ kind: 'square', side: 2 }), 4); assert.equal(area({ kind: 'circle', radius: 1 }), Math.PI);
```

## runtime: area fails loudly on unknown shapes

```js
assert.throws(() => area({ kind: 'hexagon', side: 1 }), 'Unexpected value');
```

## pattern: The default branch calls assertNever(shape)

```regex
default:\s*return\s+assertNever\(\s*shape\s*\)|default:\s*assertNever\(\s*shape\s*\)
```
