## Types that change along the code

Every narrowing you have seen so far relies on **control flow analysis** (CFA): the compiler walks every possible path through a function and tracks, at each point, which type each variable can have. A variable therefore has two types:

- its **declared type**, fixed by the annotation or the initializer;
- its **narrowed type** at a given position, computed from the checks and assignments on the paths that reach it.

```ts
let id: string | number = 'abc'; // declared: string | number
id;                               // narrowed: string (assignment narrowing)
id = 42;
id;                               // narrowed: number
id = true;                        // Error: the declared type still decides what can be assigned
```

## What CFA understands

| Construct | Example |
| --- | --- |
| `if` / `else`, ternaries, `&&`, `\|\|`, `??` | `value && value.length` |
| early `return`, `throw`, `break`, `continue` | `if (!user) return;` then `user` is defined |
| `switch` on a discriminant, and `switch (true)` (TS 5.3) | `case typeof x === 'string':` |
| assignments | `x = 'a'` narrows `x` to `string` |
| calls to `never` functions and assertion functions | `fail()` makes the rest unreachable |
| aliased conditions (TS 4.4) | `const isText = typeof x === 'string'; if (isText) ...` |
| constant indexed access (TS 5.5) | `if (typeof obj[key] === 'string') obj[key].trim()` with `const key` |

Aliased conditions only work when the narrowed reference cannot change: a `const`, a `readonly` property, or a parameter that is never assigned in the function body.

Never-returning and assertion calls need **explicit** type annotations on the function (a declaration or an annotated `const`) for CFA to take them into account.

## Where narrowing is lost

### Callbacks and closures

A callback can run later, after the variable has been reassigned. TypeScript therefore resets narrowing inside closures for **mutable** variables:

```ts
function schedule(name: string | undefined) {
  if (name) {
    setTimeout(() => name.toUpperCase()); // ok: name is never assigned again
  }
  name = undefined; // add this line and the callback above reports "possibly undefined"
}
```

Since **TypeScript 5.4**, narrowing is preserved in closures created **after the last assignment** of a `let` variable or parameter. `const` variables always keep their narrowing because they cannot change.

### Function calls do not invalidate property narrowing

CFA is deliberately optimistic about object properties:

```ts
function process(state: { value: string | null }) {
  if (state.value !== null) {
    reset(state);               // could set state.value = null...
    state.value.toUpperCase();  // ...but this still compiles
  }
}
```

Re-checking every property after every call would make narrowing nearly useless, so TypeScript accepts this unsoundness. When a function may mutate shared state, copy the property into a `const` before narrowing.

### `let` declared without a value

```ts
let total;          // implicitly any, then evolving
total = 0;          // number
total = 'zero';     // string
```

Prefer an annotation or an initializer so the declared type is clear.

## Reachability

Code after an unconditional `return`, `throw` or `never` call is **unreachable**, and the compiler can report it (`allowUnreachableCode`). Exhaustive switches narrow the subject to `never` in the `default` branch, which is the basis of exhaustiveness checking.

Functions with an explicit return type are also checked for **missing returns**: if any path can reach the end of the function, you get *"Function lacks ending return statement"*.

## Practical tips

- Prefer `const` and early returns: they give CFA the simplest graph to follow.
- Copy object properties into local constants before complex logic or awaits.
- Hover a variable at different lines in your editor; the tooltip shows the narrowed type at that exact position.
- When CFA cannot follow your logic, restructure the code before reaching for `!` or `as`.
