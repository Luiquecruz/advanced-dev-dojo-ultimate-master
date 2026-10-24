## Type guards are ordinary JavaScript

TypeScript narrows unions by understanding the checks you would write in JavaScript anyway. Each of these expressions is a **type guard**.

## `typeof`

`typeof` returns one of `"string"`, `"number"`, `"bigint"`, `"boolean"`, `"symbol"`, `"undefined"`, `"object"` and `"function"`:

```ts
function pad(value: string | number) {
  if (typeof value === 'number') {
    return ' '.repeat(value);   // value: number
  }
  return value;                 // value: string
}
```

Pitfall: `typeof null === 'object'`. Checking `typeof x === 'object'` leaves `null` in the union:

```ts
function keys(value: object | null) {
  if (typeof value === 'object') {
    Object.keys(value); // Error: 'value' is possibly 'null'
  }
}
```

## Truthiness and equality

```ts
function greet(name: string | null | undefined) {
  if (name) { /* name: string */ }
  if (name != null) { /* name: string (excludes both null and undefined) */ }
  if (name === undefined) { /* name: undefined */ }
}
```

Truthiness checks also remove `''`, `0` and `false`, which is often a bug for numbers and strings. Prefer explicit comparisons (`!== undefined`, `!= null`) when empty values are valid.

## `instanceof`

`x instanceof C` checks the prototype chain, so it narrows to **class instances**: `Date`, `Error`, `Map`, your own classes.

```ts
function toTimestamp(value: number | Date): number {
  if (value instanceof Date) {
    return value.getTime();   // value: Date
  }
  return value;               // value: number
}
```

It does not work for interfaces or type aliases, because those do not exist at runtime. It also fails across realms (an `Array` from an iframe), which is why `Array.isArray` exists and narrows to arrays.

## `in`

`'prop' in obj` checks whether a property exists, and narrows object unions by their shape:

```ts
type Circle = { radius: number };
type Square = { side: number };

function area(shape: Circle | Square): number {
  if ('radius' in shape) {
    return Math.PI * shape.radius ** 2;  // shape: Circle
  }
  return shape.side ** 2;                // shape: Square
}
```

If the property is **optional** on a member, that member stays in both branches. Since TypeScript 4.9, `in` also narrows `unknown` objects by *adding* the property: after `'id' in value`, `value.id` is `unknown` instead of an error.

## Why not type assertions?

A type assertion (`value as Date`) is **not** a check. It tells the compiler to trust you and generates no code:

```ts
function toTimestamp(value: number | Date): number {
  return (value as Date).getTime();  // compiles, crashes for numbers
}
```

Assertions are an escape hatch for facts the compiler cannot know. When a runtime check can prove the type, write the check instead.

## Catching errors

Values in a `catch` clause are `unknown` (with `useUnknownInCatchVariables`, part of `strict`) because anything can be thrown. Narrow them before use:

```ts
try {
  risky();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
}
```

| Guard | Narrows | Use for |
| --- | --- | --- |
| `typeof x === 'string'` | primitives, functions | `string`, `number`, `boolean`, `bigint`, `symbol`, `undefined` |
| `x instanceof C` | class instances | `Date`, `Error`, `Map`, custom classes |
| `'key' in x` | object shapes | unions of object types |
| `Array.isArray(x)` | arrays | "one or many" inputs |
| `x === value`, `x != null` | literals, null | literal unions, optional values |
