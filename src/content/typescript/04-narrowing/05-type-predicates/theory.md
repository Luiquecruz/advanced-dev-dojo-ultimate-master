## Packaging a check in a function

Built-in guards (`typeof`, `instanceof`, `in`) narrow only where they are written. As soon as you move a check into a helper, the narrowing is lost:

```ts
function isString(value: unknown): boolean {
  return typeof value === 'string';
}

function shout(value: unknown) {
  if (isString(value)) {
    value.toUpperCase(); // Error: 'value' is of type 'unknown'
  }
}
```

The function returns a `boolean`, and the compiler does not know what that boolean *means*.

## Type predicates

A **type predicate** is a special return type `parameterName is Type`. It tells the compiler: "when this function returns `true`, the argument is a `Type`; when it returns `false`, it is not":

```ts
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function shout(value: unknown) {
  if (isString(value)) {
    value.toUpperCase();  // value: string
  } else {
    value;                // value: unknown
  }
}
```

Functions with a predicate are called **user-defined type guards**. They are perfect for validating data whose shape you do not control: parsed JSON, `localStorage`, messages, API responses.

```ts
interface User { id: number; name: string }

function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value && typeof value.id === 'number' &&
    'name' in value && typeof value.name === 'string'
  );
}
```

Since TypeScript 4.9, `'id' in value` narrows an `object` to `object & Record<'id', unknown>`, so `value.id` can be checked without assertions.

## Filtering arrays

`Array.prototype.filter` has an overload that accepts a type predicate and returns a narrowed array:

```ts
const raw: unknown[] = JSON.parse(text);
const users = raw.filter(isUser);   // User[]
```

### Inferred type predicates (TypeScript 5.5)

Before TypeScript 5.5, an inline arrow function never produced a predicate, so this was a classic annoyance:

```ts
const names = ['Ada', undefined, 'Alan'].filter((name) => name !== undefined);
// TS < 5.5: (string | undefined)[]
// TS 5.5+:  string[]
```

TypeScript now **infers** `name is string` when a function has no return type annotation, returns a single boolean expression, and the check is true *if and only if* the parameter has the narrower type. Hover the arrow function to see the inferred predicate.

Pitfall: `filter(Boolean)` still does **not** narrow, because `Boolean` is typed as `(value?: unknown) => boolean`. It also removes `0` and `''`, which is often not what you want. Prefer an explicit comparison.

Truthiness checks (`(name) => !!name`) are not inferred either: a `false` result does not prove the value is `undefined`, since `''` is also falsy.

## Predicates are trusted, not verified

The compiler only checks that the function returns a `boolean`. It does **not** verify that the logic matches the predicate:

```ts
function isNumber(value: unknown): value is number {
  return true;  // compiles, and every caller is now misled
}
```

A wrong predicate is as dangerous as a wrong `as` assertion, so keep predicates small and test them.

## `this is` predicates

Class methods can narrow their own instance:

```ts
class FileNode {
  isDirectory(): this is DirectoryNode { return this instanceof DirectoryNode; }
}
```

## Summary

| Return type | Effect in `if (fn(x))` |
| --- | --- |
| `boolean` | no narrowing |
| `x is T` | `x: T` in the true branch, the rest of the union in the false branch |
| inferred (5.5+) | same as `x is T`, when the body qualifies |
