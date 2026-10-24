## type: MyReturnType extracts the return type

```ts
type _ = [
  Expect<Equal<MyReturnType<() => string>, string>>,
  Expect<Equal<MyReturnType<(id: number) => Promise<Date>>, Promise<Date>>>,
  Expect<Equal<MyReturnType<(a: string, b: boolean) => 1 | 2>, 1 | 2>>,
  Expect<Equal<MyReturnType<string>, never>>,
];
```

## type: MyParameters extracts the parameter tuple

```ts
type _ = [
  Expect<Equal<MyParameters<(id: number, label?: string) => void>, [id: number, label?: string]>>,
  Expect<Equal<MyParameters<() => void>, []>>,
  Expect<Equal<MyParameters<(...values: boolean[]) => void>, boolean[]>>,
  Expect<Equal<MyParameters<{ id: number }>, never>>,
];
```

## type: FirstArgument extracts only the first parameter

```ts
type _ = [
  Expect<Equal<FirstArgument<(id: number, label: string) => void>, number>>,
  Expect<Equal<FirstArgument<(user: { name: string }) => void>, { name: string }>>,
  Expect<Equal<FirstArgument<() => void>, never>>,
  Expect<Equal<FirstArgument<'not a function'>, never>>,
];
```

## type: UnwrapPromise unwraps exactly one level

```ts
type _ = [
  Expect<Equal<UnwrapPromise<Promise<number>>, number>>,
  Expect<Equal<UnwrapPromise<Promise<Promise<number>>>, Promise<number>>>,
  Expect<Equal<UnwrapPromise<string>, string>>,
];
```

## type: ToNumber converts numeric strings

```ts
type _ = [
  Expect<Equal<ToNumber<'42'>, 42>>,
  Expect<Equal<ToNumber<'3.5'>, 3.5>>,
  Expect<Equal<ToNumber<'abc'>, never>>,
  Expect<Equal<ToNumber<42>, never>>,
];
```

## forbid: Does not use the built-in helpers

```regex
\b(ReturnType|Parameters|Awaited)\s*<
```
