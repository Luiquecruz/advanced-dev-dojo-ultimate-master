## Throw or continue

A type predicate narrows inside an `if`. Sometimes you do not want an `if` at all: the program simply **cannot continue** when a condition is false. Without help from the type system, you end up repeating the check:

```ts
function readPort(value: unknown): number {
  if (typeof value !== 'number') {
    throw new TypeError('port must be a number');
  }
  return value; // narrowed, but only because the throw is inline
}
```

Moving that throw into a reusable helper loses the narrowing, unless the helper is an **assertion function**.

## `asserts condition`

An assertion function's return type says: "if I return at all, the condition was truthy". The compiler narrows everything after the call:

```ts
function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function charge(amount: number | undefined) {
  invariant(amount !== undefined && amount > 0, 'amount must be positive');
  amount.toFixed(2); // amount: number
}
```

## `asserts value is Type`

The second form combines an assertion with a type predicate:

```ts
function assertIsString(value: unknown, name: string): asserts value is string {
  if (typeof value !== 'string') {
    throw new TypeError(`${name} must be a string`);
  }
}

const input: unknown = JSON.parse(text);
assertIsString(input, 'input');
input.trim(); // input: string from here on
```

## Predicates vs assertions

| | Type predicate | Assertion function |
| --- | --- | --- |
| Return type | `value is T` | `asserts value is T` / `asserts condition` |
| Returns | `boolean` | `void` (or throws) |
| Narrowing | inside `if` / `else` | everything after the call |
| Failure | `false` branch | exception |

Use predicates when both outcomes are valid paths (filtering, branching). Use assertions for **invariants**: configuration that must be present, preconditions, test setup, "this should never happen".

## Rules and pitfalls

- An assertion function must return `void`; returning a value is an error.
- Like predicates, assertions are **trusted**. If the body forgets to throw, the compiler still narrows.
- **Explicit annotations are required at the call site.** Calling an assertion through a variable whose type was inferred fails:

```ts
const assertString = (value: unknown): asserts value is string => { /* ... */ };
assertString(x);
// Error: Assertions require every name in the call target to be declared with an explicit type annotation.

const assertString2: (value: unknown) => asserts value is string = (value) => { /* ... */ };
assertString2(x); // ok
```

  Function declarations (`function assertString(...)`) are always fine, which is why assertion helpers are usually written as declarations.
- Do not name your helper `assert` inside test environments that already provide a global `assert`; prefer descriptive names like `invariant` or `assertIsString`.

## Legacy and ecosystem

Node's `assert` module (`assert(value)`, `assert.ok`) and many test libraries are typed as assertion functions, so after `assert(user)` the compiler knows `user` is truthy. Before TypeScript 3.7 introduced assertion signatures, code had to repeat the check or use `!` after calling such helpers. Libraries like `tiny-invariant` popularized the `invariant(condition, message)` pattern you implement in this challenge.
