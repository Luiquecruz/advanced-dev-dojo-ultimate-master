Model a few string formats with **template literal types**.

1. `type CssUnit = 'px' | 'rem' | '%'` is given. Declare `type CssLength` as any number followed by one of
   the units (`'12px'`, `'1.5rem'`, `'100%'`).
2. `type ChangeEvent<T>`: for an object type `T`, the union of `<key>Changed` for every **string** key.
   `ChangeEvent<{ name: string; age: number }>` is `'nameChanged' | 'ageChanged'`.
3. `type ParseVersion<V>`: parses a `'major.minor.patch'` string into
   `{ major: number literal; minor: number literal; patch: number literal }`.
   `ParseVersion<'1.20.3'>` is `{ major: 1; minor: 20; patch: 3 }`. Anything else is `never`.
4. Implement `function toPx<N extends number>(value: N)` returning `` `${value}px` `` typed as
   `` `${N}px` ``, so `toPx(12)` has the type `'12px'`.

`any` is not allowed.
