# Type-safe Builder

A **builder** assembles a complex object step by step: `request().url('/users').method('POST').body(json).build()`. It reads well and hides defaults, but a classic builder has a weakness: nothing stops `build()` before a required step, or a step that makes no sense for the choices already made. Those mistakes surface at runtime, usually as an exception thrown from `build()`.

A **type-state builder** moves those rules into the type system. Each step returns a builder whose *type* records what has been configured, and methods are only callable in valid states.

## The classic builder

```ts
class QueryBuilder {
  #table?: string;
  #limit = 100;

  from(table: string): this {
    this.#table = table;
    return this;
  }

  limit(limit: number): this {
    this.#limit = limit;
    return this;
  }

  build(): string {
    if (!this.#table) throw new Error('from() is required');
    return `SELECT * FROM ${this.#table} LIMIT ${this.#limit}`;
  }
}
```

Two problems: `new QueryBuilder().build()` compiles and throws, and because every step mutates and returns `this`, a builder shared as a "base" is silently changed by whoever uses it next.

## Recording state in type parameters

Add a type parameter that accumulates the completed steps as a union of string literals:

```ts
type Step = 'from' | 'select';

class QueryBuilder<Done extends Step = never> {
  from(table: string): QueryBuilder<Done | 'from'> { /* ... */ }
  select(...columns: string[]): QueryBuilder<Done | 'select'> { /* ... */ }
}
```

`new QueryBuilder()` is `QueryBuilder<never>`; after `.from('users')` it is `QueryBuilder<'from'>`; after `.select('id')` it is `QueryBuilder<'from' | 'select'>`. The order does not matter because unions are unordered.

The type parameter must appear in the **shape** of the class (a parameter or return type of some member). TypeScript compares classes structurally: a type parameter that is never used is a *phantom* that does not change compatibility, so `QueryBuilder<never>` would be assignable to `QueryBuilder<'from'>` and the checks would vanish.

## Gating a method on the state

There are three common ways to make a method unavailable in some states.

**A conditional rest parameter** is the most readable for the learner using the API:

```ts
type Missing<Done extends Step> = Exclude<Step, Done>;
type BuildArgs<Done extends Step> = [Missing<Done>] extends [never] ? [] : [missing: `Missing step: ${Missing<Done>}`];

build(..._args: BuildArgs<Done>): Query { /* ... */ }
```

When every step is done, `build()` takes no arguments. Otherwise it requires an argument of a template literal type nobody can produce by accident, and the compiler error says *"Expected 1 arguments, but got 0"* next to `missing: "Missing step: select"`. The tuple wrapper `[X] extends [never]` stops the conditional from distributing over the union.

**A `this` parameter** (`build(this: QueryBuilder<'from' | 'select'>)`) looks natural but is a trap with accumulating unions. `Done` only appears in return types, so the class is **covariant** in it: `'from'` is assignable to `'from' | 'select'`, therefore `QueryBuilder<'from'>` is assignable to `QueryBuilder<'from' | 'select'>` and the incomplete builder passes. Compute what is *missing* instead, as the rest parameter above does.

**A conditional parameter type** gates a single argument: `body(body: [M] extends ['POST' | 'PUT'] ? string : never)` accepts a string only when the chosen method allows a body; with `never` no value is accepted.

## Capturing literal choices

To branch on a value chosen in an earlier step, capture it as a literal with a generic method:

```ts
method<N extends Method>(method: N): RequestBuilder<Done | 'method', N>
```

`method('POST')` infers `N = 'POST'`, so later steps can read it. Default `M` to the full `Method` union so that, before `method()` runs, method-dependent steps stay closed.

## Immutable steps

Return a new builder from every step instead of `this`:

```ts
#next(changes: Partial<HttpRequest>) {
  return new RequestBuilder({ ...this.#config, ...changes });
}
```

Besides avoiding shared-base bugs, immutability is *required* for type-state: if a step mutated and returned `this`, the variable holding the old builder would claim an old state while the object had moved on.

## Pitfalls

- Phantom type parameters that no member uses give no protection.
- `this: Builder<'a' | 'b'>` accepts `Builder<'a'>`: the class is covariant in the accumulated union. Check the missing steps, not the done ones.
- `Exclude<Step, Done> extends never ? ...` without the tuple wrapper distributes and yields `never` instead of a type.
- Runtime still needs a guard in `build()` for JavaScript callers and `as` casts.
- Too many type parameters make hover types unreadable; gate only the rules that cause real bugs.

## When to choose it

Use a type-state builder for APIs with a few **required** steps or **ordering rules** that are easy to forget: HTTP request builders, query builders (Kysely and Drizzle use this idea to type `select` after `from`), test-data factories, configuration of SDK clients. For plain objects with optional fields, an options object (`createRequest({ url, method })`) with a well-typed interface is simpler, has better autocomplete and needs no builder at all. Prefer the builder when the object is assembled across several places or when each step enables or forbids later ones.

## Working with AI

Ask for "a type-state builder with a `Done` type parameter, immutable steps and a conditional rest parameter on `build()`", and paste the rules (which steps are required, which steps depend on earlier choices). Review the result for: steps that `return this` (mutation), phantom type parameters no member uses, `as any` or `as unknown as` inside steps that hide errors, a missing runtime guard in `build()`, and type tests (`// @ts-expect-error`) proving invalid chains fail to compile. Without those negative tests you cannot tell if the types really protect anything.
