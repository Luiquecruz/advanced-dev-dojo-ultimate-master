## Let the compiler do the typing

You rarely need to annotate everything. Whenever a value has an obvious type, TypeScript **infers** it from the initializer, and the inferred type is exactly as strict as an annotation would be.

```ts
let retries = 3;              // number
const label = 'Checkout';     // "Checkout" (a literal, because a const never changes)
const prices = [120, 45, 199]; // number[]

retries = 'three'; // Error: Type 'string' is not assignable to type 'number'
```

Hover any variable in your editor to see what was inferred. If the tooltip already says what you would have written, the annotation is just noise.

## Where inference happens

| Situation | Inferred from |
| --- | --- |
| `let` / `const` with an initializer | the initial value |
| Function return type | every `return` statement |
| Array literals | the *best common type* of the elements (`[1, 'a']` → `(string \| number)[]`) |
| Callback parameters | the position they are passed to (**contextual typing**) |
| Default parameter values | the default (`step = 1` → `number`) |

Contextual typing is the one that saves the most keystrokes:

```ts
const names = ['Ada', 'Alan', 'Grace'];

names.map((name) => name.toUpperCase());
//         ^? name: string, because map knows it iterates a string[]

[3, 1, 2].reduce((total, value) => total + value, 0);
//                ^? total: number, value: number
```

Return types are inferred too:

```ts
function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
// average: (values: number[]) => number
```

## Where you should still annotate

Inference flows **forward** from values. Places with no value to learn from need your help:

- **Function parameters.** Nothing tells the compiler what callers will pass, so an unannotated parameter is an implicit `any`, which `strict` mode rejects.
- **Empty arrays and late initialization.** `const tags = []` starts as an *evolving* `any[]` whose type changes with every `push`. Write `const tags: string[] = []`.
- **Public APIs.** An explicit return type on an exported function documents intent and turns an accidental change of the returned value into an error *inside* the function instead of at every caller.
- **Values that must match a wider type than their initializer**, e.g. `let id: string | number = 1`.

```ts
const tags = [];
tags.push('sale');
tags.push(42);        // allowed: tags is now (string | number)[]

const safeTags: string[] = [];
safeTags.push(42);    // Error: Argument of type 'number' is not assignable to parameter of type 'string'
```

## Pitfalls

- **`reduce` without an initial value** uses the first element as the accumulator, so its type must equal the element type. Passing `0` (or `{}` / `[]` with an annotation) as the second argument makes the accumulator type explicit.
- **Widening.** `let status = 'idle'` infers `string`, not `"idle"`, because a `let` can be reassigned. The next lessons show how literal types and `as const` keep narrow types.
- **Annotating callback parameters** that are already contextually typed adds nothing and can drift out of sync with the real data.

> Rule of thumb: annotate the **boundaries** (parameters, exported return types, empty containers) and let inference handle the **inside** of your functions.
