Fluent APIs build a value step by step: `z.object({...}).extend({...})`, `db.select('id').from('users')`,
`new Router().get('/users', handler)`. In typed libraries, each call does more than return `this`: it
returns a **new type** that remembers what has been configured so far. The type parameter acts as
**type-level state** carried through the chain.

## Accumulating state in a type parameter

```ts
interface QueryBuilder<Selected = {}> {
  select<K extends string, V>(column: K, sample: V): QueryBuilder<Selected & Record<K, V>>;
  result(): Selected;
}
```

Every call to `select` returns a builder whose type parameter is **wider**: the previous state intersected
with the new column. Nothing is mutated at the type level; each step is a new instantiation, like an
immutable reducer.

```ts
declare const query: QueryBuilder;
const row = query.select('id', 1).select('name', 'Ada').result();
// {} & Record<'id', number> & Record<'name', string>
```

## Making the result readable: Simplify

The result above is correct but ugly in tooltips, and strict equality checks treat an intersection and the
equivalent flat object as different types. A tiny identity mapped type **flattens** it:

```ts
type Simplify<T> = { [K in keyof T]: T[K] } & {};

type Flat = Simplify<{ id: number } & { name: string }>; // { id: number; name: string }
```

The mapped type copies every property into one object type. The trailing `& {}` is a widely used trick that
nudges editors to display the expanded form instead of the alias name. Libraries ship the same helper as
`Simplify` (type-fest), `Prettify` or `Expand`.

## Rejecting invalid steps with conditional parameter types

Parameters can depend on the current state. To forbid configuring the same key twice, make the `key`
parameter `never` when it already exists:

```ts
interface Settings<T = {}> {
  set<K extends string, V>(key: K extends keyof T ? never : K, value: V): Settings<T & Record<K, V>>;
}
```

TypeScript still infers `K` from the argument (inference sees through the conditional type to the naked
`K`), then checks the argument against the resolved parameter type. When `K` is already a key, the parameter
is `never` and the call fails with *"Argument of type 'name' is not assignable to parameter of type
'never'"*.

Other variations follow the same idea: `Omit<T, K> & Record<K, V>` to allow **overriding** a key with a new
type, or a phantom flag (`Builder<State, HasFrom extends boolean>`) to make `.where()` callable only after
`.from()`.

## Implementing the runtime side

The runtime implementation is usually a small immutable object or class. The type-level state cannot be
proven by the compiler, so one assertion at the step that grows the state is normal:

```ts
function settings<T extends object>(state: T): Settings<T> {
  return {
    set<K extends string, V>(key: K extends keyof T ? never : K, value: V) {
      return settings({ ...state, [key]: value } as T & Record<K, V>);
    },
  };
}
```

Returning a **new** object at every step (instead of mutating and returning `this`) keeps runtime
behavior consistent with the types: an earlier builder never sees options added later.

## Legacy vs modern

Older builder APIs returned `this` and typed the result as a wide `Record<string, unknown>`, or required the
caller to pass the final shape as an explicit generic (`build<Config>()`). Both lose information or let
the declared type and the real calls drift apart. Accumulated generics derive the type from the calls
themselves.

## Pitfalls

- Long chains create deep intersections; flatten them with `Simplify` at the **end** (`get()`), not at every
  step, to keep the compiler fast.
- Generic methods implemented in object literals need their own type parameters; a contextually typed
  method cannot name `K` and `V`.
- A builder stored in a variable typed with a wide annotation (`const b: Chainable = ...`) forgets its
  state. Let inference keep the precise type.
