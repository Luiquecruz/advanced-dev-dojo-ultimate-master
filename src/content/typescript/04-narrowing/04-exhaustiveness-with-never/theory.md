## The forgotten case

Discriminated unions grow. Someone adds a member, and every `switch` that should handle it silently falls into the `default` branch or returns `undefined`:

```ts
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'square'; side: number }
  | { kind: 'triangle'; base: number; height: number }; // new

function area(shape: Shape): number {
  switch (shape.kind) {
    case 'circle': return Math.PI * shape.radius ** 2;
    case 'square': return shape.side ** 2;
    default: return 0; // triangles quietly get area 0
  }
}
```

**Exhaustiveness checking** turns this into a compile error.

## Narrowing down to `never`

Every handled `case` removes a member from the union. After all members are handled, the remaining type is `never`, the type with no values. Since only `never` is assignable to `never`, you can assert that a branch is unreachable:

```ts
function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
}

function area(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':
      return Math.PI * shape.radius ** 2;
    case 'square':
      return shape.side ** 2;
    default:
      return assertNever(shape);
      // Error: Argument of type '{ kind: "triangle"; ... }' is not assignable to parameter of type 'never'.
  }
}
```

The error names the forgotten member. Add the missing `case` and the error disappears. If unexpected data still arrives at runtime (for example from an outdated API), `assertNever` throws a clear error instead of returning garbage.

## Variants of the same idea

**Inline `never` variable** (no helper needed):

```ts
default: {
  const exhaustive: never = shape;
  throw new Error(`Unhandled shape ${exhaustive}`);
}
```

**`satisfies never`** (TypeScript 4.9+):

```ts
default:
  throw new Error(`Unhandled shape: ${shape satisfies never}`);
```

**Return type annotation.** With an explicit return type and no `default`, a missing case makes the end of the function reachable, which `strict` reports as *"Function lacks ending return statement and return type does not include 'undefined'"*. It works, but the error points at the function, not at the missing member.

## Related compiler options and tools

- `noFallthroughCasesInSwitch` reports a `case` that falls into the next one without `break` or `return`.
- The typescript-eslint rule `switch-exhaustiveness-check` reports switches over unions that miss members, even without a `default`.

## When not to be exhaustive

Exhaustiveness is right when every member **must** be handled differently. When most members share behavior, a `default` that handles "everything else" is fine; just do not use `default` to hide members you forgot. A good compromise is to list the shared members as stacked cases:

```ts
case 'square':
case 'rectangle':
  return width * height;
```

## Pitfall

`assertNever` must accept `never`, not `unknown`. A parameter typed `unknown` accepts every value, so the compiler can no longer warn you.
