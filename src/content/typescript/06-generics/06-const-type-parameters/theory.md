When TypeScript infers a type argument from a literal, it usually **widens** it to keep values flexible:

```ts
function routes<T extends readonly string[]>(paths: T): T {
  return paths;
}

const result = routes(['/home', '/users']); // string[]: the exact paths are lost
```

For configuration objects, enums-as-arrays and route tables you often want the **exact literal types**
instead: `readonly ['/home', '/users']`.

## Legacy approach: make every caller write `as const`

```ts
const exact = routes(['/home', '/users'] as const); // readonly ["/home", "/users"]
```

It works, but every call site must remember it, and forgetting it silently degrades the types. Another old
trick was adding extra constraints such as `T extends string` (which keeps literals for a single value) or
overly clever tuple constraints like `T extends readonly [] | readonly string[]`.

## Modern approach: `const` type parameters (TypeScript 5.0)

Put `const` in front of the type parameter and inference behaves **as if the caller wrote `as const`**:

```ts
function routes<const T extends readonly string[]>(paths: T): T {
  return paths;
}

const result = routes(['/home', '/users']); // readonly ["/home", "/users"]
```

It works for objects too; properties become `readonly` literals:

```ts
function defineConfig<const T extends object>(config: T): T {
  return config;
}

const config = defineConfig({ env: 'prod', retries: 3, tags: ['api'] });
// { readonly env: "prod"; readonly retries: 3; readonly tags: readonly ["api"] }
```

And with rest parameters you get exact tuples:

```ts
function tuple<const T extends unknown[]>(...items: T): T {
  return items;
}
tuple(1, 'a', true); // [1, "a", true]
```

## Rules and pitfalls

- **Only literals written at the call site are affected.** Passing a variable keeps that variable's type:

  ```ts
  const paths = ['/home'];   // string[]
  routes(paths);             // string[]: const cannot recover what was already widened
  ```

- **Readonly vs mutable constraints.** With `T extends readonly unknown[]`, an array literal is inferred as a
  `readonly` tuple. With `T extends unknown[]`, recent TypeScript versions (5.3+) infer a **mutable** tuple
  instead. In TypeScript 5.0–5.2 a mutable constraint made the `const` modifier fall back to plain `string[]`,
  which is why older articles insist on `readonly`. Choose the constraint that matches what you return.
- `const` is about **inference**, not runtime: the values are not frozen. Use `Object.freeze` if you need that.
- The modifier is allowed on functions, methods and classes, not on type aliases or interfaces.

## When to use it

Library-style helpers that turn literals into types: `defineConfig`, route and event maps, schema builders,
"enum from array" helpers, type guard factories like the one in the challenge below. For regular business
functions, widened types are usually what you want.
