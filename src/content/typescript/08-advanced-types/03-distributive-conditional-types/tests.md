## type: MyExclude removes matching members

```ts
type Status = 'idle' | 'loading' | 'success' | 'error';
type _ = [
  Expect<Equal<MyExclude<Status, 'idle'>, 'loading' | 'success' | 'error'>>,
  Expect<Equal<MyExclude<string | number | boolean, string | boolean>, number>>,
  Expect<Equal<MyExclude<'a', 'a'>, never>>,
];
```

## type: MyExtract keeps matching members, including union variants

```ts
type Shape = { kind: 'circle'; radius: number } | { kind: 'square'; size: number };
type _ = [
  Expect<Equal<MyExtract<'a' | 'b' | 1 | 2, string>, 'a' | 'b'>>,
  Expect<Equal<MyExtract<Shape, { kind: 'square' }>, { kind: 'square'; size: number }>>,
  Expect<Equal<MyExtract<string, number>, never>>,
];
```

## type: IsNever recognizes never

```ts
type _ = [
  Expect<Equal<IsNever<never>, true>>,
  Expect<Equal<IsNever<undefined>, false>>,
  Expect<Equal<IsNever<string | number>, false>>,
  Expect<Equal<IsNever<[]>, false>>,
];
```

## type: ArrayOf builds a single array of the whole union

```ts
type _ = [
  Expect<Equal<ArrayOf<string | number>, (string | number)[]>>,
  Expect<Equal<ArrayOf<boolean>, boolean[]>>,
  Expect<Equal<ArrayOf<Date>, Date[]>>,
];
```

## type: IsUnion detects unions

```ts
type _ = [
  Expect<Equal<IsUnion<'a' | 'b'>, true>>,
  Expect<Equal<IsUnion<string | number | undefined>, true>>,
  Expect<Equal<IsUnion<boolean>, true>>,
  Expect<Equal<IsUnion<string>, false>>,
  Expect<Equal<IsUnion<[string | number]>, false>>,
  Expect<Equal<IsUnion<never>, false>>,
];
```

## forbid: Does not use the built-in Exclude or Extract

```regex
\b(Exclude|Extract)\s*<
```
