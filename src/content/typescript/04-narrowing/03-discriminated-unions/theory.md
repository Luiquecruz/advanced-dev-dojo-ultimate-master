## The problem with optional-flag objects

A common way to model a request in JavaScript is one object with optional fields:

```ts
interface RequestState {
  isLoading: boolean;
  data?: string[];
  error?: string;
}
```

This type allows **impossible states**: `isLoading: true` together with `error`, or success without `data`. Every consumer has to guess which combination is valid and sprinkle `?.` and `!` everywhere.

## Discriminated unions

A **discriminated union** (also called a tagged union) is a union of object types that share one property, the **discriminant**, whose type is a *different literal* in each member:

```ts
type RequestState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: string[] }
  | { status: 'error'; error: string };
```

Each member only has the fields that make sense in that state. Impossible combinations are now compile errors:

```ts
const broken: RequestState = { status: 'success' };
// Error: Property 'data' is missing in type '{ status: "success"; }'
```

## Narrowing on the discriminant

Checking the discriminant narrows the whole object, so member-specific fields become available without assertions:

```ts
function render(state: RequestState): string {
  switch (state.status) {
    case 'idle':
      return 'Nothing yet';
    case 'loading':
      return 'Loading…';
    case 'success':
      return state.data.join(', ');   // state: { status: 'success'; data: string[] }
    case 'error':
      return `Error: ${state.error}`;  // state: { status: 'error'; error: string }
  }
}
```

`if (state.status === 'error')` works the same way. TypeScript 4.6+ also narrows **destructured** discriminants when they are `const` (or parameters that are never reassigned):

```ts
function render({ status, ...rest }: RequestState) { /* ... */ }
const { status } = state;
if (status === 'success') {
  state.data; // ok, narrowing through the destructured variable
}
```

## Rules for a good discriminant

- It must be a property present in **every** member.
- Its type must be a **literal** (string, number, boolean) or `undefined`/`null`, different in each member.
- Common names: `kind`, `type`, `status`, `tag`.

Discriminated unions must be written with `type` aliases, because an `interface` cannot be a union. Each member can still be an interface:

```ts
interface Circle { kind: 'circle'; radius: number }
interface Square { kind: 'square'; side: number }
type Shape = Circle | Square;
```

## Where you will see them

- UI state machines (idle/loading/success/error)
- Redux actions and reducers (`{ type: 'todo/added'; payload: Todo }`)
- API results (`{ ok: true; value: T } | { ok: false; error: E }`)
- Events and messages in workers and WebSockets

To extract one member type, use `Extract`:

```ts
type Success = Extract<RequestState, { status: 'success' }>;
```

## Pitfalls

- A discriminant typed as plain `string` in one member breaks narrowing: the compiler cannot rule that member out.
- Building state objects in variables without annotations widens the literal (`status: string`); annotate the variable with the union type or use `as const`.
- Adding a new member does not automatically update every `switch`. The next lesson makes the compiler find the places you forgot.
